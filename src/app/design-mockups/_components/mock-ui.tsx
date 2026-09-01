import type { ReactNode } from 'react'
import {
  Bike,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CircleUser,
  Dumbbell,
  Flag,
  Footprints,
  Home,
  Leaf,
  Library,
  LineChart,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  Wrench,
  Waves,
} from 'lucide-react'
import Link from 'next/link'
import { MockGradientSidebar } from './mock-gradient-sidebar'
import { TrainTrackLogo, TrainTrackMark } from '@/components/brand/traintrack-logo'
import { cn } from '@/lib/utils'

export type MockStatus = 'Draft' | 'Review' | 'Locked'
export type MockRole = 'athlete' | 'coach'

export const MOCK_SCREENS = [
  { href: '/design-mockups', label: 'Index' },
  { href: '/design-mockups/kit', label: 'UI Kit' },
  { href: '/design-mockups/shell', label: 'App Shell' },
  { href: '/design-mockups/athlete-home', label: 'Athlete Home' },
  { href: '/design-mockups/athlete-home-mobile', label: 'Athlete Home · Mobile' },
  { href: '/design-mockups/coach-home', label: 'Coach Home' },
  { href: '/design-mockups/coach-home-mobile', label: 'Coach Home · Mobile' },
  { href: '/design-mockups/training-list', label: 'Training List' },
  { href: '/design-mockups/training-list-mobile', label: 'Training List · Mobile' },
  { href: '/design-mockups/training-week', label: 'Training Week' },
  { href: '/design-mockups/training-week-mobile', label: 'Training Week · Mobile' },
  { href: '/design-mockups/training-month', label: 'Training Month' },
  { href: '/design-mockups/workout-detail', label: 'Workout Cards · Detail Modals' },
  { href: '/design-mockups/workout-builder', label: 'Workout Builder' },
  { href: '/design-mockups/inbox', label: 'Inbox' },
  { href: '/design-mockups/season', label: 'Season' },
  { href: '/design-mockups/stats', label: 'Stats' },
  { href: '/design-mockups/library', label: 'Library' },
  { href: '/design-mockups/settings', label: 'Settings' },
  { href: '/design-mockups/tools', label: 'Tools · Calculators' },
] as const

const athleteNav = [
  { label: 'Training', icon: CalendarDays, active: false },
  { label: 'Inbox', icon: MessageSquare, active: false, badge: 3 },
  { label: 'Season', icon: Flag, active: false },
  { label: 'Stats', icon: LineChart, active: false },
  { label: 'Tools', icon: Wrench, active: false },
]

const coachNav = [
  { label: 'Athletes', icon: Users, active: false },
  { label: 'Training', icon: CalendarDays, active: false },
  { label: 'Inbox', icon: MessageSquare, active: false, badge: 5 },
  { label: 'Season', icon: Flag, active: false },
  { label: 'Stats', icon: LineChart, active: false },
  { label: 'Library', icon: Library, active: false },
  { label: 'Tools', icon: Wrench, active: false },
]

export function MockBanner({
  title,
  status = 'Draft',
}: {
  title: string
  status?: MockStatus
}) {
  return (
    <div className="tt-mock-banner">
      <div className="flex flex-wrap items-center gap-3">
        <span>Mock · not production</span>
        <span className="opacity-50">/</span>
        <span>{title}</span>
        <span className="tt-mock-status" data-status={status}>
          {status}
        </span>
      </div>
      <Link href="/design-mockups">All mockups</Link>
    </div>
  )
}

