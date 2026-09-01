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

export const SETTINGS_NAV: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: Settings,
}

/** @deprecated Use SETTINGS_NAV */
export const PREFERENCES_NAV = SETTINGS_NAV

/** @deprecated Use SETTINGS_NAV */
export const PROFILE_NAV: NavItem = {
  href: '/settings#profile',
  label: 'Profile',
  icon: CircleUser,
}

/** @deprecated Use SETTINGS_NAV */
export const ACCOUNT_NAV = PROFILE_NAV

/** Nested under athlete name while on /settings/* */
export const SETTINGS_SUBNAV: NavItem[] = [SETTINGS_NAV]

/** Name/avatar click opens settings. */
export const SETTINGS_ENTRY_HREF = SETTINGS_NAV.href

export const CONNECT_COACH_NAV: NavItem = {
  href: '/settings#profile',
  label: 'Connect to a coach',
  icon: Users,
}
