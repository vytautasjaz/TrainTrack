'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import {
  adaptAiTrainingPlan,
  draftAiTrainingPlan,
  getAiAthleteDraftContext,
  type AiAthleteDraftContext,
  type AiSkillListItem,
} from '@/app/actions/ai-plans'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { AiQuotaSnapshot } from '@/lib/ai/entitlements'
import { AiPaywallBanner } from '@/components/ai/ai-paywall-banner'
import { CoachEngineProgress } from '@/components/ai/why-this-plan-panel'
import { COACH_ENGINE_STEP_IDS } from '@/lib/coach-engine/decision-trace'
import { DAY_OPTIONS } from '@/lib/coach-engine/brief'
import {
  formatPaceMinPerKm,
  parsePaceMinPerKm,
} from '@/lib/athlete-preferences'
import type { TrainingModelId } from '@/lib/coach-engine/types'

const METHODOLOGY_OPTIONS: {
  value: '' | TrainingModelId
  label: string
  hint: string
}[] = [
  {
    value: '',
    label: 'Let AI decide',
    hint: 'Engine picks from your fitness and history',
  },
  {
    value: 'PYRAMIDAL',
    label: 'Pyramidal',
    hint: 'Lots of easy, some threshold, little VO2',
  },
  {
    value: 'NORWEGIAN',
    label: 'Norwegian',
    hint: 'AM+PM controlled threshold same day; recovery next day',
  },
  {
    value: 'POLARIZED',
    label: 'Polarized',
    hint: 'Easy + hard, minimal gray zone',
  },
  {
    value: 'THRESHOLD',
    label: 'Threshold-focused',
    hint: 'Tempo / threshold as the main quality',
  },
]

const VOLUME_CHIPS = [
  { label: '<30 km', value: 25 },
  { label: '30–45', value: 38 },
  { label: '45–60', value: 52 },
  { label: '60–80', value: 70 },
  { label: '80–100', value: 90 },
  { label: '100+', value: 110 },
] as const

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner', hint: 'Building consistency' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Solid base' },
  { value: 'advanced', label: 'Advanced', hint: 'High volume / quality' },
  { value: 'elite', label: 'Elite', hint: 'Competitive peak load' },
] as const

const ADAPT_PROGRESS_STEPS = [
  'Loading plan & recent load',
  'Scoring skips & recovery need',
  'Choosing adapt focus',
  'Replanning affected sessions',
  'Validating & saving changes',
] as const

const SCHEDULE_KEYS = new Set([
  'daysPerWeek',
  'longRunDay',
  'currentWeeklyKm',
  'firstWeekKm',
  'availableDays',
])

const PROFILE_KEYS = new Set([
  'paceEasy',
  'paceTempo',
  'paceThreshold',
  'paceVo2',
  'bikeFtpWatts',
  'swimCssSecPer100m',
  'hrMax',
  'hrResting',
])

type DraftStep =
  | 'goal'
  | 'athlete'
  | 'fitness'
  | 'availability'
  | 'style'
  | 'review'
type AdaptStep = 'goal' | 'athlete' | 'style'
type GuideStep = DraftStep | AdaptStep

type AthleteOption = { id: string; name: string }

type AiPlanWizardProps = {
  mode: 'draft' | 'adapt'
  audience: 'coach' | 'athlete'
  skills: AiSkillListItem[]
  quota: Pick<
    AiQuotaSnapshot,
    | 'draftsRemaining'
    | 'adaptsRemaining'
    | 'draftsLimit'
    | 'adaptsLimit'
    | 'enabledSkillSlugs'
    | 'membership'
  >
  athletes: AthleteOption[]
  defaultAthleteId?: string
  planId?: string
  plans?: { id: string; title: string }[]
}

const SKILL_SHORT: Record<string, { short: string; emoji?: string }> = {
  'run-5k-build': { short: '5K' },
  'run-half-marathon': { short: 'Half Marathon' },
  'run-marathon': { short: 'Marathon' },
  'hyrox-general': { short: 'HYROX' },
  'multi-sport-base': { short: 'Multi-sport' },
  'adapt-plan': { short: 'Adapt plan' },
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--tt-ink-faint,#9a9a9a)]">
      {children}
      {required ? ' *' : ''}
    </span>
  )
}

