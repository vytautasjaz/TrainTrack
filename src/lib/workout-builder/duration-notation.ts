/** How time quantities are written on workout cards / block summaries. */
export type DurationNotation = 'standard' | 'athletic'

export const DEFAULT_DURATION_NOTATION: DurationNotation = 'standard'

export function parseDurationNotation(raw: unknown): DurationNotation {
  return raw === 'athletic' ? 'athletic' : 'standard'
}

/**
 * Athletic: 20" · 1' · 1'30"
 * Standard: 20 sec · 1 min · 1 min (or 90 sec when unit is sec)
 */
export function formatDurationQuantity(
  value: number,
  unit: 'sec' | 'min' | 'm' | 'km',
  notation: DurationNotation = DEFAULT_DURATION_NOTATION,
): string {
  if (!Number.isFinite(value) || value <= 0) return ''

  if (unit === 'km') return `${value} km`
  if (unit === 'm') return `${value} m`

  if (notation !== 'athletic') {
    return unit === 'min' ? `${value} min` : `${value} sec`
  }

  const totalSec =
    unit === 'min' ? Math.round(value * 60) : Math.round(value)
  if (totalSec <= 0) return ''

  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  if (mins === 0) return `${secs}"`
  if (secs === 0) return `${mins}'`
  return `${mins}'${secs.toString().padStart(2, '0')}"`
}
