import { SeasonPlanHeader } from '@/components/races/season-planner/season-plan-header'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { SeasonMockContent } from '../_components/season-mock-content'

/**
 * Season Plan mock — production layout & tokens inside mock chrome.
 * Minimal redesign: shell only; planner/tables stay close to `/season`.
 */
export default function SeasonMockPage() {
  return (
    <MockAppChrome title="Season · Desktop" status="Review" role="athlete" activeNav="Season">
      <div className="tt-season-page w-full min-w-0 max-w-[90rem] space-y-8">
        <SeasonPlanHeader />
        <SeasonMockContent />
      </div>
      <p className="mt-8 text-[11px] text-[var(--tt-ink-faint)]">
        Production Season structure · dark timeline + light race tables ·{' '}
        <a href="/season" className="text-[var(--tt-ink-soft)]">
          live /season
        </a>
      </p>
    </MockAppChrome>
  )
}
