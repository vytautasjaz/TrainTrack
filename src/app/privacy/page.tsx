import Link from 'next/link'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'

export const metadata = {
  title: 'Privacy Policy · TrainTrack',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-10 text-[var(--tt-v2-light-ink,#111315)]">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <TrainTrackLogo className="h-6 w-auto" />
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">
        Privacy Policy<span className="tt-title-dot">.</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: October 2026</p>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          TrainTrack (“we”) processes personal data to provide coaching and
          training tools. We act as controller for account data you create in
          the product.
        </p>
        <p>
          We store account details, training plans, workouts, race results, and
          related preferences. Integrations you connect (for example Strava) may
          share activity data with us under their terms.
        </p>
        <p>
          We use essential cookies for sign-in and app function. Optional
          analytics or marketing cookies, if added later, will require consent.
        </p>
        <p>
          Questions or GDPR requests:{' '}
          <a
            className="font-medium text-foreground underline underline-offset-2"
            href="mailto:support@traintrack.app"
          >
            support@traintrack.app
          </a>
          .
        </p>
      </div>
      <p className="mt-10 text-sm">
        <Link href="/terms" className="underline underline-offset-2">
          Terms of Service
        </Link>
      </p>
    </main>
  )
}