export function MockSidebar({
  role = 'athlete',
  active = 'Home',
  collapsed = false,
}: {
  role?: MockRole
  active?: string
  collapsed?: boolean
}) {
  const items = (role === 'coach' ? coachNav : athleteNav).map((item) => ({
    ...item,
    active: item.label === active,
  }))

  return (
    <aside className="tt-mock-sidebar" data-collapsed={collapsed}>
      <div className="tt-mock-brand">
        {collapsed ? (
          <TrainTrackMark className="tt-mock-brand-mark" />
        ) : (
          <TrainTrackLogo
            markClassName="tt-mock-brand-mark"
            wordmarkClassName="tt-mock-brand-wordmark"
          />
        )}
      </div>

      {!collapsed ? (
        <div className="tt-mock-role" aria-label="View mode">
          <button type="button" data-active={role === 'athlete'}>
            Athlete
          </button>
          <button type="button" data-active={role === 'coach'}>
            Coach
          </button>
        </div>
      ) : null}

      <nav className="tt-mock-nav">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <span key={item.label} data-active={item.active}>
              <span className="tt-mock-nav-icon">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {item.badge ? (
                  <span className="tt-mock-badge">{item.badge}</span>
                ) : null}
              </span>
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </span>
          )
        })}
      </nav>

      {!collapsed ? (
        <div className="tt-mock-sidebar-footer">
          <nav className="tt-mock-nav">
            <span>
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              Settings
            </span>
            <span>
              <CircleHelp className="h-4 w-4" strokeWidth={1.75} />
              Help
            </span>
          </nav>
          <div className="mt-2 flex items-center gap-2 rounded-[var(--tt-radius-sm)] bg-white px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--tt-sidebar)] text-xs font-bold ring-1 ring-[var(--tt-line)]">
              V
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Vytautas</p>
              <p className="text-[11px] capitalize text-[var(--tt-ink-faint)]">
                {role === 'coach' ? 'Coach' : 'Athlete'}
              </p>
            </div>
          </div>
          <span className="mt-1 flex items-center gap-2 px-2 pb-0.5 text-sm text-[var(--tt-ink-soft)]">
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </span>
        </div>
      ) : (
        <CircleUser className="tt-mock-sidebar-footer mx-auto h-5 w-5 text-[var(--tt-ink-soft)]" />
      )}
    </aside>
  )
}

export function MockPage({
  title,
  status = 'Draft',
  role = 'athlete',
  activeNav = 'Home',
  collapsed = false,
  children,
  hideSidebar = false,
}: {
  title: string
  status?: MockStatus
  role?: MockRole
  activeNav?: string
  collapsed?: boolean
  children: ReactNode
  hideSidebar?: boolean
}) {
  return (
    <div className="tt-mock min-h-dvh">
      <MockBanner title={title} status={status} />
      <div className={hideSidebar ? 'tt-mock-shell' : 'tt-mock-grad-shell'}>
        {!hideSidebar ? (
          <MockGradientSidebar role={role} active={activeNav} collapsed={collapsed} />
        ) : null}
        <main className={hideSidebar ? 'tt-mock-main' : 'tt-mock-grad-main'}>{children}</main>
      </div>
    </div>
  )
}

export function SportIcon({
  sport,
  className,
  color: colorOverride,
}: {
  sport: 'run' | 'bike' | 'swim' | 'strength' | 'recovery' | 'mobility'
  className?: string
  color?: string
}) {
  const map = {
    run: { Icon: Footprints, color: 'var(--tt-sport-run)' },
    bike: { Icon: Bike, color: 'var(--tt-sport-bike)' },
    swim: { Icon: Waves, color: 'var(--tt-sport-swim)' },
    strength: { Icon: Dumbbell, color: 'var(--tt-sport-strength)' },
    recovery: { Icon: Leaf, color: 'var(--tt-sport-recovery)' },
    mobility: { Icon: Leaf, color: 'var(--tt-sport-mobility)' },
  } as const
  const { Icon, color } = map[sport]
  return (
    <Icon
      className={cn('h-4 w-4', className)}
      style={{ color: colorOverride ?? color }}
      strokeWidth={1.75}
    />
  )
}

/** Phase 2 vision widget — shown in mocks, not in v1 production mapping. */
export function Phase2Card({
  children,
  note,
  className,
}: {
  children: ReactNode
  note: string
  className?: string
}) {
  return (
    <div className={cn('tt-mock-card tt-mock-phase2 p-5', className)}>
      {children}
      <p className="mt-3 border-t border-dashed border-[var(--tt-line)] pt-2 text-[10px] leading-snug text-[var(--tt-ink-faint)]">
        Phase 2 · {note}
      </p>
    </div>
  )
}

export { TrainTrackMark, ChevronRight, LineChart, Home, Flag }
