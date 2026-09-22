import Link from 'next/link'
import { getMyAiQuota } from '@/app/actions/ai-plans'
import { AiPaywallBanner } from '@/components/ai/ai-paywall-banner'

export async function AiMembershipUsageCard({
  audience,
}: {
  audience: 'coach' | 'athlete'
}) {
  const quota = await getMyAiQuota()
  const href =
    audience === 'coach' ? '/workouts/plans/ai' : '/training/ai-plan'
  const hasMembership = Boolean(quota.membership)

  return (
    <div className="space-y-3 rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--tt-ink,#111)]">
            AI coaching
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
            Draft and adapt training plans from athlete history.
          </p>
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs font-medium text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
        >
          Open AI wizard
        </Link>
      </div>

      {hasMembership ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
              Plan
            </dt>
            <dd className="font-medium">{quota.membership!.plan.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
              Drafts left
            </dt>
            <dd className="tabular-nums">
              {quota.draftsRemaining}/{quota.draftsLimit}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
              Adapts left
            </dt>
            <dd className="tabular-nums">
              {quota.adaptsRemaining}/{quota.adaptsLimit}
            </dd>
          </div>
        </dl>
      ) : (
        <AiPaywallBanner reason="no_membership" />
      )}

      {hasMembership &&
      (quota.draftsRemaining <= 0 || quota.adaptsRemaining <= 0) ? (
        <AiPaywallBanner
          reason="quota_exhausted"
          planName={quota.membership!.plan.name}
        />
      ) : null}
    </div>
  )
}
