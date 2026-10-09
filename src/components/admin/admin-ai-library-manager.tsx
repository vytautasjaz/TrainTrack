'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SessionType, WorkoutStatus, WorkoutType, PlannedMetricSource } from '@prisma/client'
import {
  adminDeleteCoachEngineWorkout,
  adminSeedCoachEngineWorkouts,
  adminToggleCoachEngineWorkout,
  adminUpsertCoachEngineWorkout,
  type CoachEngineWorkoutAdminRow,
} from '@/app/actions/admin-ai-library'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormError } from '@/components/ui/form-error'
import { WorkoutEditorDialog } from '@/components/workout-editor/workout-editor-dialog'
import { AdminAiLibraryProgressionGraph } from '@/components/admin/admin-ai-library-progression-graph'
import { ADAPTATION_KEYS } from '@/lib/coach-engine/types'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { todayDateKey } from '@/lib/dates'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { getSessionTypeLabel } from '@/lib/workout-builder/session-modes'
import { computeStructureDiagramSnapshot } from '@/lib/workout-builder/structure-diagram'
import { cn } from '@/lib/utils'

const SPORTS = Object.values(WorkoutType)
const SESSION_TYPES = Object.values(SessionType)
const DIFFICULTIES = ['easy', 'medium', 'medium_high', 'hard']
const LOADS = ['low', 'medium', 'high']

const SPORT_TAB_ORDER: WorkoutType[] = [
  WorkoutType.RUN,
  WorkoutType.BIKE,
  WorkoutType.SWIM,
  WorkoutType.STRENGTH,
  WorkoutType.HYROX,
  WorkoutType.TRIATHLON,
  WorkoutType.RECOVERY,
  WorkoutType.REST,
]

const SESSION_GROUP_ORDER: SessionType[] = [
  SessionType.EASY_RUN,
  SessionType.RECOVERY_RUN,
  SessionType.LONG_RUN,
  SessionType.TEMPO,
  SessionType.THRESHOLD,
  SessionType.VO2_MAX,
  SessionType.INTERVALS,
  SessionType.FARTLEK,
  SessionType.RACE_PACE,
  SessionType.HILL_REPEATS,
  SessionType.BRICK,
  SessionType.STRENGTH,
  SessionType.CROSS_TRAINING,
  SessionType.HYROX,
  SessionType.CUSTOM,
]

function sessionGroupLabel(sessionType: SessionType, sport: WorkoutType) {
  // Short, library-friendly names (user asked for Easy / Threshold / Tempo / …)
  if (sport === WorkoutType.BIKE) {
    switch (sessionType) {
      case SessionType.EASY_RUN:
        return 'Easy'
      case SessionType.RECOVERY_RUN:
        return 'Recovery'
      case SessionType.LONG_RUN:
        return 'Long ride'
      case SessionType.TEMPO:
        return 'Tempo'
      case SessionType.THRESHOLD:
        return 'Threshold'
      case SessionType.VO2_MAX:
        return 'VO₂ max'
      case SessionType.INTERVALS:
        return 'Intervals'
      case SessionType.CROSS_TRAINING:
        return 'Endurance'
      default:
        break
    }
  }
  switch (sessionType) {
    case SessionType.EASY_RUN:
      return 'Easy'
    case SessionType.RECOVERY_RUN:
      return 'Recovery'
    case SessionType.LONG_RUN:
      return sport === WorkoutType.RUN ? 'Long run' : 'Long'
    case SessionType.TEMPO:
      return 'Tempo'
    case SessionType.THRESHOLD:
      return 'Threshold'
    case SessionType.VO2_MAX:
      return 'VO₂ max'
    case SessionType.INTERVALS:
      return 'Intervals / speed'
    case SessionType.FARTLEK:
      return 'Fartlek'
    case SessionType.RACE_PACE:
      return 'Race pace'
    case SessionType.HILL_REPEATS:
      return 'Hills'
    case SessionType.BRICK:
      return 'Brick'
    case SessionType.STRENGTH:
      return 'Strength'
    case SessionType.CROSS_TRAINING:
      return 'Cross-training'
    case SessionType.HYROX:
      return 'HYROX'
    case SessionType.CUSTOM:
      return sport === WorkoutType.REST ? 'Rest' : 'Custom'
    default:
      return getSessionTypeLabel(sessionType, sport)
  }
}

