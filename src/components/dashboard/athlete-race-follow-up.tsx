'use client'

import { useEffect, useState, useTransition } from 'react'
import { RaceOutcome, RaceType } from '@prisma/client'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { logRaceOutcome } from '@/app/actions/workouts'
import { RaceLegsResultFields } from '@/components/races/race-legs-fields'
import { RaceStravaLinkPicker } from '@/components/races/race-strava-link-picker'
import { PersonalBestUpdateModal } from '@/components/races/personal-best-update-modal'
import { RACE_TYPE_LABELS } from '@/lib/constants'
import { raceUsesLegs, type RaceLegView } from '@/lib/race-legs'
import type { PersonalBestSuggestion } from '@/lib/personal-bests'
import { cn } from '@/lib/utils'

const DEFERRED_STORAGE_KEY = 'tt:race-follow-up:deferred'

export type PendingRaceFollowUp = {
  id: string
  name: string
  date: Date | string
  location: string | null
  type: keyof typeof RACE_TYPE_LABELS
  goal: string | null
  stravaActivityUrl?: string | null
  stravaActivityName?: string | null
  legs?: RaceLegView[]
}

type AthleteRaceFollowUpProps = {
  races: PendingRaceFollowUp[]
  className?: string
}

type OutcomeChoice = 'FINISHED' | 'DID_NOT_START' | 'DNF'

function readDeferredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DEFERRED_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeDeferredIds(ids: Set<string>) {
  try {
    localStorage.setItem(DEFERRED_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore quota / private mode */
  }
}

function pruneDeferredIds(pendingIds: string[]) {
  const pending = new Set(pendingIds)
  const next = new Set([...readDeferredIds()].filter((id) => pending.has(id)))
  writeDeferredIds(next)
  return next
}

export function AthleteRaceFollowUp({ races, className }: AthleteRaceFollowUpProps) {
  const [pbSuggestion, setPbSuggestion] = useState<PersonalBestSuggestion | null>(null)
  const [pbOpen, setPbOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [animate, setAnimate] = useState(false)

  const raceIdsKey = races.map((r) => r.id).sort().join(',')

  useEffect(() => {
    const pendingIds = raceIdsKey ? raceIdsKey.split(',') : []
    const deferred = pruneDeferredIds(pendingIds)
    setCollapsed(pendingIds.some((id) => deferred.has(id)))
    const id = window.requestAnimationFrame(() => setAnimate(true))
    return () => window.cancelAnimationFrame(id)
  }, [raceIdsKey])

  if (races.length === 0) return null

  function deferForLater() {
    const next = readDeferredIds()
    for (const race of races) next.add(race.id)
    writeDeferredIds(next)
    setCollapsed(true)
  }

  function expand() {
    setCollapsed(false)
  }

  const summaryLabel =
    races.length === 1
      ? races[0].name
      : `${races.length} races waiting for a result`

  const expanded = !collapsed

  return (
    <section
      className={cn('tt-race-follow-up', expanded && 'space-y-2.5', className)}
      data-animate={animate ? 'true' : 'false'}
    >
      <div className="tt-race-follow-up-summary" data-open={collapsed ? 'true' : 'false'}>
        <div className="tt-race-follow-up-summary-inner">
          <button
            type="button"
            onClick={expand}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left transition hover:opacity-95"
            aria-expanded={expanded}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-follow-muted)]">
                Report later
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[var(--tt-follow-ink)]">
                How did it go? · {summaryLabel}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-[var(--tt-follow-line)] px-2 py-1 text-[11px] font-medium text-[var(--tt-follow-ink)]">
              Log result
              <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </span>
          </button>
        </div>
      </div>

      <div className="tt-race-follow-up-panel" data-open={expanded ? 'true' : 'false'}>
        <div className="tt-race-follow-up-panel-inner space-y-2.5">
          <div className="flex items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold leading-tight tracking-tight text-[var(--tt-follow-ink)]">
              How did it go?
            </h2>
            <div
              role="presentation"
              onClick={deferForLater}
              className="min-h-7 min-w-0 flex-1 self-stretch"
            />
            <button
              type="button"
              onClick={deferForLater}
              className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-[11px] font-medium text-[var(--tt-follow-muted)] transition hover:text-[var(--tt-follow-ink)]"
              title="Minimize and report later"
            >
              <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Report later
            </button>
          </div>
          <div className="space-y-3">
            {races.map((race, index) => (
              <div
                key={race.id}
                className={cn(index > 0 && 'border-t border-[var(--tt-follow-line)] pt-3')}
              >
                <RaceFollowUpCard
                  race={race}
                  onPbSuggestion={(suggestion) => {
                    setPbSuggestion(suggestion)
                    setPbOpen(true)
                  }}
                  onDefer={deferForLater}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <PersonalBestUpdateModal
        suggestion={pbSuggestion}
        open={pbOpen}
        onOpenChange={setPbOpen}
      />
    </section>
  )
}

function RaceFollowUpCard({
  race,
  onPbSuggestion,
  onDefer,
}: {
  race: PendingRaceFollowUp
  onPbSuggestion: (suggestion: PersonalBestSuggestion) => void
  onDefer: () => void
}) {
  const [choice, setChoice] = useState<OutcomeChoice>('FINISHED')
  const [pending, startTransition] = useTransition()
  const isTri = raceUsesLegs(race.type as RaceType)
  const legs = race.legs ?? []

  const dateLabel = new Date(race.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await logRaceOutcome(formData)
      if (result?.pbSuggestion) {
        onPbSuggestion(result.pbSuggestion)
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{race.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {dateLabel}
            {' · '}
            {RACE_TYPE_LABELS[race.type]}
            {race.location ? ` · ${race.location}` : ''}
            {race.goal ? ` · Goal: ${race.goal}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-0.5">
          {(
            [
              ['FINISHED', 'Finished'],
              ['DID_NOT_START', 'DNS'],
              ['DNF', 'DNF'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setChoice(value)}
              data-active={choice === value}
              className="tt-race-follow-up-pill cursor-pointer rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form action={submit} className="mt-2 space-y-2">
        <input type="hidden" name="raceId" value={race.id} />
        <input type="hidden" name="outcome" value={choice} />

        {choice === 'FINISHED' ? (
          <div className="tt-follow-fields grid grid-cols-1 gap-0 overflow-hidden rounded-[6px] border border-border/60 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,3fr)]">
            <label className="flex min-w-0 flex-col gap-0.5 px-3 py-2 sm:self-start">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Finish time
              </span>
              <Input
                name="resultTime"
                placeholder="3:27:16"
                autoComplete="off"
                variant="ghost"
                className="h-8 min-h-0 px-0 py-0 text-base font-bold tabular-nums tracking-tight"
                aria-label="Finish time"
              />
            </label>
            <div className="hidden bg-border/70 sm:block" aria-hidden />
            <label className="flex min-w-0 flex-col gap-0.5 border-t border-border/50 px-3 py-2 sm:self-start sm:border-t-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Place
              </span>
              <Input
                name="resultPlace"
                placeholder="12th"
                autoComplete="off"
                variant="ghost"
                className="h-8 min-h-0 px-0 py-0 text-sm font-semibold tabular-nums"
                aria-label="Finish place"
              />
            </label>
            <div className="hidden bg-border/70 sm:block" aria-hidden />
            <label className="flex min-w-0 flex-col gap-0.5 border-t border-border/50 px-3 py-2 sm:border-t-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </span>
              <Textarea
                name="resultNotes"
                placeholder="Optional…"
                autoComplete="off"
                variant="ghost"
                rows={2}
                className="min-h-[2.5rem] resize-y text-sm leading-snug"
                aria-label="Race notes"
              />
            </label>
          </div>
        ) : null}

        {choice !== 'DID_NOT_START' && !isTri ? (
          <div className="flex items-center gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Strava
            </span>
            <RaceStravaLinkPicker
              raceId={race.id}
              linkedUrl={race.stravaActivityUrl}
              linkedName={race.stravaActivityName}
              compact
              iconOnly
            />
          </div>
        ) : null}

        {choice === 'DNF' ? (
          <label className="tt-follow-fields flex min-w-0 flex-col gap-0.5 rounded-[6px] border border-border/60 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </span>
            <Textarea
              name="resultNotes"
              placeholder="What happened?"
              autoComplete="off"
              variant="ghost"
              rows={2}
              className="min-h-[2.5rem] resize-y text-sm leading-snug"
            />
          </label>
        ) : null}

        {choice === 'DID_NOT_START' ? (
          <label className="tt-follow-fields flex min-w-0 flex-col gap-0.5 rounded-[6px] border border-border/60 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </span>
            <Textarea
              name="resultNotes"
              placeholder="Why didn’t you start?"
              autoComplete="off"
              variant="ghost"
              rows={2}
              className="min-h-[2.5rem] resize-y text-sm leading-snug"
            />
          </label>
        ) : null}

        {choice !== 'DID_NOT_START' && isTri && legs.length > 0 ? (
          <RaceLegsResultFields raceId={race.id} legs={legs} />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onDefer}
              className="tt-btn-ghost-on-dark h-7 cursor-pointer gap-1 px-2 text-xs"
            >
              <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Report later
            </Button>
            <Button
              type="submit"
              formAction={(formData) => {
                formData.set('outcome', RaceOutcome.DISMISSED)
                submit(formData)
              }}
              variant="ghost"
              size="sm"
              disabled={pending}
              className="tt-btn-ghost-on-dark h-7 cursor-pointer gap-1 px-2 text-xs"
            >
              <X className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Dismiss
            </Button>
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={pending}
            className="tt-btn-save-on-dark h-7 cursor-pointer px-3 text-xs"
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </>
  )
}
