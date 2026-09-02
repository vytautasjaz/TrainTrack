import Link from 'next/link'
import { CoachHomeCoachingRequests } from '@/components/coach/coach-home-coaching-requests'
import type { CoachHomeCoachingRequest } from '@/components/coach/coach-home-coaching-requests'
import { CoachHomeEmptyState } from '@/components/coach/coach-home-empty-state'

/** Sample code matching production format (TT-XXXXX). */
export const MOCK_COACHING_CODE = 'TT-83KF9'

export const MOCK_COACHING_REQUESTS: CoachHomeCoachingRequest[] = [
  {
    id: 'mock-request-1',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    athlete: { id: 'mock-athlete-1', name: 'Jordan Lee', avatarUrl: null },
  },
]

type CoachHomeEmptyMockContentProps = {
  showRequests?: boolean
}

export function CoachHomeEmptyMockContent({
  showRequests = false,
}: CoachHomeEmptyMockContentProps) {
  return (
    <div className="tt-dashboard-page -mx-4 px-4 pb-8 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="tt-dashboard-content space-y-8">
        <header className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-normal uppercase leading-none tracking-tight text-[var(--tt-ink)]">
            Home
          </h1>
        </header>

        {showRequests ? (
          <CoachHomeCoachingRequests requests={MOCK_COACHING_REQUESTS} />
        ) : null}

        <CoachHomeEmptyState coachingCode={MOCK_COACHING_CODE} />
      </div>
    </div>
  )
}

export function CoachHomeEmptyMockVariantLinks({
  showRequests,
}: {
  showRequests: boolean
}) {
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--tt-ink-faint)]">
      <span>Preview variant:</span>
      <Link
        href="/design-mockups/coach-home-empty"
        className={
          showRequests
            ? 'font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]'
            : 'font-semibold text-[var(--tt-red)]'
        }
        aria-current={showRequests ? undefined : 'page'}
      >
        Empty only
      </Link>
      <span aria-hidden>·</span>
      <Link
        href="/design-mockups/coach-home-empty?requests=1"
        className={
          showRequests
            ? 'font-semibold text-[var(--tt-red)]'
            : 'font-semibold text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]'
        }
        aria-current={showRequests ? 'page' : undefined}
      >
        With coaching request
      </Link>
    </p>
  )
}
