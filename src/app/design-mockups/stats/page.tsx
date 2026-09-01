import { MockAppChrome } from '../_components/mock-app-chrome'
import { StatsMockContent } from '../_components/stats-mock-content'

/**
 * Stats mock — trends + Results (PBs / race table) on one page.
 */
export default function StatsMockPage() {
  return (
    <MockAppChrome title="Stats · Desktop" status="Review" role="athlete" activeNav="Stats">
      <div className="w-full min-w-0 max-w-[90rem]">
        <StatsMockContent />
      </div>
      <p className="mt-8 text-[11px] text-[var(--tt-ink-faint)]">
        Unified Stats · Trends 2/3 + PBs · Race results ·{' '}
        <a href="/results" className="text-[var(--tt-ink-soft)]">
          live /results
        </a>
      </p>
    </MockAppChrome>
  )
}
