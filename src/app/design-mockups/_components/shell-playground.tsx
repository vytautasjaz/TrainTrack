'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MockGradientSidebar } from './mock-gradient-sidebar'
import { MockBanner, type MockRole } from './mock-ui'

function CoachContextBar() {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--tt-line)] bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tt-sidebar)] text-xs font-bold">
          IK
        </div>
        <div className="min-w-0">
          <p className="tt-mock-overline" style={{ color: 'var(--tt-ink-faint)' }}>
            Selected athlete
          </p>
          <button
            type="button"
            className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-[var(--tt-ink)]"
          >
            Ieva Kazlauskaitė
            <ChevronDown className="h-3.5 w-3.5 text-[var(--tt-ink-faint)]" />
          </button>
        </div>
        <span className="rounded bg-[var(--tt-good-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-good)]">
          Active
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--tt-ink-soft)]">
        <span className="rounded border border-[var(--tt-line)] px-2 py-1">
          Next race · 23d
        </span>
        <span className="rounded border border-[var(--tt-line)] px-2 py-1 text-[var(--tt-red)]">
          2 planning warnings
        </span>
      </div>
    </div>
  )
}

function NavDiffTable() {
  return (
    <div className="tt-mock-card overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-[var(--tt-line)] border-b border-[var(--tt-line)] bg-[var(--tt-sidebar)]">
        <p className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint)]">
          Athlete nav
        </p>
        <p className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint)]">
          Coach nav
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--tt-line)] text-sm">
        <ul className="space-y-1.5 p-4 text-[var(--tt-ink-soft)]">
          <li>Logo → Home</li>
          <li>Training</li>
          <li>Inbox (badge)</li>
          <li>Season</li>
          <li>Stats</li>
          <li>Tools</li>
          <li className="text-[var(--tt-ink-faint)]">— no Library</li>
        </ul>
        <ul className="space-y-1.5 p-4 text-[var(--tt-ink-soft)]">
          <li>Athletes (Home)</li>
          <li>Training</li>
          <li>Inbox (badge)</li>
          <li>Season</li>
          <li>Stats</li>
          <li>Library</li>
          <li>Tools</li>
        </ul>
      </div>
    </div>
  )
}

export function ShellPlayground() {
  const [role, setRole] = useState<MockRole>('athlete')
  const [collapsed, setCollapsed] = useState(false)
  const [active, setActive] = useState('Training')

  function handleRoleChange(next: MockRole) {
    setRole(next)
    setActive(next === 'coach' ? 'Athletes' : 'Training')
  }

  return (
    <div className="tt-mock min-h-dvh">
      <MockBanner title="App Shell · Interactive" status="Review" />
      <div className="tt-mock-grad-shell">
        <MockGradientSidebar
          role={role}
          collapsed={collapsed}
          active={active}
          onRoleChange={handleRoleChange}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onNav={setActive}
        />
        <main className="tt-mock-grad-main">
          <div className="mb-5">
            <p className="text-[0.8rem] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft)]">
              Shell playground
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--tt-ink)]">
              {role === 'coach' ? 'Coach workspace' : 'Athlete workspace'}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[var(--tt-ink-soft)]">
              Role switch under the logo; collapse at the bottom of the rail. On Home mocks, the
              toggle switches between Athlete and Coach home. Notification bell is mobile-only.
            </p>
          </div>

          {role === 'coach' ? <CoachContextBar /> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="tt-mock-card p-5">
              <p className="tt-mock-overline">Active destination</p>
              <p className="mt-2 text-xl font-semibold">{active}</p>
              <p className="tt-mock-caption mt-2">
                Role · {role} · Sidebar · {collapsed ? 'collapsed' : 'expanded'}
              </p>
              <div className="mt-4 rounded-md bg-[var(--tt-sidebar)] px-3 py-3 text-[12px] leading-relaxed text-[var(--tt-ink-soft)]">
                Main workspace placeholder. Training week, Season, and Library grids use near-full
                width; settings stay readable-width.
              </div>
            </div>
            <NavDiffTable />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: 'Role switch',
                body: 'Compact pill under the logo. On homes, it navigates Athlete ↔ Coach home.',
              },
              {
                title: 'Collapse',
                body: 'Chevron at the footer — animates width. Labels and wordmark leave the flow.',
              },
              {
                title: 'Coach bar',
                body: 'Athlete picker, status, next race, and planning warnings above the workspace.',
              },
            ].map((card) => (
              <div key={card.title} className="tt-mock-card p-4">
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="tt-mock-caption mt-1.5">{card.body}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
