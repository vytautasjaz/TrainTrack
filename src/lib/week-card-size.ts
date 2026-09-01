export const WEEK_CARD_SIZE_STORAGE_KEY = 'tt-week-card-size'
export const MONTH_CARD_SIZE_STORAGE_KEY = 'tt-month-card-size'

export type WeekCardSize = 's' | 'm' | 'l'

export const WEEK_CARD_SIZES: WeekCardSize[] = ['s', 'm', 'l']

export const WEEK_CARD_SIZE_HINT: Record<WeekCardSize, string> = {
  s: 'Compact — title + primary metric',
  m: 'Medium — title, subtitle, primary + secondary (if enabled)',
  l: 'Large — as medium + structure graph',
}

export function defaultWeekCardSize(): WeekCardSize {
  return 'm'
}

export function parseWeekCardSize(raw: string | null): WeekCardSize {
  if (raw === 's' || raw === 'm' || raw === 'l') return raw
  return defaultWeekCardSize()
}

export function readStoredWeekCardSize(
  storageKey: string = WEEK_CARD_SIZE_STORAGE_KEY,
): WeekCardSize {
  if (typeof window === 'undefined') return defaultWeekCardSize()
  try {
    return parseWeekCardSize(localStorage.getItem(storageKey))
  } catch {
    return defaultWeekCardSize()
  }
}

export function writeStoredWeekCardSize(
  size: WeekCardSize,
  storageKey: string = WEEK_CARD_SIZE_STORAGE_KEY,
) {
  try {
    localStorage.setItem(storageKey, size)
  } catch {
    /* ignore */
  }
}
