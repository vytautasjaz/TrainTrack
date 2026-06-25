import type { ReactNode } from 'react'
import type { UserRole } from '../../types/role'
import { USER_ROLES } from '../../types/role'
import { BottomNav, type AppTab } from './BottomNav'

export type { AppTab }

type AppShellProps = {
  children: ReactNode
  activeTab: AppTab
  role: UserRole
  showAddButton: boolean
  addButtonLabel: string
  onTabChange: (tab: AppTab) => void
  onAdd: () => void
}

const TAB_TITLES: Record<AppTab, string> = {
  summary: 'Home',
  calendar: 'Calendar',
  settings: 'Settings',
}

export function AppShell({
  children,
  activeTab,
  role,
  showAddButton,
  addButtonLabel,
  onTabChange,
  onAdd,
}: AppShellProps) {
  const roleLabel = USER_ROLES.find((item) => item.value === role)?.label ?? role

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-brand">
      <header className="px-5 pb-2 pt-5 supports-[padding:max(0px)]:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-white/60">TrainTrack</p>
          <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-medium text-white/90">
            {roleLabel}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-white">{TAB_TITLES[activeTab]}</h1>
      </header>

      <main className="flex-1 overflow-y-auto rounded-t-2xl bg-white px-4 pb-28 pt-5">
        {children}
      </main>

      <BottomNav
        activeTab={activeTab}
        showAddButton={showAddButton}
        addButtonLabel={addButtonLabel}
        onTabChange={onTabChange}
        onAdd={onAdd}
      />
    </div>
  )
}
