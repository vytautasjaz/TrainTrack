'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Eye,
  LayoutGrid,
  ListPlus,
  Save,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SportIcon } from './mock-ui'

type SportId = 'run' | 'bike' | 'swim'
type PrimaryMetric = 'distance' | 'duration'

type BlockRow = {
  id: string
  kind: 'warmup' | 'intervals' | 'cooldown'
  label: string
  summary: string
}

const SESSION_TYPES: Record<SportId, string[]> = {
  run: ['Easy Run', 'Long Run', 'Threshold', 'Intervals', 'Tempo'],
  bike: ['Easy', 'Endurance', 'Sweet spot', 'VO2'],
  swim: ['Aerobic', 'Technique', 'CSS'],
}

const SPORT_LABEL: Record<SportId, string> = {
  run: 'Run',
  bike: 'Bike',
  swim: 'Swim',
}

/** Soft hero tint — mirrors production sport card header. */
function sportHeroClass(sport: SportId) {
  if (sport === 'run') return 'bg-[color-mix(in_srgb,var(--tt-sport-run)_10%,white)]'
  if (sport === 'bike') return 'bg-[color-mix(in_srgb,var(--tt-sport-bike)_10%,white)]'
  return 'bg-[color-mix(in_srgb,var(--tt-sport-swim)_10%,white)]'
}

function sportAccent(sport: SportId) {
  if (sport === 'run') return 'var(--tt-sport-run)'
  if (sport === 'bike') return 'var(--tt-sport-bike)'
  return 'var(--tt-sport-swim)'
}

function estimateFromDistance(km: string, sport: SportId) {
  const n = Number.parseFloat(km)
  if (!Number.isFinite(n) || n <= 0) return ''
  const minPerKm = sport === 'run' ? 5.75 : sport === 'bike' ? 2.1 : 18
  return String(Math.round(n * minPerKm))
}

function estimateFromDuration(min: string, sport: SportId) {
  const n = Number.parseFloat(min)
  if (!Number.isFinite(n) || n <= 0) return ''
  const kmPerMin = sport === 'run' ? 1 / 5.75 : sport === 'bike' ? 1 / 2.1 : 1 / 18
  const km = n * kmPerMin
  return sport === 'swim' ? km.toFixed(1) : String(Math.round(km * 10) / 10)
}

const DEFAULT_BLOCKS: BlockRow[] = [
  { id: 'wu', kind: 'warmup', label: 'Warm-up', summary: '2 km · easy' },
  {
    id: 'main',
    kind: 'intervals',
    label: 'Intervals',
    summary: '3 × 2 km @ 4:05/km · 2′ recovery',
  },
  { id: 'cd', kind: 'cooldown', label: 'Cool-down', summary: '1.5 km · easy' },
]

type EditorState = {
  sport: SportId
  title: string
  subtitle: string
  titleAuto: boolean
  sessionType: string
  distance: string
  duration: string
  primary: PrimaryMetric
  distanceManual: boolean
  durationManual: boolean
  libraryOpen: boolean
  buildOpen: boolean
  includeOpen: boolean
  includeText: string
  notes: string
  notesPrivate: boolean
  blocks: BlockRow[]
}

function initialCreate(sport: SportId = 'run'): EditorState {
  const sessionType = SESSION_TYPES[sport][0]
  return {
    sport,
    title: sessionType,
    subtitle: '',
    titleAuto: true,
    sessionType,
    distance: '10',
    duration: '',
    primary: 'distance',
    distanceManual: true,
    durationManual: false,
    libraryOpen: false,
    buildOpen: false,
    includeOpen: false,
    includeText: '',
    notes: '',
    notesPrivate: false,
    blocks: [],
  }
}

function initialEdit(): EditorState {
  return {
    sport: 'run',
    title: 'Threshold Intervals',
    subtitle: '3 × 2 km @ Threshold',
    titleAuto: false,
    sessionType: 'Threshold',
    distance: '12',
    duration: '52',
    primary: 'distance',
    distanceManual: true,
    durationManual: false,
    libraryOpen: false,
    buildOpen: true,
    includeOpen: false,
    includeText: '6 × 100 m strides · Anywhere',
    notes: 'Keep first rep controlled.',
    notesPrivate: false,
    blocks: DEFAULT_BLOCKS,
  }
}

/**
 * Mock of production SharedWorkoutEditor / EditableWorkoutCardShell —
 * same information architecture, mock tokens.
 */
