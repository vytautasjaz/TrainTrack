import {
  compactSearchText,
  normalizeSearchText,
} from '@/lib/exercises/normalize'

/**
 * Shared name-matching for linking TrainTrack exercises to external datasets
 * (RepDB, etc.).
 */
export function matchKey(name: string): string {
  let key = compactSearchText(name)
  if (key.length > 4 && key.endsWith('s') && !key.endsWith('ss')) {
    key = key.slice(0, -1)
  }
  return key
}

function nameWithoutVariantSuffix(name: string): string {
  return name.replace(/\s*[-–—].*$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim()
}

const EQUIPMENT_PREFIX =
  /^(barbell|dumbbell|dumbells|ez\s*bar|cable|kettlebell|smith\s*machine|bodyweight|machine|banded|band|trap\s*bar|hex\s*bar)\s+/i

/** Local programming / brand names → RepDB catalog names. */
const LOCAL_TO_REPDB_SYNONYMS: Record<string, string[]> = {
  'assault bike': ['air bike'],
  'assault bike easy': ['air bike'],
  'assault bike sprint': ['air bike'],
  'bike easy': ['air bike', 'stationary bike'],
  'bike intervals': ['air bike', 'stationary bike'],
  'bike threshold': ['air bike', 'stationary bike'],
  bikeerg: ['air bike', 'stationary bike'],
  'bikeerg easy': ['air bike'],
  'bikeerg sprint': ['air bike'],
  'bikeerg threshold': ['air bike'],
  skierg: ['skierg'],
  'skierg intervals': ['skierg'],
  'cable row': ['seated cable row'],
  'single arm cable row': ['one-arm seated cable row', 'one arm seated cable row'],
  'leg raise': ['lying leg raise', 'hanging leg raise'],
  'bear plank': ['bear plank hold'],
  'scapular push up': ['scapular pull ups'],
  'landmine row': ['t-bar row'],
  row: ['rowing machine'],
  'row easy': ['rowing machine'],
  'row intervals': ['rowing machine'],
  'row sprint': ['rowing machine'],
  'row threshold': ['rowing machine'],
  'split jump': ['plyo lunge', 'jump squat'],
  'copenhagen plank': ['side plank'],
  'bear hug carry': ["dumbbell farmer's walk", 'suitcase carry'],
}

/** Lower = better default when several rows collapse to the same key. */
export function matchPriority(name: string): number {
  const n = name.toLowerCase()
  let score = name.length
  if (/\bmedium grip\b/.test(n)) score -= 40
  // Prefer exact / bodyweight-named rows over equipment-qualified when linking
  // a bare local name (e.g. "Bulgarian Split Squat" → bodyweight catalog id).
  if (/^(barbell|dumbbell|kettlebell|cable|smith)\b/.test(n)) score += 8
  if (/\bbodyweight\b/.test(n)) score -= 5
  if (/\bpowerlifting\b|\bwith bands?\b|\bwith chains?\b|\bsmith\b/.test(n))
    score += 80
  if (/\bwide[- ]?grip\b|\bclose[- ]?grip\b|\bguillotine\b/.test(n)) score += 30
  return score
}

export function indexKeysForName(name: string): string[] {
  const keys = new Set<string>()
  const base = nameWithoutVariantSuffix(name)
  keys.add(matchKey(name))
  keys.add(matchKey(base))
  const withoutEquipment = base.replace(EQUIPMENT_PREFIX, '').trim()
  if (withoutEquipment && withoutEquipment !== base) {
    keys.add(matchKey(withoutEquipment))
  }
  return [...keys].filter(Boolean)
}

/**
 * Keys to try when matching a TrainTrack exercise to an external catalog.
 * Bare names like "Bench Press" also try "Barbell Bench Press".
 */
export function lookupKeysForLocalName(
  name: string,
  aliases: string[] = [],
): string[] {
  const keys = new Set<string>()
  const names = [name, ...aliases]
  const norm = normalizeSearchText(name)
  for (const syn of LOCAL_TO_REPDB_SYNONYMS[norm] ?? []) {
    names.push(syn)
  }

  for (const raw of names) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    for (const k of indexKeysForName(trimmed)) keys.add(k)
    if (!EQUIPMENT_PREFIX.test(trimmed)) {
      for (const eq of [
        'Barbell',
        'Dumbbell',
        'Bodyweight',
        'Cable',
        'Kettlebell',
      ]) {
        keys.add(matchKey(`${eq} ${trimmed}`))
      }
    }
    if (!/\bbarbell\b/i.test(trimmed)) {
      const withBarbell = trimmed.replace(
        /\b((?:close[- ]?grip|wide[- ]?grip|decline|incline|pause|tempo)\s+)?(bench press|squat|deadlift)\b/i,
        (_m, qualifier: string | undefined, lift: string) =>
          `${qualifier ?? ''}Barbell ${lift}`.replace(/\s+/g, ' ').trim(),
      )
      if (withBarbell !== trimmed) {
        for (const k of indexKeysForName(withBarbell)) keys.add(k)
      }
    }
  }
  return [...keys]
}
