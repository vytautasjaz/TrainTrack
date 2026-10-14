import { compactSearchText } from '@/lib/exercises/normalize'

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
  /^(barbell|dumbbell|dumbells|ez\s*bar|cable|kettlebell|smith\s*machine)\s+/i

/** Lower = better default when several rows collapse to the same key. */
export function matchPriority(name: string): number {
  const n = name.toLowerCase()
  let score = name.length
  if (/\bmedium grip\b/.test(n)) score -= 40
  if (/\bbarbell\b/.test(n)) score -= 15
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
  for (const raw of [name, ...aliases]) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    for (const k of indexKeysForName(trimmed)) keys.add(k)
    if (!EQUIPMENT_PREFIX.test(trimmed)) {
      keys.add(matchKey(`Barbell ${trimmed}`))
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
