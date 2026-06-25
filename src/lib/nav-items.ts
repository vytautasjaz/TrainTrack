import {
  CalendarRange,
  Dumbbell,
  Flag,
  Home,
  LineChart,
  Settings,
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
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/races', label: 'Races', icon: Flag },
  { href: '/progress', label: 'Stats', icon: LineChart },
]

export function getMainNav(isCoach: boolean): NavItem[] {
  if (isCoach) {
    return MAIN_NAV.filter((item) => item.href !== '/races' && item.href !== '/progress')
  }
  return MAIN_NAV.filter((item) => item.href !== '/workouts')
}

export const PREFERENCES_NAV: NavItem = {
  href: '/settings/preferences',
  label: 'Preferences',
  icon: Settings,
}
