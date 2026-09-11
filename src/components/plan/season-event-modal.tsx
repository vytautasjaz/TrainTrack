/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  Calendar,
  ChevronDown,
  History,
  ImagePlus,
  Lock,
  MapPin,
  Trash2,
} from 'lucide-react'
import {
  createSeasonEvent,
  listCoachRecentSeasonEvents,
  updateSeasonEvent,
  type CoachRecentSeasonEvent,
} from '@/app/actions/season-events'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type SeasonEventData,
} from '@/lib/season-planner'
import { parseDateOnly, toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PrivateNoteToggle } from '@/components/ui/private-note-toggle'
import { DateField } from '@/components/ui/date-field'
import { RaceCoverCropDialog } from '@/components/races/race-cover-crop-dialog'
import { SIDEBAR_HERO_STYLE } from '@/lib/sidebar-hero'

function dateInputValue(d: Date): string {
  return toDateKey(d)
}

function todayLocalKey(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatEventRange(startKey: string, endKey: string): string {
  if (!startKey) return '—'
  if (!endKey || endKey === startKey) return startKey
  return `${startKey} → ${endKey}`
}

function formatDisplayDate(key: string): string {
  if (!key) return '—'
  try {
    return parseDateOnly(key).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return key
  }
}

function formatDisplayRange(startKey: string, endKey: string): string {
  const start = formatDisplayDate(startKey)
  if (!startKey) return 'Add dates'
  if (!endKey || endKey === startKey) return start
  return `${start} → ${formatDisplayDate(endKey)}`
}

type SeasonEventModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit existing event when set. */
  event?: SeasonEventData | null
  /** Defaults for create (YYYY-MM-DD). */
  defaultStartDate?: string
  defaultEndDate?: string
  /** Coach view: events they create stay visible; no private toggle. */
  isCoach?: boolean
  /** Called after a successful create/update (before close). */
  onSaved?: () => void
}

