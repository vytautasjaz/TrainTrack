export type SettingsSectionId =
  | 'profile'
  | 'sign-in'
  | 'privacy'
  | 'zones'
  | 'weather'
  | 'plan'
  | 'integrations'
  | 'planning'
  | 'builder'
  | 'notifications'

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
  /** One-line hint on the mobile settings hub list. */
  description?: string
}

export const ATHLETE_SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', description: 'Name, photo, coach' },
  { id: 'sign-in', label: 'Sign-in', description: 'Password and Google' },
  { id: 'privacy', label: 'Privacy', description: 'Strava import and coach' },
  { id: 'notifications', label: 'Notifications', description: 'Push alerts' },
  { id: 'zones', label: 'Training zones', description: 'Pace, HR, bike, swim' },
  { id: 'weather', label: 'Weather', description: 'Forecast location' },
  { id: 'plan', label: 'Training display', description: 'Units · views · cards' },
  { id: 'integrations', label: 'Integrations', description: 'Strava · Calendar' },
]

/** Coach settings = coach account only. Athlete zones live under Athletes. */
export const COACH_SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', description: 'Name, photo, invite code' },
  { id: 'sign-in', label: 'Sign-in', description: 'Password and Google' },
  { id: 'notifications', label: 'Notifications', description: 'Push alerts' },
  { id: 'planning', label: 'Planning', description: 'Units · views · lead' },
  { id: 'builder', label: 'Builder prefs', description: 'Duration · types' },
  { id: 'integrations', label: 'Integrations', description: 'Coaching code' },
]

const LEGACY_HASH_MAP: Record<string, SettingsSectionId> = {
  profile: 'profile',
  'connect-coach': 'profile',
  'pending-requests': 'profile',
  'invite-athlete': 'profile',
  'sign-in': 'sign-in',
  privacy: 'privacy',
  zones: 'zones',
  weather: 'weather',
  plan: 'plan',
  'calendar-sync': 'integrations',
  integrations: 'integrations',
  'integrations-strava': 'integrations',
  'integrations-calendar': 'integrations',
  planning: 'planning',
  builder: 'builder',
  notifications: 'notifications',
}

export function settingsNavForRole(isCoachView: boolean): SettingsNavItem[] {
  return isCoachView ? COACH_SETTINGS_NAV : ATHLETE_SETTINGS_NAV
}

/**
 * Resolve a hash to a section. Empty hash → `null` (mobile hub).
 * Unknown hash → first nav item (desktop default).
 */
export function parseSettingsSection(
  hash: string,
  nav: SettingsNavItem[],
): SettingsSectionId | null {
  const raw = hash.replace(/^#/, '').trim()
  if (!raw) return null
  const mapped = LEGACY_HASH_MAP[raw]
  if (mapped && nav.some((item) => item.id === mapped)) return mapped
  return nav[0]?.id ?? 'profile'
}

/** Desktop always needs a concrete section when hash is empty. */
export function resolveSettingsSection(
  hash: string,
  nav: SettingsNavItem[],
): SettingsSectionId {
  return parseSettingsSection(hash, nav) ?? nav[0]?.id ?? 'profile'
}

export function settingsSectionHref(section: SettingsSectionId): string {
  return `/settings#${section}`
}

export function settingsHubHref(): string {
  return '/settings'
}