function SuggestionChip({
  label,
  active,
  onClick,
  disabled,
  hint,
}: {
  label: string
  active?: boolean
  onClick: () => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-[var(--tt-ink,#111)] bg-[var(--tt-ink,#111)] text-white'
          : 'border-[var(--tt-line,#ebebeb)] bg-white text-[var(--tt-ink,#111)] hover:border-[var(--tt-ink,#111)]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {label}
    </button>
  )
}

function GuideSteps({
  steps,
  current,
}: {
  steps: { id: GuideStep; label: string }[]
  current: GuideStep
}) {
  const idx = steps.findIndex((s) => s.id === current)
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => {
        const done = i < idx
        const active = s.id === current
        return (
          <li key={s.id} className="flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight
                className="h-3 w-3 text-[var(--tt-ink-faint,#9a9a9a)]"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'text-[12px] font-medium',
                active
                  ? 'text-[var(--tt-ink,#111)]'
                  : done
                    ? 'text-[var(--tt-ink-soft,#6b6b6b)]'
                    : 'text-[var(--tt-ink-faint,#9a9a9a)]',
              )}
            >
              <span
                className={cn(
                  'mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] tabular-nums',
                  active
                    ? 'bg-[var(--color-brand,#da2f36)] text-white'
                    : done
                      ? 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)]'
                      : 'bg-transparent text-[var(--tt-ink-faint,#9a9a9a)] ring-1 ring-[var(--tt-line,#ebebeb)]',
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function AdaptGenerationProgress({
  active,
  steps,
  stepIndex,
}: {
  active: boolean
  steps: readonly string[]
  stepIndex: number
}) {
  if (!active) return null
  return (
    <div
      className="rounded-lg border border-[var(--tt-line,#e8e8e8)] bg-[var(--tt-sidebar,#f5f5f5)] px-4 py-3"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
        Coach engine
      </p>
      <ol className="mt-2.5 space-y-1.5">
        {steps.map((label, index) => {
          const done = index < stepIndex
          const current = index === stepIndex
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-2 text-[13px] leading-snug',
                done || current
                  ? 'text-[var(--tt-ink,#111)]'
                  : 'text-[var(--tt-ink-faint,#9a9a9a)]',
              )}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : current ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--tt-line-strong,#d4d4d4)]" />
                )}
              </span>
              <span className={cn(current && 'font-medium')}>{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function blankGeneralContext(): AiAthleteDraftContext {
  return {
    athleteId: '',
    name: 'General athlete',
    paces: { easy: null, tempo: null, threshold: null, vo2: null },
    bikeFtpWatts: null,
    swimCssSecPer100m: null,
    hr: { max: null, resting: null },
    races: [],
    recentVolumeKm: 0,
    recentSessionsPerWeek: 0,
    consistencyPct: 50,
    weekCountLookback: 0,
    sessionCountLookback: 0,
    dataGaps: ['Training history', 'Zones', 'Upcoming race'],
    weeklyKm: [],
    recentLongestRunKm: null,
    volumeTrendPct: null,
    suggestedLevel: 'intermediate',
  }
}

function ContextBanner({ context }: { context: AiAthleteDraftContext }) {
  const isGeneral = !context.athleteId
  const avg =
    context.weeklyKm.length > 0
      ? Math.round(
          context.weeklyKm.reduce((a, b) => a + b, 0) / context.weeklyKm.length,
        )
      : null
  return (
    <div className="rounded-lg border border-[var(--tt-line,#ebebeb)] bg-[linear-gradient(135deg,#fafafa_0%,#f5f5f5_100%)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
        {isGeneral
          ? 'General plan · enter athlete data below'
          : 'Current context · from TrainTrack'}
      </p>
      <p className="mt-1.5 text-sm font-medium text-[var(--tt-ink,#111)]">
        {context.name}
      </p>
      {isGeneral ? (
        <p className="mt-1 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
          No linked athlete — set level, volume, paces, and schedule yourself.
          The plan is saved as a general library plan.
        </p>
      ) : null}
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
        <div>
          <dt className="text-[var(--tt-ink-faint,#9a9a9a)]">Weekly volume</dt>
          <dd className="font-medium tabular-nums">
            ~{context.recentVolumeKm || '—'} km
          </dd>
        </div>
        <div>
          <dt className="text-[var(--tt-ink-faint,#9a9a9a)]">Frequency</dt>
          <dd className="font-medium tabular-nums">
            {context.recentSessionsPerWeek || '—'} / wk
          </dd>
        </div>
        <div>
          <dt className="text-[var(--tt-ink-faint,#9a9a9a)]">Longest recent</dt>
          <dd className="font-medium tabular-nums">
            {context.recentLongestRunKm != null
              ? `${context.recentLongestRunKm} km`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--tt-ink-faint,#9a9a9a)]">Consistency</dt>
          <dd className="font-medium tabular-nums">{context.consistencyPct}%</dd>
        </div>
      </dl>
      {context.weeklyKm.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
            Last {context.weeklyKm.length} weeks
            {avg != null ? ` · avg ${avg} km` : ''}
            {context.volumeTrendPct != null
              ? ` · trend ${context.volumeTrendPct > 0 ? '+' : ''}${context.volumeTrendPct}%`
              : ''}
          </p>
          <div className="mt-1.5 flex h-8 items-end gap-1">
            {[...context.weeklyKm].reverse().map((km, i) => {
              const max = Math.max(...context.weeklyKm, 1)
              const h = Math.max(4, Math.round((km / max) * 28))
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-[var(--tt-ink,#111)]/70"
                  style={{ height: h }}
                  title={`${km} km`}
                />
              )
            })}
          </div>
        </div>
      ) : null}
      {context.races[0] ? (
        <p className="mt-2.5 text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
          Next race:{' '}
          <span className="font-medium text-[var(--tt-ink,#111)]">
            {context.races[0].name}
          </span>{' '}
          · {context.races[0].date}
          {context.races[0].goal ? ` · goal ${context.races[0].goal}` : ''}
        </p>
      ) : null}
    </div>
  )
}

function parseAvailableDaySet(value: unknown): Set<number> {
  if (typeof value !== 'string' || !value.trim()) return new Set()
  return new Set(
    value
      .split(',')
      .map((p) => Number(p.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6),
  )
}

function weeksUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const diff = Math.ceil(
    (target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000),
  )
  return diff > 0 ? diff : null
}

function peakVolumeSuggestion(current: number): string {
  if (current <= 0) return '—'
  const low = Math.round(current * 1.12)
  const high = Math.round(current * 1.22)
  return `${low}–${high} km`
}

function peakLongSuggestion(
  longest: number | null,
  skillSlug: string | null,
): string {
  const base = longest ?? 0
  if (skillSlug === 'run-marathon') {
    const peak = Math.min(35, Math.max(26, Math.round(base + 6)))
    return `${Math.max(22, peak - 2)}–${peak} km`
  }
  if (skillSlug === 'run-half-marathon') {
    const peak = Math.min(30, Math.max(18, Math.round(base + 4)))
    return `${Math.max(16, peak - 2)}–${peak} km`
  }
  if (base > 0) return `${Math.round(base)}–${Math.round(base + 3)} km`
  return 'Engine will set'
}

export function AiPlanWizard({
  mode,
  audience,
  skills,
  quota,
  athletes,
  defaultAthleteId,
  planId: initialPlanId,
  plans = [],
}: AiPlanWizardProps) {
  const router = useRouter()
  const filtered = useMemo(
    () => skills.filter((s) => s.kind === mode),
    [skills, mode],
  )
  const progressSteps = ADAPT_PROGRESS_STEPS
  const guideSteps = useMemo(() => {
    if (mode === 'adapt') {
      return [
        { id: 'goal' as const, label: 'Skill' },
        { id: 'athlete' as const, label: 'Athlete' },
        { id: 'style' as const, label: 'Focus' },
      ]
    }
    return [
      { id: 'goal' as const, label: 'Goal' },
      { id: 'athlete' as const, label: 'Athlete' },
      { id: 'fitness' as const, label: 'Fitness' },
      { id: 'availability' as const, label: 'Availability' },
      { id: 'style' as const, label: 'Style' },
      { id: 'review' as const, label: 'Review' },
    ]
  }, [mode])

  const [step, setStep] = useState<GuideStep>('goal')
  const [skillSlug, setSkillSlug] = useState<string | null>(null)
  const [athleteId, setAthleteId] = useState(
    defaultAthleteId ?? athletes[0]?.id ?? '',
  )
  const [planId, setPlanId] = useState(initialPlanId ?? plans[0]?.id ?? '')
  const [brief, setBrief] = useState<Record<string, string | number>>({})
  const [lockedModel, setLockedModel] = useState<'' | TrainingModelId>('')
  const [context, setContext] = useState<AiAthleteDraftContext | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paywall, setPaywall] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [progressIndex, setProgressIndex] = useState(0)

  const skill = filtered.find((s) => s.slug === skillSlug) ?? null
  const remaining =
    mode === 'draft' ? quota.draftsRemaining : quota.adaptsRemaining
  const limit = mode === 'draft' ? quota.draftsLimit : quota.adaptsLimit
  const hasMembership = Boolean(quota.membership)
  const softBlocked = !hasMembership || remaining <= 0

  const goalFields = useMemo(
    () =>
      (skill?.briefFields ?? []).filter(
        (f) =>
          !SCHEDULE_KEYS.has(f.key) &&
          !PROFILE_KEYS.has(f.key) &&
          f.key !== 'level',
      ),
    [skill],
  )

  const availableDays = useMemo(
    () => parseAvailableDaySet(brief.availableDays),
    [brief.availableDays],
  )

  const scheduleReady =
    Number(brief.daysPerWeek) >= 3 &&
    availableDays.size >= 3 &&
    brief.longRunDay !== '' &&
    brief.longRunDay != null &&
    Number(brief.currentWeeklyKm) > 0

  const goalReady = useMemo(() => {
    return goalFields.every((field) => {
      if (!field.required) return true
      const value = brief[field.key]
      if (value == null) return false
      if (typeof value === 'string') return value.trim().length > 0
      return Number.isFinite(value)
    })
  }, [goalFields, brief])

  const isGeneralPlan = mode === 'draft' && !athleteId
  const canGenerate =
    (Boolean(athleteId) || isGeneralPlan) &&
    (mode !== 'adapt' || Boolean(planId)) &&
    (mode === 'adapt' ? goalReady : scheduleReady && goalReady) &&
    !softBlocked &&
    !isPending

  useEffect(() => {
    if (!isPending) return
    setProgressIndex(0)
    const lastIndex =
      mode === 'draft'
        ? COACH_ENGINE_STEP_IDS.length - 1
        : progressSteps.length - 1
    const id = window.setInterval(() => {
      setProgressIndex((current) =>
        current >= lastIndex ? current : current + 1,
      )
    }, 1400)
    return () => window.clearInterval(id)
  }, [isPending, progressSteps.length, mode])

  // Athletes: skip athlete pick when only one athlete (self).
  useEffect(() => {
    if (
      mode === 'draft' &&
      audience === 'athlete' &&
      athleteId &&
      step === 'athlete' &&
      athletes.length <= 1
    ) {
      void loadAthleteContext(athleteId).then(() => setStep('fitness'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot skip
  }, [mode, audience, athleteId, step, athletes.length])

  async function loadAthleteContext(id: string) {
    if (!id) {
      setContext(null)
      return
    }
    setContextLoading(true)
    setContextError(null)
    try {
      const snap = await getAiAthleteDraftContext(id)
      setContext(snap)
      setBrief((prev) => {
        const next = { ...prev }
        const volume =
          snap.recentVolumeKm > 0
            ? Math.round(snap.recentVolumeKm)
            : Number(prev.currentWeeklyKm) || 30
        next.currentWeeklyKm = volume
        next.firstWeekKm = volume
        if (snap.recentSessionsPerWeek > 0) {
          next.daysPerWeek = Math.min(
            7,
            Math.max(3, Math.round(snap.recentSessionsPerWeek)),
          )
        }
        if (!next.level) next.level = snap.suggestedLevel
        if (snap.paces.easy != null) {
          next.paceEasy = formatPaceMinPerKm(snap.paces.easy)
        }
        if (snap.paces.tempo != null) {
          next.paceTempo = formatPaceMinPerKm(snap.paces.tempo)
        }
        if (snap.paces.threshold != null) {
          next.paceThreshold = formatPaceMinPerKm(snap.paces.threshold)
        }
        if (snap.paces.vo2 != null) {
          next.paceVo2 = formatPaceMinPerKm(snap.paces.vo2)
        }
        if (snap.bikeFtpWatts != null) next.bikeFtpWatts = snap.bikeFtpWatts
        if (snap.swimCssSecPer100m != null) {
          next.swimCssSecPer100m = snap.swimCssSecPer100m
        }
        if (snap.hr.max != null) next.hrMax = snap.hr.max
        if (snap.hr.resting != null) next.hrResting = snap.hr.resting

        const race = snap.races[0]
        const until = weeksUntil(race?.date)
        if (until != null && (next.weekCount == null || Number(next.weekCount) <= 0)) {
          const minW =
            skillSlug === 'run-marathon'
              ? 12
              : skillSlug === 'run-half-marathon'
                ? 8
                : 4
          const maxW =
            skillSlug === 'run-marathon'
              ? 24
              : skillSlug === 'run-half-marathon'
                ? 20
                : 16
          next.weekCount = Math.min(maxW, Math.max(minW, until))
        }
        if (race?.goal && !next.goalTime) next.goalTime = race.goal
        return next
      })
    } catch (err) {
      setContext(null)
      setContextError(
        err instanceof Error ? err.message : 'Could not load athlete data',
      )
    } finally {
      setContextLoading(false)
    }
  }

  function selectSkill(slug: string) {
    const s = filtered.find((x) => x.slug === slug)
    if (!s) return
    setSkillSlug(slug)
    const defaults: Record<string, string | number> = {}
    for (const f of s.briefFields) {
      if (f.defaultValue != null) defaults[f.key] = f.defaultValue
    }
    if (!defaults.availableDays) defaults.availableDays = '0,2,4,5'
    if (!defaults.daysPerWeek) defaults.daysPerWeek = 4
    if (!defaults.longRunDay) defaults.longRunDay = 5
    if (defaults.raceWeekday == null) defaults.raceWeekday = 6
    if (!defaults.currentWeeklyKm) defaults.currentWeeklyKm = 30
    defaults.firstWeekKm = defaults.currentWeeklyKm
    setBrief(defaults)
    setStep('athlete')
    setError(null)
    setPaywall(false)
    setContext(null)
  }

  function setVolumeKm(km: number) {
    setBrief((b) => ({
      ...b,
      currentWeeklyKm: km,
      firstWeekKm: km,
    }))
  }

  function toggleAvailableDay(day: number) {
    const next = new Set(availableDays)
    if (next.has(day)) next.delete(day)
    else next.add(day)
    const sorted = [...next].sort((a, b) => a - b)
    setBrief((b) => ({
      ...b,
      availableDays: sorted.join(','),
      daysPerWeek: Math.max(3, sorted.length),
    }))
  }

  function goNextFromAthlete() {
    if (mode === 'adapt' && !athleteId) {
      setError('Select an athlete')
      return
    }
    if (mode === 'adapt' && !planId) {
      setError('Select a plan to adapt')
      return
    }
    setError(null)
    if (mode === 'adapt') {
      setStep('style')
      return
    }
    if (!athleteId) {
      setContext(blankGeneralContext())
      setContextError(null)
      setBrief((prev) => ({
        ...prev,
        level: prev.level || 'intermediate',
        currentWeeklyKm: Number(prev.currentWeeklyKm) || 30,
        firstWeekKm: Number(prev.currentWeeklyKm) || 30,
      }))
      setStep('fitness')
      return
    }
    void loadAthleteContext(athleteId).then(() => setStep('fitness'))
  }

  function generate() {
    if (!skill) return
    if (mode === 'adapt' && (!athleteId || !planId)) {
      setError(!athleteId ? 'Select an athlete' : 'Select a plan to adapt')
      return
    }
    setError(null)
    setPaywall(false)
    const payload: Record<string, unknown> = { ...brief }
    // Engine starts from current volume — never ask the athlete for week-1 target.
    const currentKm = Number(payload.currentWeeklyKm) || 30
    payload.firstWeekKm = currentKm
    if (typeof payload.availableDays === 'string') {
      payload.daysPerWeek =
        parseAvailableDaySet(payload.availableDays).size ||
        Number(payload.daysPerWeek) ||
        4
    }
    for (const key of [
      'paceEasy',
      'paceTempo',
      'paceThreshold',
      'paceVo2',
    ] as const) {
      const raw = payload[key]
      if (typeof raw === 'string') {
        payload[key] = parsePaceMinPerKm(raw)
      }
    }
    startTransition(async () => {
      if (mode === 'draft') {
        const result = await draftAiTrainingPlan({
          skillSlug: skill.slug,
          athleteId: athleteId || null,
          brief: payload,
          lockedModel: lockedModel || null,
        })
        if (!result.ok) {
          setError(result.error)
          setPaywall(Boolean(result.paywall))
          return
        }
        setProgressIndex(COACH_ENGINE_STEP_IDS.length - 1)
        router.push(`/workouts/plans/${result.planId}`)
        return
      }

      const result = await adaptAiTrainingPlan({
        skillSlug: skill.slug,
        planId,
        athleteId,
        brief: payload,
        lockedModel: lockedModel || null,
      })
      if (!result.ok) {
        setError(result.error)
        setPaywall(Boolean(result.paywall))
        return
      }
      setProgressIndex(progressSteps.length - 1)
      router.push(`/workouts/plans/${result.planId}`)
    })
  }

  function renderBriefField(field: AiSkillListItem['briefFields'][number]) {
    return (
      <label key={field.key} className="block space-y-1.5">
        <FieldLabel required={field.required}>{field.label}</FieldLabel>
        {field.kind === 'textarea' ? (
          <textarea
            className="min-h-[88px] w-full rounded-lg border border-[var(--tt-line,#ebebeb)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--tt-ink,#111)]"
            placeholder={field.placeholder}
            value={String(brief[field.key] ?? '')}
            disabled={isPending}
            onChange={(e) =>
              setBrief((b) => ({ ...b, [field.key]: e.target.value }))
            }
          />
        ) : field.kind === 'select' ? (
          <Select
            value={String(brief[field.key] ?? '')}
            disabled={isPending}
            onChange={(e) =>
              setBrief((b) => ({ ...b, [field.key]: e.target.value }))
            }
          >
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            type={field.kind === 'number' ? 'number' : 'text'}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            value={brief[field.key] ?? ''}
            disabled={isPending}
            onChange={(e) =>
              setBrief((b) => ({
                ...b,
                [field.key]:
                  field.kind === 'number'
                    ? Number(e.target.value)
                    : e.target.value,
              }))
            }
          />
        )}
      </label>
    )
  }

  const nav = (back: GuideStep | null, next?: () => void, nextLabel = 'Continue') => (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {next ? (
        <Button type="button" onClick={next} disabled={isPending}>
          {nextLabel}
        </Button>
      ) : null}
      {back ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setStep(back)}
        >
          Back
        </Button>
      ) : null}
    </div>
  )

  const shortTitle = skill
    ? (SKILL_SHORT[skill.slug]?.short ?? skill.title)
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand,#da2f36)]">
          {audience === 'coach' ? 'Coach' : 'Athlete'} · AI coach
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[2.25rem] leading-none tracking-wide text-[var(--tt-ink,#111)] sm:text-[2.75rem]">
          {mode === 'draft' ? 'Create your training plan' : 'Adapt your plan'}
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]">
          {mode === 'draft'
            ? "Let's build a plan around you. We'll use what TrainTrack already knows and only ask what's missing."
            : 'Tell the coach engine what to fix — it replans from recent load and skips.'}
        </p>
        <p className="text-xs tabular-nums text-[var(--tt-ink-faint,#9a9a9a)]">
          {hasMembership
            ? `${remaining}/${limit} ${mode === 'draft' ? 'drafts' : 'adapts'} left`
            : 'No AI membership'}
        </p>
      </header>

      {(softBlocked || paywall) && (
        <AiPaywallBanner
          reason={
            !hasMembership
              ? 'no_membership'
              : remaining <= 0
                ? 'quota_exhausted'
                : 'skill_locked'
          }
          planName={quota.membership?.plan.name}
        />
      )}

      {step !== 'goal' ? (
        <GuideSteps steps={guideSteps} current={step} />
      ) : null}

      {/* ── Goal / skill ── */}
      {step === 'goal' ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tt-ink,#111)]">
              What are you training for?
            </h2>
            <p className="mt-1 text-[14px] text-[var(--tt-ink-soft,#6b6b6b)]">
              Pick a goal. The coach engine builds periodization, load, and
              workouts from your profile — not a chat inventing sessions.
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filtered.map((s) => {
              const locked = !s.unlocked
              const short = SKILL_SHORT[s.slug]?.short ?? s.title
              return (
                <button
                  key={s.slug}
                  type="button"
                  disabled={locked}
                  onClick={() => selectSkill(s.slug)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border border-[var(--tt-line,#e8e8e8)] bg-white p-4 text-left transition-all',
                    locked
                      ? 'cursor-not-allowed opacity-55'
                      : 'hover:border-[var(--tt-ink,#111)] hover:shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-semibold tracking-tight text-[var(--tt-ink,#111)]">
                        {short}
                        {locked ? (
                          <span className="ml-2 text-[11px] font-normal text-[var(--tt-ink-faint,#9a9a9a)]">
                            Locked
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
                        {s.description}
                      </p>
                    </div>
                    <Sparkles
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)] transition-colors group-hover:text-[var(--color-brand,#da2f36)]"
                      aria-hidden
                    />
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--tt-ink-soft,#6b6b6b)] sm:col-span-2">
                No skills available.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step !== 'goal' && skill ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tt-line,#ebebeb)] pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Building for
              </p>
              <p className="text-[15px] font-semibold text-[var(--tt-ink,#111)]">
                {shortTitle}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setStep('goal')}
              disabled={isPending}
            >
              Change goal
            </Button>
          </div>

          {/* ── Athlete ── */}
          {step === 'athlete' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Who is this plan for?</h2>
                <p className="mt-1 text-[14px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {mode === 'draft'
                    ? 'Pick a real athlete to load history and zones, or build a general plan from data you enter yourself.'
                    : 'We will load training history and zones automatically.'}
                </p>
              </div>
              {(athletes.length > 0 || audience === 'coach' || mode === 'draft') && (
                <label className="block space-y-1.5">
                  <FieldLabel required={mode === 'adapt'}>Athlete</FieldLabel>
                  <Select
                    value={athleteId}
                    onChange={(e) => {
                      setAthleteId(e.target.value)
                      setContext(null)
                    }}
                    disabled={isPending}
                  >
                    {mode === 'draft' ? (
                      <option value="">
                        General plan — enter athlete data myself
                      </option>
                    ) : null}
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              {mode === 'draft' && !athleteId ? (
                <label className="block space-y-1.5">
                  <FieldLabel>Profile name (optional)</FieldLabel>
                  <Input
                    value={String(brief.athleteName ?? '')}
                    placeholder="e.g. Intermediate half marathoner"
                    disabled={isPending}
                    onChange={(e) =>
                      setBrief((b) => ({ ...b, athleteName: e.target.value }))
                    }
                  />
                  <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                    Used only for audit context — plan stays in General (no
                    athlete assigned).
                  </p>
                </label>
              ) : null}
              {mode === 'adapt' && !initialPlanId ? (
                <label className="block space-y-1.5">
                  <FieldLabel required>Plan</FieldLabel>
                  <Select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    disabled={isPending}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}
              <FormError message={error} />
              {nav('goal', goNextFromAthlete)}
            </div>
          ) : null}

          {/* ── Fitness ── */}
          {step === 'fitness' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Current fitness</h2>
                <p className="mt-1 text-[14px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {isGeneralPlan
                    ? 'Describe the imaginary athlete: level, weekly volume, and paces. These drive the plan.'
                    : 'Review what we found. Edit only what looks wrong — overrides apply to this plan only.'}
                </p>
              </div>

              {contextLoading ? (
                <p className="flex items-center gap-2 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading {athletes.find((a) => a.id === athleteId)?.name}…
                </p>
              ) : null}
              <FormError message={contextError} />

              {context ? <ContextBanner context={context} /> : null}

              <div className="space-y-3">
                <div>
                  <FieldLabel>Athlete level</FieldLabel>
                  <p className="mt-0.5 text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                    {isGeneralPlan
                      ? 'Choose the level this general plan should target.'
                      : `Suggested from volume and long-run history${
                          context ? ` → ${context.suggestedLevel}` : ''
                        }. Adjust if needed.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map((opt) => (
                    <SuggestionChip
                      key={opt.value}
                      label={opt.label}
                      hint={opt.hint}
                      active={String(brief.level) === opt.value}
                      disabled={isPending}
                      onClick={() =>
                        setBrief((b) => ({ ...b, level: opt.value }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['paceEasy', 'Easy pace'],
                    ['paceTempo', 'Tempo pace'],
                    ['paceThreshold', 'Threshold pace'],
                    ['paceVo2', 'VO2 pace'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1.5">
                    <FieldLabel>{label}</FieldLabel>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="5:30"
                        value={String(brief[key] ?? '')}
                        disabled={isPending}
                        className="font-mono tabular-nums"
                        onChange={(e) =>
                          setBrief((b) => ({ ...b, [key]: e.target.value }))
                        }
                        onBlur={() => {
                          const raw = String(brief[key] ?? '')
                          if (!raw.trim()) return
                          const parsed = parsePaceMinPerKm(raw)
                          if (parsed == null) return
                          setBrief((b) => ({
                            ...b,
                            [key]: formatPaceMinPerKm(parsed),
                          }))
                        }}
                      />
                      <span className="shrink-0 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                        /km
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['hrMax', 'Max HR'],
                    ['hrResting', 'Resting HR'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1.5">
                    <FieldLabel>{label}</FieldLabel>
                    <Input
                      type="number"
                      value={brief[key] ?? ''}
                      disabled={isPending}
                      placeholder="—"
                      onChange={(e) =>
                        setBrief((b) => ({
                          ...b,
                          [key]:
                            e.target.value === ''
                              ? ''
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              {context?.dataGaps.length ? (
                <p className="text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  Still missing: {context.dataGaps.join(', ')}. The engine will
                  estimate where needed.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setStep('availability')}
                  disabled={contextLoading}
                >
                  Continue
                </Button>
                {audience === 'coach' || athletes.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('athlete')}
                  >
                    Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('goal')}
                  >
                    Back
                  </Button>
                )}
                {!isGeneralPlan ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={contextLoading || !athleteId}
                    onClick={() => void loadAthleteContext(athleteId)}
                  >
                    Reload data
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── Availability ── */}
          {step === 'availability' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Training availability</h2>
                <p className="mt-1 text-[14px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  Tell us when you can train and how much you’re running now.
                  The engine sets starting volume and progression — you do not
                  need to guess peak mileage.
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel required>Days available for running</FieldLabel>
                <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                  Orientation for the week — not every day must be filled.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => {
                    const selected = availableDays.has(Number(d.value))
                    return (
                      <SuggestionChip
                        key={d.value}
                        label={d.label}
                        active={selected}
                        disabled={isPending}
                        onClick={() => toggleAvailableDay(Number(d.value))}
                      />
                    )
                  })}
                </div>
                <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                  {availableDays.size} day{availableDays.size === 1 ? '' : 's'}{' '}
                  selected (min 3)
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel required>Long-run day</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => {
                    const day = Number(d.value)
                    return (
                      <SuggestionChip
                        key={d.value}
                        label={d.label}
                        active={Number(brief.longRunDay) === day}
                        disabled={isPending}
                        onClick={() => {
                          setBrief((b) => {
                            const days = parseAvailableDaySet(b.availableDays)
                            days.add(day)
                            return {
                              ...b,
                              longRunDay: day,
                              availableDays: [...days]
                                .sort((a, c) => a - c)
                                .join(','),
                              daysPerWeek: Math.max(3, days.size),
                            }
                          })
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel required>Typical weekly volume right now</FieldLabel>
                {context && context.recentVolumeKm > 0 ? (
                  <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                    Suggested from recent training: ~
                    {Math.round(context.recentVolumeKm)} km/week
                    {context.recentLongestRunKm != null
                      ? ` · longest ${context.recentLongestRunKm} km`
                      : ''}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {VOLUME_CHIPS.map((chip) => (
                    <SuggestionChip
                      key={chip.label}
                      label={chip.label}
                      active={
                        Math.abs(Number(brief.currentWeeklyKm) - chip.value) <=
                        (chip.value >= 100 ? 15 : 8)
                      }
                      disabled={isPending}
                      onClick={() => setVolumeKm(chip.value)}
                    />
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-2">
                  <span className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                    Exact
                  </span>
                  <Input
                    type="number"
                    min={5}
                    max={160}
                    className="w-24"
                    value={brief.currentWeeklyKm ?? ''}
                    disabled={isPending}
                    onChange={(e) => setVolumeKm(Number(e.target.value))}
                  />
                  <span className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
                    km/week
                  </span>
                </label>
              </div>

              {!scheduleReady ? (
                <p className="text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  Select at least 3 training days and set current volume to
                  continue.
                </p>
              ) : null}

              {nav(
                'fitness',
                scheduleReady ? () => setStep('style') : undefined,
              )}
            </div>
          ) : null}

          {/* ── Style / goal details ── */}
          {step === 'style' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {mode === 'draft' ? 'How do you like to train?' : 'Adapt focus'}
                </h2>
                <p className="mt-1 text-[14px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {mode === 'draft'
                    ? 'Preference guides workout selection — it will not override safe load or recovery rules.'
                    : 'How should the existing plan change?'}
                </p>
              </div>

              {mode === 'draft' ? (
                <div className="space-y-2">
                  <FieldLabel>Training model</FieldLabel>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {METHODOLOGY_OPTIONS.map((o) => {
                      const active = lockedModel === o.value
                      return (
                        <button
                          key={o.value || 'auto'}
                          type="button"
                          disabled={isPending}
                          onClick={() => setLockedModel(o.value)}
                          className={cn(
                            'rounded-lg border px-3 py-2.5 text-left transition-colors',
                            active
                              ? 'border-[var(--tt-ink,#111)] bg-[var(--tt-ink,#111)] text-white'
                              : 'border-[var(--tt-line,#ebebeb)] bg-white hover:border-[var(--tt-ink,#111)]',
                          )}
                        >
                          <p className="text-[13px] font-semibold">{o.label}</p>
                          <p
                            className={cn(
                              'mt-0.5 text-[12px] leading-snug',
                              active
                                ? 'text-white/70'
                                : 'text-[var(--tt-ink-faint,#9a9a9a)]',
                            )}
                          >
                            {o.hint}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">{goalFields.map(renderBriefField)}</div>

              {mode === 'adapt' ? (
                <>
                  <AdaptGenerationProgress
                    active={isPending}
                    steps={progressSteps}
                    stepIndex={progressIndex}
                  />
                  <FormError message={error} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={generate}
                      disabled={!canGenerate}
                    >
                      {isPending ? 'Adapting…' : 'Adapt plan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => setStep('athlete')}
                    >
                      Back
                    </Button>
                  </div>
                </>
              ) : (
                nav('availability', () => setStep('review'))
              )}
            </div>
          ) : null}

          {/* ── Review ── */}
          {step === 'review' ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Your training profile</h2>
                <p className="mt-1 text-[14px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  Check assumptions before we generate. Fix anything wrong with
                  Back — then the deterministic coach engine builds the plan.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--tt-line,#ebebeb)]">
                <dl className="divide-y divide-[var(--tt-line,#ebebeb)] text-[14px]">
                  {(
                    [
                      ['Goal', shortTitle ?? '—'],
                      [
                        'Plan length',
                        brief.weekCount != null
                          ? `${brief.weekCount} weeks`
                          : '—',
                      ],
                      [
                        'Target time',
                        brief.goalTime
                          ? String(brief.goalTime)
                          : 'Finish / engine estimate',
                      ],
                      [
                        'Level',
                        String(brief.level ?? context?.suggestedLevel ?? '—'),
                      ],
                      [
                        'Current volume',
                        `${brief.currentWeeklyKm ?? '—'} km/week`,
                      ],
                      [
                        'Suggested peak volume',
                        peakVolumeSuggestion(Number(brief.currentWeeklyKm) || 0),
                      ],
                      [
                        'Suggested peak long run',
                        peakLongSuggestion(
                          context?.recentLongestRunKm ?? null,
                          skillSlug,
                        ),
                      ],
                      [
                        'Running days',
                        `${availableDays.size} · long on ${
                          DAY_OPTIONS.find(
                            (d) => Number(d.value) === Number(brief.longRunDay),
                          )?.label ?? '—'
                        }`,
                      ],
                      [
                        'Methodology',
                        METHODOLOGY_OPTIONS.find((m) => m.value === lockedModel)
                          ?.label ?? 'Let AI decide',
                      ],
                      [
                        'Threshold pace',
                        brief.paceThreshold
                          ? `${brief.paceThreshold}/km`
                          : '—',
                      ],
                      context?.races[0]
                        ? [
                            'Race',
                            `${context.races[0].name} · ${context.races[0].date}`,
                          ]
                        : null,
                    ] as ([string, string] | null)[]
                  )
                    .filter(Boolean)
                    .map((row) => {
                      const [k, v] = row as [string, string]
                      return (
                        <div
                          key={k}
                          className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                        >
                          <dt className="text-[var(--tt-ink-faint,#9a9a9a)]">
                            {k}
                          </dt>
                          <dd className="text-right font-medium text-[var(--tt-ink,#111)]">
                            {v}
                          </dd>
                        </div>
                      )
                    })}
                </dl>
              </div>

              <p className="rounded-lg bg-[var(--tt-sidebar,#f5f5f5)] px-3 py-2.5 text-[13px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
                Next: architecture (phases → weekly load → long-run progression →
                intensity) → workout library → validation. The model does not
                invent the final calendar.
              </p>

              <CoachEngineProgress
                active={isPending}
                stepIndex={progressIndex}
              />
              <FormError message={error} />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={generate}
                  disabled={!canGenerate}
                  className="min-w-[140px]"
                >
                  {isPending ? 'Generating…' : 'Generate plan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setStep('style')}
                >
                  Back
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
