import type { ReactNode } from 'react'

export type AppTab = 'summary' | 'calendar' | 'settings'

type BottomNavProps = {
  activeTab: AppTab
  showAddButton: boolean
  addButtonLabel: string
  onTabChange: (tab: AppTab) => void
  onAdd: () => void
}

function NavIcon({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center transition-colors ${
        active ? 'text-brand' : 'text-muted'
      }`}
    >
      {children}
    </div>
  )
}

export function BottomNav({
  activeTab,
  showAddButton,
  addButtonLabel,
  onTabChange,
  onAdd,
}: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-gray-100 bg-white supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-4 py-2">
        <button
          type="button"
          onClick={() => onTabChange('summary')}
          className="flex flex-col items-center gap-0.5"
          aria-label="Home"
          aria-current={activeTab === 'summary' ? 'page' : undefined}
        >
          <NavIcon active={activeTab === 'summary'}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </NavIcon>
        </button>

        {showAddButton ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addButtonLabel}
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl font-light text-white"
          >
            +
          </button>
        ) : (
          <div className="h-12 w-12" aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={() => onTabChange('calendar')}
          className="flex flex-col items-center gap-0.5"
          aria-label="Calendar"
          aria-current={activeTab === 'calendar' ? 'page' : undefined}
        >
          <NavIcon active={activeTab === 'calendar'}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
            </svg>
          </NavIcon>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className="flex flex-col items-center gap-0.5"
          aria-label="Settings"
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <NavIcon active={activeTab === 'settings'}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692a.722.722 0 01-.153-.43 7.598 7.598 0 000-1.139c.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
          </NavIcon>
        </button>
      </div>
    </nav>
  )
}
