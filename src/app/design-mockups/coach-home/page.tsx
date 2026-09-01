import Link from 'next/link'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { CoachAthletesTable } from '../_components/coach-athletes-table'
import { CoachAttentionStack } from '../_components/coach-attention-stack'
import {
  COACH_MOCK_ATHLETES,
} from '../_components/coach-athletes-mock-data'

export default function CoachHomeMockPage() {
  const athletes = COACH_MOCK_ATHLETES
  const activeCount = athletes.filter((a) => a.status === 'Active').length
  const attentionCount = athletes.filter((a) => a.attention > 0).length

  return (
    <MockAppChrome
      title="Coach Home · Athletes"
      status="Review"
      role="coach"
      activeNav="Athletes"
    >
      <div className="mb-6">
        <p className="text-[0.8rem] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft)]">
          Coach home
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--tt-ink)]">
          Athletes
        </h1>
        <p className="mt-1 text-sm text-[var(--tt-ink-soft)]">
          {activeCount} active · {attentionCount} need attention · expand for chat, feedback &amp;
          zones (proposals need athlete permission)
        </p>
        <p className="mt-2">
          <Link
            href="/design-mockups/coach-home-mobile"
            className="text-[12px] font-semibold text-[var(--tt-red)] hover:underline"
          >
            Open mobile mock →
          </Link>
        </p>
      </div>

      <div className="mb-5">
        <CoachAttentionStack />
        <p className="mt-2 text-[11px] text-[var(--tt-ink-faint)]">
          Invite athletes via coaching code in Settings → Integrations
        </p>
      </div>

      <CoachAthletesTable athletes={athletes} />
    </MockAppChrome>
  )
}
