import {
  CalendarRange,
  Flag,
  Home,
  Library,
  LineChart,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/training', label: 'Training', icon: CalendarRange },
  { href: '/workouts', label: 'Library', icon: Library },
  { href: '/races', label: 'Races', icon: Flag },
  { href: '/progress', label: 'Stats', icon: LineChart },
  { href: '/tools', label: 'Tools', icon: Wrench },
]

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

export function getMainNav(isCoach: boolean): NavItem[] {
  if (isCoach) {
    return [
      { href: '/dashboard', label: 'Athletes', icon: Users },
      { href: '/training', label: 'Training', icon: CalendarRange },
      { href: '/workouts', label: 'Library', icon: Library },
      { href: '/tools', label: 'Tools', icon: Wrench },
    ]
  }
  return MAIN_NAV.filter((item) => item.href !== '/workouts')
}

export const PREFERENCES_NAV: NavItem = {
  href: '/settings/preferences',
  label: 'Preferences',
  icon: Settings,
}
