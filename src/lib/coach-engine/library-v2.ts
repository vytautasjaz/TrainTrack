import type {
  AthleteLevel,
  CandidateWorkout,
  MethodologySelection,
  TrainingModelId,
  WeeklySlot,
  WorkoutAdaptations,
} from '@/lib/coach-engine/types'
import {
  findCandidatesForSlot as baseFind,
  getWorkoutById,
  listWorkoutLibrary,
} from '@/lib/coach-engine/library'
import { WorkoutType } from '@prisma/client'
import {
  clampThresholdAdaptations,
  scoreThresholdVolumeFit,
} from '@/lib/coach-engine/volume-guards'
import { longProfileMatch } from '@/lib/coach-engine/long-run-target'
import {
  qualityShapeForSlot,
  qualityShapeMatchers,
  type IntensityBand,
  type QualityShape,
} from '@/lib/coach-engine/intensity-ramp'

/** Progression edges (V2 §49): id → allowed next ids. */
import { DETAILED_PROGRESSION_GRAPH } from '@/lib/coach-engine/library-seed'

export const PROGRESSION_GRAPH: Record<string, string[]> =
  DETAILED_PROGRESSION_GRAPH

export function progressionTargets(fromId: string): string[] {
  const from = getWorkoutById(fromId)
  if (from?.progressionTo?.length) return from.progressionTo
  return PROGRESSION_GRAPH[fromId] ?? []
}

export function canProgressTo(fromId: string, toId: string): boolean {
  const edges = progressionTargets(fromId)
  if (!edges.length) return fromId !== toId
  return edges.includes(toId)
}

/** Stable numeric suffix for ordering siblings (RUN_THRESHOLD_03 → 3). */
function workoutSeriesRank(id: string): number {
  const match = id.match(/_(\d+)$/)
  return match ? Number.parseInt(match[1]!, 10) : 0
}

function seriesPrefix(id: string): string {
  return id.replace(/_\d+$/, '')
}

/**
 * Norwegian double-threshold halves:
 * AM = longer controlled reps (≈5–10′ or 1–2 km)
 * PM = shorter controlled reps (≈400–1000 m / ≤3′)
 */
export function matchesDoubleThresholdPart(
  candidate: CandidateWorkout,
  part: 'am' | 'pm',
): boolean {
  const tags = candidate.tags.join(' ').toLowerCase()
  const title = candidate.title.toLowerCase()
  const blob = `${tags} ${title} ${candidate.id}`
  if (part === 'am') {
    if (/double-threshold-am/.test(blob)) return true
    if (/double-threshold-pm/.test(blob)) return false
    if (
      (candidate.intervalDurationMin != null &&
        candidate.intervalDurationMin >= 5) ||
      /cruise|extended|1k|1\.5|2\s*km|long threshold|threshold blocks/i.test(
        blob,
      )
    ) {
      return candidate.tags.some((t) => /threshold|norwegian/i.test(t))
    }
    return false
  }
  // PM
  if (/double-threshold-pm/.test(blob)) return true
  if (/double-threshold-am/.test(blob)) return false
  if (
    /400|short threshold|25\s*[×x]|20\s*[×x]/i.test(blob) ||
    (candidate.intervalDurationMin != null &&
      candidate.intervalDurationMin > 0 &&
      candidate.intervalDurationMin <= 3)
  ) {
    return candidate.tags.some((t) =>
      /threshold|norwegian|fartlek|quality/i.test(t),
    )
  }
  return false
}

export function filterByMethodology(
  candidates: CandidateWorkout[],
  methodology?: MethodologySelection,
): CandidateWorkout[] {
  if (!methodology) return candidates
  const model = methodology.selectedModel
  return candidates.filter((c) => {
    if (c.difficulty === 'easy' || c.family === 'easy' || c.family === 'rest') {
      return true
    }
    // Long-run durability is methodology-agnostic — do not drop RUN_LONG_*
    // just because seed tags list PYRAMIDAL (POLARIZED was falling back to easy).
    if (c.family === 'long' || c.sessionType === 'LONG_RUN') {
      return true
    }
    if (
      methodology.constraints.includes('prefer_high_intensity_sparingly') &&
      c.difficulty === 'medium_high' &&
      c.primaryAdaptation === 'threshold' &&
      model === 'POLARIZED'
    ) {
      return false
    }
    if (
      methodology.constraints.includes('limit_moderate_intensity_accumulation') &&
      c.sessionType === 'TEMPO' &&
      model === 'PYRAMIDAL'
    ) {
      // Prefer true easy or controlled threshold over gray-zone tempo spam.
      return c.id.includes('THRESHOLD') || c.id.includes('LONG')
    }
    if (c.methodologyTags && c.methodologyTags.length > 0) {
      return c.methodologyTags.includes(model)
    }
    return true
  })
}

/**
 * Elite/advanced-only library samples (high-volume intervals / benchmarks)
 * must not appear just because weekly km is high.
 */
export function filterByAthleteLevel(
  candidates: CandidateWorkout[],
  athleteLevel?: AthleteLevel | null,
): CandidateWorkout[] {
  const level = athleteLevel ?? 'intermediate'
  return candidates.filter((c) => {
    const tags = c.tags.join(' ')
    if (/elite-only/i.test(tags)) return level === 'elite'
    if (/advanced-elite|advanced-only/i.test(tags)) {
      return level === 'advanced' || level === 'elite'
    }
    return true
  })
}

