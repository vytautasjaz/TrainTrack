import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { CoachInviteLinkPanel } from '@/components/coach/coach-invite-link-panel'

type CoachHomeEmptyStateProps = {
  coachingCode: string | null
}

export function CoachHomeEmptyState({ coachingCode }: CoachHomeEmptyStateProps) {
  return (
    <section className="tt-surface-card mx-auto max-w-xl px-6 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tt-red)_10%,white)] text-[var(--tt-red)]">
          <UserPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-[1.75rem] font-normal uppercase leading-tight tracking-tight text-[var(--tt-ink)]">
          Invite your first athlete
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
          Share your personal invite link or coaching code. After they register, they&apos;ll be
          asked to accept you as their coach.
        </p>
      </div>

      {coachingCode ? (
        <div className="mx-auto mt-8 max-w-md">
          <CoachInviteLinkPanel coachingCode={coachingCode} compact />
        </div>
      ) : (
        <p className="mx-auto mt-8 max-w-md text-center text-[13px] text-[var(--tt-ink-faint)]">
          Your coaching code is being set up. Check Settings → Integrations in a moment.
        </p>
      )}

      <p className="mx-auto mt-8 max-w-md text-center text-[12px] text-[var(--tt-ink-faint)]">
        Prefer to set them up yourself?{' '}
        <Link
          href="/athletes"
          className="font-semibold text-[var(--tt-ink-soft)] underline-offset-2 hover:text-[var(--tt-ink)] hover:underline"
        >
          Add an athlete manually
        </Link>
        {' '}— then send them a personal link to take over the profile.
      </p>
    </section>
  )
}
