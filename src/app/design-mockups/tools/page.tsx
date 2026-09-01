import { Suspense } from 'react'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { ToolsMockTabBar } from '../_components/tools-mock-tab-bar'
import { CalculatorsView } from '@/components/calculators/calculators-view'
import { buildCalculatorDefaults } from '@/lib/calculators/prefill'

/**
 * Tools · Calculators mock — production calculator UI as-is inside mock chrome.
 * Only shell/context changes (tab strip for mock nav); calculator layouts untouched.
 */
export default function ToolsMockPage() {
  const defaults = buildCalculatorDefaults({
    paceTempoMinPerKm: 4 + 50 / 60, // ~4:50 Z3
  })

  return (
    <MockAppChrome
      title="Tools · Calculators"
      status="Review"
      role="athlete"
      activeNav="Tools"
      switchHomesOnRole={false}
    >
      <div className="w-full min-w-0 max-w-3xl space-y-5">
        <p className="pt-1 text-[12px] leading-relaxed text-[var(--tt-ink-soft)]">
          Production calculators in the redesign shell — calc UI unchanged. Use tabs below (live
          app uses Tools subnav).
        </p>

        <Suspense fallback={null}>
          <ToolsMockTabBar />
        </Suspense>

        <Suspense
          fallback={
            <p className="text-[13px] text-[var(--tt-ink-faint)]">Loading calculators…</p>
          }
        >
          <CalculatorsView defaults={defaults} />
        </Suspense>
      </div>
      <p className="mt-8 text-[11px] text-[var(--tt-ink-faint)]">
        Same components as{' '}
        <a href="/tools" className="text-[var(--tt-ink-soft)]">
          live /tools
        </a>
        . Prefill uses mock athlete Z3 pace.
      </p>
    </MockAppChrome>
  )
}