/** Easy means easy: never escalate recovery/easy slots to hard candidates. */
export function enforceEasyMeansEasy(
  slot: WeeklySlot,
  candidates: CandidateWorkout[],
): CandidateWorkout[] {
  if (slot.stimulus === 'quality' && slot.hard) {
    // Quality slots must not silently become easy runs or second long runs.
    // Progressive "long" library samples (RUN_PROG_*) were stealing weekly km
    // from the real Sunday long (e.g. 18 km midweek PROG + 33 km Saturday
    // looked like a 51 km "peak long" in reviews).
    const quality = candidates.filter(
      (c) =>
        c.difficulty !== 'easy' &&
        c.sessionType !== 'EASY_RUN' &&
        c.sessionType !== 'RECOVERY_RUN' &&
        c.sessionType !== 'LONG_RUN' &&
        c.family !== 'easy' &&
        c.family !== 'long' &&
        c.primaryAdaptation !== 'long_run_tolerance' &&
        !/^RUN_PROG_0[7-9]$|^RUN_PROG_1|^RUN_LONG_/i.test(c.id),
    )
    // Never fall back to the unfiltered pool — that reintroduces second longs.
    return quality
  }
  if (
    slot.stimulus === 'long' ||
    slot.stimulus === 'strength' ||
    slot.stimulus === 'race'
  ) {
    return candidates
  }
  // Bike / swim slots: prefer matching sport when available, else any easy aerobic.
  if (slot.stimulus === 'bike' || slot.stimulus === 'swim') {
    const sport =
      slot.stimulus === 'bike' ? WorkoutType.BIKE : WorkoutType.SWIM
    const matched = candidates.filter(
      (c) =>
        c.sport === sport ||
        c.difficulty === 'easy' ||
        c.family === 'easy',
    )
    return matched.length ? matched : candidates
  }
  if (slot.stimulus === 'easy' || slot.stimulus === 'recovery' || !slot.hard) {
    return candidates.filter(
      (c) =>
        c.difficulty === 'easy' ||
        c.family === 'easy' ||
        c.sessionType === 'RECOVERY_RUN' ||
        c.sessionType === 'EASY_RUN',
    )
  }
  return candidates
}

