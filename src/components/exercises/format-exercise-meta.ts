/** Humanize ENUM_STYLE labels for exercise UI. */
export function formatExerciseLabel(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatExerciseMetaLine(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ? formatExerciseLabel(p) : ''))
    .filter(Boolean)
    .join(' · ')
}
