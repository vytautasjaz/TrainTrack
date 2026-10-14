import {
  compactSearchText,
  expandShorthandTokens,
  normalizeSearchText,
  tokenizeSearchText,
} from '@/lib/exercises/normalize'
import type {
  ExerciseMatchType,
  ExerciseRecord,
  ExerciseSearchContext,
  ExerciseSearchHit,
  ExerciseSearchOptions,
} from '@/lib/exercises/types'

const CONTEXT_CATEGORY_BOOST: Record<
  ExerciseSearchContext,
  Record<string, number>
> = {
  STRENGTH: {
    STRENGTH: 18,
    BODYWEIGHT: 8,
    CORE: 6,
    PLYOMETRIC: 4,
  },
  HYROX: {
    HYROX: 28,
    ERG: 18,
    RUNNING: 10,
    CONDITIONING: 8,
    STRENGTH: 4,
  },
  RUNNING: {
    RUNNING: 28,
    ERG: 6,
    RECOVERY: 4,
  },
  CONDITIONING: {
    ERG: 14,
    HYROX: 10,
    PLYOMETRIC: 10,
    BODYWEIGHT: 8,
    STRENGTH: 4,
  },
  MOBILITY: {
    MOBILITY: 28,
    RECOVERY: 18,
    CORE: 6,
  },
  CORE: {
    CORE: 28,
    BODYWEIGHT: 8,
  },
  GENERAL: {},
}

const CONTEXT_MODALITY_BOOST: Record<
  ExerciseSearchContext,
  Record<string, number>
> = {
  STRENGTH: { STRENGTH: 8 },
  HYROX: { STRENGTH: 2, RUNNING: 4 },
  RUNNING: { RUNNING: 12 },
  CONDITIONING: { STRENGTH: 4 },
  MOBILITY: { MOBILITY: 12, RECOVERY: 10 },
  CORE: { CORE: 12 },
  GENERAL: {},
}

function contextBoost(
  exercise: ExerciseRecord,
  context?: ExerciseSearchContext,
): number {
  if (!context || context === 'GENERAL') return 0
  let boost = 0
  boost += CONTEXT_CATEGORY_BOOST[context][exercise.category] ?? 0
  for (const m of exercise.modalities) {
    boost += CONTEXT_MODALITY_BOOST[context][m] ?? 0
  }
  // HYROX station-ish names
  if (context === 'HYROX') {
    const blob = `${exercise.canonicalName} ${exercise.aliases.join(' ')}`.toLowerCase()
    if (
      /sled|wall ball|farmer|sandbag|burpee|ski|row|lunges?/.test(blob)
    ) {
      boost += 12
    }
  }
  if (context === 'STRENGTH') {
    const blob = `${exercise.canonicalName} ${exercise.aliases.join(' ')}`.toLowerCase()
    if (/squat|deadlift|bench|press|row|lunge|rdl/.test(blob)) {
      boost += 8
    }
  }
  return boost
}

function usageBoost(exercise: ExerciseRecord): number {
  return Math.min(12, Math.log10((exercise.usageCount || 0) + 1) * 4) +
    Math.min(8, (exercise.popularity || 0) / 25)
}

type Scored = {
  score: number
  matchType: ExerciseMatchType
}

function scoreMatch(exercise: ExerciseRecord, query: string): Scored | null {
  const q = normalizeSearchText(query)
  if (!q) {
    return { score: 1, matchType: 'context' }
  }
  const qCompact = compactSearchText(query)
  const qTokens = expandShorthandTokens(tokenizeSearchText(query))
  const name = normalizeSearchText(exercise.canonicalName)
  const nameCompact = compactSearchText(exercise.canonicalName)
  const aliases = exercise.aliases.map((a) => normalizeSearchText(a))
  const aliasCompacts = exercise.aliases.map((a) => compactSearchText(a))
  const terms = exercise.searchTerms.map((t) => normalizeSearchText(t))

  if (name === q) return { score: 1000, matchType: 'exact_name' }
  if (aliases.includes(q)) return { score: 950, matchType: 'exact_alias' }
  if (nameCompact === qCompact && qCompact.length >= 2) {
    return { score: 930, matchType: 'exact_name' }
  }
  if (aliasCompacts.includes(qCompact) && qCompact.length >= 2) {
    return { score: 910, matchType: 'exact_alias' }
  }
  if (name.startsWith(q)) return { score: 800, matchType: 'name_prefix' }
  if (aliases.some((a) => a.startsWith(q))) {
    return { score: 760, matchType: 'alias_prefix' }
  }

  // Multi-token: all query tokens appear in name or aliases/searchTerms
  if (qTokens.length > 1) {
    const hay = `${name} ${aliases.join(' ')} ${terms.join(' ')}`
    if (qTokens.every((t) => hay.includes(t))) {
      return { score: 700, matchType: 'token' }
    }
  }

  // Single-token alias/acronym often stored as alias (BBJ, RDL)
  if (qTokens.length === 1) {
    const t = qTokens[0]!
    if (aliases.some((a) => a === t || a.startsWith(t))) {
      return { score: 720, matchType: 'exact_alias' }
    }
    if (terms.includes(t)) return { score: 640, matchType: 'search_term' }
  }

  if (name.includes(q)) return { score: 520, matchType: 'partial_name' }
  if (aliases.some((a) => a.includes(q))) {
    return { score: 480, matchType: 'partial_alias' }
  }
  if (nameCompact.includes(qCompact) && qCompact.length >= 3) {
    return { score: 500, matchType: 'partial_name' }
  }
  if (terms.some((t) => t.includes(q) || q.includes(t))) {
    return { score: 420, matchType: 'search_term' }
  }

  // Token overlap (weaker)
  const nameTokens = new Set(tokenizeSearchText(exercise.canonicalName))
  const overlap = qTokens.filter((t) => nameTokens.has(t)).length
  if (overlap > 0 && overlap === qTokens.length) {
    return { score: 600, matchType: 'token' }
  }
  if (overlap > 0) {
    return { score: 360 + overlap * 20, matchType: 'token' }
  }

  return null
}

/**
 * Pure ranked search over an in-memory exercise snapshot.
 * Relevance always outweighs popularity/usage.
 */
export function searchExercises(
  corpus: ExerciseRecord[],
  query: string,
  options: ExerciseSearchOptions = {},
): ExerciseSearchHit[] {
  const limit = options.limit ?? 12
  const includeInactive = options.includeInactive ?? false
  const q = query.trim()

  const hits: ExerciseSearchHit[] = []
  for (const exercise of corpus) {
    if (!includeInactive && !exercise.isActive) continue
    const matched = scoreMatch(exercise, q)
    if (!matched && q) continue
    const base = matched ?? { score: 1, matchType: 'context' as const }
    const score =
      base.score +
      contextBoost(exercise, options.context) +
      usageBoost(exercise)
    hits.push({
      exercise,
      score,
      matchType: base.matchType,
    })
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.exercise.canonicalName.localeCompare(b.exercise.canonicalName)
  })

  return hits.slice(0, limit)
}

export function getExerciseFromCorpus(
  corpus: ExerciseRecord[],
  id: string,
): ExerciseRecord | undefined {
  return corpus.find((e) => e.id === id)
}
