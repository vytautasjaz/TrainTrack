'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type AthleteOption = {
  id: string
  name: string
  avatarUrl: string | null
}

type InboxComposeGeneralChatButtonProps = {
  athletes: AthleteOption[]
  onSelectAthlete: (athleteId: string) => void
  className?: string
}

/** Light “+” control — pick an athlete and open their general chat. */
export function InboxComposeGeneralChatButton({
  athletes,
  onSelectAthlete,
  className,
}: InboxComposeGeneralChatButtonProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () => [...athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [athletes],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((a) => a.name.toLowerCase().includes(q))
  }, [sorted, query])

  function pick(athleteId: string) {
    onSelectAthlete(athleteId)
    setOpen(false)
    setQuery('')
  }

  if (athletes.length === 0) return null

  return (
    <>
      <button
        type="button"
        className={cn('tt-inbox-compose-btn', className)}
        aria-label="New message"
        title="New message"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b border-[var(--tt-line,#ebebeb)] px-4 py-3.5 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">
              New message
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
              Open general chat with an athlete.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-[var(--tt-line,#ebebeb)] px-3 py-2.5">
            <label className="relative block">
              <span className="sr-only">Search athletes</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tt-ink-faint,#9a9a9a)]"
                strokeWidth={2}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search athletes"
                className="h-10 w-full rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] pl-9 pr-3 text-sm text-[var(--tt-ink,#111)] outline-none transition placeholder:text-[var(--tt-ink-faint,#9a9a9a)] focus:border-[var(--tt-ink-soft,#6b6b6b)] focus:bg-[var(--tt-surface,#fff)]"
                autoFocus
              />
            </label>
          </div>

          <ul className="max-h-[min(22rem,55dvh)] overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
                No athletes match.
              </li>
            ) : (
              filtered.map((athlete) => (
                <li key={athlete.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--tt-sidebar,#f5f5f5)]"
                    onClick={() => pick(athlete.id)}
                  >
                    <AthleteAvatar
                      name={athlete.name}
                      avatarUrl={athlete.avatarUrl}
                      size="sm"
                      className="!h-9 !w-9 shrink-0 !text-[11px]"
                    />
                    <span className="min-w-0 truncate text-sm font-medium text-[var(--tt-ink,#111)]">
                      {athlete.name}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
