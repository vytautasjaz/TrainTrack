'use client'

import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flag,
  Library,
  LineChart,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  Wrench,
} from 'lucide-react'
import { TrainTrackMark } from '@/components/brand/traintrack-logo'
import type { MockRole } from './mock-ui'

const athleteNav = [
  { label: 'Training', icon: CalendarRange },
  { label: 'Inbox', icon: MessageSquare, badge: 3 },
  { label: 'Season', icon: Flag },
  { label: 'Stats', icon: LineChart },
  { label: 'Tools', icon: Wrench },
] as const

const coachNav = [
  { label: 'Athletes', icon: Users },
  { label: 'Training', icon: CalendarRange },
  { label: 'Inbox', icon: MessageSquare, badge: 5 },
  { label: 'Season', icon: Flag },
  { label: 'Stats', icon: LineChart },
  { label: 'Library', icon: Library },
  { label: 'Tools', icon: Wrench },
] as const

export function MockGradientSidebar({
  role = 'athlete',
  active = 'Training',
  collapsed = false,
  onRoleChange,
  onToggleCollapse,
  onNav,
}: {
  role?: MockRole
  active?: string
  collapsed?: boolean
  onRoleChange?: (role: MockRole) => void
  onToggleCollapse?: () => void
  onNav?: (label: string) => void
}) {
  const items = (role === 'coach' ? coachNav : athleteNav).map((item) => ({
    ...item,
    active: item.label === active,
  }))

  if (collapsed) {
    return (
      <aside className="tt-mock-grad-sidebar" data-collapsed="true">
        <div className="tt-mock-grad-sidebar-logo">
          <div className="tt-mock-grad-sidebar-logo-mark">
            <TrainTrackMark tone="dark" className="h-6 w-6" />
          </div>
        </div>
        <nav className="tt-mock-grad-nav">
          {items.map((item) => {
            const Icon = item.icon
            const badge = 'badge' in item ? item.badge : undefined
            return (
              <button
                key={item.label}
                type="button"
                className="tt-mock-grad-nav-item"
                data-active={item.active}
                title={item.label}
                onClick={() => onNav?.(item.label)}
              >
                <Icon strokeWidth={1.7} />
                {badge ? <span className="tt-mock-grad-badge-dot" /> : null}
              </button>
            )
          })}
        </nav>
        <div className="tt-mock-grad-footer">
          <button
            type="button"
            className="tt-mock-grad-footer-item"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
          >
            <ChevronRight strokeWidth={1.7} />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="tt-mock-grad-sidebar">
      <div className="tt-mock-grad-sidebar-logo">
        <div className="tt-mock-grad-sidebar-logo-mark">
          <TrainTrackMark tone="dark" className="h-6 w-6" />
        </div>
        <span className="tt-mock-grad-sidebar-logo-text">TRAINTRACK</span>
      </div>

      <div className="tt-mock-grad-mode-switch" aria-label="View mode">
        <button
          type="button"
          data-active={role === 'athlete'}
          onClick={() => onRoleChange?.('athlete')}
        >
          ATHLETE
        </button>
        <button
          type="button"
          data-active={role === 'coach'}
          onClick={() => onRoleChange?.('coach')}
        >
          COACH
        </button>
      </div>

      <nav className="tt-mock-grad-nav">
        {items.map((item) => {
          const Icon = item.icon
          const badge = 'badge' in item ? item.badge : undefined
          return (
            <button
              key={item.label}
              type="button"
              className="tt-mock-grad-nav-item"
              data-active={item.active}
              onClick={() => onNav?.(item.label)}
            >
              <Icon strokeWidth={1.7} />
              <span>{item.label}</span>
              {badge ? <span className="tt-mock-grad-badge">{badge}</span> : null}
            </button>
          )
        })}
      </nav>

      <div className="tt-mock-grad-footer">
        <button
          type="button"
          className="tt-mock-grad-footer-item"
          data-active={active === 'Settings'}
          onClick={() => onNav?.('Settings')}
        >
          <Settings strokeWidth={1.7} />
          <span>Settings</span>
        </button>
        <button
          type="button"
          className="tt-mock-grad-footer-item"
          onClick={() => onNav?.('Help')}
        >
          <CircleHelp strokeWidth={1.7} />
          <span>Help</span>
        </button>

        <div className="tt-mock-grad-profile">
          <div className="tt-mock-grad-profile-avatar">V</div>
          <div className="min-w-0 flex-1">
            <p className="tt-mock-grad-profile-name truncate">Vytautas</p>
            <p className="tt-mock-grad-profile-role capitalize">{role}</p>
          </div>
          <ChevronDown className="tt-mock-grad-profile-chevron h-4 w-4" strokeWidth={1.75} />
        </div>

        <button type="button" className="tt-mock-grad-footer-item">
          <LogOut strokeWidth={1.7} />
          <span>Sign out</span>
        </button>
        <button type="button" className="tt-mock-grad-footer-item" onClick={onToggleCollapse}>
          <ChevronLeft strokeWidth={1.7} />
          <span>Collapse</span>
        </button>
      </div>
    </aside>
  )
}
