/** Shared Notes / Events / Stats layer prefs (Month + Week toolbars). */

export const SHOW_NOTES_STORAGE_KEY = 'tt-calendar-show-notes'
export const SHOW_EVENTS_STORAGE_KEY = 'tt-calendar-show-events'
export const SHOW_WEATHER_STORAGE_KEY = 'tt-calendar-show-weather'
export const SHOW_WEATHER_SESSION_KEY = 'tt-calendar-show-weather-session'
export const SHOW_STATS_STORAGE_KEY = 'tt-calendar-show-stats'
export const SHOW_FEEDBACK_STORAGE_KEY = 'tt-calendar-show-feedback'

export const STORED_FLAG_CHANGE_EVENT = 'tt-stored-flag-change'

export function readStoredFlag(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === '0' || raw === 'false') return false
    if (raw === '1' || raw === 'true') return true
  } catch {
    /* keep default */
  }
  return fallback
}

export function writeStoredFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(STORED_FLAG_CHANGE_EVENT, { detail: { key, value } }),
    )
  }
}

/** Session-only override (week toolbar). `null` means use the athlete preference. */
export function readSessionFlag(key: string): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === '0' || raw === 'false') return false
    if (raw === '1' || raw === 'true') return true
  } catch {
    /* keep default */
  }
  return null
}

export function writeSessionFlag(key: string, value: boolean) {
  try {
    sessionStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}
