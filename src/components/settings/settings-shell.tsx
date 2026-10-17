'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeaderDescription, PageHeaderTitle } from '@/components/ui/page-header'
import {
  parseSettingsSection,
  resolveSettingsSection,
  settingsHubHref,
  settingsSectionHref,
  type SettingsNavItem,
  type SettingsSectionId,
} from '@/lib/settings-nav'
import { cn } from '@/lib/utils'

type SettingsShellProps = {
  nav: SettingsNavItem[]
  isCoachView: boolean
  sections: Partial<Record<SettingsSectionId, ReactNode>>
}

export function SettingsShell({ nav, isCoachView, sections }: SettingsShellProps) {
  const [hashSection, setHashSection] = useState<SettingsSectionId | null>(() =>
    typeof window !== 'undefined' ? parseSettingsSection(window.location.hash, nav) : null,
  )

  const syncFromHash = useCallback(() => {
    setHashSection(parseSettingsSection(window.location.hash, nav))
  }, [nav])

  useEffect(() => {
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    window.addEventListener('popstate', syncFromHash)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [syncFromHash])

  // Desktop always shows a concrete section; mobile uses hub when hash is empty.
  const desktopSection = resolveSettingsSection(
    hashSection ? `#${hashSection}` : '',
    nav,
  )
  // When hash is set, use it; when empty on desktop we still resolve to first item
  // via desktopSection. Mobile hub when hashSection === null.
  const activeSection = hashSection ?? desktopSection
  const activeItem = nav.find((item) => item.id === activeSection) ?? nav[0]
  const showMobileHub = hashSection === null

  function openSection(next: SettingsSectionId) {
    setHashSection(next)
    window.history.pushState(null, '', settingsSectionHref(next))
  }

  function backToHub() {
    setHashSection(null)
    window.history.pushState(null, '', settingsHubHref())
  }

  function selectDesktopSection(next: SettingsSectionId) {
    setHashSection(next)
    window.history.replaceState(null, '', settingsSectionHref(next))
  }

  return (
    <div className="tt-settings-page w-full min-w-0 max-w-[90rem] space-y-5 sm:space-y-6">
      <header className="space-y-1.5 pt-1 sm:space-y-2">
        {showMobileHub || !activeItem ? (
          <>
            <PageHeaderTitle>Settings.</PageHeaderTitle>
            <PageHeaderDescription className="max-w-lg text-[13px] leading-relaxed">
              {isCoachView ? 'Coach account preferences.' : 'Account and training preferences.'}
            </PageHeaderDescription>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={backToHub}
              className="tt-settings-back lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Settings
            </button>
            <PageHeaderTitle className="hidden lg:block">Settings.</PageHeaderTitle>
            <h2 className="tt-settings-mobile-title lg:hidden">{activeItem.label}</h2>
            <PageHeaderDescription className="hidden max-w-lg text-[13px] leading-relaxed lg:block">
              {isCoachView ? 'Coach account preferences.' : 'Account and training preferences.'}
            </PageHeaderDescription>
          </>
        )}
      </header>

      {isCoachView ? (
        <div
          className={cn(
            'rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)]/60 px-3.5 py-3 text-[13px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]',
            !showMobileHub && 'hidden lg:block',
          )}
        >
          Athlete training zones and personal prefs are not edited here. Open an athlete under{' '}
          <Link
            href="/athletes"
            className="font-semibold text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
          >
            Athletes
          </Link>{' '}
          to propose pace/zone adjustments (requires their permission — they get a notification).
        </div>
      ) : null}

      {/* Mobile hub — full list (iOS / Android settings pattern) */}
      <nav
        aria-label="Settings sections"
        className={cn('tt-settings-hub lg:hidden', !showMobileHub && 'hidden')}
      >
        <ul className="tt-settings-hub-list">
          {nav.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="tt-settings-hub-row"
                onClick={() => openSection(item.id)}
              >
                <span className="min-w-0 flex-1 text-left">
                  <span className="tt-settings-hub-label">{item.label}</span>
                  {item.description ? (
                    <span className="tt-settings-hub-desc">{item.description}</span>
                  ) : null}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)]"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop sidebar + content / mobile detail */}
      <div
        className={cn(
          'flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8',
          showMobileHub && 'hidden lg:flex',
        )}
      >
        <nav aria-label="Settings sections" className="tt-settings-nav hidden lg:block">
          <div className="tt-settings-nav-track">
            {nav.map((item) => {
              const active = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => selectDesktopSection(item.id)}
                  className={cn(
                    'tt-settings-nav-item',
                    active && 'tt-settings-nav-item--active',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="tt-settings-content min-w-0 max-w-[42rem] flex-1">
          {sections[activeSection] ?? null}
        </div>
      </div>
    </div>
  )
}
