import Link from 'next/link'
import { requireAdmin } from '@/lib/session'
import { MOCK_SCREENS } from '@/lib/design-mockup-screens'

type ToolLink = {
  href: string
  title: string
  description: string
}

const DESIGN_SYSTEM: ToolLink[] = [
  {
    href: '/style-guide',
    title: 'Style guide',
    description: 'Colors, typography, surfaces, and component patterns.',
  },
  {
    href: '/style-guide/athlete-cards',
    title: 'Athlete cards',
    description: 'Today / prescription card explorations.',
  },
  {
    href: '/style-guide/workout-modal',
    title: 'Workout modal',
    description: 'Workout detail modal layout experiments.',
  },
  {
    href: '/design-preview',
    title: 'Design preview',
    description: 'Component lab samples and poster / table experiments.',
  },
]

const PRODUCT: ToolLink[] = [
  {
    href: '/admin/todos',
    title: 'Product backlog',
    description: 'Ideas and deferred work from docs/TODO.md.',
  },
]

function ToolList({ items }: { items: ToolLink[] }) {
  return (
    <ul className="divide-y divide-[var(--tt-line,#ebebeb)] overflow-hidden rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-start justify-between gap-4 px-4 py-3.5 transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--tt-ink,#111)]">{item.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
                {item.description}
              </p>
              <p className="mt-1 font-mono text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                {item.href}
              </p>
            </div>
            <span className="shrink-0 text-[12px] font-medium text-[var(--tt-ink-faint,#9a9a9a)]">
              Open →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminToolsPage() {
  await requireAdmin()

  const mockups = MOCK_SCREENS.filter((screen) => screen.href !== '/design-mockups').map(
    (screen) => ({
      href: screen.href,
      title: screen.label,
      description: 'Static redesign mock screen.',
    }),
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Internal tools</h1>
        <p className="mt-1 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          Product backlog, style guide, and design mockups — for admins and design review.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
          Product
        </h2>
        <ToolList items={PRODUCT} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
          Design system
        </h2>
        <ToolList items={DESIGN_SYSTEM} />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
            Design mockups
          </h2>
          <Link
            href="/design-mockups"
            className="text-[12px] font-semibold text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]"
          >
            Index →
          </Link>
        </div>
        <ToolList items={mockups} />
      </section>
    </div>
  )
}