export function findCandidatesForSlotV2(
  slot: WeeklySlot,
  opts?: {
    sportFocus?: WorkoutType
    limit?: number
    methodology?: MethodologySelection
    previousWorkoutId?: string | null
    /** Prefer excluding these ids when alternatives exist (recent weeks). */
    avoidIds?: string[]
    /** Prefer aerobic longs (no threshold/tempo spam) in base weeks. */
    preferAerobicLong?: boolean
    /** Prefer HM / race-pace / MP samples for quality slots. */
    preferRaceSpecific?: boolean
    /** Goal demand — filters HM vs marathon race-specific samples. */
    demandId?: string | null
    /** Athlete level — gates elite/advanced-only samples. */
    athleteLevel?: AthleteLevel | null
    /** Long-run intensity family from blueprint. */
    longIntensityProfile?: import('@/lib/coach-engine/long-run-target').LongIntensityProfile | null
    /** Target minutes of threshold work this week (dose control). */
    thresholdVolumeTargetMin?: number | null
    /** Norwegian double-threshold half: AM = longer reps, PM = shorter reps. */
    doubleThresholdPart?: 'am' | 'pm' | null
    /** Plan week index — ladders marathon-pace quality volume. */
    weekIndex?: number
    /** When false, never pick VO2max for this week. */
    allowVo2?: boolean
    /** Prefer strides / neuromuscular over threshold. */
    preferStrides?: boolean
    /** Roadmap intensity band — drives workout *shape* for quality slots. */
    intensityBand?: IntensityBand
    /** 0 = first quality of the week; 1 = second, … */
    qualityIndex?: number
  },
): CandidateWorkout[] {
  const resolvedShape =
    slot.stimulus === 'quality' && opts?.intensityBand
      ? qualityShapeForSlot({
          band: opts.intensityBand,
          qualityIndex: opts.qualityIndex ?? 0,
          allowVo2: opts.allowVo2 !== false,
          weekIndex: opts.weekIndex ?? 0,
          preferRaceSpecific:
            Boolean(opts.preferRaceSpecific) || Boolean(slot.preferRaceSpecific),
        })
      : null
  // Block recipe wins over methodology "second quality = race-pace" heuristics.
  const preferRaceEffective =
    resolvedShape === 'race_specific'
      ? true
      : resolvedShape === 'vo2_short' ||
          resolvedShape === 'threshold_1k' ||
          resolvedShape === 'threshold_2k' ||
          resolvedShape === 'threshold_time' ||
          resolvedShape === 'strides' ||
          resolvedShape === 'aerobic_fartlek' ||
          resolvedShape === 'cruise'
        ? false
        : Boolean(opts?.preferRaceSpecific) || Boolean(slot.preferRaceSpecific)

  let candidates = baseFind(slot, {
    sportFocus: opts?.sportFocus,
    // Wider pool so distance-interval recipes are not crowded out by fartlek.
    limit: Math.max((opts?.limit ?? 4) + 20, 28),
  })
  // Guarantee block-recipe samples are in-pool (baseFind ranks by slot
  // primaryAdaptation and can bury 1 km / VO2 under fartlek/tempo).
  if (resolvedShape) {
    candidates = injectQualityShapePool(candidates, resolvedShape)
  }
  candidates = filterByMethodology(candidates, opts?.methodology)
  candidates = enforceEasyMeansEasy(slot, candidates)
  candidates = filterByAthleteLevel(candidates, opts?.athleteLevel)

  // Early marathon adaptation: easy + strides, not VO2 / hard threshold.
  if (opts?.allowVo2 === false) {
    const withoutVo2 = candidates.filter(
      (c) =>
        c.sessionType !== 'VO2_MAX' &&
        !/VO2/i.test(c.id) &&
        !c.tags.some((t) => /vo2/i.test(t)),
    )
    if (withoutVo2.length) candidates = withoutVo2
  }
  if (opts?.preferStrides) {
    if (slot.stimulus === 'easy' || slot.stimulus === 'recovery') {
      // Keep the day easy — embed strides in easy/recovery samples only.
      const easyStrides = candidates.filter(
        (c) =>
          (c.sessionType === 'EASY_RUN' ||
            c.sessionType === 'RECOVERY_RUN' ||
            c.family === 'easy') &&
          (c.tags.some((t) => /stride|neuromuscular/i.test(t)) ||
            /EASY_04|RECOVERY_04/i.test(c.id)),
      )
      if (easyStrides.length) candidates = easyStrides
    } else if (slot.stimulus === 'quality') {
      const soft = candidates.filter(
        (c) =>
          c.tags.some((t) => /stride|neuromuscular|sharpen/i.test(t)) ||
          /STRIDE|SPEED_04|MP_06/i.test(c.id),
      )
      if (soft.length) candidates = soft
    }
  }

  if (opts?.doubleThresholdPart === 'am' || opts?.doubleThresholdPart === 'pm') {
    const part = opts.doubleThresholdPart
    const matched = candidates.filter((c) =>
      matchesDoubleThresholdPart(c, part),
    )
    if (matched.length) candidates = matched
  }

  // Never schedule "post-race recovery" before the race exists.
  // Shakeout / pre-race labels belong in race week only — not ordinary recovery.
  candidates = candidates.filter(
    (c) =>
      !c.tags.some((t) => /post-race/i.test(t)) &&
      !/POST_RACE|post-race/i.test(c.id) &&
      !(slot.stimulus !== 'race' && c.tags.some((t) => /race-day/i.test(t))) &&
      !(
        !opts?.preferRaceSpecific &&
        slot.stimulus !== 'race' &&
        (c.tags.some((t) => /shakeout|pre-race/i.test(t)) ||
          /shakeout/i.test(c.title))
      ),
  )

  // Key endurance longs for run race goals: never substitute bike/swim.
  if (
    slot.stimulus === 'long' &&
    (opts?.demandId === 'MARATHON_V1' ||
      opts?.demandId === 'HALF_V1' ||
      opts?.sportFocus === WorkoutType.RUN)
  ) {
    const runOnly = candidates.filter(
      (c) => c.sport === WorkoutType.RUN || c.sport === WorkoutType.HYROX,
    )
    if (runOnly.length) candidates = runOnly
  }

  if (slot.stimulus === 'long' && opts?.preferAerobicLong) {
    const aerobic = candidates.filter(
      (c) =>
        !c.tags.some(
          (t) =>
            /threshold|tempo|norwegian|race-pace|hm-specific|mp-specific|fartlek/i.test(
              t,
            ),
        ) &&
        c.difficulty !== 'hard' &&
        !/fartlek/i.test(c.title),
    )
    if (aerobic.length) candidates = aerobic
  } else if (
    slot.stimulus === 'long' &&
    (opts?.preferRaceSpecific || slot.preferRaceSpecific)
  ) {
    // Late marathon/HM blocks: prefer race-specific / MP longs when available.
    const specific = candidates.filter(
      (c) =>
        c.tags.some(
          (t) =>
            /marathon|mp-specific|hm-specific|race-pace|progressive/i.test(t),
        ) || /LONG_1[0-5]|LONG_06|PROG_/i.test(c.id),
    )
    if (specific.length) candidates = specific
  }

  if (slot.stimulus === 'long' && opts?.longIntensityProfile) {
    const matched = candidates.filter((c) =>
      longProfileMatch(c.tags, c.id, opts.longIntensityProfile!),
    )
    if (matched.length) candidates = matched
  }

  // Always keep HM plans off pure MP samples (even outside race-specific weeks).
  if (opts?.demandId === 'HALF_V1') {
    const withoutMp = candidates.filter(
      (c) =>
        !(
          c.tags.some((t) => /mp-specific/i.test(t)) &&
          !c.tags.some((t) => /hm-specific|half-marathon/i.test(t))
        ) && !/^RUN_MP_/i.test(c.id),
    )
    if (withoutMp.length) candidates = withoutMp
  }
  if (opts?.demandId === 'MARATHON_V1' && slot.stimulus === 'quality') {
    const withoutHmOnly = candidates.filter(
      (c) =>
        !(
          c.tags.some((t) => /hm-specific/i.test(t)) &&
          !c.tags.some((t) => /mp-specific|marathon/i.test(t))
        ),
    )
    if (withoutHmOnly.length) candidates = withoutHmOnly
  }

  const wantRace = preferRaceEffective

  // Threshold / base weeks: hard-exclude race-pace from quality slots so a
  // "THRESHOLD" plan is not secretly an HM-pace plan every Tuesday.
  if (!wantRace && slot.stimulus === 'quality') {
    const withoutRacePace = candidates.filter(
      (c) =>
        c.sessionType !== 'RACE_PACE' &&
        c.family !== 'race' &&
        !c.tags.some((t) =>
          /hm-specific|mp-specific|race-pace|race-day/i.test(t),
        ),
    )
    if (withoutRacePace.length) candidates = withoutRacePace
  }

  if (
    wantRace &&
    (slot.stimulus === 'quality' || slot.stimulus === 'race')
  ) {
    const demandId = opts?.demandId
    const thTarget = opts?.thresholdVolumeTargetMin
    // Race week / taper: short sharpening only — never full HM/MP sessions.
    if (thTarget != null && thTarget <= 12) {
      const isFullRaceBlock = (c: CandidateWorkout) =>
        /[2-6]\s*[×xX]\s*[2-9]\s*km/i.test(c.title) ||
        /[2-6]\s*x\s*[2-9]\s*km/i.test(c.title) ||
        ((c.intervalCount ?? 0) >= 2 && (c.intervalDurationMin ?? 0) >= 6) ||
        ((c.distanceKm ?? 0) >= 12 &&
          c.tags.some((t) => /hm-specific|mp-specific|race-pace/i.test(t)))
      // Hard-drop full race blocks first so they cannot win later raceish sort.
      const withoutFull = candidates.filter((c) => !isFullRaceBlock(c))
      if (withoutFull.length) candidates = withoutFull
      const sharpen = candidates.filter((c) => {
        const workVol =
          (c.intervalCount ?? 0) * (c.intervalDurationMin ?? 0)
        const shortDuration = c.durationMin != null && c.durationMin <= 45
        const tagged = c.tags.some((t) =>
          /sharpen|taper|stride|short|opener/i.test(t),
        )
        const shortReps =
          c.intervalCount != null &&
          c.intervalCount <= 5 &&
          (c.intervalDurationMin == null || c.intervalDurationMin <= 3) &&
          workVol > 0 &&
          workVol <= 12
        return (
          shortDuration ||
          tagged ||
          shortReps ||
          /STRIDE|SPEED_|MP_06|RACE_PACE_0[12]/i.test(c.id)
        )
      })
      if (sharpen.length) candidates = sharpen
    }
    const raceish = candidates.filter((c) => {
      const tags = c.tags.join(' ')
      const isRaceFamily =
        c.sessionType === 'RACE_PACE' ||
        c.family === 'race' ||
        /race-pace|hm-specific|mp-specific|marathon|sharpen/i.test(tags)
      if (!isRaceFamily) return false
      if (demandId === 'MARATHON_V1') {
        if (
          /hm-specific|half-marathon/i.test(tags) &&
          !/mp-specific|marathon/i.test(tags)
        ) {
          return false
        }
      }
      if (demandId === 'HALF_V1') {
        if (
          /mp-specific/i.test(tags) &&
          !/hm-specific|half-marathon|race-pace/i.test(tags)
        ) {
          return false
        }
      }
      return true
    })
    if (raceish.length) candidates = raceish
    // Marathon quality: grow continuous MP (intro → blocks → longer MP),
    // not a random race-pace sample every week.
    if (
      demandId === 'MARATHON_V1' &&
      slot.stimulus === 'quality' &&
      (thTarget == null || thTarget > 12)
    ) {
      const wIdx = opts?.weekIndex ?? 0
      const preferred =
        wIdx < 9
          ? /^RUN_MP_0[12]$/i
          : wIdx < 12
            ? /^RUN_MP_0[234]$/i
            : /^RUN_MP_0[345]$/i
      const ladder = candidates.filter((c) => preferred.test(c.id))
      if (ladder.length) candidates = ladder
      else {
        const anyMp = candidates.filter((c) => /^RUN_MP_/i.test(c.id))
        if (anyMp.length) candidates = anyMp
      }
    }
    if (slot.availableMinutes > 0 && slot.availableMinutes <= 40) {
      const short = candidates.filter(
        (c) =>
          c.durationMin <= 45 ||
          c.tags.some((t) => /sharpen|taper|stride/i.test(t)) ||
          /MP_06|STRIDES_/i.test(c.id),
      )
      if (short.length) candidates = short
    }
  } else if (slot.stimulus === 'quality') {
    // Outside race-specific slots: demote VO2 unless this slot's recipe wants it.
    const shapeHint =
      opts?.intensityBand != null
        ? qualityShapeForSlot({
            band: opts.intensityBand,
            qualityIndex: opts.qualityIndex ?? 0,
            allowVo2: opts.allowVo2 !== false,
            weekIndex: opts.weekIndex ?? 0,
            preferRaceSpecific: opts.preferRaceSpecific,
          })
        : null
    const wantVo2 = shapeHint === 'vo2_short' && opts?.allowVo2 !== false
    const nonVo2 = candidates.filter(
      (c) =>
        c.sessionType !== 'VO2_MAX' &&
        !c.id.includes('VO2') &&
        !c.tags.some((t) => /vo2/i.test(t)),
    )
    if (opts?.allowVo2 === false) {
      if (nonVo2.length) candidates = nonVo2
    } else if (wantVo2) {
      const vo2 = candidates.filter(
        (c) =>
          c.sessionType === 'VO2_MAX' ||
          /VO2/i.test(c.id) ||
          c.tags.some((t) => /vo2|300m|400m/i.test(t)),
      )
      if (vo2.length) candidates = [...vo2, ...candidates.filter((c) => !vo2.includes(c))]
    } else if (nonVo2.length >= 2) {
      candidates = [...nonVo2, ...candidates.filter((c) => !nonVo2.includes(c))]
    }
  }

  const previous = opts?.previousWorkoutId ?? null
  const sharpeningDose =
    opts?.thresholdVolumeTargetMin != null &&
    opts.thresholdVolumeTargetMin <= 12 &&
    (Boolean(opts?.preferRaceSpecific) || Boolean(slot.preferRaceSpecific))
  // Taper/race sharpening: do not climb the full HM/MP progression ladder.
  if (previous && !sharpeningDose) {
    const targets = progressionTargets(previous)
    // Keep explicit progression targets in-pool even when duration-fit ranking
    // would have dropped them (structure-aligned durations can shift order).
    // Never inject long-run family into a midweek quality slot.
    for (const id of targets) {
      if (candidates.some((c) => c.id === id)) continue
      const fromLib = getWorkoutById(id)
      if (!fromLib) continue
      if (
        slot.stimulus === 'quality' &&
        (fromLib.sessionType === 'LONG_RUN' ||
          fromLib.family === 'long' ||
          fromLib.primaryAdaptation === 'long_run_tolerance' ||
          /^RUN_PROG_0[7-9]$|^RUN_PROG_1|^RUN_LONG_/i.test(fromLib.id))
      ) {
        continue
      }
      candidates.push(fromLib)
    }
    const preferred = targets
      .map((id) => candidates.find((c) => c.id === id))
      .filter((c): c is CandidateWorkout => Boolean(c))
    if (preferred.length) {
      // Honor explicit progression graph order (e.g. 6×3 → 5×5 → 4×8),
      // even when interval *count* decreases as reps get longer.
      candidates = preferred
    } else {
      const sameSeries = candidates
        .filter(
          (c) =>
            c.id !== previous &&
            seriesPrefix(c.id) === seriesPrefix(previous) &&
            workoutSeriesRank(c.id) > workoutSeriesRank(previous),
        )
        .sort((a, b) => workoutSeriesRank(a.id) - workoutSeriesRank(b.id))
      if (sameSeries.length) {
        candidates = sameSeries
      } else {
        const different = candidates.filter((c) => c.id !== previous)
        if (different.length) candidates = different
      }
    }
  }

  const avoid = new Set((opts?.avoidIds ?? []).filter(Boolean))
  if (avoid.size) {
    const fresh = candidates.filter((c) => !avoid.has(c.id))
    if (fresh.length) candidates = fresh
  }

  // Prefer threshold samples whose work minutes fit the week dose target.
  // Recovery / very low dose weeks: prefer strides / speed / light stimulus.
  const thTarget = opts?.thresholdVolumeTargetMin
  if (
    thTarget != null &&
    slot.stimulus === 'quality' &&
    !opts?.preferRaceSpecific &&
    !slot.preferRaceSpecific
  ) {
    if (thTarget <= 12) {
      const soft = candidates.filter(
        (c) =>
          c.difficulty === 'easy' ||
          c.difficulty === 'medium' ||
          c.sessionType === 'INTERVALS' ||
          c.tags.some((t) => /stride|speed|neuromuscular|sharpen/i.test(t)) ||
          /SPEED_|STRIDE/i.test(c.id),
      )
      if (soft.length) candidates = soft
    }
    candidates = [...candidates].sort(
      (a, b) =>
        scoreThresholdVolumeFit(a, thTarget) -
        scoreThresholdVolumeFit(b, thTarget),
    )
  }

  // Block-aware recipe: after dose ranking, boost the shape for this band.
  if (resolvedShape) {
    candidates = preferQualityShape(candidates, resolvedShape, thTarget)
  }

  return candidates.slice(0, opts?.limit ?? 4)
}

