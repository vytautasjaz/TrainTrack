/**
 * Sport-specific planning architectures: volume units, session mix, interference.
 * Keeps blueprint/capacity from assuming every sport is run-km + long-run.
 */
import { WorkoutType } from '@prisma/client'
import type {
  AthleteLevel,
  DemandProfileId,
  PlannedSession,
  SportArchitecture,
  SportArchitectureId,
  SportInterferenceRule,
  SportModality,
  SportVolumeChannel,
  SportVolumeUnit,
  ValidationError,
  WeeklyModalityVolume,
} from '@/lib/coach-engine/types'

function channel(args: {
  modality: SportModality
  unit: SportVolumeUnit
  label: string
  baselineTarget: number
  presentMax: number
  peakMax: number
  sessionShare: number
}): SportVolumeChannel {
  return args
}

const RUN_INTERFERENCE: SportInterferenceRule[] = [
  {
    a: 'run',
    b: 'strength',
    requireHard: true,
    maxDayGap: 1,
    severity: 'high',
    message: 'Hard run adjacent to lower-body strength.',
  },
]

const HYROX_INTERFERENCE: SportInterferenceRule[] = [
  {
    a: 'run',
    b: 'strength',
    requireHard: true,
    maxDayGap: 1,
    severity: 'high',
    message: 'Hard run adjacent to station/strength work.',
  },
  {
    a: 'run',
    b: 'hyrox',
    requireHard: true,
    maxDayGap: 1,
    severity: 'high',
    message: 'Hard run adjacent to HYROX simulation/stations.',
  },
  {
    a: 'hyrox',
    b: 'strength',
    requireHard: false,
    maxDayGap: 1,
    severity: 'medium',
    message: 'HYROX simulation adjacent to heavy strength.',
  },
]

const MULTI_INTERFERENCE: SportInterferenceRule[] = [
  {
    a: 'run',
    b: 'strength',
    requireHard: true,
    maxDayGap: 1,
    severity: 'high',
    message: 'Hard run adjacent to lower-body strength.',
  },
  {
    a: 'bike',
    b: 'run',
    requireHard: true,
    maxDayGap: 0,
    severity: 'low',
    message: 'Hard bike and hard run on the same day (brick risk).',
  },
  {
    a: 'swim',
    b: 'run',
    requireHard: true,
    maxDayGap: 0,
    severity: 'low',
    message: 'Hard swim and hard run stacked same day.',
  },
  {
    a: 'bike',
    b: 'strength',
    requireHard: true,
    maxDayGap: 1,
    severity: 'medium',
    message: 'Hard bike adjacent to heavy lower-body strength.',
  },
]

function runArchitecture(level: AthleteLevel = 'intermediate'): SportArchitecture {
  const runBase = level === 'beginner' ? 30 : level === 'elite' ? 70 : 45
  return {
    id: 'run_endurance',
    primaryModality: 'run',
    primaryUnit: 'run_km',
    usesLongRunKey: true,
    usesStationVolume: false,
    usesMultiSportMix: false,
    channels: [
      channel({
        modality: 'run',
        unit: 'run_km',
        label: 'Running volume',
        baselineTarget: runBase,
        presentMax: Math.round(runBase * 1.08 * 10) / 10,
        peakMax: Math.round(runBase * 1.35 * 10) / 10,
        sessionShare: 1,
      }),
    ],
    interferenceRules: RUN_INTERFERENCE,
  }
}

function hyroxArchitecture(level: AthleteLevel = 'intermediate'): SportArchitecture {
  const runBase = level === 'beginner' ? 20 : level === 'elite' ? 45 : 30
  const stations = level === 'beginner' ? 24 : level === 'elite' ? 48 : 36
  return {
    id: 'hyrox',
    primaryModality: 'hyrox',
    primaryUnit: 'strength_stations',
    usesLongRunKey: false,
    usesStationVolume: true,
    usesMultiSportMix: false,
    channels: [
      channel({
        modality: 'run',
        unit: 'run_km',
        label: 'Compromised / race-run volume',
        baselineTarget: runBase,
        presentMax: Math.round(runBase * 1.08 * 10) / 10,
        peakMax: Math.round(runBase * 1.25 * 10) / 10,
        sessionShare: 0.45,
      }),
      channel({
        modality: 'strength',
        unit: 'strength_stations',
        label: 'Station volume',
        baselineTarget: stations,
        presentMax: Math.round(stations * 1.1),
        peakMax: Math.round(stations * 1.3),
        sessionShare: 0.35,
      }),
      channel({
        modality: 'hyrox',
        unit: 'session_minutes',
        label: 'HYROX simulation minutes',
        baselineTarget: level === 'beginner' ? 40 : 55,
        presentMax: level === 'beginner' ? 50 : 70,
        peakMax: level === 'beginner' ? 65 : 90,
        sessionShare: 0.2,
      }),
    ],
    interferenceRules: HYROX_INTERFERENCE,
  }
}

