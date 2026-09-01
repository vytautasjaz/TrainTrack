'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Coach replied',
    body: "Keep today's run conversational — Z2 only.",
    meta: '2m ago',
    unread: true,
  },
  {
    id: '2',
    title: 'Workout completed',
    body: 'Easy Aerobic · 10.2 km synced from Strava.',
    meta: '1h ago',
    unread: true,
  },
  {
    id: '3',
    title: 'Race reminder',
    body: 'Vilnius Half Marathon in 23 days.',
    meta: 'Yesterday',
    unread: true,
  },
  {
    id: '4',
    title: 'Plan updated',
    body: 'Saturday Long Ride adjusted to 80 km.',
    meta: '2d ago',
    unread: false,
  },
]

export function MockNotificationsBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const unread = NOTIFICATIONS.filter((n) => n.unread).length

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative rounded-full p-1.5 text-[var(--tt-ink-soft)] hover:bg-[var(--tt-sidebar)] hover:text-[var(--tt-ink)]"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--tt-red)] ring-2 ring-white" />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[10px] border border-[var(--tt-line)] bg-white shadow-[0_8px_28px_rgb(0_0_0/0.12)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--tt-line)] px-3.5 py-2.5">
            <p className="tt-mock-overline">Notifications</p>
            <p className="text-[10px] text-[var(--tt-ink-faint)]">{unread} unread</p>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {NOTIFICATIONS.map((n) => (
              <li
                key={n.id}
                className={`border-b border-[var(--tt-line)] px-3.5 py-2.5 last:border-b-0 ${
                  n.unread ? 'bg-[var(--tt-sidebar)]' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  {n.unread ? (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tt-red)]" />
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[var(--tt-ink)]">{n.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--tt-ink-soft)]">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--tt-ink-faint)]">{n.meta}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--tt-line)] px-3.5 py-2">
            <button
              type="button"
              className="tt-mock-link w-full text-center"
              onClick={() => setOpen(false)}
            >
              Open inbox →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