/** Seed IDs that must be available for each quality recipe. */
const SHAPE_SEED_IDS: Record<QualityShape, string[]> = {
  strides: ['RUN_STRIDES_01', 'RUN_SPEED_01'],
  aerobic_fartlek: [
    'RUN_FARTLEK_03',
    'RUN_FARTLEK_05',
    'RUN_FARTLEK_06',
    'RUN_FARTLEK_07',
    'RUN_FARTLEK_08',
    'RUN_FARTLEK_02',
  ],
  threshold_1k: [
    'RUN_THRESHOLD_10',
    'RUN_THRESHOLD_11',
    'RUN_THRESHOLD_12',
    'RUN_THRESHOLD_04',
    'RUN_THRESHOLD_07',
    'RUN_THRESHOLD_13',
    'RUN_THRESHOLD_14',
    'RUN_INTERVAL_08',
  ],
  threshold_2k: [
    'RUN_THRESHOLD_16',
    'RUN_THRESHOLD_09',
    'RUN_THRESHOLD_08',
    'RUN_THRESHOLD_05',
    'RUN_INTERVAL_10',
  ],
  threshold_time: [
    'RUN_THRESHOLD_03',
    'RUN_THRESHOLD_06',
    'RUN_THRESHOLD_01',
    'RUN_THRESHOLD_02',
  ],
  vo2_short: [
    'RUN_VO2_06',
    'RUN_VO2_07',
    'RUN_VO2_08',
    'RUN_VO2_09',
    'RUN_VO2_10',
    'RUN_VO2_03',
    'RUN_VO2_01',
    'RUN_SPEED_01',
  ],
  race_specific: ['RUN_MP_01', 'RUN_MP_02', 'RUN_MP_03', 'RUN_HM_SPECIFIC_01'],
  cruise: ['RUN_TEMPO_01', 'RUN_TEMPO_02', 'RUN_DURABILITY_01'],
}

