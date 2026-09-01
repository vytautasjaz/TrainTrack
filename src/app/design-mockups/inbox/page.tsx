import { MockAppChrome } from '../_components/mock-app-chrome'

const threads = [
  { title: 'Ask · Easy Aerobic', preview: 'Should I push if HR stays low?', unread: true, meta: 'Today' },
  { title: 'Feedback · Long Ride', preview: 'Felt strong on the climbs.', unread: true, meta: 'Yesterday' },
  { title: 'Race · Vilnius HM', preview: 'Taper plan looks good.', unread: false, meta: 'Mon' },
]

export default function InboxMockPage() {
  return (
    <MockAppChrome title="Inbox" status="Draft" role="athlete" activeNav="Inbox">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="tt-mock-eyebrow">Messages</p>
          <h1 className="tt-mock-display mt-1 text-5xl">Inbox</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" className="tt-mock-btn tt-mock-btn-primary">
            Unread
          </button>
          <button type="button" className="tt-mock-btn tt-mock-btn-ghost">
            All
          </button>
        </div>
      </div>

      <div className="tt-mock-card grid min-h-[28rem] overflow-hidden md:grid-cols-[320px_1fr]">
        <div className="divide-y divide-[var(--tt-line)] border-r border-[var(--tt-line)]">
          {threads.map((t, i) => (
            <div
              key={t.title}
              className={`px-4 py-3 ${i === 0 ? 'bg-[var(--tt-red-soft)]' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.unread ? <span className="tt-mock-badge">1</span> : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--tt-ink-soft)]">{t.preview}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--tt-ink-faint)]">
                {t.meta}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col p-5">
          <p className="text-sm font-semibold">Ask · Easy Aerobic</p>
          <div className="mt-4 flex-1 space-y-3">
            <div className="max-w-[80%] rounded-[var(--tt-radius)] bg-[var(--tt-bg)] px-3 py-2 text-sm">
              Should I push if HR stays low?
            </div>
            <div className="ml-auto max-w-[80%] rounded-[var(--tt-radius)] bg-[var(--tt-red)] px-3 py-2 text-sm text-white">
              Stay Z2 — volume matters more this week.
            </div>
          </div>
          <div className="mt-4 flex gap-2 border-t border-[var(--tt-line)] pt-4">
            <input
              className="min-w-0 flex-1 rounded-[var(--tt-radius-sm)] border border-[var(--tt-line)] px-3 py-2 text-sm"
              placeholder="Reply…"
              readOnly
            />
            <button type="button" className="tt-mock-btn tt-mock-btn-primary">
              Send
            </button>
          </div>
        </div>
      </div>
    </MockAppChrome>
  )
}
