'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { PageHeaderDescription, PageHeaderTitle } from '@/components/ui/page-header'
import {
  type SettingsNavItem,
  type SettingsSectionId,
  parseSettingsSection,
  settingsSectionHref,
} from '@/lib/settings-nav'
import { cn } from '@/lib/utils'

type SettingsShellProps = {
  nav: SettingsNavItem[]
  isCoachView: boolean
  sections: Partial<Record<SettingsSectionId, ReactNode>>
}

export function SettingsShell({ nav, isCoachView, sections }: SettingsShellProps) {
  const [section, setSection] = useState<SettingsSectionId>(() =>
    typeof window !== 'undefined'
      ? parseSettingsSection(window.location.hash, nav)
      : (nav[0]?.id ?? 'profile'),
  )

  const syncFromHash = useCallback(() => {
    setSection(parseSettingsSection(window.location.hash, nav))
  }, [nav])

  useEffect(() => {
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [syncFromHash])

  useEffect(() => {
    if (!nav.some((item) => item.id === section)) {
      setSection(nav[0]?.id ?? 'profile')
    }
  }, [nav, section])

  function selectSection(next: SettingsSectionId) {
    setSection(next)
    const href = settingsSectionHref(next)
    window.history.replaceState(null, '', href)
  }

  return (
    <div className="tt-settings-page w-full min-w-0 max-w-[90rem] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div className="space-y-2">
          <PageHeaderTitle>Settings.</PageHeaderTitle>
          <PageHeaderDescription className="max-w-lg text-[13px] leading-relaxed">
            {isCoachView
              ? 'Your coach account — planning defaults and builder prefs. Athlete zones stay under Athletes.'
              : 'Profile, zones, and integrations — sectioned so long forms stay scannable.'}
          </PageHeaderDescription>
        </div>
      </header>

      {isCoachView ? (
        <div className="rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)]/60 px-3.5 py-3 text-[13px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]">
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

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto lg:sticky lg:top-4 lg:w-[11.5rem] lg:flex-col lg:overflow-visible"
        >
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSection(item.id)}
              className={cn(
                'shrink-0 rounded-[6px] px-3 py-2 text-left text-[13px] font-medium transition',
                section === item.id
                  ? 'bg-[var(--tt-ink,#111)] text-white'
                  : 'text-[var(--tt-ink-soft,#6b6b6b)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)]',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="tt-settings-content min-w-0 max-w-[42rem] flex-1">{sections[section] ?? null}</div>
      </div>
    </div>
  )
}
