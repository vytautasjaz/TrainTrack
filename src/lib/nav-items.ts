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
  /** Optional section header shown above this item in menus (first of group). */
  group?: string
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
  id: 'running' | 'interval' | 'triathlon' | 'hyrox' | 'splits' | 'predictor'
  /** Page H1 / full name */
  label: string
  /** Compact label in Tools menus */
  menuLabel: string
  href: string
  group: 'Calculators' | 'Predict'
}

export const CALCULATOR_NAV_TABS: CalculatorNavTab[] = [
  {
    id: 'running',
    label: 'Run Calculator',
    menuLabel: 'Run',
    href: '/tools?tab=running',
    group: 'Calculators',
  },
  {
    id: 'interval',
    label: 'Interval Calculator',
    menuLabel: 'Interval',
    href: '/tools?tab=interval',
    group: 'Calculators',
  },
  {
    id: 'triathlon',
    label: 'Triathlon Calculator',
    menuLabel: 'Triathlon',
    href: '/tools?tab=triathlon',
    group: 'Calculators',
  },
  {
    id: 'hyrox',
    label: 'HYROX Calculator',
    menuLabel: 'HYROX',
    href: '/tools?tab=hyrox',
    group: 'Calculators',
  },
  {
    id: 'splits',
    label: 'Splits Calculator',
    menuLabel: 'Splits',
    href: '/tools?tab=splits',
    group: 'Calculators',
  },
  {
    id: 'predictor',
    label: 'Race Time Predictor',
    menuLabel: 'Race time predictor',
    href: '/tools?tab=predictor',
    group: 'Predict',
  },
]

function toolsNavChildren(): NavSubItem[] {
  return CALCULATOR_NAV_TABS.map((tab, index) => {
    const prev = CALCULATOR_NAV_TABS[index - 1]
    return {
      href: tab.href,
      label: tab.menuLabel,
      group: !prev || prev.group !== tab.group ? tab.group : undefined,
    }
  })
}

const TOOLS_NAV: NavItem = {
  href: '/tools',
  label: 'Tools',
  icon: Wrench,
  children: toolsNavChildren(),
}

const COACH_ATHLETE_SUBNAV: NavSubItem[] = [
  { href: '/training', label: 'Training' },
  { href: '/season', label: 'Season' },
  { href: '/progress', label: 'Trends' },
  { href: '/progress/fitness', label: 'Fitness' },
  { href: '/progress/personal-bests', label: 'Personal bests' },
  { href: '/progress/races', label: 'Race results' },
]

const COACH_ATHLETES_NAV: NavItem = {
  href: '/athletes',
  label: 'Athletes',
  icon: Users,
  subnavAlwaysVisible: true,
  children: COACH_ATHLETE_SUBNAV,
}

const COACH_LIBRARY_NAV: NavItem = {
  href: '/workouts',
  label: 'Library',
  icon: Library,
  subnavAlwaysVisible: true,
  children: [
    { href: '/workouts', label: 'Workouts' },
    { href: '/workouts/plans', label: 'Training plans' },
    { href: '/workouts/plans/ai', label: 'Draft with AI' },
  ],
}

const HOME_NAV: NavItem = { href: '/dashboard', label: 'Home', icon: Home }

/**
 * Active match for sidebar / mobile nav.
 * `/workouts` must not match `/workouts/plans` so Workouts vs Training plans stay distinct.
 */
export function isNavActive(pathname: string, href: string) {
  if (href === '/workouts') {
    return (
      pathname === '/workouts' ||
      (pathname.startsWith('/workouts/') && !pathname.startsWith('/workouts/plans'))
    )
  }
  if (href === '/workouts/plans') {
    return (
      pathname === '/workouts/plans' ||
      (pathname.startsWith('/workouts/plans/') &&
        !pathname.startsWith('/workouts/plans/ai'))
    )
  }
  if (href === '/training') {
    return (
      pathname === '/training' ||
      (pathname.startsWith('/training/') &&
        !pathname.startsWith('/training/ai-plan'))
    )
  }
  // Stats overview must not light up every /progress/* child.
  if (href === '/progress') {
    return pathname === '/progress'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

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
      COACH_LIBRARY_NAV,
      TOOLS_NAV,
    ]
  }
  return [
    HOME_NAV,
    {
      href: '/training',
      label: 'Training',
      icon: CalendarRange,
      subnavAlwaysVisible: true,
      children: [
        { href: '/training', label: 'Calendar' },
        { href: '/training/ai-plan', label: 'Draft with AI' },
      ],
    },
    { href: '/inbox', label: 'Inbox', icon: MessageSquare },
    { href: '/season', label: 'Season', icon: Flag },
    {
      href: '/progress',
      label: 'Stats',
      icon: LineChart,
      subnavAlwaysVisible: true,
      children: [
        { href: '/progress', label: 'Trends' },
        { href: '/progress/fitness', label: 'Fitness' },
        { href: '/progress/personal-bests', label: 'Personal bests' },
        { href: '/progress/races', label: 'Race results' },
      ],
    },
    TOOLS_NAV,
  ]
}

/**
 * Desktop top-nav links (v2 shell). Items with `children` render as hover/click menus.
 */
const TOOLS_TOP_NAV: NavItem = {
  href: '/tools',
  label: 'Tools',
  icon: Wrench,
  children: toolsNavChildren(),
}

const ATHLETE_LIBRARY_TOP_NAV: NavItem = {
  href: '/workouts',
  label: 'Library',
  icon: Library,
  children: [
    { href: '/workouts', label: 'Workout library' },
    { href: '/workouts/plans', label: 'Training plans' },
    { href: '/training/ai-plan', label: 'Draft with AI' },
  ],
}

export function getTopNav(isCoach: boolean): NavItem[] {
  if (isCoach) {
    return [
      HOME_NAV,
      { href: '/inbox', label: 'Inbox', icon: MessageSquare },
      { href: '/athletes', label: 'Athletes', icon: Users },
      {
        href: '/workouts',
        label: 'Library',
        icon: Library,
        children: [
          { href: '/workouts', label: 'Workouts' },
          { href: '/workouts/plans', label: 'Training plans' },
          { href: '/workouts/plans/ai', label: 'Draft with AI' },
        ],
      },
      TOOLS_TOP_NAV,
    ]
  }
  return [
    HOME_NAV,
    { href: '/training', label: 'Training', icon: CalendarRange },
    { href: '/season', label: 'Season', icon: Flag },
    ATHLETE_LIBRARY_TOP_NAV,
    {
      href: '/progress',
      label: 'Analytics',
      icon: LineChart,
      children: [
        { href: '/progress', label: 'Trends' },
        { href: '/progress/fitness', label: 'Fitness' },
        { href: '/progress/personal-bests', label: 'Personal bests' },
        { href: '/progress/races', label: 'Race results' },
      ],
    },
    TOOLS_TOP_NAV,
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