function multiArchitecture(level: AthleteLevel = 'intermediate'): SportArchitecture {
  const runBase = level === 'beginner' ? 20 : level === 'elite' ? 45 : 30
  const bikeMin = level === 'beginner' ? 120 : level === 'elite' ? 300 : 180
  const swimM = level === 'beginner' ? 3000 : level === 'elite' ? 8000 : 5000
  return {
    id: 'multi_sport',
    primaryModality: 'run',
    primaryUnit: 'run_km',
    usesLongRunKey: true,
    usesStationVolume: false,
    usesMultiSportMix: true,
    channels: [
      channel({
        modality: 'run',
        unit: 'run_km',
        label: 'Running volume',
        baselineTarget: runBase,
        presentMax: Math.round(runBase * 1.08 * 10) / 10,
        peakMax: Math.round(runBase * 1.28 * 10) / 10,
        sessionShare: 0.35,
      }),
      channel({
        modality: 'bike',
        unit: 'bike_minutes',
        label: 'Bike duration',
        baselineTarget: bikeMin,
        presentMax: Math.round(bikeMin * 1.1),
        peakMax: Math.round(bikeMin * 1.3),
        sessionShare: 0.35,
      }),
      channel({
        modality: 'swim',
        unit: 'swim_meters',
        label: 'Swim distance',
        baselineTarget: swimM,
        presentMax: Math.round(swimM * 1.1),
        peakMax: Math.round(swimM * 1.25),
        sessionShare: 0.25,
      }),
      channel({
        modality: 'strength',
        unit: 'strength_stations',
        label: 'Strength touch',
        baselineTarget: 12,
        presentMax: 16,
        peakMax: 20,
        sessionShare: 0.05,
      }),
    ],
    interferenceRules: MULTI_INTERFERENCE,
  }
}

const BY_ID: Record<SportArchitectureId, (level?: AthleteLevel) => SportArchitecture> =
  {
    run_endurance: runArchitecture,
    hyrox: hyroxArchitecture,
    multi_sport: multiArchitecture,
  }

export function sportArchitectureIdForDemand(
  demandId: DemandProfileId,
): SportArchitectureId {
  if (demandId === 'HYROX_V1') return 'hyrox'
  if (demandId === 'MULTI_BASE_V1') return 'multi_sport'
  return 'run_endurance'
}

export function resolveSportArchitecture(args: {
  demandId: DemandProfileId
  level?: AthleteLevel
}): SportArchitecture {
  const id = sportArchitectureIdForDemand(args.demandId)
  return BY_ID[id](args.level ?? 'intermediate')
}

/** Scale architecture channel baselines to the athlete's declared/history volume. */
export function scaleArchitectureChannels(
  architecture: SportArchitecture,
  args: {
    runKmBaseline: number
    readinessFactor?: number
  },
): SportVolumeChannel[] {
  const readiness = args.readinessFactor ?? 1
  const runCh = architecture.channels.find((c) => c.modality === 'run')
  const scale =
    runCh && runCh.baselineTarget > 0
      ? clamp(args.runKmBaseline / runCh.baselineTarget, 0.7, 1.6)
      : 1

  return architecture.channels.map((ch) => {
    if (ch.modality === 'run' && ch.unit === 'run_km') {
      const baseline = Math.round(args.runKmBaseline * 10) / 10
      return {
        ...ch,
        baselineTarget: baseline,
        presentMax: Math.round(baseline * 1.08 * readiness * 10) / 10,
        peakMax: Math.round(ch.peakMax * scale * readiness * 10) / 10,
      }
    }
    return {
      ...ch,
      baselineTarget: Math.round(ch.baselineTarget * scale),
      presentMax: Math.round(ch.presentMax * scale * readiness),
      peakMax: Math.round(ch.peakMax * scale * Math.max(0.95, readiness)),
    }
  })
}

export function modalityCapsFromChannels(
  channels: SportVolumeChannel[],
): WeeklyModalityVolume[] {
  return channels.map((ch) => ({
    modality: ch.modality,
    unit: ch.unit,
    target: ch.baselineTarget,
    max: ch.presentMax,
  }))
}

