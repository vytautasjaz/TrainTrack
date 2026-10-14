/** Stable custom exercise id from free-text name (legacy / offline path). */
export function customExerciseId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return slug
    ? `custom_${slug}`
    : `custom_${crypto.randomUUID().slice(0, 8)}`
}
