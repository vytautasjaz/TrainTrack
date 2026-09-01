import {
  CalendarRange,
  CircleUser,
  Flag,
  Library,
  LineChart,
  MessageSquare,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type NavSubItem = {
  href: string
  label: string
}

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  children?: NavSubItem[]
}

export type CalculatorNavTab = {
  id: 'running' | 'interval' | 'triathlon' | 'hyrox' | 'splits'
  label: string
  href: string
}

export const CALCULATOR_NAV_TABS: CalculatorNavTab[] = [
  { id: 'running', label: 'Running Calculator', href: '/tools?tab=running' },
  { id: 'interval', label: 'Interval Calculator', href: '/tools?tab=interval' },
  { id: 'triathlon', label: 'Triathlon Calculator', href: '/tools?tab=triathlon' },
  { id: 'hyrox', label: 'HYROX Calculator', href: '/tools?tab=hyrox' },
  { id: 'splits', label: 'Splits Calculator', href: '/tools?tab=splits' },
]

const TOOLS_NAV: NavItem = {
  href: '/tools',
  label: 'Tools',
  icon: Wrench,
  children: CALCULATOR_NAV_TABS.map(({ href, label }) => ({ href, label })),
}

/** Home is via the app logo → /dashboard; not listed in athlete nav. */
export const MAIN_NAV: NavItem[] = [
  { href: '/training', label: 'Training', icon: CalendarRange },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/season', label: 'Season', icon: Flag },
  { href: '/progress', label: 'Stats', icon: LineChart },
  TOOLS_NAV,
]

export function getMainNav(isCoach: boolean): NavItem[] {
  if (isCoach) {
    return [
      { href: '/athletes', label: 'Athletes', icon: Users },
      { href: '/training', label: 'Training', icon: CalendarRange },
      { href: '/inbox', label: 'Inbox', icon: MessageSquare },
      { href: '/season', label: 'Season', icon: Flag },
      { href: '/progress', label: 'Stats', icon: LineChart },
      { href: '/workouts', label: 'Library', icon: Library },
      TOOLS_NAV,
    ]
  }
  return [
    { href: '/training', label: 'Training', icon: CalendarRange },
    { href: '/inbox', label: 'Inbox', icon: MessageSquare },
    { href: '/season', label: 'Season', icon: Flag },
    { href: '/progress', label: 'Stats', icon: LineChart },
    TOOLS_NAV,
  ]
}

export const PREFERENCES_NAV: NavItem = {
  href: '/settings/preferences',
  label: 'Preferences',
  icon: Settings,
}

export const PROFILE_NAV: NavItem = {
  href: '/settings/account',
  label: 'Profile',
  icon: CircleUser,
}

/** @deprecated Use PROFILE_NAV */
export const ACCOUNT_NAV = PROFILE_NAV

/** Nested under athlete name while on /settings/* */
export const SETTINGS_SUBNAV: NavItem[] = [PROFILE_NAV, PREFERENCES_NAV]

/** Name/avatar click opens athlete profile (zones, PBs, coach). */
export const SETTINGS_ENTRY_HREF = PROFILE_NAV.href

export const CONNECT_COACH_NAV: NavItem = {
  href: '/settings/account#connect-coach',
  label: 'Connect to a coach',
  icon: Users,
}