export function SeasonEventModal({
  open,
  onOpenChange,
  event = null,
  defaultStartDate,
  defaultEndDate,
  isCoach = false,
  onSaved,
}: SeasonEventModalProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const editing = event
  const fallbackToday = useMemo(() => todayLocalKey(), [])
  const createStart = defaultStartDate ?? fallbackToday
  const createEnd = defaultEndDate ?? defaultStartDate ?? fallbackToday

  const [title, setTitle] = useState(editing?.title ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [startKey, setStartKey] = useState(
    editing ? dateInputValue(editing.startDate) : createStart,
  )
  const [endKey, setEndKey] = useState(
    editing ? dateInputValue(editing.endDate) : createEnd,
  )
  const [isPrivate, setIsPrivate] = useState(
    editing ? Boolean(editing.isPrivate) : !isCoach,
  )
  const [allDay, setAllDay] = useState(editing ? editing.allDay !== false : false)
  const [startTime, setStartTime] = useState(editing?.startTime?.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(editing?.endTime?.slice(0, 5) ?? '')
  const [location, setLocation] = useState(editing?.location ?? '')
  const [recentEvents, setRecentEvents] = useState<CoachRecentSeasonEvent[]>([])
  const [recentLoaded, setRecentLoaded] = useState(false)
  const [reuseOpen, setReuseOpen] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const pickInputRef = useRef<HTMLInputElement>(null)
  const savedCoverUrl = editing?.coverImageUrl ?? null
  const [clearCover, setClearCover] = useState(false)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setNotes(editing.notes ?? '')
      setStartKey(dateInputValue(editing.startDate))
      setEndKey(dateInputValue(editing.endDate))
      setIsPrivate(Boolean(editing.isPrivate))
      setAllDay(editing.allDay !== false)
      setStartTime(editing.startTime?.slice(0, 5) ?? '')
      setEndTime(editing.endTime?.slice(0, 5) ?? '')
      setLocation(editing.location ?? '')
      setRecentEvents([])
      setRecentLoaded(false)
      setReuseOpen(false)
      setClearCover(false)
      setCoverError(null)
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setCropFile(null)
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    setTitle('')
    setNotes('')
    setStartKey(createStart)
    setEndKey(createEnd)
    setIsPrivate(!isCoach)
    setAllDay(false)
    setStartTime('')
    setEndTime('')
    setLocation('')
    setRecentLoaded(false)
    setReuseOpen(false)
    setClearCover(false)
    setCoverError(null)
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setCropFile(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
    let cancelled = false
    void listCoachRecentSeasonEvents()
      .then((rows) => {
        if (!cancelled) {
          setRecentEvents(rows)
          setRecentLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentEvents([])
          setRecentLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset cover preview only when modal opens/edits
  }, [open, editing, createStart, createEnd, isCoach])

  function assignCoverFile(file: File) {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    const url = URL.createObjectURL(file)
    setPendingPreviewUrl(url)
    setClearCover(false)
    setCoverError(null)
    if (coverInputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      coverInputRef.current.files = dt.files
    }
  }

  function clearCustomCover() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingPreviewUrl(null)
    setClearCover(Boolean(savedCoverUrl))
    setCoverError(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCoverError('Use a JPEG, PNG, or WebP image.')
      return
    }
    setCoverError(null)
    setCropFile(file)
  }

  function applyReuse(row: CoachRecentSeasonEvent) {
    setTitle(row.title)
    setNotes(row.notes ?? '')
    setStartKey(row.startDate)
    setEndKey(row.endDate)
    setAllDay(row.allDay)
    setStartTime(row.startTime?.slice(0, 5) ?? '')
    setEndTime(row.endTime?.slice(0, 5) ?? '')
    setLocation(row.location ?? '')
    setError(null)
  }

  const showReuse = !editing && recentLoaded && recentEvents.length > 0
  const dateRangeLabel = formatDisplayRange(startKey, endKey)
  const heroTitle = title.trim() || 'Event'
  const dialogLabel = editing ? 'Edit event' : 'Add event'
  const heroImageUrl = pendingPreviewUrl || (!clearCover ? savedCoverUrl : null) || null
  const hasHeroImage = Boolean(heroImageUrl)
  const hasCustomCover =
    Boolean(pendingPreviewUrl) || (Boolean(savedCoverUrl) && !clearCover)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-[44rem] flex-col gap-0 overflow-hidden p-0"
        closeButtonClassName="text-white/85 hover:bg-white/15 hover:text-white"
      >
        <DialogTitle className="sr-only">{dialogLabel}</DialogTitle>
        <DialogDescription className="sr-only">
          Add or edit a season plan event.
        </DialogDescription>

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

            <div className="absolute right-11 top-3 z-10 flex items-center gap-1 sm:right-12">
              {hasCustomCover ? (
                <button
                  type="button"
                  onClick={clearCustomCover}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white transition-colors hover:bg-black/50"
                  aria-label="Remove cover photo"
                  title="Remove cover photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => pickInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black/35 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-black/50"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Cover
              </button>
            </div>

            <div className="relative z-[1] flex items-start gap-3 pr-20 sm:pr-24">
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
                <p
                  className={cn(
                    'truncate text-[17px] font-semibold leading-snug text-white',
                    !title.trim() && 'opacity-45',
                  )}
                >
                  {heroTitle}
                </p>
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-snug text-white/80">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{dateRangeLabel}</span>
                  </span>
                  {location.trim() ? (
                    <>
                      <span
                        className="hidden h-3 w-px shrink-0 bg-white/25 sm:block"
                        aria-hidden
                      />
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">{location.trim()}</span>
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            {coverError ? (
              <p className="relative z-[1] mt-2 text-xs text-red-200">{coverError}</p>
            ) : null}
          </div>

          <input
            ref={pickInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onCoverPick}
          />
          <RaceCoverCropDialog
            file={cropFile}
            open={Boolean(cropFile)}
            onOpenChange={(next) => {
              if (!next) setCropFile(null)
            }}
            onConfirm={(file) => {
              setCropFile(null)
              assignCoverFile(file)
            }}
          />

          <form
            id="season-event-form"
            className="space-y-4 px-5 py-4 sm:px-6 sm:py-5"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              const fd = new FormData(e.currentTarget)
              startTransition(async () => {
                try {
                  if (editing) {
                    fd.set('id', editing.id)
                    await updateSeasonEvent(fd)
                  } else {
                    await createSeasonEvent(fd)
                  }
                  onSaved?.()
                  onOpenChange(false)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not save event')
                }
              })
            }}
          >
              <input
                ref={coverInputRef}
                type="file"
                name="cover"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
              {clearCover ? <input type="hidden" name="clearCover" value="1" /> : null}
              <FormError message={error} />

              <FormField label="Title">
                <Input
                  name="title"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Alps training camp"
                  autoComplete="off"
                />
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Location (optional)">
                  <Input
                    name="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Vilnius"
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Notes (optional)">
                  <Input
                    name="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional detail"
                    autoComplete="off"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Start">
                  <DateField
                    name="startDate"
                    value={startKey}
                    onChange={(next) => {
                      setStartKey(next)
                      if (endKey && next && endKey < next) setEndKey(next)
                    }}
                    required
                  />
                </FormField>
                <FormField label="End">
                  <DateField
                    name="endDate"
                    value={endKey}
                    onChange={setEndKey}
                    min={startKey || undefined}
                    required
                  />
                </FormField>
              </div>

              <input type="hidden" name="allDay" value={allDay ? 'true' : 'false'} />

              {!allDay ? (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Start time">
                    <Input
                      name="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </FormField>
                  <FormField label="End time">
                    <Input
                      name="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </FormField>
                </div>
              ) : null}

              <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand"
                />
                <span>All day — no specific time</span>
              </label>

              {!isCoach ? (
                <PrivateNoteToggle
                  hideFrom="coach"
                  name="isPrivate"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  label="Private — only you can see this. Your coach will not."
                />
              ) : null}

              {showReuse ? (
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground"
                    onClick={() => setReuseOpen((v) => !v)}
                    aria-expanded={reuseOpen}
                  >
                    <History className="h-3.5 w-3.5" />
                    Reuse from…
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        reuseOpen && 'rotate-180',
                      )}
                    />
                  </Button>

                  {reuseOpen ? (
                    <div className="max-h-[11.5rem] overflow-y-auto overscroll-contain rounded-[8px] border border-border">
                      <ul className="divide-y divide-border">
                        {recentEvents.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => {
                                applyReuse(row)
                                setReuseOpen(false)
                              }}
                              className={cn(
                                'flex w-full flex-col gap-0.5 px-3 py-2 text-left transition',
                                'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                              )}
                            >
                              <span className="truncate text-sm font-medium text-foreground">
                                {row.title}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {formatEventRange(row.startDate, row.endDate)}
                                {' · '}
                                {row.athleteName}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {'< Back'}
          </Button>
          <Button
            type="submit"
            form="season-event-form"
            size="sm"
            variant="brand"
            disabled={pending}
          >
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