function injectQualityShapePool(
  candidates: CandidateWorkout[],
  shape: QualityShape,
): CandidateWorkout[] {
  const have = new Set(candidates.map((c) => c.id))
  const extra: CandidateWorkout[] = []
  for (const id of SHAPE_SEED_IDS[shape]) {
    if (have.has(id)) continue
    const w = getWorkoutById(id)
    if (w) {
      extra.push(w)
      have.add(id)
    }
  }
  return extra.length ? [...extra, ...candidates] : candidates
}

function matchesQualityShape(
  c: CandidateWorkout,
  shape: QualityShape,
): boolean {
  const m = qualityShapeMatchers(shape)
  if (m.id.test(c.id)) return true
  if (c.tags.some((t) => m.tag.test(t))) return true
  if (m.sessionTypes?.includes(c.sessionType)) {
    // Session type alone is weak — require tag/id hint for broad types.
    if (shape === 'threshold_time' || shape === 'cruise') return true
  }
  // Title fallbacks for distance recipes.
  if (shape === 'threshold_1k' && /1\s*km|1000\s*m|1k/i.test(c.title)) return true
  if (shape === 'threshold_2k' && /2\s*km|1\.5\s*km/i.test(c.title)) return true
  if (shape === 'vo2_short' && /(300|400)\s*m/i.test(c.title)) return true
  if (
    shape === 'aerobic_fartlek' &&
    /fartlek/i.test(c.title) &&
    !/threshold fartlek/i.test(c.title)
  ) {
    return true
  }
  return false
}

