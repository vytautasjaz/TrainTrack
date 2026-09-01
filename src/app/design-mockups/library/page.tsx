import Link from 'next/link'
import { MockAppChrome } from '../_components/mock-app-chrome'
import { LibraryMockContent } from '../_components/library-mock-content'

/**
 * Coach Library — sport hubs + template grid + preview (brief §7.14 A/C).
 */
export default function LibraryMockPage() {
  return (
    <MockAppChrome
      title="Library · Desktop"
      status="Draft"
      role="coach"
      activeNav="Library"
      switchHomesOnRole={false}
    >
      <div className="w-full min-w-0 max-w-[90rem]">
        <LibraryMockContent />
      </div>
      <p className="mt-8 text-[11px] text-[var(--tt-ink-faint)]">
        Standalone library · Schedule primary · docked panel on{' '}
        <a href="/design-mockups/training-week" className="text-[var(--tt-ink-soft)]">
          Training Week
        </a>
        {' · '}
        <Link href="/workouts" className="text-[var(--tt-ink-soft)]">
          live /workouts
        </Link>
      </p>
    </MockAppChrome>
  )
}