function sortBySessionThenTitle(a: CoachEngineWorkoutAdminRow, b: CoachEngineWorkoutAdminRow) {
  const ai = SESSION_GROUP_ORDER.indexOf(a.sessionType)
  const bi = SESSION_GROUP_ORDER.indexOf(b.sessionType)
  const aRank = ai === -1 ? 99 : ai
  const bRank = bi === -1 ? 99 : bi
  if (aRank !== bRank) return aRank - bRank
  return a.title.localeCompare(b.title)
}

function coachEngineRowToPlanDetail(
  row: CoachEngineWorkoutAdminRow,
): PlanWorkoutDetail {
  return {
    id: row.id,
    title: row.title,
    dateKey: todayDateKey(),
    type: row.sport,
    sessionType: row.sessionType,
    status: WorkoutStatus.PLANNED,
    description: row.description || null,
    plannedDistance: row.distanceKm,
    plannedDistanceMeters:
      row.sport === WorkoutType.SWIM && row.distanceKm != null
        ? Math.round(row.distanceKm * 1000)
        : null,
    plannedDuration: row.durationMin > 0 ? row.durationMin : null,
    // Structure is the source of truth — keep Manual/Auto cells in sync in the builder.
    plannedDistanceSource:
      row.hasStructure && row.distanceKm != null
        ? PlannedMetricSource.STRUCTURE
        : null,
    plannedDurationSource:
      row.hasStructure && row.durationMin > 0
        ? PlannedMetricSource.STRUCTURE
        : null,
    swimEnvironment: null,
    coachNotes: null,
    structure: row.structure,
    swimStructure: row.swimStructure,
    structureDiagram: row.structure
      ? computeStructureDiagramSnapshot(row.structure, {
          durationMinutes: row.durationMin > 0 ? row.durationMin : null,
        })
      : null,
    hasBuilderDetail: row.hasStructure,
    tags: row.tags,
    result: null,
  }
}

type FormState = {
  id: string
  title: string
  description: string
  sport: WorkoutType
  sessionType: SessionType
  primaryAdaptation: string
  durationMin: number
  distanceKm: string
  difficulty: string
  cardiovascularLoad: string
  tags: string
  intervalCount: string
  intervalDurationMin: string
  recoveryMin: string
  methodologyTags: string
  progressionTo: string
  family: string
  isActive: boolean
  sortOrder: number
}

const emptyForm = (): FormState => ({
  id: '',
  title: '',
  description: '',
  sport: WorkoutType.RUN,
  sessionType: SessionType.EASY_RUN,
  primaryAdaptation: 'aerobic_capacity',
  durationMin: 45,
  distanceKm: '',
  difficulty: 'easy',
  cardiovascularLoad: 'low',
  tags: '',
  intervalCount: '',
  intervalDurationMin: '',
  recoveryMin: '',
  methodologyTags: '',
  progressionTo: '',
  family: '',
  isActive: true,
  sortOrder: 0,
})

function rowToForm(row: CoachEngineWorkoutAdminRow): FormState {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sport: row.sport,
    sessionType: row.sessionType,
    primaryAdaptation: row.primaryAdaptation,
    durationMin: row.durationMin,
    distanceKm: row.distanceKm != null ? String(row.distanceKm) : '',
    difficulty: row.difficulty,
    cardiovascularLoad: row.cardiovascularLoad,
    tags: row.tags.join(', '),
    intervalCount: row.intervalCount != null ? String(row.intervalCount) : '',
    intervalDurationMin:
      row.intervalDurationMin != null ? String(row.intervalDurationMin) : '',
    recoveryMin: row.recoveryMin != null ? String(row.recoveryMin) : '',
    methodologyTags: row.methodologyTags.join(', '),
    progressionTo: row.progressionTo.join(', '),
    family: row.family ?? '',
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }
}

