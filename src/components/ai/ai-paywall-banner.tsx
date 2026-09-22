import Link from 'next/link'
import { cn } from '@/lib/utils'

type AiPaywallBannerProps = {
  reason: 'no_membership' | 'quota_exhausted' | 'skill_locked' | string
  planName?: string | null
  className?: string
}

export function AiPaywallBanner({
  reason,
  planName,
  className,
}: AiPaywallBannerProps) {
  const title =
    reason === 'quota_exhausted'
      ? 'AI quota used up for this period'
      : reason === 'skill_locked'
        ? 'This skill is not on your plan'
        : 'AI membership required'

  const body =
    reason === 'quota_exhausted'
      ? `You’ve used all AI credits on ${planName ?? 'your plan'} for this billing period. Ask an admin to extend access or wait for the next period.`
      : reason === 'skill_locked'
        ? 'Your current membership does not include this skill. Ask an admin to unlock it on your plan.'
        : 'Upgrade to Coach AI or Athlete AI to draft and adapt training plans from athlete history. Admins can grant beta memberships.'

  return (
    <div
      className={cn(
        'rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-[var(--tt-sidebar,#f5f5f5)] px-4 py-3',
        className,
      )}
    >
      <p className="text-sm font-semibold text-[var(--tt-ink,#111)]">{title}</p>
      <p className="mt-1 text-[13px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
        {body}
      </p>
      <p className="mt-2 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
        Stripe checkout comes later — for now, contact an admin or visit{' '}
        <Link
          href="/settings"
          className="font-medium underline-offset-2 hover:underline"
        >
          Settings
        </Link>{' '}
        to see your usage.
      </p>
    </div>
  )
}