/**
 * Re-rank so the block's preferred workout shape leads, then dose fit.
 * Keeps interval-distance variety (1 km / 2 km / 400s) visible in plans.
 */
function preferQualityShape(
  candidates: CandidateWorkout[],
  shape: QualityShape,
  thTarget: number | null | undefined,
): CandidateWorkout[] {
  const matched = candidates.filter((c) => matchesQualityShape(c, shape))
  if (!matched.length) return candidates
  const rest = candidates.filter((c) => !matchesQualityShape(c, shape))
  const byDose = (list: CandidateWorkout[]) =>
    thTarget != null
      ? [...list].sort(
          (a, b) =>
            scoreThresholdVolumeFit(a, thTarget) -
            scoreThresholdVolumeFit(b, thTarget),
        )
      : list
  return [...byDose(matched), ...byDose(rest)]
}

export function pickDeterministicCandidateV2(
  slot: WeeklySlot,
  sportFocus?: WorkoutType,
  methodology?: MethodologySelection,
): CandidateWorkout {
  const list = findCandidatesForSlotV2(slot, {
    sportFocus,
    limit: 1,
    methodology,
  })
  if (list[0]) return list[0]
  // Quality must never fall back to a long-run sample.
  if (slot.stimulus === 'quality') {
    return (
      getWorkoutById('RUN_TEMPO_01') ??
      getWorkoutById('RUN_EASY_01')!
    )
  }
  return getWorkoutById('RUN_EASY_01')!
}

function emptyAdaptations(): WorkoutAdaptations {
  return {
    intervalCount: null,
    intervalDurationMin: null,
    recoveryMin: null,
    durationMin: null,
    distanceKm: null,
  }
}

function intervalStep(baseCount: number, prevCount: number | null): number {
  return baseCount >= 8 || (prevCount != null && prevCount >= 8) ? 2 : 1
}

/** True while a high-rep template is still ramping toward its catalog peak. */
export function isClimbingIntervalLadder(
  workoutId: string | null | undefined,
  adaptations: WorkoutAdaptations | null | undefined,
): boolean {
  if (!workoutId || !adaptations?.intervalCount) return false
  const workout = getWorkoutById(workoutId)
  const peak = workout?.intervalCount
  if (peak == null || peak < 6) return false
  return adaptations.intervalCount < peak
}

function levelEaseOffset(level?: AthleteLevel | null): number {
  switch (level) {
    case 'beginner':
      return 6
    case 'intermediate':
      return 2
    case 'advanced':
      return 0
    case 'elite':
      return 0
    default:
      return 2
  }
}

/**
 * Build week-to-week adaptations so library samples are edited for the athlete
 * (e.g. 6×1 km → 8×1 km → 10×1 km) instead of pasting catalog defaults forever.
 */
