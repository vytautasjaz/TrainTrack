/**
 * Generate marathon coach-engine drafts across lengths / levels / models
 * and write CSV files for coaching review.
 *
 * Usage:
 *   MARATHON_CSV_MODE=engine npx tsx --env-file=.env scripts/generate-beginner-marathon-csvs.mts
 *   MARATHON_CSV_MODE=both   npx tsx --env-file=.env scripts/generate-beginner-marathon-csvs.mts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { WorkoutType } from '@prisma/client'
import { buildDraftFromCollected } from '@/lib/coach-engine/pipeline'
import type { AthleteLevel, CollectedAthleteData } from '@/lib/coach-engine/types'
import type { TrainingModelId } from '@/lib/coach-engine/types'
import { isAiAvailable } from '@/lib/coach-engine/ai-adapt'
import {
  assessMarathonFeasibility,
  getMarathonPreparationStandard,
} from '@/lib/coach-engine/long-run-target'
import { describeRoadmap } from '@/lib/coach-engine/preparation-roadmap'

const OUT_DIR = path.join(process.cwd(), 'tmp', 'marathon-plan-batch')

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type Variant = {
  id: string
  label: string
  lockedModel: TrainingModelId
  level: AthleteLevel
  weekCount: number
  daysPerWeek: number
  firstWeekKm: number
  currentWeeklyKm: number
  /** Recent longest run — drives readiness / feasibility. */
  recentLongKm: number
  goalTime: string
  athleteName: string
}

/**
 * Diverse matrix: lengths × levels × models × readiness profiles.
 * Engine-only by default (fast, deterministic).
 */
