'use client'

import { useEffect, useId, useState } from 'react'
import {
  Check,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Mountain,
  Share2,
  Target,
  Timer,
  X,
} from 'lucide-react'
import { SportIcon } from './mock-ui'
import {
  PrescriptionWorkoutCard,
  sportRailColor,
  type CardSize,
  type PrescriptionWorkout,
} from './prescription-workout-card'

export type { CardSize, PrescriptionWorkout }

export const PRESCRIPTION_SAMPLES: PrescriptionWorkout[] = [
  {
    id: 'threshold',
    sport: 'run',
    title: 'Threshold Intervals',
    prescription: '3 × 2 km @ 4:05/km',
    recovery: "2' easy recovery",
    metric: '12 km',
    zone: 'Z3',
    include: '6 × 100 m strides',
    status: 'planned',
  },
  {
    id: 'threshold-done',
    sport: 'run',
    title: 'Threshold Intervals',
    prescription: '3 × 2 km @ Threshold',
    recovery: "2' easy recovery",
    metric: '12 km',
    zone: 'Z3',
    status: 'done',
    completionPercent: 101,
    actualMetric: '12.1 km',
    actualSecondary: '49:12',
  },
  {
    id: 'easy',
    sport: 'run',
    title: 'Easy Run',
    prescription: '10 km · Z2',
    metric: '10 km',
    zone: 'Z2',
    status: 'planned',
  },
  {
    id: 'long',
    sport: 'run',
    title: 'Long Run',
    prescription: '30 km · Z2 Endurance',
    metric: '30 km',
    zone: 'Z2',
    include: '6 × 30" strides · 60" easy · Anywhere',
    status: 'planned',
  },
  {
    id: 'long-92',
    sport: 'run',
    title: 'Long Run',
    prescription: '30 km · Z2',
    metric: '30 km',
    zone: 'Z2',
    status: 'done',
    completionPercent: 92,
    actualMetric: '27.5 km',
    actualSecondary: '2:18:40',
  },
  {
    id: 'ride',
    sport: 'bike',
    title: 'Long Ride',
    prescription: '80 km · Z2',
    metric: '80 km',
    zone: 'Z2',
    status: 'planned',
  },
  {
    id: 'swim',
    sport: 'swim',
    title: 'Swim Easy',
    prescription: '8 × 100 m aerobic · 20s rest',
    metric: '2.0 km',
    status: 'planned',
  },
  {
    id: 'strength',
    sport: 'strength',
    title: 'Upper Body',
    prescription: 'Pull · push · core · 3 rounds',
    metric: '45 min',
    status: 'planned',
  },
]

function PlannedDetailModal({
  workout,
  onClose,
}: {
  workout: PrescriptionWorkout
  onClose: () => void
}) {
  const titleId = useId()
  const accent = sportRailColor(workout.sport)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg overflow-hidden rounded-[12px] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.14)] sm:w-[min(32rem,calc(100vw-3rem))]"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[4px]"
          style={{ background: accent }}
          aria-hidden
        />

        <div className="flex items-center justify-between px-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#9aa0a8] hover:bg-[#f4f4f3] hover:text-[#111]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-[#9aa0a8] hover:bg-[#f4f4f3] hover:text-[#111]"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center gap-2.5">
            <SportIcon sport={workout.sport} className="h-5 w-5" color={accent} />
            <h2 id={titleId} className="tt-mock-h2">
              {workout.title}
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[var(--tt-line)] py-3 text-center">
            <div>
              <p className="tt-mock-overline !text-[var(--tt-ink-faint)]">Prescribed</p>
              <p className="tt-mock-h3 mt-1 tabular-nums">{workout.metric}</p>
            </div>
            <div>
              <p className="tt-mock-overline !text-[var(--tt-ink-faint)]">Estimated</p>
              <p className="tt-mock-h3 mt-1 tabular-nums">~48 min</p>
            </div>
            <div>
              <p className="tt-mock-overline !text-[var(--tt-ink-faint)]">Zone</p>
              <p className="tt-mock-h3 mt-1">{workout.zone ?? '—'}</p>
            </div>
          </div>

          <p className="tt-mock-overline mt-4 !text-[var(--tt-ink-faint)]">Structure</p>
          <div className="mt-2 space-y-1">
            <p className="tt-mock-body !text-[var(--tt-ink)] !font-medium">{workout.prescription}</p>
            {workout.recovery ? (
              <p className="tt-mock-caption">{workout.recovery}</p>
            ) : null}
          </div>

          {workout.include ? (
            <div className="mt-4 rounded-[8px] bg-[var(--tt-sidebar)] px-3 py-2.5">
              <p className="tt-mock-overline !text-[var(--tt-ink-faint)]">Include</p>
              <p className="tt-mock-body mt-1 !text-[var(--tt-ink)]">{workout.include}</p>
              <p className="tt-mock-caption mt-0.5 !text-[var(--tt-ink-faint)]">
                Placement · Anywhere
              </p>
            </div>
          ) : null}

          <p className="tt-mock-caption mt-4 !text-[var(--tt-ink-faint)]">
            Estimated load · mock · intelligence stays in modal, not on card
          </p>
        </div>
      </div>
    </div>
  )
}

