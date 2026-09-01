'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CALCULATOR_NAV_TABS } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

/** Compact tab strip — production Tools subnav lives in app chrome; mock needs it in-page. */
export function ToolsMockTabBar() {
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'running'

  return (
    <div
      role="tablist"
      aria-label="Calculators"
      className="flex flex-wrap gap-1 border-b border-[var(--tt-line)] pb-px"
    >
      {CALCULATOR_NAV_TABS.map((tab) => {
        const selected = active === tab.id
        const short = tab.label.replace(' Calculator', '')
        return (
          <Link
            key={tab.id}
            href={`/design-mockups/tools?tab=${tab.id}`}
            role="tab"
            aria-selected={selected}
            className={cn(
              'relative px-3 py-2 text-[13px] font-medium transition',
              selected
                ? 'text-[var(--tt-ink)]'
                : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink-soft)]',
            )}
          >
            {short}
            {selected ? (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--tt-red)]"
                aria-hidden
              />
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
