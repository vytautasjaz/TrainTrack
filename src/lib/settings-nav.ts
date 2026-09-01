export type SettingsSectionId =
  | 'profile'
  | 'sign-in'
  | 'zones'
  | 'weather'
  | 'plan'
  | 'integrations'
  | 'planning'
  | 'builder'

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
}

export const ATHLETE_SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'sign-in', label: 'Sign-in' },
  { id: 'zones', label: 'Training zones' },
  { id: 'weather', label: 'Weather' },
  { id: 'plan', label: 'Plan display' },
  { id: 'integrations', label: 'Integrations' },
]

/** Coach settings = coach account only. Athlete zones live under Athletes. */
export const COACH_SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'sign-in', label: 'Sign-in' },
  { id: 'planning', label: 'Planning' },
  { id: 'builder', label: 'Builder prefs' },
  { id: 'integrations', label: 'Integrations' },
]

const LEGACY_HASH_MAP: Record<string, SettingsSectionId> = {
  profile: 'profile',
  'connect-coach': 'profile',
  'pending-requests': 'profile',
  'invite-athlete': 'profile',
  'sign-in': 'sign-in',
  zones: 'zones',
  weather: 'weather',
  plan: 'plan',
  'calendar-sync': 'integrations',
  integrations: 'integrations',
  planning: 'planning',
  builder: 'builder',
}

export function settingsNavForRole(isCoachView: boolean): SettingsNavItem[] {
  return isCoachView ? COACH_SETTINGS_NAV : ATHLETE_SETTINGS_NAV
}

export function parseSettingsSection(
  hash: string,
  nav: SettingsNavItem[],
): SettingsSectionId {
  const raw = hash.replace(/^#/, '').trim()
  const mapped = LEGACY_HASH_MAP[raw]
  if (mapped && nav.some((item) => item.id === mapped)) return mapped
  return nav[0]?.id ?? 'profile'
}

export function settingsSectionHref(section: SettingsSectionId): string {
  return `/settings#${section}`
}