export function AdminAiLibraryManager({
  workouts,
}: {
  workouts: CoachEngineWorkoutAdminRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [filter, setFilter] = useState('')
  const [sportFilter, setSportFilter] = useState<WorkoutType | 'ALL'>('ALL')
  const [sessionFilter, setSessionFilter] = useState<SessionType | 'ALL'>('ALL')
  const [viewMode, setViewMode] = useState<'catalog' | 'graph'>('catalog')
  const [structureTarget, setStructureTarget] =
    useState<CoachEngineWorkoutAdminRow | null>(null)

  const sportCounts = useMemo(() => {
    const map = new Map<WorkoutType, number>()
    for (const w of workouts) {
      map.set(w.sport, (map.get(w.sport) ?? 0) + 1)
    }
    return map
  }, [workouts])

  const sessionCounts = useMemo(() => {
    const map = new Map<SessionType, number>()
    const pool =
      sportFilter === 'ALL'
        ? workouts
        : workouts.filter((w) => w.sport === sportFilter)
    for (const w of pool) {
      map.set(w.sessionType, (map.get(w.sessionType) ?? 0) + 1)
    }
    return map
  }, [workouts, sportFilter])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return workouts
      .filter((w) => (sportFilter === 'ALL' ? true : w.sport === sportFilter))
      .filter((w) =>
        sessionFilter === 'ALL' ? true : w.sessionType === sessionFilter,
      )
      .filter((w) => {
        if (!q) return true
        return (
          w.id.toLowerCase().includes(q) ||
          w.title.toLowerCase().includes(q) ||
          w.primaryAdaptation.toLowerCase().includes(q) ||
          w.sport.toLowerCase().includes(q) ||
          w.sessionType.toLowerCase().includes(q) ||
          sessionGroupLabel(w.sessionType, w.sport).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sportFilter === 'ALL') {
          const as = SPORT_TAB_ORDER.indexOf(a.sport)
          const bs = SPORT_TAB_ORDER.indexOf(b.sport)
          const aRank = as === -1 ? 99 : as
          const bRank = bs === -1 ? 99 : bs
          if (aRank !== bRank) return aRank - bRank
        }
        return sortBySessionThenTitle(a, b)
      })
  }, [workouts, filter, sportFilter, sessionFilter])

  const grouped = useMemo(() => {
    type SessionBucket = {
      sessionType: SessionType
      label: string
      rows: CoachEngineWorkoutAdminRow[]
    }
    type SportBucket = {
      sport: WorkoutType
      label: string
      sessions: SessionBucket[]
    }

    const bySport = new Map<WorkoutType, CoachEngineWorkoutAdminRow[]>()
    for (const w of visible) {
      const list = bySport.get(w.sport) ?? []
      list.push(w)
      bySport.set(w.sport, list)
    }

    const sports: SportBucket[] = []
    const sportKeys =
      sportFilter === 'ALL'
        ? SPORT_TAB_ORDER.filter((s) => bySport.has(s))
        : [sportFilter]

    for (const sport of sportKeys) {
      const rows = bySport.get(sport) ?? []
      if (rows.length === 0) continue
      const bySession = new Map<SessionType, CoachEngineWorkoutAdminRow[]>()
      for (const row of rows) {
        const list = bySession.get(row.sessionType) ?? []
        list.push(row)
        bySession.set(row.sessionType, list)
      }
      const sessions: SessionBucket[] = []
      for (const st of SESSION_GROUP_ORDER) {
        const list = bySession.get(st)
        if (!list?.length) continue
        sessions.push({
          sessionType: st,
          label: sessionGroupLabel(st, sport),
          rows: list,
        })
      }
      for (const [st, list] of bySession) {
        if (SESSION_GROUP_ORDER.includes(st)) continue
        sessions.push({
          sessionType: st,
          label: sessionGroupLabel(st, sport),
          rows: list,
        })
      }
      sports.push({
        sport,
        label: WORKOUT_TYPE_LABELS[sport],
        sessions,
      })
    }
    return sports
  }, [visible, sportFilter])

  function selectSport(next: WorkoutType | 'ALL') {
    setSportFilter(next)
    setSessionFilter('ALL')
  }
  function startCreate() {
    setEditing(true)
    setForm(emptyForm())
    setError(null)
    setMessage(null)
  }

  function startEdit(row: CoachEngineWorkoutAdminRow) {
    setEditing(true)
    setForm(rowToForm(row))
    setError(null)
    setMessage(null)
  }

  function save() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await adminUpsertCoachEngineWorkout({
          id: form.id,
          title: form.title,
          description: form.description,
          sport: form.sport,
          sessionType: form.sessionType,
          primaryAdaptation: form.primaryAdaptation,
          durationMin: form.durationMin,
          distanceKm: form.distanceKm === '' ? null : Number(form.distanceKm),
          difficulty: form.difficulty,
          cardiovascularLoad: form.cardiovascularLoad,
          tags: form.tags,
          intervalCount:
            form.intervalCount === '' ? null : Number(form.intervalCount),
          intervalDurationMin:
            form.intervalDurationMin === ''
              ? null
              : Number(form.intervalDurationMin),
          recoveryMin:
            form.recoveryMin === '' ? null : Number(form.recoveryMin),
          methodologyTags: form.methodologyTags,
          progressionTo: form.progressionTo,
          family: form.family || null,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        })
        setEditing(false)
        setMessage('Saved workout')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  function seed() {
    if (
      !window.confirm(
        'Upsert the code seed library into the database? Existing rows with the same IDs will be updated.',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const result = await adminSeedCoachEngineWorkouts()
        setMessage(`Seeded ${result.count} workouts`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Seed failed')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Engine workout catalog</h2>
          <p className="mt-0.5 text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
            Candidates used by AI plan generation. Empty DB falls back to the
            code seed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex overflow-hidden rounded-[8px] ring-1 ring-inset ring-[var(--tt-line,#e8e8e8)]">
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className={cn(
                'px-2.5 py-1.5 text-[12px] font-medium transition',
                viewMode === 'catalog'
                  ? 'bg-[var(--tt-ink,#111)] text-white'
                  : 'bg-white text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]',
              )}
            >
              Catalog
            </button>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={cn(
                'px-2.5 py-1.5 text-[12px] font-medium transition',
                viewMode === 'graph'
                  ? 'bg-[var(--tt-ink,#111)] text-white'
                  : 'bg-white text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]',
              )}
            >
              Graph
            </button>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={seed} disabled={isPending}>
            Seed from code
          </Button>
          <Button type="button" size="sm" onClick={startCreate} disabled={isPending}>
            Add workout
          </Button>
        </div>
      </div>

      <FormError message={error} />
      {message ? (
        <p className="text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">{message}</p>
      ) : null}

      {editing ? (
        <div className="space-y-3 rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white p-4">
          <p className="text-sm font-semibold">
            {form.id ? `Edit ${form.id}` : 'New workout'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                ID
              </span>
              <Input
                value={form.id}
                disabled={isPending}
                placeholder="RUN_EASY_03"
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Title
              </span>
              <Input
                value={form.title}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Description
              </span>
              <textarea
                className="min-h-[72px] w-full rounded-[8px] border border-[var(--tt-line,#ebebeb)] px-2.5 py-2 text-sm"
                value={form.description}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Sport
              </span>
              <Select
                value={form.sport}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sport: e.target.value as WorkoutType,
                  }))
                }
              >
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {WORKOUT_TYPE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Session type
              </span>
              <Select
                value={form.sessionType}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sessionType: e.target.value as SessionType,
                  }))
                }
              >
                {SESSION_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {sessionGroupLabel(s, form.sport)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Primary adaptation
              </span>
              <Select
                value={form.primaryAdaptation}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primaryAdaptation: e.target.value,
                  }))
                }
              >
                {ADAPTATION_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Difficulty
              </span>
              <Select
                value={form.difficulty}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, difficulty: e.target.value }))
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Duration (min)
              </span>
              <Input
                type="number"
                value={form.durationMin}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    durationMin: Number(e.target.value),
                  }))
                }
              />
              <span className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                Synced from builder structure when structure exists.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Distance (km)
              </span>
              <Input
                type="number"
                step="0.1"
                value={form.distanceKm}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, distanceKm: e.target.value }))
                }
              />
              <span className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                Synced from builder structure when structure exists.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Cardio load
              </span>
              <Select
                value={form.cardiovascularLoad}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cardiovascularLoad: e.target.value,
                  }))
                }
              >
                {LOADS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Sort order
              </span>
              <Input
                type="number"
                value={form.sortOrder}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Tags (comma-separated)
              </span>
              <Input
                value={form.tags}
                disabled={isPending}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Progression to (IDs, comma-separated)
              </span>
              <Input
                value={form.progressionTo}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, progressionTo: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={isPending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active in AI generation
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={save} disabled={isPending}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={sportFilter === 'ALL'}
            onClick={() => selectSport('ALL')}
            label={`All sports (${workouts.length})`}
          />
          {SPORT_TAB_ORDER.filter((s) => (sportCounts.get(s) ?? 0) > 0).map(
            (sport) => (
              <FilterChip
                key={sport}
                active={sportFilter === sport}
                onClick={() => selectSport(sport)}
                label={`${WORKOUT_TYPE_LABELS[sport]} (${sportCounts.get(sport) ?? 0})`}
              />
            ),
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={sessionFilter === 'ALL'}
            onClick={() => setSessionFilter('ALL')}
            label={`All types (${[...sessionCounts.values()].reduce((a, b) => a + b, 0)})`}
            muted
          />
          {SESSION_GROUP_ORDER.filter((st) => (sessionCounts.get(st) ?? 0) > 0).map(
            (st) => (
              <FilterChip
                key={st}
                active={sessionFilter === st}
                onClick={() => setSessionFilter(st)}
                label={`${sessionGroupLabel(
                  st,
                  sportFilter === 'ALL' ? WorkoutType.RUN : sportFilter,
                )} (${sessionCounts.get(st) ?? 0})`}
                muted
              />
            ),
          )}
        </div>

        <Input
          placeholder="Search id, title, type…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {viewMode === 'graph' ? (
          <AdminAiLibraryProgressionGraph
            workouts={visible}
            allWorkouts={workouts}
            onEditWorkout={(id) => {
              const row = workouts.find((w) => w.id === id)
              if (row) startEdit(row)
            }}
          />
        ) : grouped.length === 0 ? (
          <div className="rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white px-3 py-8 text-center text-[13px] text-[var(--tt-ink-faint,#9a9a9a)]">
            No workouts match — adjust filters or click “Seed from code”.
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((sportBucket) => (
              <section key={sportBucket.sport} className="space-y-3">
                {sportFilter === 'ALL' ? (
                  <h3 className="text-sm font-semibold text-[var(--tt-ink,#111)]">
                    {sportBucket.label}
                    <span className="ml-2 text-[12px] font-medium text-[var(--tt-ink-faint,#9a9a9a)]">
                      {sportBucket.sessions.reduce(
                        (n, s) => n + s.rows.length,
                        0,
                      )}
                    </span>
                  </h3>
                ) : null}

                {sportBucket.sessions.map((sessionBucket) => (
                  <div
                    key={`${sportBucket.sport}-${sessionBucket.sessionType}`}
                    className="overflow-hidden rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] px-3 py-2">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink,#111)]">
                        {sessionBucket.label}
                      </p>
                      <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                        {sessionBucket.rows.length} workout
                        {sessionBucket.rows.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <table className="w-full text-left text-[13px]">
                      <thead className="border-b border-[var(--tt-line,#f0f0f0)] text-[11px] uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                        <tr>
                          <th className="px-3 py-2 font-medium">ID</th>
                          <th className="px-3 py-2 font-medium">Title</th>
                          <th className="hidden px-3 py-2 font-medium sm:table-cell">
                            Adapt
                          </th>
                          <th className="px-3 py-2 font-medium">Duration</th>
                          <th className="px-3 py-2 font-medium">Distance</th>
                          <th className="px-3 py-2 font-medium">Builder</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {sessionBucket.rows.map((w) => (
                          <tr
                            key={w.id}
                            className="border-b border-[var(--tt-line,#f0f0f0)] last:border-0"
                          >
                            <td className="px-3 py-2 font-mono text-[12px]">
                              {w.id}
                            </td>
                            <td className="px-3 py-2">
                              <div className="min-w-0">
                                <p className="font-medium">{w.title}</p>
                                {w.description ? (
                                  <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                                    {w.description}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="hidden px-3 py-2 text-[var(--tt-ink-soft,#6b6b6b)] sm:table-cell">
                              {w.primaryAdaptation}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                              {w.durationMin > 0 ? `${w.durationMin} min` : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
                              {w.distanceKm != null ? `${w.distanceKm} km` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  w.hasStructure
                                    ? 'bg-[color-mix(in_srgb,var(--tt-ink,#111)_8%,white)] text-[var(--tt-ink,#111)]'
                                    : 'bg-[var(--tt-line,#ebebeb)] text-[var(--tt-ink-faint,#9a9a9a)]',
                                )}
                              >
                                {w.hasStructure ? 'Yes' : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  w.isActive
                                    ? 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)]'
                                    : 'bg-[var(--tt-line,#ebebeb)] text-[var(--tt-ink-faint,#9a9a9a)]',
                                )}
                              >
                                {w.isActive ? 'Active' : 'Off'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => setStructureTarget(w)}
                                >
                                  Structure
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => startEdit(w)}
                                >
                                  Meta
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      await adminToggleCoachEngineWorkout(
                                        w.id,
                                        !w.isActive,
                                      )
                                      router.refresh()
                                    })
                                  }
                                >
                                  {w.isActive ? 'Disable' : 'Enable'}
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => {
                                    if (!window.confirm(`Delete ${w.id}?`))
                                      return
                                    startTransition(async () => {
                                      await adminDeleteCoachEngineWorkout(w.id)
                                      router.refresh()
                                    })
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {structureTarget ? (
        <WorkoutEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setStructureTarget(null)
              router.refresh()
            }
          }}
          mode="ai-library"
          entityId={structureTarget.id}
          sport={structureTarget.sport}
          date={todayDateKey()}
          workout={coachEngineRowToPlanDetail(structureTarget)}
        />
      ) : null}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  muted = false,
}: {
  label: string
  active: boolean
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition',
        active
          ? 'bg-[var(--tt-ink,#111)] text-white'
          : muted
            ? 'bg-white text-[var(--tt-ink-soft,#6b6b6b)] ring-1 ring-inset ring-[var(--tt-line,#e8e8e8)] hover:text-[var(--tt-ink,#111)]'
            : 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)] hover:bg-[color-mix(in_srgb,var(--tt-ink,#111)_8%,white)]',
      )}
    >
      {label}
    </button>
  )
}
