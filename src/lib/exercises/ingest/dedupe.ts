import { normalizeSearchText } from '@/lib/exercises/normalize'
import type { ExerciseRecord } from '@/lib/exercises/types'

/**
 * Collapse exact duplicate names/aliases within a batch before upsert.
 * Does not aggressively fuzzy-merge unrelated movements.
 */
export function dedupeExerciseBatch(
  records: ExerciseRecord[],
): { kept: ExerciseRecord[]; duplicates: ExerciseRecord[] } {
  const byId = new Map<string, ExerciseRecord>()
  const byName = new Map<string, string>()
  const duplicates: ExerciseRecord[] = []

  for (const record of records) {
    if (byId.has(record.id)) {
      duplicates.push(record)
      continue
    }
    const nameKey = normalizeSearchText(record.canonicalName)
    const existingId = byName.get(nameKey)
    if (existingId && existingId !== record.id) {
      // Merge aliases into the first canonical row
      const primary = byId.get(existingId)
      if (primary) {
        primary.aliases = [
          ...new Set([
            ...primary.aliases,
            record.canonicalName,
            ...record.aliases,
          ]),
        ]
        primary.searchTerms = [
          ...new Set([...primary.searchTerms, ...record.searchTerms]),
        ]
      }
      duplicates.push(record)
      continue
    }
    byId.set(record.id, { ...record })
    byName.set(nameKey, record.id)
  }

  return { kept: [...byId.values()], duplicates }
}