const VARIANTS: Variant[] = [
  // ── 16w full development ───────────────────────────────────────
  {
    id: '16w-beg-polarized-3d-29',
    label: '16w · beginner · POLARIZED · 3d · 29 km',
    lockedModel: 'POLARIZED',
    level: 'beginner',
    weekCount: 16,
    daysPerWeek: 3,
    firstWeekKm: 29,
    currentWeeklyKm: 29,
    recentLongKm: 14,
    goalTime: '4:30',
    athleteName: 'Beg Polarized 29',
  },
  {
    id: '16w-beg-pyramidal-4d-35',
    label: '16w · beginner · PYRAMIDAL · 4d · 35 km',
    lockedModel: 'PYRAMIDAL',
    level: 'beginner',
    weekCount: 16,
    daysPerWeek: 4,
    firstWeekKm: 35,
    currentWeeklyKm: 35,
    recentLongKm: 16,
    goalTime: '4:15',
    athleteName: 'Beg Pyramidal 35',
  },
  {
    id: '16w-int-threshold-5d-45',
    label: '16w · intermediate · THRESHOLD · 5d · 45 km',
    lockedModel: 'THRESHOLD',
    level: 'intermediate',
    weekCount: 16,
    daysPerWeek: 5,
    firstWeekKm: 45,
    currentWeeklyKm: 45,
    recentLongKm: 20,
    goalTime: '3:45',
    athleteName: 'Int Threshold 45',
  },
  {
    id: '16w-adv-polarized-5d-60',
    label: '16w · advanced · POLARIZED · 5d · 60 km',
    lockedModel: 'POLARIZED',
    level: 'advanced',
    weekCount: 16,
    daysPerWeek: 5,
    firstWeekKm: 58,
    currentWeeklyKm: 60,
    recentLongKm: 26,
    goalTime: '3:10',
    athleteName: 'Adv Polarized 60',
  },
  {
    id: '16w-beg-polarized-3d-22-low',
    label: '16w · beginner · POLARIZED · 3d · 22 km (low readiness)',
    lockedModel: 'POLARIZED',
    level: 'beginner',
    weekCount: 16,
    daysPerWeek: 3,
    firstWeekKm: 22,
    currentWeeklyKm: 22,
    recentLongKm: 12,
    goalTime: '4:45',
    athleteName: 'Beg Low 22',
  },

  // ── 12w compressed development ─────────────────────────────────
  {
    id: '12w-beg-pyramidal-4d-32',
    label: '12w · beginner · PYRAMIDAL · 4d · 32 km',
    lockedModel: 'PYRAMIDAL',
    level: 'beginner',
    weekCount: 12,
    daysPerWeek: 4,
    firstWeekKm: 32,
    currentWeeklyKm: 32,
    recentLongKm: 16,
    goalTime: '4:20',
    athleteName: 'Beg 12w Pyramidal',
  },
  {
    id: '12w-int-polarized-4d-42',
    label: '12w · intermediate · POLARIZED · 4d · 42 km',
    lockedModel: 'POLARIZED',
    level: 'intermediate',
    weekCount: 12,
    daysPerWeek: 4,
    firstWeekKm: 42,
    currentWeeklyKm: 42,
    recentLongKm: 20,
    goalTime: '3:50',
    athleteName: 'Int 12w Polarized',
  },
  {
    id: '12w-adv-threshold-5d-55',
    label: '12w · advanced · THRESHOLD · 5d · 55 km',
    lockedModel: 'THRESHOLD',
    level: 'advanced',
    weekCount: 12,
    daysPerWeek: 5,
    firstWeekKm: 52,
    currentWeeklyKm: 55,
    recentLongKm: 24,
    goalTime: '3:15',
    athleteName: 'Adv 12w Threshold',
  },

  // ── 8w specific block ──────────────────────────────────────────
  {
    id: '8w-int-polarized-4d-48-ready',
    label: '8w · intermediate · POLARIZED · 4d · 48 km (ready)',
    lockedModel: 'POLARIZED',
    level: 'intermediate',
    weekCount: 8,
    daysPerWeek: 4,
    firstWeekKm: 48,
    currentWeeklyKm: 48,
    recentLongKm: 24,
    goalTime: '3:55',
    athleteName: 'Int 8w Ready',
  },
  {
    id: '8w-adv-threshold-5d-55-ready',
    label: '8w · advanced · THRESHOLD · 5d · 55 km (ready)',
    lockedModel: 'THRESHOLD',
    level: 'advanced',
    weekCount: 8,
    daysPerWeek: 5,
    firstWeekKm: 55,
    currentWeeklyKm: 55,
    recentLongKm: 26,
    goalTime: '3:20',
    athleteName: 'Adv 8w Ready',
  },
  {
    id: '8w-beg-pyramidal-3d-28-unready',
    label: '8w · beginner · PYRAMIDAL · 3d · 28 km (unready)',
    lockedModel: 'PYRAMIDAL',
    level: 'beginner',
    weekCount: 8,
    daysPerWeek: 3,
    firstWeekKm: 28,
    currentWeeklyKm: 28,
    recentLongKm: 14,
    goalTime: '4:30',
    athleteName: 'Beg 8w Unready',
  },

  // ── 6w specific ────────────────────────────────────────────────
  {
    id: '6w-adv-polarized-5d-50-ready',
    label: '6w · advanced · POLARIZED · 5d · 50 km (ready)',
    lockedModel: 'POLARIZED',
    level: 'advanced',
    weekCount: 6,
    daysPerWeek: 5,
    firstWeekKm: 50,
    currentWeeklyKm: 50,
    recentLongKm: 25,
    goalTime: '3:25',
    athleteName: 'Adv 6w Ready',
  },
  {
    id: '6w-beg-threshold-3d-25-unready',
    label: '6w · beginner · THRESHOLD · 3d · 25 km (unready)',
    lockedModel: 'THRESHOLD',
    level: 'beginner',
    weekCount: 6,
    daysPerWeek: 3,
    firstWeekKm: 25,
    currentWeeklyKm: 25,
    recentLongKm: 12,
    goalTime: '4:40',
    athleteName: 'Beg 6w Unready',
  },

  // ── 10w build+specific ─────────────────────────────────────────
  {
    id: '10w-int-pyramidal-4d-40',
    label: '10w · intermediate · PYRAMIDAL · 4d · 40 km',
    lockedModel: 'PYRAMIDAL',
    level: 'intermediate',
    weekCount: 10,
    daysPerWeek: 4,
    firstWeekKm: 40,
    currentWeeklyKm: 40,
    recentLongKm: 18,
    goalTime: '3:55',
    athleteName: 'Int 10w Pyramidal',
  },

  // ── 20w deep base ──────────────────────────────────────────────
  {
    id: '20w-beg-polarized-3d-28',
    label: '20w · beginner · POLARIZED · 3d · 28 km',
    lockedModel: 'POLARIZED',
    level: 'beginner',
    weekCount: 20,
    daysPerWeek: 3,
    firstWeekKm: 28,
    currentWeeklyKm: 28,
    recentLongKm: 14,
    goalTime: '4:25',
    athleteName: 'Beg 20w Polarized',
  },

  // ── 4w race prep (high readiness only) ─────────────────────────
  {
    id: '4w-adv-threshold-5d-58-ready',
    label: '4w · advanced · THRESHOLD · 5d · 58 km (race prep)',
    lockedModel: 'THRESHOLD',
    level: 'advanced',
    weekCount: 4,
    daysPerWeek: 5,
    firstWeekKm: 55,
    currentWeeklyKm: 58,
    recentLongKm: 28,
    goalTime: '3:05',
    athleteName: 'Adv 4w RacePrep',
  },
]

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function fixtureData(
  name: string,
  weeklyKm: number,
  recentLongKm: number,
  level: AthleteLevel,
): CollectedAthleteData {
  const easy =
    level === 'advanced' ? 5.2 : level === 'intermediate' ? 5.5 : 5.8
  return {
    athleteId: `gen_${name.replace(/\s+/g, '_').toLowerCase()}`,
    name,
    paces: {
      easy,
      tempo: easy - 0.7,
      threshold: easy - 1.0,
      vo2: easy - 1.5,
    },
    bikeFtpWatts: null,
    swimCssSecPer100m: null,
    hr: { max: 188, resting: 52 },
    races: [
      {
        name: 'City Marathon',
        date: '2027-04-18',
        type: 'MARATHON',
        sport: 'RUN',
        priority: 'A',
        goal: '4:30',
      },
    ],
    recentSessions: [
      {
        date: '2026-10-01',
        type: WorkoutType.RUN,
        title: 'Easy',
        status: 'COMPLETED',
        plannedDistanceKm: Math.max(6, Math.round(weeklyKm * 0.25)),
        plannedDurationMin: 45,
        actualDistanceKm: Math.max(6, Math.round(weeklyKm * 0.25)),
        actualDurationMin: 48,
        rpe: 5,
        estimatedTss: 40,
      },
      {
        date: '2026-09-27',
        type: WorkoutType.RUN,
        title: 'Long',
        status: 'COMPLETED',
        plannedDistanceKm: recentLongKm,
        plannedDurationMin: Math.round(recentLongKm * easy),
        actualDistanceKm: recentLongKm,
        actualDurationMin: Math.round(recentLongKm * easy),
        rpe: 6,
        estimatedTss: Math.round(recentLongKm * 5),
      },
    ],
    weekSummaries: [0, 1, 2, 3].map((i) => ({
      weekStart: `2026-09-${String(29 - i * 7).padStart(2, '0')}`,
      planned: 3,
      completed: 3,
      skipped: 0,
      plannedDistanceKm: weeklyKm,
      completedDistanceKm: Math.round(weeklyKm * 0.95),
      estimatedTss: Math.round(weeklyKm * 4.5),
    })),
  }
}