export function WorkoutBuilderModal({
  open,
  onClose,
  mode = 'create',
}: {
  open: boolean
  onClose: () => void
  mode?: 'create' | 'edit'
}) {
  const titleId = useId()
  const [state, setState] = useState<EditorState>(() =>
    mode === 'edit' ? initialEdit() : initialCreate(),
  )

  useEffect(() => {
    if (!open) return
    setState(mode === 'edit' ? initialEdit() : initialCreate())
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const autoDuration = useMemo(
    () => estimateFromDistance(state.distance, state.sport),
    [state.distance, state.sport],
  )
  const autoDistance = useMemo(
    () => estimateFromDuration(state.duration || autoDuration, state.sport),
    [state.duration, autoDuration, state.sport],
  )

  const shownDuration = state.durationManual
    ? state.duration
    : autoDuration || state.duration
  const shownDistance = state.distanceManual
    ? state.distance
    : autoDistance || state.distance

  function patch(p: Partial<EditorState>) {
    setState((s) => ({ ...s, ...p }))
  }

  function setSessionType(type: string) {
    setState((s) => ({
      ...s,
      sessionType: type,
      title: s.titleAuto ? type : s.title,
    }))
  }

  function openBuild() {
    setState((s) => ({
      ...s,
      buildOpen: !s.buildOpen,
      includeOpen: false,
      libraryOpen: false,
      blocks: !s.buildOpen && s.blocks.length === 0 ? DEFAULT_BLOCKS : s.blocks,
    }))
  }

  function openInclude() {
    setState((s) => ({
      ...s,
      includeOpen: !s.includeOpen,
      buildOpen: false,
      libraryOpen: false,
    }))
  }

  function openLibrary() {
    setState((s) => ({
      ...s,
      libraryOpen: !s.libraryOpen,
      buildOpen: false,
      includeOpen: false,
    }))
  }

  if (!open) return null

  const accent = sportAccent(state.sport)
  const distancePrimary = state.primary === 'distance'
  const durationPrimary = state.primary === 'duration'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      // Production: no outside dismiss
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex w-full flex-col overflow-hidden border border-[var(--tt-line)] bg-white shadow-[0_20px_60px_rgba(17,17,17,0.18)]',
          'max-h-[min(92vh,52rem)] rounded-t-[6px] sm:w-[42rem] sm:max-w-[42rem] sm:rounded-[6px]',
        )}
      >
        <span id={titleId} className="sr-only">
          {mode === 'edit' ? 'Edit workout' : 'Add workout'}
        </span>

        {/* Absolute corner — close only via X (like production) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-md p-1.5 text-[var(--tt-ink-faint)] hover:bg-black/[0.04] hover:text-[var(--tt-ink)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Card shell header */}
          <div
            className={cn(
              'relative border-b border-black/10 px-5 pb-6 pt-5 sm:px-6',
              sportHeroClass(state.sport),
            )}
          >
            <p className="mb-2.5 text-[13px] leading-snug text-[#6B7280]">
              Wednesday, 26 August 2026
            </p>

            <div className="flex items-start gap-3 pr-8">
              <SportIcon
                sport={state.sport}
                className="mt-0.5 h-8 w-8 shrink-0"
                color={accent}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex max-w-full items-baseline gap-1.5">
                  <input
                    value={state.title}
                    onChange={(e) =>
                      patch({ title: e.target.value, titleAuto: false })
                    }
                    aria-label="Workout title"
                    style={{ width: `${Math.max(state.title.length + 1, 8)}ch` }}
                    className="max-w-[calc(100%-2.75rem)] min-w-0 bg-transparent text-[17px] font-semibold leading-snug text-[#111827] outline-none placeholder:text-[var(--tt-ink-faint)]"
                    placeholder="Workout title"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({ titleAuto: true, title: state.sessionType })
                    }
                    className={cn(
                      'shrink-0 text-[11px] font-medium',
                      state.titleAuto
                        ? 'text-[var(--tt-ink-faint)]'
                        : 'text-[var(--tt-ink-faint)]/70 hover:text-[var(--tt-ink-soft)]',
                    )}
                  >
                    Auto
                  </button>
                </div>
                <input
                  value={state.subtitle}
                  onChange={(e) => patch({ subtitle: e.target.value })}
                  aria-label="Workout subtitle"
                  placeholder="Subtitle"
                  className="w-full bg-transparent text-[13px] leading-snug text-[#6B7280] outline-none placeholder:text-[var(--tt-ink-faint)]/60"
                />
              </div>
            </div>

            {/* Metrics row — type · distance · duration */}
            <div className="mt-[18px] flex min-w-0 items-stretch overflow-hidden">
              <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-2 text-center">
                <span className="flex h-4 items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                  Workout type
                </span>
                <div className="relative mt-1.5 flex h-8 w-full items-center justify-center">
                  <select
                    value={state.sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="h-8 max-w-full appearance-none bg-transparent pr-4 text-center text-[13px] font-semibold text-[#111827] outline-none"
                  >
                    {SESSION_TYPES[state.sport].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1 h-3.5 w-3.5 text-[var(--tt-ink-faint)]" />
                </div>
              </div>

              <div className="w-px shrink-0 self-stretch bg-foreground/20" />

              <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
                <button
                  type="button"
                  onClick={() => patch({ primary: 'distance' })}
                  className={cn(
                    'inline-flex h-4 items-center text-[10px] font-bold uppercase tracking-wide',
                    distancePrimary ? 'text-[var(--tt-ink)]' : 'text-[var(--tt-ink-faint)]',
                  )}
                >
                  Distance
                </button>
                <div className="mt-1.5 flex h-8 items-center justify-center gap-0.5">
                  {!state.distanceManual && shownDistance ? (
                    <span className="text-xl font-semibold text-[var(--tt-ink-faint)]">~</span>
                  ) : null}
                  <input
                    value={shownDistance}
                    onChange={(e) =>
                      patch({
                        distance: e.target.value,
                        distanceManual: true,
                        primary: 'distance',
                      })
                    }
                    onFocus={() => patch({ primary: 'distance' })}
                    className={cn(
                      'w-[4ch] bg-transparent text-center tabular-nums outline-none',
                      distancePrimary ? 'text-[32px] font-bold' : 'text-[18px] font-bold',
                      shownDistance ? 'text-[#111827]' : 'text-[var(--tt-ink-faint)]',
                    )}
                  />
                  <span
                    className={cn(
                      'font-semibold',
                      distancePrimary ? 'text-base' : 'text-[11px]',
                      shownDistance ? 'text-[#111827]' : 'text-[var(--tt-ink-faint)]',
                    )}
                  >
                    km
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      distanceManual: !state.distanceManual,
                      distance: state.distanceManual
                        ? autoDistance || state.distance
                        : state.distance,
                    })
                  }
                  className="mt-1.5 text-[11px] font-medium text-[var(--tt-ink-faint)]"
                >
                  {state.distanceManual ? 'Manual' : 'Auto'}
                </button>
              </div>

              <div className="w-px shrink-0 self-stretch bg-foreground/20" />

              <div className="flex min-w-0 flex-[1_1_0%] flex-col items-center px-1.5 text-center">
                <button
                  type="button"
                  onClick={() => patch({ primary: 'duration' })}
                  className={cn(
                    'inline-flex h-4 items-center text-[10px] font-bold uppercase tracking-wide',
                    durationPrimary ? 'text-[var(--tt-ink)]' : 'text-[var(--tt-ink-faint)]',
                  )}
                >
                  Duration
                </button>
                <div className="mt-1.5 flex h-8 items-center justify-center gap-0.5">
                  {!state.durationManual && shownDuration ? (
                    <span
                      className={cn(
                        'font-semibold text-[var(--tt-ink-faint)]',
                        durationPrimary ? 'text-xl' : 'text-sm',
                      )}
                    >
                      ~
                    </span>
                  ) : null}
                  <input
                    value={shownDuration}
                    onChange={(e) =>
                      patch({
                        duration: e.target.value,
                        durationManual: true,
                        primary: 'duration',
                      })
                    }
                    onFocus={() => patch({ primary: 'duration' })}
                    className={cn(
                      'w-[4ch] bg-transparent text-center tabular-nums outline-none',
                      durationPrimary ? 'text-[32px] font-bold' : 'text-[18px] font-bold',
                      shownDuration ? 'text-[#111827]' : 'text-[var(--tt-ink-faint)]',
                    )}
                  />
                  <span
                    className={cn(
                      'font-semibold',
                      durationPrimary ? 'text-base' : 'text-[11px]',
                      shownDuration ? 'text-[#111827]' : 'text-[var(--tt-ink-faint)]',
                    )}
                  >
                    min
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      durationManual: !state.durationManual,
                      duration: state.durationManual
                        ? autoDuration || state.duration
                        : state.duration,
                    })
                  }
                  className="mt-1.5 text-[11px] font-medium text-[var(--tt-ink-faint)]"
                >
                  {state.durationManual ? 'Manual' : 'Auto'}
                </button>
              </div>
            </div>
          </div>

          {/* Body actions + panels */}
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="flex gap-2">
              {mode === 'create' ? (
                <button
                  type="button"
                  onClick={openLibrary}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition',
                    state.libraryOpen
                      ? 'border-transparent text-white'
                      : 'border-[var(--tt-line)] bg-white text-[var(--tt-ink)] hover:border-[var(--tt-line-strong)]',
                  )}
                  style={
                    state.libraryOpen
                      ? { background: accent, borderColor: accent }
                      : undefined
                  }
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Library
                </button>
              ) : null}
              <button
                type="button"
                onClick={openBuild}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition',
                  state.buildOpen
                    ? 'border-transparent text-white'
                    : 'border-[var(--tt-line)] bg-white text-[var(--tt-ink)] hover:border-[var(--tt-line-strong)]',
                )}
                style={
                  state.buildOpen
                    ? { background: accent, borderColor: accent }
                    : undefined
                }
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Build workout
              </button>
              <button
                type="button"
                onClick={openInclude}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition',
                  state.includeOpen
                    ? 'border-transparent text-white'
                    : 'border-[var(--tt-line)] bg-white text-[var(--tt-ink)] hover:border-[var(--tt-line-strong)]',
                )}
                style={
                  state.includeOpen
                    ? { background: accent, borderColor: accent }
                    : undefined
                }
              >
                <ListPlus className="h-3.5 w-3.5" />
                Include
                {state.includeText ? (
                  <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-ink)]">
                    1
                  </span>
                ) : null}
              </button>
            </div>

            {state.libraryOpen ? (
              <div className="space-y-1 border-t border-[var(--tt-line)] pt-4">
                <p className="mb-2 text-[11px] text-[var(--tt-ink-faint)]">
                  Pick a template · {SPORT_LABEL[state.sport]}
                </p>
                {(
                  [
                    ['Easy 10K', '10 km · Z2'],
                    ['Threshold 3×2K', '3 × 2 km @ 4:05'],
                    ['Long 20K', '20 km · Z2'],
                  ] as const
                ).map(([name, meta]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      patch({
                        title: name,
                        titleAuto: false,
                        subtitle: meta,
                        libraryOpen: false,
                        buildOpen: name.includes('Threshold'),
                        blocks: name.includes('Threshold') ? DEFAULT_BLOCKS : [],
                        distance: name.includes('20') ? '20' : name.includes('3×') ? '12' : '10',
                      })
                    }
                    className="flex w-full items-center justify-between rounded-[8px] px-3 py-2.5 text-left text-sm hover:bg-[var(--tt-sidebar,#f4f4f2)]"
                  >
                    <span className="font-medium text-[var(--tt-ink)]">{name}</span>
                    <span className="text-[12px] text-[var(--tt-ink-faint)]">{meta}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {state.buildOpen ? (
              <div className="space-y-2 border-t border-[var(--tt-line)] pt-4">
                <p className="mb-1 text-[11px] text-[var(--tt-ink-faint)]">
                  Structure blocks
                </p>
                {state.blocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--tt-line)] py-2.5 last:border-0"
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                        {b.label}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-[var(--tt-ink)]">
                        {b.summary}
                      </p>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="pt-1 text-[12px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
                >
                  + Add block
                </button>
              </div>
            ) : null}

            {state.includeOpen ? (
              <div className="border-t border-[var(--tt-line)] pt-4">
                <label className="block">
                  <span className="text-[11px] text-[var(--tt-ink-faint)]">Include items</span>
                  <input
                    value={state.includeText}
                    onChange={(e) => patch({ includeText: e.target.value })}
                    placeholder="e.g. 6 × 100 m strides · Anywhere"
                    className="mt-2 h-9 w-full rounded-[8px] border border-[var(--tt-line)] bg-white px-3 text-[13px] text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)]"
                  />
                </label>
              </div>
            ) : null}

            {/* Coach notes — always available */}
            {!state.libraryOpen ? (
              <div className="border-t border-[var(--tt-line)] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-[var(--tt-ink-faint)]">Coach notes</span>
                  <button
                    type="button"
                    onClick={() => patch({ notesPrivate: !state.notesPrivate })}
                    className={cn(
                      'text-[11px] font-medium',
                      state.notesPrivate
                        ? 'text-[var(--tt-ink)]'
                        : 'text-[var(--tt-ink-faint)]',
                    )}
                  >
                    {state.notesPrivate ? 'Private' : 'Shared'}
                  </button>
                </div>
                <textarea
                  value={state.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={3}
                  placeholder="Optional notes for the athlete…"
                  className="w-full resize-none rounded-[8px] border border-[var(--tt-line)] bg-white px-3 py-2 text-[13px] leading-relaxed text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)] focus:border-[var(--tt-ink)]"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer — Cancel / Preview / Save */}
        <div className="border-t border-[var(--tt-line)] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f4f4f2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--tt-ink)] hover:border-[var(--tt-line-strong)]"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
