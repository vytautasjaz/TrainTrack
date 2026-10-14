/** Lowercase, collapse separators, strip punctuation noise for matching. */
export function normalizeSearchText(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Compact form without spaces (wallball, skierg). */
export function compactSearchText(raw: string): string {
  return normalizeSearchText(raw).replace(/\s+/g, '')
}

export function tokenizeSearchText(raw: string): string[] {
  const n = normalizeSearchText(raw)
  if (!n) return []
  return n.split(' ').filter(Boolean)
}

const SHORTHAND: Record<string, string[]> = {
  db: ['dumbbell'],
  kb: ['kettlebell'],
  bb: ['barbell'],
  rdl: ['romanian', 'deadlift'],
  ohp: ['overhead', 'press'],
  bbj: ['burpee', 'broad', 'jump'],
  wb: ['wall', 'ball'],
  bw: ['bodyweight'],
}

/** Expand known abbreviations into extra tokens for indexing/query. */
export function expandShorthandTokens(tokens: string[]): string[] {
  const out = new Set(tokens)
  for (const t of tokens) {
    const extra = SHORTHAND[t]
    if (extra) for (const e of extra) out.add(e)
  }
  return [...out]
}

export function buildSearchBlob(parts: {
  canonicalName: string
  aliases?: string[]
  searchTerms?: string[]
  equipment?: string[]
  movementPattern?: string | null
}): string {
  const chunks = [
    parts.canonicalName,
    ...(parts.aliases ?? []),
    ...(parts.searchTerms ?? []),
    ...(parts.equipment ?? []),
    parts.movementPattern ?? '',
  ]
  const tokens = expandShorthandTokens(
    chunks.flatMap((c) => tokenizeSearchText(c)),
  )
  return tokens.join(' ')
}