function draftToCsv(args: {
  title: string
  sessions: Array<{
    weekIndex: number
    dayOfWeek: number
    type: string
    sessionType: string
    title: string
    description: string | null
    plannedDistance: number | null
    plannedDuration: number | null
    coachNotes: string | null
    tags: string[]
    candidateId?: string | null
  }>
  phases: Array<{ label: string | null; startDay: number; endDay: number }>
}): string {
  const headers = [
    'week',
    'day',
    'day_name',
    'kind',
    'sport',
    'session_type',
    'title',
    'description',
    'distance_km',
    'duration_min',
    'coach_notes',
    'tags',
    'candidate_id',
    'phase',
  ]

  const phaseFor = (weekIndex: number, dayOfWeek: number) => {
    const dayIndex = weekIndex * 7 + dayOfWeek
    const phase = args.phases.find(
      (p) => dayIndex >= p.startDay && dayIndex <= p.endDay,
    )
    return phase?.label?.trim() || ''
  }

  const rows = [...args.sessions]
    .sort(
      (a, b) =>
        a.weekIndex - b.weekIndex ||
        a.dayOfWeek - b.dayOfWeek ||
        a.title.localeCompare(b.title),
    )
    .map((s) => [
      String(s.weekIndex + 1),
      String(s.dayOfWeek + 1),
      DAY_NAMES[s.dayOfWeek] ?? '',
      s.tags.includes('race-day') ? 'race' : 'session',
      s.type,
      s.sessionType,
      s.title,
      s.description ?? '',
      s.plannedDistance != null ? String(s.plannedDistance) : '',
      s.plannedDuration != null ? String(s.plannedDuration) : '',
      s.coachNotes ?? '',
      s.tags.join('; '),
      s.candidateId ?? '',
      phaseFor(s.weekIndex, s.dayOfWeek),
    ])

  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n') +
    '\n'
  )
}

