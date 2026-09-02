import {
  CalendarRange,
  CircleUser,
  Flag,
  Home,
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
  /** Subnav renders open by default (no extra toggle). */
  subnavAlwaysVisible?: boolean
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

const COACH_ATHLETE_SUBNAV: NavSubItem[] = [
  { href: '/training', label: 'Training' },
  { href: '/season', label: 'Season' },
  { href: '/progress', label: 'Stats' },
]

const COACH_ATHLETES_NAV: NavItem = {
  href: '/athletes',
  label: 'Athletes',
  icon: Users,
  subnavAlwaysVisible: true,
  children: COACH_ATHLETE_SUBNAV,
}

const HOME_NAV: NavItem = { href: '/dashboard', label: 'Home', icon: Home }

/** Home is also reachable via the app logo → /dashboard. */
export const MAIN_NAV: NavItem[] = [
  HOME_NAV,
  { href: '/training', label: 'Training', icon: CalendarRange },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/season', label: 'Season', icon: Flag },
  { href: '/progress', label: 'Stats', icon: LineChart },
  TOOLS_NAV,
]

export function getMainNav(isCoach: boolean): NavItem[] {
  if (isCoach) {
    return [
      HOME_NAV,
      { href: '/inbox', label: 'Inbox', icon: MessageSquare },
      COACH_ATHLETES_NAV,
      { href: '/workouts', label: 'Library', icon: Library },
      TOOLS_NAV,
    ]
  }
  return [
    HOME_NAV,
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
