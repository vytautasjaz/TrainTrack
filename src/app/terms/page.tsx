import Link from 'next/link'
import { TrainTrackLogo } from '@/components/brand/traintrack-logo'

export const metadata = {
  title: 'Terms of Service · TrainTrack',
}

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-10 text-[var(--tt-v2-light-ink,#111315)]">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <TrainTrackLogo className="h-6 w-auto" />
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">
        Terms of Service<span className="tt-title-dot">.</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: October 2026</p>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          By using TrainTrack you agree to these terms. The product is provided
          for personal training and coaching coordination.
        </p>
        <p>
          You are responsible for the accuracy of data you enter and for
          accounts you invite (athletes or coaches). Do not misuse the service,
          attempt unauthorized access, or upload unlawful content.
        </p>
        <p>
          Training advice in the app is informational and not medical advice.
          Consult a professional before starting or changing a program.
        </p>
        <p>
          Contact:{' '}
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
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
      </p>
    </main>
  )
}
