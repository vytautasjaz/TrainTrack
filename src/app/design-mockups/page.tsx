import Link from 'next/link'
import { MOCK_SCREENS, MockBanner } from './_components/mock-ui'

export default function DesignMockupsIndexPage() {
  return (
    <div className="tt-mock min-h-dvh">
      <MockBanner title="Mockup studio" status="Draft" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="tt-mock-eyebrow">Redesign · Mockups first</p>
        <h1 className="tt-mock-display mt-2 text-5xl">Design mockups</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--tt-ink-soft)]">
          Static mock screens for the editorial redesign. Review here before any production UI
          rewrite. Attached Athlete Home comps are the visual north star; Phase 2 widgets are
          labeled on screen.
        </p>

        <ul className="tt-mock-card mt-8 divide-y divide-[var(--tt-line)] overflow-hidden">
          {MOCK_SCREENS.filter((s) => s.href !== '/design-mockups').map((screen) => (
            <li key={screen.href}>
              <Link
                href={screen.href}
                className="flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--tt-ink)] transition hover:bg-[var(--tt-bg)]"
              >
                {screen.label}
                <span className="text-[var(--tt-ink-faint)]">Open →</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-[var(--tt-ink-faint)]">
          Also see <code className="text-[var(--tt-ink-soft)]">docs/REDESIGN-TOKENS.md</code> and
          the mobile/web design briefs.
        </p>
      </div>
    </div>
  )
}