export function buildProgressiveAdaptations(args: {
  candidate: CandidateWorkout
  weekIndex: number
  previousWorkoutId?: string | null
  previousAdaptations?: WorkoutAdaptations | null
  availableMinutes?: number
  athleteLevel?: AthleteLevel | null
}): WorkoutAdaptations {
  const {
    candidate,
    weekIndex,
    previousWorkoutId,
    previousAdaptations,
    athleteLevel,
  } = args
  const adaptations = emptyAdaptations()

  // Do NOT clamp durationMin to availableMinutes here — duration/distance are
  // derived from adapted structure in applyAdaptations. Clamping caused
  // 10×1 km @ 29 min and 19 min "long runs".

  const baseCount = candidate.intervalCount
  if (baseCount == null || baseCount < 1) return adaptations

  const sameAsPrevious = previousWorkoutId === candidate.id
  const prevCount = previousAdaptations?.intervalCount ?? null
  const step = intervalStep(baseCount, prevCount)
  const ceiling = Math.max(baseCount, 16)
  const ease = levelEaseOffset(athleteLevel)

  if (sameAsPrevious && prevCount != null) {
    // Stay on the ladder: 6 → 8 → 10 (do not snap to catalog peak).
    adaptations.intervalCount = Math.min(ceiling, prevCount + step)
  } else if (baseCount >= 8 && prevCount != null && prevCount >= 4) {
    // Similar high-rep samples: ease in by level, never drop below last week.
    const eased = Math.max(4, baseCount - Math.max(ease, weekIndex <= 1 ? 4 : 2))
    adaptations.intervalCount = Math.min(
      ceiling,
      Math.max(eased, Math.min(prevCount + step, baseCount)),
    )
  } else if (baseCount >= 6) {
    // First exposure: scale sample down for level (advanced/elite keep catalog).
    const shouldEase =
      ease > 0 ||
      athleteLevel == null ||
      athleteLevel === 'intermediate'
    if (shouldEase) {
      const startEase =
        baseCount >= 8 ? Math.max(ease > 0 ? ease : 4, 4) : Math.max(ease, 0)
      if (startEase > 0) {
        adaptations.intervalCount = Math.max(3, baseCount - startEase)
      }
    }
  } else if (weekIndex > 0 && baseCount >= 6) {
    const ramp = Math.min(4, Math.floor(weekIndex / 2) * step)
    if (ramp > 0) adaptations.intervalCount = Math.min(ceiling, baseCount + ramp)
  }

  // Beginners: slightly longer recovery when we touch interval structure.
  if (
    adaptations.intervalCount != null &&
    athleteLevel === 'beginner' &&
    candidate.recoveryMin != null
  ) {
    adaptations.recoveryMin = Math.min(
      8,
      Math.round(candidate.recoveryMin + 1),
    )
  }

  if (
    adaptations.intervalCount != null &&
    previousAdaptations?.intervalDurationMin != null &&
    sameAsPrevious
  ) {
    adaptations.intervalDurationMin = previousAdaptations.intervalDurationMin
  }
  if (
    adaptations.intervalCount != null &&
    previousAdaptations?.recoveryMin != null &&
    sameAsPrevious
  ) {
    adaptations.recoveryMin = previousAdaptations.recoveryMin
  }

  return adaptations
}

/** Family key so Mon threshold and Wed VO2/HM progress independently. */
export function progressionFamilyKey(
  slot: WeeklySlot,
  workoutId?: string | null,
): string {
  if (
    slot.stimulus === 'quality' ||
    slot.stimulus === 'strength' ||
    slot.stimulus === 'race'
  ) {
    if (workoutId) {
      const w = getWorkoutById(workoutId)
      if (w) {
        const raceish =
          w.family === 'race' ||
          w.tags.some((t) =>
            /hm-specific|mp-specific|race-pace|race-day|marathon/i.test(t),
          )
        return `${slot.stimulus}:${raceish ? 'race_specific' : w.primaryAdaptation}`
      }
    }
    if (slot.preferRaceSpecific) return `${slot.stimulus}:race_specific`
    return `${slot.stimulus}:${slot.primaryAdaptation ?? 'any'}`
  }
  return slot.stimulus
}