function weekSummaryCsv(
  sessions: Array<{
    weekIndex: number
    sessionType: string
    plannedDistance: number | null
    tags: string[]
    candidateId?: string | null
  }>,
): string {
  const byWeek = new Map<
    number,
    {
      km: number
      long: number
      sessions: number
      quality: number
      mpish: number
    }
  >()
  for (const s of sessions) {
    const race = s.tags.includes('race-day')
    const row = byWeek.get(s.weekIndex) ?? {
      km: 0,
      long: 0,
      sessions: 0,
      quality: 0,
      mpish: 0,
    }
    if (!race) {
      row.km += s.plannedDistance ?? 0
      row.sessions += 1
      if (s.sessionType === 'LONG_RUN') {
        row.long = Math.max(row.long, s.plannedDistance ?? 0)
      }
      if (
        s.sessionType === 'THRESHOLD' ||
        s.sessionType === 'TEMPO' ||
        s.sessionType === 'VO2_MAX' ||
        s.sessionType === 'INTERVALS' ||
        s.sessionType === 'RACE_PACE'
      ) {
        row.quality += 1
      }
      if (
        (s.candidateId ?? '').includes('MP_') ||
        s.tags.some((t) => /mp-specific|marathon/i.test(t))
      ) {
        row.mpish += 1
      }
    } else {
      row.long = Math.max(row.long, s.plannedDistance ?? 0)
    }
    byWeek.set(s.weekIndex, row)
  }
  const headers = [
    'week',
    'sessions',
    'training_km',
    'long_run_km',
    'quality_sessions',
    'mpish_sessions',
    'lr_week_ratio',
  ]
  const rows = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([w, v]) => {
      const ratio =
        v.long > 0 && v.km > 0 ? (Math.round((v.long / v.km) * 100) / 100).toString() : ''
      return [
        String(w + 1),
        String(v.sessions),
        (Math.round(v.km * 10) / 10).toString(),
        (Math.round(v.long * 10) / 10).toString(),
        String(v.quality),
        String(v.mpish),
        ratio,
      ]
    })
  return [headers, ...rows].map((r) => r.join(',')).join('\n') + '\n'
}

