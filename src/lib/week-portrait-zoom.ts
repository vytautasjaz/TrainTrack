/** Discrete Week matrix zoom for phone portrait (not CSS transform scale). */

export type WeekPortraitZoom = 'comfort' | 'medium' | 'fit'

export const WEEK_PORTRAIT_ZOOM_STORAGE_KEY = 'tt-week-portrait-zoom'

export const WEEK_PORTRAIT_ZOOM_LEVELS: WeekPortraitZoom[] = [
  'comfort',
  'medium',
  'fit',
]

export const WEEK_PORTRAIT_ZOOM_LABEL: Record<WeekPortraitZoom, string> = {
  comfort: 'Comfort',
  medium: 'Medium',
  fit: 'Fit week',
}

export function defaultWeekPortraitZoom(): WeekPortraitZoom {
  return 'comfort'
}

export function parseWeekPortraitZoom(
  raw: string | null | undefined,
): WeekPortraitZoom {
  if (raw === 'comfort' || raw === 'medium' || raw === 'fit') return raw
  return defaultWeekPortraitZoom()
}

export function readStoredWeekPortraitZoom(): WeekPortraitZoom {
  if (typeof window === 'undefined') return defaultWeekPortraitZoom()
  try {
    return parseWeekPortraitZoom(
      localStorage.getItem(WEEK_PORTRAIT_ZOOM_STORAGE_KEY),
    )
  } catch {
    return defaultWeekPortraitZoom()
  }
}

export function writeStoredWeekPortraitZoom(zoom: WeekPortraitZoom) {
  try {
    localStorage.setItem(WEEK_PORTRAIT_ZOOM_STORAGE_KEY, zoom)
  } catch {
    /* ignore */
  }
}

export function stepWeekPortraitZoom(
  current: WeekPortraitZoom,
  delta: -1 | 1,
): WeekPortraitZoom {
  const idx = WEEK_PORTRAIT_ZOOM_LEVELS.indexOf(current)
  const next = Math.min(
    WEEK_PORTRAIT_ZOOM_LEVELS.length - 1,
    Math.max(0, (idx < 0 ? 0 : idx) + delta),
  )
  return WEEK_PORTRAIT_ZOOM_LEVELS[next]!
}
