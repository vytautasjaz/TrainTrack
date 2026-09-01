'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MockBanner, type MockRole, type MockStatus } from './mock-ui'
import { MockGradientSidebar } from './mock-gradient-sidebar'

const ROLE_HOME = {
  athlete: '/design-mockups/athlete-home',
  coach: '/design-mockups/coach-home',
} as const

/** Shared chrome for desktop mocks — gradient sidebar + role switch. */
export function MockAppChrome({
  title,
  status = 'Review',
  role,
  activeNav,
  children,
  switchHomesOnRole = true,
  onRoleChange,
}: {
  title: string
  status?: MockStatus
  role: MockRole
  activeNav: string
  children: ReactNode
  /** When true, Athlete/Coach toggle navigates between home mocks. */
  switchHomesOnRole?: boolean
  /** Optional controlled role change (e.g. Settings stays on-page). */
  onRoleChange?: (role: MockRole) => void
}) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  function handleRoleChange(next: MockRole) {
    if (next === role) return
    onRoleChange?.(next)
    if (switchHomesOnRole) {
      router.push(ROLE_HOME[next])
    }
  }

  return (
    <div className="tt-mock min-h-dvh">
      <MockBanner title={title} status={status} />
      <div className="tt-mock-grad-shell">
        <MockGradientSidebar
          role={role}
          collapsed={collapsed}
          active={activeNav}
          onRoleChange={handleRoleChange}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <main className="tt-mock-grad-main">{children}</main>
      </div>
    </div>
  )
}
