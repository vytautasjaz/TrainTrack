import Link from 'next/link'
import { getMyAiQuota } from '@/app/actions/ai-plans'
import { AiPaywallBanner } from '@/components/ai/ai-paywall-banner'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'

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
    <SettingsPanel id="ai-coaching" title="AI coaching">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasMembership ? (
          <p className="text-sm text-[var(--tt-ink,#111)]">
            <span className="font-medium">{quota.membership!.plan.name}</span>
            <span className="text-[var(--tt-ink-soft,#6b6b6b)]">
              {' '}
              · {quota.draftsRemaining}/{quota.draftsLimit} drafts ·{' '}
              {quota.adaptsRemaining}/{quota.adaptsLimit} adapts
            </span>
          </p>
        ) : (
          <p className="text-sm text-[var(--tt-ink-soft,#6b6b6b)]">No AI plan yet.</p>
        )}
        <Link
          href={href}
          className="shrink-0 text-xs font-medium text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
        >
          Open wizard
        </Link>
      </div>

      {!hasMembership ? <div className="mt-3"><AiPaywallBanner reason="no_membership" /></div> : null}

      {hasMembership &&
      (quota.draftsRemaining <= 0 || quota.adaptsRemaining <= 0) ? (
        <div className="mt-3">
          <AiPaywallBanner
            reason="quota_exhausted"
            planName={quota.membership!.plan.name}
          />
        </div>
      ) : null}
    </SettingsPanel>
  )
}