/** Post-workout athlete modal — “What did I actually do?” */
function CompletedAthleteModal({
  workout,
  onClose,
}: {
  workout: PrescriptionWorkout
  onClose: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const pct = workout.completionPercent ?? 100

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[16px] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.14)] sm:rounded-[16px] sm:w-[min(32rem,calc(100vw-3rem))]"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#d8d8d4] sm:hidden" />

        <div className="flex items-center justify-between px-4 pt-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#9aa0a8] hover:bg-[#f4f4f3]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-0.5">
            <button type="button" className="rounded-md p-1.5 text-[#9aa0a8] hover:bg-[#f4f4f3]" aria-label="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-md p-1.5 text-[#9aa0a8] hover:bg-[#f4f4f3]" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <div className="mt-1 flex flex-col items-center text-center">
            <SportIcon sport={workout.sport} className="h-6 w-6" color="var(--tt-good)" />
            <h2 id={titleId} className="tt-mock-h2 mt-2">
              {workout.title}
            </h2>
            <p className="tt-mock-overline mt-1 inline-flex items-center gap-1 !text-[var(--tt-good)]">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Completed
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="tt-mock-stat text-[1.75rem] tabular-nums">
                {workout.actualMetric?.replace(' km', '') ?? '—'}
                <span className="tt-mock-caption align-middle !normal-case !tracking-normal">
                  {' '}
                  km
                </span>
              </p>
              <p className="tt-mock-caption mt-0.5 !text-[var(--tt-ink-faint)]">Distance</p>
            </div>
            <div>
              <p className="tt-mock-stat text-[1.75rem] tabular-nums">
                {workout.actualSecondary ?? '—'}
              </p>
              <p className="tt-mock-caption mt-0.5 !text-[var(--tt-ink-faint)]">Time</p>
            </div>
            <div>
              <p className="tt-mock-stat text-[1.75rem] tabular-nums">
                4:04
                <span className="tt-mock-caption align-middle !normal-case !tracking-normal">
                  {' '}
                  /km
                </span>
              </p>
              <p className="tt-mock-caption mt-0.5 !text-[var(--tt-ink-faint)]">Avg pace</p>
            </div>
          </div>

          {/* Route map placeholder — visual memory, not GIS */}
          <div className="relative mt-5 overflow-hidden rounded-[12px] border border-[#e8e8e6] bg-[#f3f4f2]">
            <svg viewBox="0 0 320 180" className="h-44 w-full sm:h-52" aria-hidden>
              <rect width="320" height="180" fill="#f3f4f2" />
              <path
                d="M40 140 C80 120, 90 80, 130 70 S190 90, 210 60 S270 40, 290 55"
                fill="none"
                stroke="#1a9f5c"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="40" cy="140" r="6" fill="#1a9f5c" />
              <rect x="282" y="46" width="12" height="10" fill="#111" rx="1" />
              <path d="M282 46 h12 v5 h-12 z" fill="#fff" opacity="0.35" />
            </svg>
            <div className="absolute bottom-3 left-3 right-3 flex justify-between rounded-[8px] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
              <span className="tt-mock-caption inline-flex items-center gap-1 !font-semibold !text-[var(--tt-ink)] tabular-nums">
                <MapPin className="h-3 w-3 text-[var(--tt-good)]" strokeWidth={2} />
                {workout.actualMetric}
              </span>
              <span className="tt-mock-caption inline-flex items-center gap-1 tabular-nums">
                <Mountain className="h-3 w-3" strokeWidth={1.75} />
                +86 m
              </span>
              <span className="tt-mock-caption inline-flex items-center gap-1 tabular-nums">
                <Timer className="h-3 w-3" strokeWidth={1.75} />
                {workout.actualSecondary}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-[12px] border border-[var(--tt-line)] px-3.5 py-3">
            <div className="flex items-center justify-between">
              <p className="tt-mock-h3">Completion</p>
              <p className="tt-mock-h3 tabular-nums !text-[var(--tt-good)]">{pct}%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--tt-line)]">
              <div
                className="h-full rounded-full bg-[var(--tt-good)]"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="tt-mock-caption mt-1.5 !text-[var(--tt-ink-faint)]">
              {workout.actualMetric} completed of {workout.metric} planned
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-0 overflow-hidden rounded-[12px] border border-[var(--tt-line)]">
            <div className="border-r border-[var(--tt-line)] px-3.5 py-3">
              <p className="tt-mock-overline inline-flex items-center gap-1 !text-[var(--tt-sport-run)]">
                <Target className="h-3 w-3" strokeWidth={2} />
                Plan
              </p>
              <p className="tt-mock-body mt-1.5 !font-medium !text-[var(--tt-ink)]">
                {workout.prescription}
              </p>
              {workout.recovery ? (
                <p className="tt-mock-caption mt-0.5">{workout.recovery}</p>
              ) : null}
            </div>
            <div className="px-3.5 py-3">
              <p className="tt-mock-overline inline-flex items-center gap-1 !text-[var(--tt-good)]">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Done
              </p>
              <p className="tt-mock-body mt-1.5 !font-medium !text-[var(--tt-ink)]">
                3 / 3 intervals
              </p>
              <p className="tt-mock-caption mt-0.5">100% completed</p>
            </div>
          </div>

          <div className="mt-3 rounded-[12px] border border-[var(--tt-line)] px-3.5 py-3">
            <p className="tt-mock-overline !text-[var(--tt-ink-faint)]">Notes</p>
            <p className="tt-mock-body mt-1.5 !text-[var(--tt-ink)]">
              Felt strong today. Intervals were controlled. Slight wind in the last 2 km.
            </p>
          </div>

          <p className="tt-mock-caption mt-4 text-center !text-[var(--tt-ink-faint)]">
            Synced from Strava · Today at 08:24
          </p>
        </div>

        <div className="shrink-0 border-t border-[var(--tt-line)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="tt-mock-h3 flex w-full items-center justify-center gap-1 rounded-[10px] bg-[var(--tt-ink)] py-3 !text-white"
          >
            Done
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function WorkoutDetailGallery() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = PRESCRIPTION_SAMPLES.find((w) => w.id === selectedId) ?? null

  return (
    <div className="space-y-10">
      <div>
        <p className="tt-mock-overline text-[var(--tt-ink-faint)]">Workout system</p>
        <h1 className="tt-mock-h1 mt-1 !text-5xl">Cards &amp; modals</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
          Spec: prescription on cards, intelligence in modals. No intensity charts on cards. Click a
          card — planned opens structure modal; completed opens athlete post-workout (route + plan →
          done). See{' '}
          <code className="text-[12px] text-[var(--tt-ink)]">docs/WORKOUT-SYSTEM-SPEC.md</code>.
        </p>
      </div>

      {/* Size ladder */}
      <section>
        <p className="tt-mock-section-title">Card sizes · one system</p>
        <p className="mt-1 text-[12px] text-[var(--tt-ink-faint)]">
          Same Threshold Intervals — XL → XS reduces info, doesn&apos;t redesign.
        </p>
        <div className="mt-4 space-y-3">
          {(['xl', 'l', 'm', 's', 'xs'] as CardSize[]).map((size) => (
            <div key={size} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
              <p className="w-10 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                {size}
              </p>
              <div className={size === 'xl' || size === 'l' ? 'w-full max-w-md' : 'w-full max-w-sm'}>
                <PrescriptionWorkoutCard
                  workout={PRESCRIPTION_SAMPLES[0]!}
                  size={size}
                  onOpen={() => setSelectedId('threshold')}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Completion */}
      <section>
        <p className="tt-mock-section-title">Completion · green rail fill</p>
        <p className="mt-1 text-[12px] text-[var(--tt-ink-faint)]">
          After sync: rail turns green; fill height ≈ completion %. Card stays recognizable.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { ...PRESCRIPTION_SAMPLES[4]!, id: 'c60', completionPercent: 60, actualMetric: '18.0 km' },
            { ...PRESCRIPTION_SAMPLES[4]!, id: 'c92', completionPercent: 92 },
            {
              ...PRESCRIPTION_SAMPLES[1]!,
              id: 'c101',
              completionPercent: 101,
            },
            {
              ...PRESCRIPTION_SAMPLES[1]!,
              id: 'c100',
              completionPercent: 100,
              actualMetric: '12.0 km',
              actualSecondary: '48:50',
            },
          ].map((w) => (
            <PrescriptionWorkoutCard
              key={w.id}
              workout={w}
              size="m"
              onOpen={() => setSelectedId(w.status === 'done' ? 'threshold-done' : 'threshold')}
            />
          ))}
        </div>
      </section>

      {/* Sports gallery */}
      <section>
        <p className="tt-mock-section-title">Open from card</p>
        <p className="mt-1 text-[12px] text-[var(--tt-ink-faint)]">
          Planned → structure modal. Completed → athlete post-workout modal.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PRESCRIPTION_SAMPLES.map((w) => (
            <PrescriptionWorkoutCard
              key={w.id}
              workout={w}
              size="l"
              onOpen={() => setSelectedId(w.id)}
            />
          ))}
        </div>
      </section>

      {selected && selected.status === 'done' ? (
        <CompletedAthleteModal workout={selected} onClose={() => setSelectedId(null)} />
      ) : null}
      {selected && selected.status === 'planned' ? (
        <PlannedDetailModal workout={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  )
}
