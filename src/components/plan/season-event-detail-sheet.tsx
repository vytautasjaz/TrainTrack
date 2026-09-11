'use client'

import { useState, useTransition } from 'react'
import {
  Calendar,
  Clock,
  Lock,
  MapPin,
  Pencil,
  StickyNote,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SeasonEventModal } from '@/components/plan/season-event-modal'
import { deleteSeasonEvent } from '@/app/actions/season-events'
import {
  formatSeasonEventWhenLine,
  type SeasonEventData,
} from '@/lib/season-planner'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SIDEBAR_HERO_STYLE } from '@/lib/sidebar-hero'

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDisplayRange(start: Date, end: Date): string {
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  const startLabel = formatDisplayDate(start)
  if (endKey === startKey) return startLabel
  return `${startLabel} → ${formatDisplayDate(end)}`
}

type StatCellProps = {
  icon: LucideIcon
  label: string
  children: ReactNode
}

function StatCell({ icon: Icon, label, children }: StatCellProps) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 bg-background px-4 py-3.5 sm:px-5">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 text-sm font-semibold leading-snug text-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}

type SeasonEventDetailSheetProps = {
  event: SeasonEventData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When false, only Close is shown (no Edit/Delete). */
  editable?: boolean
  isCoach?: boolean
  onChanged?: () => void
}

export function SeasonEventDetailSheet({
  event,
  open,
  onOpenChange,
  editable = true,
  isCoach = false,
  onChanged,
}: SeasonEventDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  if (!event) return null

  const dateRangeLabel = formatDisplayRange(event.startDate, event.endDate)
  const allDay = event.allDay !== false
  const whenLine = allDay
    ? null
    : formatSeasonEventWhenLine({ ...event, location: null })
  const location = event.location?.trim() || ''
  const notes = event.notes?.trim() || ''
  const isPrivate = Boolean(event.isPrivate)
  const heroImageUrl = event.coverImageUrl?.trim() || null
  const hasHeroImage = Boolean(heroImageUrl)
  const showWhen = Boolean(whenLine)

  return (
    <>
      <Dialog
        open={open && !editOpen}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false)
        }}
      >
        <DialogContent
          className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[44rem] flex-col gap-0 overflow-hidden p-0"
          closeButtonClassName="text-white/85 hover:bg-white/15 hover:text-white"
        >
          <DialogTitle className="sr-only">{event.title}</DialogTitle>
          <DialogDescription className="sr-only">Event details</DialogDescription>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div
              className="relative isolate flex aspect-[3/1] flex-col justify-end overflow-hidden border-b border-white/10 px-5 pb-5 pt-5 sm:px-6 sm:pb-6"
              style={hasHeroImage ? undefined : SIDEBAR_HERO_STYLE}
            >
              {heroImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#151827]/90 via-[#151827]/45 to-[#151827]/20"
                    aria-hidden
                  />
                </>
              ) : null}

              <div className="relative z-[1] flex items-start gap-3 pr-10">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white backdrop-blur-[2px]">
                  <Calendar className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/65">
                    {isPrivate ? (
                      <>
                        <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
                        Private event
                      </>
                    ) : (
                      'Event'
                    )}
                  </p>
                  <p className="truncate text-[17px] font-semibold leading-snug text-white">
                    {event.title.trim() || 'Event'}
                  </p>
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-snug text-white/80">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">{dateRangeLabel}</span>
                    </span>
                    {location ? (
                      <>
                        <span
                          className="hidden h-3 w-px shrink-0 bg-white/25 sm:block"
                          aria-hidden
                        />
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          <span className="truncate">{location}</span>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-border">
              <div
                className={cn(
                  'grid grid-cols-1 gap-px',
                  showWhen ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
                )}
              >
                <StatCell icon={Calendar} label="Dates">
                  {dateRangeLabel}
                </StatCell>
                {showWhen ? (
                  <StatCell icon={Clock} label="When">
                    {whenLine}
                  </StatCell>
                ) : null}
                <StatCell icon={MapPin} label="Location">
                  {location || '—'}
                </StatCell>
              </div>
              {notes ? (
                <div className="mt-px">
                  <StatCell icon={StickyNote} label="Notes">
                    <span className="whitespace-pre-wrap font-medium leading-relaxed">
                      {notes}
                    </span>
                  </StatCell>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            {editable ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="brand"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SeasonEventModal
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
        isCoach={isCoach}
        onSaved={() => {
          setEditOpen(false)
          onChanged?.()
          onOpenChange(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this event?"
        description={`${event.title.trim() || 'Event'} will be removed from your season plan.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => {
          startTransition(async () => {
            const fd = new FormData()
            fd.set('id', event.id)
            await deleteSeasonEvent(fd)
            setDeleteOpen(false)
            onChanged?.()
            onOpenChange(false)
          })
        }}
      />
    </>
  )
}