/** Scale modality targets for a given week volume scale (dose curve). */
export function scaleModalityVolumesForWeek(
  channels: SportVolumeChannel[],
  volumeScale: number,
  kind: 'baseline' | 'build' | 'deload' | 'peak' | 'taper' | 'race',
): WeeklyModalityVolume[] {
  const scale =
    kind === 'deload'
      ? Math.min(volumeScale, 0.85)
      : kind === 'taper'
        ? Math.min(volumeScale, 0.75)
        : kind === 'race'
          ? Math.min(volumeScale, 0.45)
          : volumeScale

  return channels.map((ch) => {
    const target = Math.round(ch.baselineTarget * scale * 10) / 10
    const climbMax = ch.baselineTarget + (ch.peakMax - ch.baselineTarget) * Math.min(1, scale)
    const max = Math.round(Math.max(target, Math.min(ch.peakMax, climbMax)) * 10) / 10
    return {
      modality: ch.modality,
      unit: ch.unit,
      target,
      max: Math.max(target, max),
    }
  })
}

export function modalityOfSession(session: PlannedSession): SportModality {
  if (session.type === WorkoutType.BIKE) return 'bike'
  if (session.type === WorkoutType.SWIM) return 'swim'
  if (session.type === WorkoutType.STRENGTH) return 'strength'
  if (session.type === WorkoutType.HYROX) return 'hyrox'
  if (
    session.tags.some((t) => /hyrox|station|sled|wall.?ball|lunges?/i.test(t))
  ) {
    return 'hyrox'
  }
  if (session.tags.some((t) => /strength|gym|lift/i.test(t))) return 'strength'
  return 'run'
}

function sessionIsHardForInterference(session: PlannedSession): boolean {
  if (session.tags.includes('race-day')) return true
  if (session.isKeySession) return true
  if (
    session.sessionType === 'THRESHOLD' ||
    session.sessionType === 'TEMPO' ||
    session.sessionType === 'VO2_MAX' ||
    session.sessionType === 'INTERVALS' ||
    session.sessionType === 'RACE_PACE' ||
    session.sessionType === 'HILL_REPEATS'
  ) {
    return true
  }
  return session.tags.some((t) =>
    /threshold|vo2|hm-specific|quality|norwegian|simulation|heavy/i.test(t),
  )
}

function dayGap(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 7 - d)
}

function ruleMatchesPair(
  rule: SportInterferenceRule,
  ma: SportModality,
  mb: SportModality,
): boolean {
  return (
    (rule.a === ma && rule.b === mb) || (rule.a === mb && rule.b === ma)
  )
}

/**
 * Evaluate cross-sport interference using the architecture rule table.
 * Falls back to hard-run ↔ strength when no architecture is supplied.
 */
export function findSportInterferenceErrors(
  sessions: PlannedSession[],
  architecture?: SportArchitecture | null,
): ValidationError[] {
  const rules =
    architecture?.interferenceRules ??
    RUN_INTERFERENCE
  const errors: ValidationError[] = []
  const sorted = [...sessions]
    .filter((s) => s.type !== 'REST')
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i]!
      const b = sorted[j]!
      const gap = dayGap(a.dayOfWeek, b.dayOfWeek)
      const ma = modalityOfSession(a)
      const mb = modalityOfSession(b)
      if (ma === mb) continue

      for (const rule of rules) {
        if (!ruleMatchesPair(rule, ma, mb)) continue
        if (gap > rule.maxDayGap) continue
        if (rule.requireHard) {
          const hardA = sessionIsHardForInterference(a)
          const hardB = sessionIsHardForInterference(b)
          // For run↔strength, the run side must be hard (matches prior behavior).
          if (rule.a === 'run' || rule.b === 'run') {
            const runHard =
              (ma === 'run' && hardA) || (mb === 'run' && hardB)
            if (!runHard) continue
          } else if (!hardA && !hardB) {
            continue
          }
        }
        // Skip low-severity same-day bike↔run unless both hard.
        if (rule.severity === 'low' && gap === 0) {
          if (
            !sessionIsHardForInterference(a) ||
            !sessionIsHardForInterference(b)
          ) {
            continue
          }
        }
        if (rule.severity === 'low' && gap > 0) continue

        errors.push({
          type: 'INTERFERENCE',
          message: `${rule.message} (days ${a.dayOfWeek}→${b.dayOfWeek}).`,
        })
      }
    }
  }

  // Deduplicate identical messages.
  const seen = new Set<string>()
  return errors.filter((e) => {
    if (seen.has(e.message)) return false
    seen.add(e.message)
    return true
  })
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function sportFocusForArchitecture(
  id: SportArchitectureId,
): WorkoutType {
  if (id === 'hyrox') return WorkoutType.HYROX
  if (id === 'multi_sport') return WorkoutType.TRIATHLON
  return WorkoutType.RUN
}