async function writeVariant(args: {
  v: Variant
  allowAi: boolean
  suffix: string
  indexLines: string[]
}) {
  const { v, allowAi, suffix, indexLines } = args
  console.log(`\n=== ${v.id}${suffix} (${v.label}, ai=${allowAi}) ===`)
  const started = Date.now()

  const feasibility = assessMarathonFeasibility({
    level: v.level,
    weekCount: v.weekCount,
    currentWeeklyKm: v.currentWeeklyKm,
    recentLongestRunKm: v.recentLongKm,
    daysPerWeek: v.daysPerWeek,
  })
  const standard = getMarathonPreparationStandard({ level: v.level })
  const roadmap = describeRoadmap(v.weekCount)

  try {
    const result = await buildDraftFromCollected({
      data: fixtureData(
        v.athleteName,
        v.currentWeeklyKm,
        v.recentLongKm,
        v.level,
      ),
      skillSlug: 'run-marathon',
      brief: {
        weekCount: v.weekCount,
        level: v.level,
        daysPerWeek: v.daysPerWeek,
        firstWeekKm: v.firstWeekKm,
        currentWeeklyKm: v.currentWeeklyKm,
        athleteName: v.athleteName,
        notes: `Batch export: ${v.label}`,
        target: v.goalTime,
        goalTime: v.goalTime,
      },
      allowAi,
      lockedModel: v.lockedModel,
    })

    const sessions = result.draft.sessions
    const trainingByWeek = new Map<number, number>()
    const longByWeek = new Map<number, number>()
    for (const s of sessions) {
      if (s.tags.includes('race-day')) continue
      trainingByWeek.set(
        s.weekIndex,
        (trainingByWeek.get(s.weekIndex) ?? 0) + (s.plannedDistance ?? 0),
      )
      if (s.sessionType === 'LONG_RUN') {
        longByWeek.set(
          s.weekIndex,
          Math.max(longByWeek.get(s.weekIndex) ?? 0, s.plannedDistance ?? 0),
        )
      }
    }
    const peakWeek = Math.max(0, ...trainingByWeek.values())
    const peakLong = Math.max(0, ...longByWeek.values())
    const runsOver30 = [...longByWeek.values()].filter((km) => km >= 30).length
    const runsOver28 = [...longByWeek.values()].filter((km) => km >= 28).length
    const meetsMin =
      peakWeek + 0.05 >= standard.minimumPeakWeeklyKm &&
      peakLong + 0.05 >= standard.minimumPeakLongRunKm &&
      runsOver30 >= standard.minimumRunsOver30Km &&
      runsOver28 >= standard.minimumRunsOver28Km

    const base = `Marathon-${v.weekCount}w-${v.level}-${v.id}${suffix}`
    await writeFile(
      path.join(OUT_DIR, `${base}.csv`),
      draftToCsv({
        title: result.draft.title,
        sessions,
        phases: result.draft.phases,
      }),
      'utf8',
    )
    await writeFile(
      path.join(OUT_DIR, `${base}-week-summary.csv`),
      weekSummaryCsv(sessions),
      'utf8',
    )
    await writeFile(
      path.join(OUT_DIR, `${base}-meta.txt`),
      [
        `variant: ${v.label}`,
        `title: ${result.draft.title}`,
        `weekCount: ${v.weekCount}`,
        `level: ${v.level}`,
        `model: ${result.meta.methodology.selectedModel}`,
        `usedAi: ${result.usedAi}`,
        `preparationDepth: ${feasibility.preparationDepth}`,
        `readiness: ${feasibility.readiness}`,
        `feasibilityPathway: ${feasibility.pathway}`,
        `feasibilityOk: ${feasibility.feasible}`,
        `feasibilityReasons: ${feasibility.reasons.join(' | ') || '(none)'}`,
        `roadmap: ${roadmap.weeks.map((w) => w.band).join(' → ')}`,
        `tokensIn: ${result.tokensIn}`,
        `tokensOut: ${result.tokensOut}`,
        `planScore: ${result.meta.planScore}`,
        `requiresReview: ${result.meta.requiresReview}`,
        `peakWeekKm: ${Math.round(peakWeek * 10) / 10}`,
        `peakLongKm: ${Math.round(peakLong * 10) / 10}`,
        `runsOver28: ${runsOver28}`,
        `runsOver30: ${runsOver30}`,
        `meetsMinimumStandard: ${meetsMin}`,
        `standardMinPeakWeek: ${standard.minimumPeakWeeklyKm}`,
        `standardMinPeakLong: ${standard.minimumPeakLongRunKm}`,
        `elapsedSec: ${Math.round((Date.now() - started) / 1000)}`,
        '',
        '--- guidelines (excerpt) ---',
        (result.guidelines || '').slice(0, 4000),
      ].join('\n'),
      'utf8',
    )

    indexLines.push(
      `| ${base}.csv | ${v.label} | ${result.meta.methodology.selectedModel} | ${feasibility.preparationDepth} | ${feasibility.readiness} | ${feasibility.feasible ? 'yes' : 'NO'} | ${Math.round(peakWeek * 10) / 10} | ${Math.round(peakLong * 10) / 10} | ${runsOver28}/${runsOver30} | ${meetsMin ? 'yes' : 'NO'} |`,
    )
    console.log(
      `ok ${base}.csv · depth=${feasibility.preparationDepth} ready=${feasibility.readiness} peak=${peakWeek.toFixed(1)}/${peakLong.toFixed(1)} ≥28=${runsOver28} ≥30=${runsOver30} meets=${meetsMin}`,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const base = `Marathon-${v.weekCount}w-${v.level}-${v.id}${suffix}`
    await writeFile(
      path.join(OUT_DIR, `${base}-FAILED.txt`),
      [
        `variant: ${v.label}`,
        `error: ${message}`,
        `preparationDepth: ${feasibility.preparationDepth}`,
        `readiness: ${feasibility.readiness}`,
        `feasibilityOk: ${feasibility.feasible}`,
        `feasibilityReasons: ${feasibility.reasons.join(' | ') || '(none)'}`,
        `roadmap: ${roadmap.weeks.map((w) => w.band).join(' → ')}`,
      ].join('\n'),
      'utf8',
    )
    indexLines.push(
      `| ${base}-FAILED | ${v.label} | — | ${feasibility.preparationDepth} | ${feasibility.readiness} | ${feasibility.feasible ? 'yes' : 'NO'} | — | — | — | FAIL |`,
    )
    console.error(`FAIL ${v.id}: ${message}`)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const mode = (process.env.MARATHON_CSV_MODE ?? 'engine').toLowerCase()
  const wantEngine = mode === 'engine' || mode === 'both'
  const wantAi = mode === 'ai' || mode === 'both'
  console.log(`AI available: ${isAiAvailable()}`)
  console.log(`Output: ${OUT_DIR} (mode=${mode})`)
  console.log(`Variants: ${VARIANTS.length}`)

  const indexLines: string[] = [
    '# Marathon plan batch (engine review)',
    '',
    'Discrete roadmaps by length × readiness — not 16w compressed.',
    '',
    `| File | Variant | Model | Depth | Readiness | Feasible | Peak week | Peak long | ≥28/≥30 | Meets std |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  ]

  for (const v of VARIANTS) {
    if (wantEngine) {
      await writeVariant({
        v,
        allowAi: false,
        suffix: '-engine',
        indexLines,
      })
    }
    if (wantAi) {
      await writeVariant({ v, allowAi: true, suffix: '', indexLines })
    }
  }

  await writeFile(
    path.join(OUT_DIR, 'README.md'),
    indexLines.join('\n') + '\n',
    'utf8',
  )
  console.log(`\nDone. Index: ${path.join(OUT_DIR, 'README.md')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