export function pickProgressiveCandidateV2(args: {
  slot: WeeklySlot
  sportFocus?: WorkoutType
  methodology?: MethodologySelection
  previousWorkoutId?: string | null
  previousAdaptations?: WorkoutAdaptations | null
  weekIndex: number
  recentIds?: string[]
  athleteLevel?: AthleteLevel | null
  preferAerobicLong?: boolean
  preferRaceSpecific?: boolean
  demandId?: string | null
  longIntensityProfile?: import('@/lib/coach-engine/long-run-target').LongIntensityProfile | null
  thresholdVolumeTargetMin?: number | null
  doubleThresholdPart?: 'am' | 'pm' | null
  allowVo2?: boolean
  preferStrides?: boolean
  intensityBand?: IntensityBand
  qualityIndex?: number
}): {
  candidate: CandidateWorkout
  adaptations: WorkoutAdaptations
  reason: string
} {
  const partMinutes =
    args.doubleThresholdPart === 'am'
      ? Math.round((args.slot.availableMinutes || 90) * 0.55)
      : args.doubleThresholdPart === 'pm'
        ? Math.round((args.slot.availableMinutes || 90) * 0.45)
        : args.slot.availableMinutes

  const shapeForSlot =
    args.intensityBand != null && args.slot.stimulus === 'quality'
      ? qualityShapeForSlot({
          band: args.intensityBand,
          qualityIndex: args.qualityIndex ?? 0,
          allowVo2: args.allowVo2 !== false,
          weekIndex: args.weekIndex,
          preferRaceSpecific: args.preferRaceSpecific,
        })
      : null

  // If the block recipe changed (e.g. tempo → 1 km threshold), do not keep
  // climbing the old sample — start the new shape's ladder.
  let previousWorkoutId = args.previousWorkoutId
  let previousAdaptations = args.previousAdaptations
  if (shapeForSlot && previousWorkoutId) {
    const prev = getWorkoutById(previousWorkoutId)
    if (prev && !matchesQualityShape(prev, shapeForSlot)) {
      previousWorkoutId = null
      previousAdaptations = null
    }
  }

  // Finish the interval ladder on the same sample before hopping to the next id.
  // Race/taper sharpening weeks must not continue a full HM/MP ladder.
  const sharpeningWeek =
    args.thresholdVolumeTargetMin != null &&
    args.thresholdVolumeTargetMin <= 12 &&
    Boolean(args.preferRaceSpecific)
  if (
    !args.doubleThresholdPart &&
    !sharpeningWeek &&
    isClimbingIntervalLadder(previousWorkoutId, previousAdaptations)
  ) {
    const climbing = getWorkoutById(previousWorkoutId!)
    if (climbing) {
      let adaptations = buildProgressiveAdaptations({
        candidate: climbing,
        weekIndex: args.weekIndex,
        previousWorkoutId,
        previousAdaptations,
        availableMinutes: partMinutes,
        athleteLevel: args.athleteLevel,
      })
      adaptations = clampThresholdAdaptations({
        candidate: climbing,
        adaptations,
        maxWorkMin: args.thresholdVolumeTargetMin,
      })
      return {
        candidate: climbing,
        adaptations,
        reason: `Progressive overload on sample ${climbing.id} → ${adaptations.intervalCount}× intervals.`,
      }
    }
  }

  const list = findCandidatesForSlotV2(args.slot, {
    sportFocus: args.sportFocus,
    limit: 6,
    methodology: args.methodology,
    previousWorkoutId,
    avoidIds: args.recentIds,
    preferAerobicLong: args.preferAerobicLong,
    preferRaceSpecific: args.preferRaceSpecific,
    demandId: args.demandId,
    athleteLevel: args.athleteLevel,
    longIntensityProfile: args.longIntensityProfile,
    thresholdVolumeTargetMin: args.thresholdVolumeTargetMin,
    doubleThresholdPart: args.doubleThresholdPart,
    weekIndex: args.weekIndex,
    allowVo2: args.allowVo2,
    preferStrides: args.preferStrides,
    intensityBand: args.intensityBand,
    qualityIndex: args.qualityIndex,
  })
  const candidate =
    list[0] ??
    pickDeterministicCandidateV2(args.slot, args.sportFocus, args.methodology)

  let adaptations = buildProgressiveAdaptations({
    candidate,
    weekIndex: args.weekIndex,
    previousWorkoutId,
    previousAdaptations,
    availableMinutes: partMinutes,
    athleteLevel: args.athleteLevel,
  })
  adaptations = clampThresholdAdaptations({
    candidate,
    adaptations,
    maxWorkMin: args.thresholdVolumeTargetMin,
  })

  const progressed =
    Boolean(previousWorkoutId) && candidate.id !== previousWorkoutId
  const adapted =
    adaptations.intervalCount != null &&
    adaptations.intervalCount !== candidate.intervalCount

  const shape = shapeForSlot

  let reason = `Sample ${candidate.id} adapted for ${args.slot.stimulus} (${args.methodology?.selectedModel ?? 'default'})`
  if (shape) reason += ` · shape ${shape}`
  if (progressed) reason += ` (from ${previousWorkoutId})`
  if (adapted) reason += ` → ${adaptations.intervalCount}× intervals`
  if (args.athleteLevel) reason += ` · level ${args.athleteLevel}`
  if (args.thresholdVolumeTargetMin != null) {
    reason += ` · TH target ~${args.thresholdVolumeTargetMin}′`
  }

  return { candidate, adaptations, reason: `${reason}.` }
}

export function seedLibraryCatalog(): CandidateWorkout[] {
  return listWorkoutLibrary().map((w) => ({
    ...w,
    family:
      w.id === 'REST_01'
        ? 'rest'
        : w.difficulty === 'easy'
          ? 'easy'
          : w.primaryAdaptation === 'long_run_tolerance' ||
              w.primaryAdaptation === 'aerobic_durability'
            ? 'long'
            : w.sport === WorkoutType.STRENGTH || w.sport === WorkoutType.HYROX
              ? 'strength'
              : w.tags.includes('race-pace')
                ? 'race'
                : 'quality',
    methodologyTags: inferMethodologyTags(w),
    progressionTo: PROGRESSION_GRAPH[w.id] ?? [],
  }))
}

function inferMethodologyTags(w: CandidateWorkout): TrainingModelId[] {
  if (w.difficulty === 'easy') {
    return [
      'PYRAMIDAL',
      'POLARIZED',
      'THRESHOLD',
      'HYBRID',
      'NORWEGIAN',
      'RACE_SPECIFIC',
      'BLOCK',
    ]
  }
  if (w.primaryAdaptation === 'threshold') {
    return ['THRESHOLD', 'NORWEGIAN', 'PYRAMIDAL', 'HYBRID', 'RACE_SPECIFIC']
  }
  if (
    w.primaryAdaptation === 'speed' ||
    w.primaryAdaptation === 'aerobic_capacity'
  ) {
    return ['POLARIZED', 'HYBRID', 'RACE_SPECIFIC', 'BLOCK']
  }
  return ['PYRAMIDAL', 'HYBRID']
}
