import { SeasonPhase, SessionType, WorkoutType } from '@prisma/client'
import type {
  AthleteLevel,
  CapacityProfile,
  DoseProfile,
  GoalProfile,
  PhaseProfile,
  PriorityProfile,
  SportArchitectureId,
  WeeklyModalityVolume,
} from '@/lib/coach-engine/types'
import {
  calculateLongRunTarget,
  getLongRunRangeKm,
  getMarathonPreparationStandard,
  isHighLevelEnduranceGoal,
  marathonSpecificMpKmInLong,
  maxLongRunWeeklyRatio,
  type LongIntensityProfile,
} from '@/lib/coach-engine/long-run-target'
import {
  resolveEnduranceIntensityBudget,
  type IntensityBand,
} from '@/lib/coach-engine/intensity-ramp'
import { DELOAD_VOLUME_RATIO } from '@/lib/coach-engine/deload'
import {
  resolveSportArchitecture,
  scaleArchitectureChannels,
  scaleModalityVolumesForWeek,
  sportArchitectureIdForDemand,
} from '@/lib/coach-engine/sport-architecture'

export type WeekBlueprint = {
  weekIndex: number
  phase: SeasonPhase
  label: string
  isDeload: boolean
  isTaper: boolean
  isRaceWeek: boolean
  /** Relative volume vs peak (~1.0). */
  volumeScale: number
  targetKm: number
  /** Soft duration floor (minutes) — derived from longRunTargetKm. */
  longRunMinMinutes: number
  /** Preferred long-run distance (km). Structure is scaled to this. */
  longRunTargetKm: number
  /** Long-run intensity family for the week. */
  longIntensityProfile: LongIntensityProfile
  /** Continuous MP km inside the long (0 = none). */
  longRunMpKm: number
  /** Intensity ramp band for this week. */
  intensityBand: IntensityBand
  /** Soft quality work-minute budget. */
  qualityBudgetMin: number
  /** 0–2 quality sessions this week. */
  qualitySessions: number
  /** Prefer race-pace / HM-specific samples for quality. */
  preferRaceSpecific: boolean
  /** Prefer aerobic (non-threshold) long. */
  preferAerobicLong: boolean
  /** Prefer strides / neuromuscular over true threshold. */
  preferStrides: boolean
  /** When false, library must not pick VO2max. */
  allowVo2: boolean
  thresholdVolumeTargetMin: number | null
  /** Sport family driving this week's volume units. */
  architectureId: SportArchitectureId
  /** Per-modality targets (run km, bike min, swim m, stations). */
  modalityVolumes: WeeklyModalityVolume[]
  /** HYROX: station count target for the week. */
  stationVolumeTarget: number | null
  /** Multi-sport: bike minutes target. */
  bikeMinutesTarget: number | null
  /** Multi-sport: swim meters target. */
  swimMetersTarget: number | null
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Parse goal time labels like `1:45`, `1:45:00`, or `3:45` into minutes. */
export function parseGoalTimeMinutes(
  valueLabel: string | null | undefined,
): number | null {
  if (!valueLabel) return null
  const parts = valueLabel
    .trim()
    .split(':')
    .map((p) => Number(p))
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null
  if (parts.length === 3) {
    return Math.round(parts[0]! * 60 + parts[1]! + parts[2]! / 60)
  }
  // H:MM for endurance races when hours look plausible; else MM:SS.
  if (parts[0]! >= 1 && parts[0]! <= 12 && parts[1]! < 60) {
    return Math.round(parts[0]! * 60 + parts[1]!)
  }
  return Math.round(parts[0]! + parts[1]! / 60)
}

/**
 * One primary phase per calendar week (never split Base/Build mid-week).
 * Deload weeks → RECOVERY. Final week → RACE. Penultimate → PEAK (taper flags).
 */
export function assignWeekPhases(args: {
  weekCount: number
  deloadWeekIndexes: number[]
  taperWeekIndexes: number[]
}): SeasonPhase[] {
  const { weekCount, deloadWeekIndexes, taperWeekIndexes } = args
  const out: SeasonPhase[] = []
  for (let w = 0; w < weekCount; w += 1) {
    const fromEnd = weekCount - 1 - w
    if (fromEnd === 0) {
      out.push(SeasonPhase.RACE)
      continue
    }
    if (deloadWeekIndexes.includes(w)) {
      out.push(SeasonPhase.RECOVERY)
      continue
    }
    if (fromEnd === 1 || taperWeekIndexes.includes(w)) {
      out.push(SeasonPhase.PEAK)
      continue
    }
    const progress = weekCount <= 1 ? 1 : w / (weekCount - 1)
    if (progress < 0.35) out.push(SeasonPhase.BASE)
    else if (progress < 0.72) out.push(SeasonPhase.BUILD)
    else out.push(SeasonPhase.PEAK)
  }
  return out
}

function modalityTarget(
  volumes: WeeklyModalityVolume[],
  unit: WeeklyModalityVolume['unit'],
): number | null {
  const hit = volumes.find((v) => v.unit === unit)
  return hit ? hit.target : null
}

export function buildWeekBlueprints(args: {
  goal: GoalProfile
  dose: DoseProfile
  priority: PriorityProfile
  /** When set, peak volume is clamped to the progressive capacity envelope. */
  capacity?: CapacityProfile
}): WeekBlueprint[] {
  const weekCount = args.goal.weekCount
  const level = args.goal.level
  const isMarathon = args.goal.demandId === 'MARATHON_V1'
  const isHalf = args.goal.demandId === 'HALF_V1'
  const architectureId = sportArchitectureIdForDemand(args.goal.demandId)
  const architecture = resolveSportArchitecture({
    demandId: args.goal.demandId,
    level,
  })
  const phases = assignWeekPhases({
    weekCount,
    deloadWeekIndexes: args.dose.deloadWeekIndexes,
    taperWeekIndexes: args.dose.taperWeekIndexes,
  })

  // HYROX / multi: don't force a 30 km run floor — sport volume lives elsewhere.
  const runFloor = architecture.usesLongRunKey && architectureId === 'run_endurance' ? 30 : 18
  const startKm = Math.max(
    runFloor,
    args.goal.firstWeekKm ??
      args.goal.currentWeeklyKm ??
      args.dose.targetWeeklyKm,
  )
  const sportChannels = scaleArchitectureChannels(architecture, {
    runKmBaseline: startKm,
  })
  const highLevel = isHighLevelEnduranceGoal(args.goal)
  const daysPerWeek = args.goal.daysPerWeek
  const longRange = getLongRunRangeKm({
    level,
    demandId: args.goal.demandId,
    weeklyMileage: Math.max(
      startKm,
      args.goal.currentWeeklyKm ?? startKm,
    ),
    highLevel,
  })
  // Peak weekly km must fit the peak long at the architecture's max share.
  // Low-frequency marathon plans allow a higher long/week ratio.
  const peakLongShare = maxLongRunWeeklyRatio({
    demandId: args.goal.demandId,
    daysPerWeek,
    weekIndex: Math.max(2, weekCount - 4),
    level,
  })
  const marathonStandard = isMarathon
    ? getMarathonPreparationStandard({ level, highLevel })
    : null
  const peakFromLong = Math.ceil(
    (marathonStandard?.targetPeakLongRunKm ?? longRange.peak) / peakLongShare,
  )
  // ≤3 days: host the peak long via ~50% share + a 4th easy when volume ≥40 km,
  // not by inflating weekly peak to ceil(30 / 0.48) ≈ 63 km.
  const peakFromStandard = marathonStandard
    ? Math.max(
        marathonStandard.minimumPeakWeeklyKm,
        marathonStandard.targetPeakWeeklyKm,
        (daysPerWeek ?? 5) <= 3
          ? 0
          : Math.ceil(marathonStandard.minimumPeakLongRunKm / peakLongShare),
      )
    : 0
  const envelopePeak = args.capacity?.envelope?.maxPeakKm
  const runClimb =
    architectureId === 'hyrox'
      ? 1.18
      : architectureId === 'multi_sport'
        ? 1.22
        : isMarathon
          ? 1.55
          : 1.25
  const runClimbCap =
    architectureId === 'hyrox'
      ? 1.28
      : architectureId === 'multi_sport'
        ? 1.35
        : isMarathon
          ? level === 'beginner'
            ? 2.0
            : level === 'intermediate'
              ? 2.15
              : 2.3
          : 1.45
  let peakKm = Math.max(
    startKm,
    Math.round(startKm * runClimb),
    architecture.usesLongRunKey
      ? Math.min(
          Math.max(peakFromLong, peakFromStandard),
          Math.max(peakFromStandard, Math.round(startKm * runClimbCap)),
        )
      : Math.round(startKm * runClimb),
  )
  // Marathon standard floor: never plan a "complete" block under the minimum peak week
  // when the progressive envelope can support it.
  if (marathonStandard && weekCount >= 12) {
    peakKm = Math.max(peakKm, marathonStandard.minimumPeakWeeklyKm)
    if (envelopePeak != null && envelopePeak > 0) {
      peakKm = Math.max(
        peakKm,
        Math.min(marathonStandard.targetPeakWeeklyKm, envelopePeak),
      )
    } else {
      peakKm = Math.max(peakKm, marathonStandard.targetPeakWeeklyKm)
    }
  }
  // Progressive envelope is the hard plan-wide ceiling — not present maxWeeklyKm.
  // When envelope < durability peak, safe progression wins and validation warns.
  if (envelopePeak != null && envelopePeak > 0) {
    const floor =
      marathonStandard && weekCount >= 12
        ? Math.min(marathonStandard.minimumPeakWeeklyKm, envelopePeak)
        : startKm
    peakKm = Math.min(peakKm, Math.max(floor, envelopePeak))
  }

  // Rebuild volume scales with hard week-to-week caps.
  // Recovery ≈ 80% of prior (15–25% cut). Loading weeks ≤ +8% vs prior loading.
  // Marathon: softer recoveries (~85%) and deeper race-week cut.
  const scales: number[] = []
  let lastLoadingScale = 0.85
  for (let w = 0; w < weekCount; w += 1) {
    const phase = phases[w]!
    const fromEnd = weekCount - 1 - w
    const progress = weekCount <= 1 ? 1 : w / Math.max(1, weekCount - 1)
    // Peak scale anchored so firstWeekKm ≈ start; marathon may climb farther
    // so peak weeks can support 30–35 km durability longs.
    const firstScale =
      args.goal.firstWeekKm != null && peakKm > 0
        ? clamp(args.goal.firstWeekKm / peakKm, 0.45, 1)
        : 0.85
    const climbRoom = Math.min(
      isMarathon ? 0.5 : 0.22,
      Math.max(0.05, 1.02 - firstScale),
    )
    let scale = firstScale + progress * climbRoom

    if (phase === SeasonPhase.RACE || fromEnd === 0) {
      // Race week = sharpening only; race km added separately in materialize.
      scale = isMarathon ? 0.28 : 0.35
    } else if (fromEnd === 1) {
      // True taper: −20–30% vs last loading week (not a mild tip).
      scale = Math.min(
        isMarathon ? 0.72 : 0.75,
        lastLoadingScale * (isMarathon ? 0.78 : 0.72),
      )
    } else if (fromEnd === 2 && isMarathon) {
      // Marathon peak→taper bridge: keep volume high enough for a durability long.
      scale = Math.min(0.95, Math.max(lastLoadingScale * 0.92, firstScale + climbRoom * 0.85))
    } else if (phase === SeasonPhase.RECOVERY) {
      // Recovery softens load vs last *loading* week — not a deep on/off cut.
      const cut = isMarathon ? 0.88 : 0.8
      scale = Math.round(lastLoadingScale * cut * 100) / 100
    } else {
      const prevPhase = w > 0 ? phases[w - 1] : null
      if (prevPhase === SeasonPhase.RECOVERY) {
        // Rebound is vs last loading scale — never treat recovery as the new baseline.
        const rebound = isMarathon ? 1.12 : 1.1
        scale = Math.min(scale, lastLoadingScale * rebound)
      } else {
        const prev = scales[w - 1] ?? firstScale
        // Normal build: ≤+8% week to week (marathon durability ≤+10%).
        scale = Math.min(scale, prev * (isMarathon ? 1.1 : 1.08))
      }
      lastLoadingScale = scale
    }
    scales.push(Math.round(scale * 100) / 100)
  }

  const blueprints: WeekBlueprint[] = []
  let prevLongKm = longRange.base
  /** Highest loading-week long — deload cuts must not reset the climb baseline. */
  let prevLoadingLongKm = longRange.base
  let prevTargetKm = Math.round(peakKm * scales[0]! * 10) / 10
  /** Last non-recovery training week km — rebound jumps use this, not deload km. */
  let prevLoadingTargetKm = prevTargetKm
  let runsOver28Planned = 0
  let runsOver30Planned = 0
  // Marathon: race-specific / MP from ~final 7–8 weeks (not early mid-build).
  // HM: race-pace quality only in the final ~40% (threshold dominates base/build).
  const raceSpecificFromWeek = isMarathon
    ? Math.max(0, weekCount - 8)
    : Math.max(Math.floor(weekCount * 0.55), weekCount - 5)

  // Easy pace minutes/km for duration floor (faster athletes → fewer minutes).
  const easyMinPerKm = (() => {
    const raceMin = parseGoalTimeMinutes(args.goal.target?.valueLabel)
    if (raceMin != null && isHalf) {
      // HM goal pace → easy roughly +20–25%.
      return clamp((raceMin / 21.1) * 1.22, 4.0, 6.2)
    }
    if (raceMin != null && isMarathon) {
      return clamp((raceMin / 42.2) * 1.2, 4.2, 6.5)
    }
    return level === 'elite' || level === 'advanced' ? 4.6 : 5.4
  })()

  for (let w = 0; w < weekCount; w += 1) {
    const phase = phases[w]!
    const fromEnd = weekCount - 1 - w
    const isRaceWeek = phase === SeasonPhase.RACE || fromEnd === 0
    const isTaper = fromEnd === 1 || (isRaceWeek && weekCount > 1)
    const isDeload = phase === SeasonPhase.RECOVERY
    const volumeScale = scales[w]!
    let targetKm = Math.round(peakKm * volumeScale * 10) / 10

    let qualitySessions = 1
    let preferRaceSpecific = false
    // Easy long is the default — never auto-attach threshold to the long run.
    let preferAerobicLong = true
    let preferStrides = false
    let allowVo2 = true
    let qualityBudgetMin = 24
    let intensityBand: IntensityBand = 'engine'
    let thresholdVolumeTargetMin: number | null = 24
    let longKind: 'base' | 'build' | 'peak' | 'deload' | 'taper' | 'race' =
      'base'

    if (isRaceWeek) {
      longKind = 'race'
    } else if (isDeload) {
      longKind = 'deload'
    } else if (fromEnd === 1) {
      longKind = 'taper'
    } else if (phase === SeasonPhase.PEAK || fromEnd <= 2) {
      longKind = 'peak'
    } else if (phase === SeasonPhase.BUILD) {
      longKind = 'build'
    } else {
      longKind = 'base'
    }

    // Endurance races: intensity = f(weeks available), not "week 1 = threshold".
    if (
      (isMarathon || isHalf) &&
      architectureId === 'run_endurance'
    ) {
      const budget = resolveEnduranceIntensityBudget({
        weekIndex: w,
        weekCount,
        isDeload,
        isTaper: fromEnd === 1,
        isRaceWeek,
        level,
        daysPerWeek: args.goal.daysPerWeek,
        demandId: args.goal.demandId,
        currentWeeklyKm: args.goal.currentWeeklyKm ?? args.goal.firstWeekKm,
        recentLongestRunKm: Math.max(
          12,
          Math.round((args.goal.currentWeeklyKm ?? args.goal.firstWeekKm ?? 25) * 0.45),
        ),
      })
      intensityBand = budget.band
      qualitySessions = budget.qualitySessions
      qualityBudgetMin = budget.qualityBudgetMin
      thresholdVolumeTargetMin = budget.thresholdVolumeTargetMin
      preferRaceSpecific = budget.preferRaceSpecific
      preferStrides = budget.preferStrides
      allowVo2 = budget.allowVo2
      preferAerobicLong = !(
        (isMarathon &&
          longKind === 'peak' &&
          fromEnd >= 2 &&
          budget.preferRaceSpecific) ||
        (isHalf && longKind === 'peak' && fromEnd === 2)
      )
      if (longKind === 'build' || longKind === 'base') {
        preferAerobicLong = true
      }
    } else if (isRaceWeek) {
      intensityBand = 'race'
      qualitySessions = 1
      preferRaceSpecific = true
      preferAerobicLong = true
      preferStrides = false
      allowVo2 = false
      qualityBudgetMin = 8
      thresholdVolumeTargetMin = 6
    } else if (isDeload) {
      intensityBand = 'recovery'
      qualitySessions = 0
      preferRaceSpecific = false
      preferAerobicLong = true
      preferStrides = false
      allowVo2 = false
      qualityBudgetMin = 0
      thresholdVolumeTargetMin = null
    } else if (fromEnd === 1) {
      intensityBand = 'taper'
      qualitySessions = 1
      preferRaceSpecific = true
      preferAerobicLong = true
      preferStrides = true
      allowVo2 = false
      qualityBudgetMin = 12
      thresholdVolumeTargetMin = 10
    } else if (phase === SeasonPhase.PEAK || fromEnd <= 2) {
      intensityBand = 'peak'
      qualitySessions = level === 'beginner' ? 1 : 2
      preferRaceSpecific = true
      preferAerobicLong = !(
        (isMarathon && fromEnd >= 2) ||
        (isHalf && fromEnd === 2)
      )
      preferStrides = false
      allowVo2 = architectureId !== 'run_endurance'
      qualityBudgetMin = 28
      thresholdVolumeTargetMin = fromEnd === 2 ? 18 : 20
    } else if (phase === SeasonPhase.BUILD) {
      intensityBand = 'engine'
      qualitySessions = level === 'beginner' ? 1 : 2
      preferRaceSpecific = w >= raceSpecificFromWeek
      preferAerobicLong = true
      preferStrides = false
      allowVo2 = true
      qualityBudgetMin = 20
      thresholdVolumeTargetMin = preferRaceSpecific
        ? isMarathon
          ? 16
          : 18
        : 22 + Math.min(8, w)
    } else {
      intensityBand = 'adaptation'
      qualitySessions = level === 'beginner' ? 1 : 2
      preferRaceSpecific = false
      preferAerobicLong = true
      preferStrides = w <= 1
      allowVo2 = false
      qualityBudgetMin = 16
      thresholdVolumeTargetMin = 18 + Math.min(8, w * 2)
    }

    // Cap quality by days/week (4-day weeks → 1 quality).
    if (args.goal.daysPerWeek <= 4) qualitySessions = Math.min(1, qualitySessions)

    // HYROX: station/compromised-run quality > long-run peaking.
    if (architectureId === 'hyrox' && !isRaceWeek) {
      qualitySessions = Math.min(
        qualitySessions,
        isDeload || fromEnd === 1 ? 1 : level === 'beginner' ? 1 : 2,
      )
      preferRaceSpecific = !isDeload && fromEnd <= Math.max(3, Math.floor(weekCount * 0.35))
      preferAerobicLong = true
      preferStrides = false
      allowVo2 = true
      longKind = isDeload ? 'deload' : fromEnd === 1 ? 'taper' : 'build'
      intensityBand = preferRaceSpecific ? 'specific' : 'engine'
      qualityBudgetMin = preferRaceSpecific ? 16 : 18
      thresholdVolumeTargetMin = isDeload ? null : preferRaceSpecific ? 12 : 16
      if (isDeload) qualitySessions = Math.min(qualitySessions, 1)
    }
    // Multi-sport: keep one run quality; bike/swim carry aerobic load.
    if (architectureId === 'multi_sport' && !isRaceWeek && !isDeload) {
      qualitySessions = Math.min(qualitySessions, level === 'beginner' ? 1 : 2)
      preferAerobicLong = true
      allowVo2 = false
    }

    const weekKind =
      isRaceWeek
        ? ('race' as const)
        : isDeload
          ? ('deload' as const)
          : fromEnd === 1
            ? ('taper' as const)
            : longKind === 'peak'
              ? ('peak' as const)
              : w === 0
                ? ('baseline' as const)
                : ('build' as const)
    const modalityVolumes = scaleModalityVolumesForWeek(
      sportChannels,
      volumeScale,
      weekKind,
    )
    // Prefer envelope modality ceilings when capacity is present.
    const envMods = args.capacity?.envelope?.weeks?.[w]?.modalityVolumes
    if (envMods?.length) {
      for (const mod of modalityVolumes) {
        const ceil = envMods.find(
          (e) => e.modality === mod.modality && e.unit === mod.unit,
        )
        if (ceil && mod.target > ceil.max) mod.target = ceil.max
      }
    }

    const weekShare = (weekIdx: number) =>
      architectureId === 'hyrox'
        ? 0.28
        : maxLongRunWeeklyRatio({
            demandId: args.goal.demandId,
            daysPerWeek,
            weekIndex: weekIdx,
            level,
          })
    const weekCeil = args.capacity?.envelope?.weeks?.[w]?.maxKm

    // Desired long from phase + progression. Use peak-week mileage so the
    // weekly-ratio cap does not shrink the target before we raise the week.
    const recentForClimb =
      isDeload || fromEnd === 1 ? prevLongKm : prevLoadingLongKm
    const desiredMileage =
      architecture.usesLongRunKey && isMarathon && !isDeload && fromEnd > 1
        ? Math.max(targetKm, peakKm * 0.92)
        : architecture.usesLongRunKey
          ? Math.max(targetKm, 30)
          : Math.min(targetKm, 25)
    const longTarget = calculateLongRunTarget({
      level,
      demandId: args.goal.demandId,
      weeklyMileage: desiredMileage,
      kind: longKind,
      recentLongRunKm: recentForClimb,
      preferRaceSpecific:
        preferRaceSpecific &&
        (longKind === 'peak' || longKind === 'build') &&
        !preferAerobicLong,
      weekIndex: w,
      highLevel,
      daysPerWeek,
      weekCount,
    })
    let longRunTargetKm = isRaceWeek ? 0 : longTarget.preferredKm

    // Raise weekly volume to host the desired long, then apply jump/envelope caps.
    let longDrivenRaise = false
    if (!isRaceWeek && longRunTargetKm > 0 && architecture.usesLongRunKey) {
      const share = weekShare(w)
      const minWeekForLong = Math.ceil(longRunTargetKm / share)
      if (targetKm < minWeekForLong) {
        targetKm = minWeekForLong
        longDrivenRaise = true
      }
    }
    if (
      architectureId === 'hyrox' &&
      !isRaceWeek &&
      longRunTargetKm > 0 &&
      targetKm > 0
    ) {
      const maxLong = Math.floor(targetKm * 0.28 * 10) / 10
      if (longRunTargetKm > maxLong) {
        longRunTargetKm = Math.max(8, maxLong)
      }
    }

    if (w > 0 && !isRaceWeek) {
      const prevPhase = phases[w - 1]!
      // After recovery, jump is measured from last loading week — not the cut week.
      const jumpBaseline =
        prevPhase === SeasonPhase.RECOVERY ? prevLoadingTargetKm : prevTargetKm
      const maxJump =
        prevPhase === SeasonPhase.RECOVERY
          ? isMarathon
            ? 1.12
            : 1.1
          : isDeload
            ? DELOAD_VOLUME_RATIO
            : fromEnd === 1
              ? 1
              : isMarathon && longDrivenRaise
                ? fromEnd <= 3
                  ? 1.15
                  : 1.1
                : isMarathon
                  ? 1.1
                  : 1.08
      if (targetKm > jumpBaseline * maxJump) {
        targetKm = Math.round(jumpBaseline * maxJump * 10) / 10
      }
      if (isDeload && targetKm > prevLoadingTargetKm * DELOAD_VOLUME_RATIO) {
        targetKm = Math.round(prevLoadingTargetKm * DELOAD_VOLUME_RATIO * 10) / 10
      }
      if (fromEnd === 1 && targetKm > prevLoadingTargetKm * 0.85) {
        targetKm = Math.round(prevLoadingTargetKm * 0.75 * 10) / 10
      }
    }

    if (weekCeil != null && weekCeil > 0 && targetKm > weekCeil) {
      targetKm = weekCeil
    }

    // Fit long into the final week — shrink only after volume caps win.
    if (!isRaceWeek && longRunTargetKm > 0 && targetKm > 0) {
      const maxShare = weekShare(w)
      // Short ready specific blocks (6–11w): still grow the long toward ~26–28 km.
      // Do not stall at the opening long while weekly km climbs alone.
      if (
        marathonStandard &&
        isMarathon &&
        !isDeload &&
        fromEnd >= 2 &&
        fromEnd <= 4 &&
        weekCount >= 6 &&
        weekCount < 12 &&
        (args.goal.currentWeeklyKm ?? startKm) >= 40
      ) {
        const shortTarget = Math.min(
          28,
          Math.max(24, marathonStandard.minimumPeakLongRunKm - 2),
        )
        if (fromEnd <= 3) {
          const needWeek = Math.ceil(shortTarget / maxShare)
          const jumpBase =
            phases[w - 1] === SeasonPhase.RECOVERY
              ? prevLoadingTargetKm
              : prevTargetKm
          const raised = Math.min(
            needWeek,
            peakKm,
            Math.round(jumpBase * 1.15 * 10) / 10,
          )
          if (raised > targetKm) targetKm = raised
          if (recentForClimb + 4 >= shortTarget - 1 || fromEnd <= 2) {
            longRunTargetKm = Math.max(
              longRunTargetKm,
              Math.min(shortTarget, Math.round(targetKm * maxShare * 10) / 10),
            )
          }
        }
      }
      // Marathon peak phase: build repeated ≥28 km exposure, then peak ≥30 —
      // not a single checkbox long in W14.
      if (
        marathonStandard &&
        !isDeload &&
        fromEnd >= 2 &&
        fromEnd <= 6 &&
        weekCount >= 12
      ) {
        let durabilityTarget = longRunTargetKm
        if (
          fromEnd >= 4 &&
          runsOver28Planned < marathonStandard.minimumRunsOver28Km
        ) {
          durabilityTarget = Math.max(durabilityTarget, 28)
        }
        if (
          fromEnd <= 3 &&
          (runsOver30Planned < marathonStandard.minimumRunsOver30Km ||
            fromEnd === 2)
        ) {
          durabilityTarget = Math.max(
            durabilityTarget,
            marathonStandard.minimumPeakLongRunKm,
          )
        }
        const fitShare =
          (daysPerWeek ?? 5) <= 3 ? Math.max(maxShare, 0.5) : maxShare
        const needWeek = Math.ceil(durabilityTarget / fitShare)
        const jumpBase =
          phases[w - 1] === SeasonPhase.RECOVERY
            ? prevLoadingTargetKm
            : prevTargetKm
        // Durability-phase weeks may climb faster and slightly exceed the soft
        // envelope ceil so ≥28 km exposures are not forever stuck at 27 km.
        const durabilityJump = fromEnd <= 5 ? 1.22 : 1.15
        const softWeekCap = Math.max(
          peakKm,
          Math.round((marathonStandard.targetPeakWeeklyKm || peakKm) * 1.1 * 10) /
            10,
        )
        const raised = Math.min(
          needWeek,
          softWeekCap,
          Math.round(jumpBase * durabilityJump * 10) / 10,
        )
        if (raised > targetKm) targetKm = raised
        if (
          recentForClimb + 4 >= durabilityTarget - 0.5 ||
          fromEnd <= 3 ||
          (fromEnd >= 4 && recentForClimb >= 24)
        ) {
          longRunTargetKm = Math.max(
            longRunTargetKm,
            Math.min(
              durabilityTarget,
              Math.round(targetKm * fitShare * 10) / 10,
            ),
          )
        }
      }
      // Prefer growing non-long volume so the long is not the only progression lever.
      if (
        isMarathon &&
        !isDeload &&
        fromEnd > 1 &&
        longRunTargetKm > 0 &&
        longRunTargetKm / Math.max(targetKm, 1) > maxShare
      ) {
        const balancedWeek = Math.ceil(longRunTargetKm / maxShare)
        const jumpBase =
          phases[w - 1] === SeasonPhase.RECOVERY
            ? prevLoadingTargetKm
            : prevTargetKm
        const softWeekCap = marathonStandard
          ? Math.max(
              peakKm,
              Math.round(marathonStandard.targetPeakWeeklyKm * 1.1 * 10) / 10,
            )
          : peakKm
        targetKm = Math.min(
          softWeekCap,
          weekCeil != null && weekCeil > 0
            ? Math.max(weekCeil, targetKm)
            : balancedWeek,
          Math.max(
            targetKm,
            Math.min(balancedWeek, Math.round(jumpBase * 1.12 * 10) / 10),
          ),
        )
      }
      const maxLong = Math.round(targetKm * maxShare * 10) / 10
      // Keep progression honesty: never jump more than overload allows.
      const overloadCap =
        recentForClimb > 0 && !isDeload && fromEnd > 1
          ? Math.min(
              recentForClimb + 4,
              Math.round(recentForClimb * 1.18 * 2) / 2,
            )
          : longRunTargetKm
      // Peak-phase weeks may step onto the durability bar when close.
      const peakStepCap =
        marathonStandard && fromEnd === 2 && !isDeload
          ? Math.max(overloadCap, marathonStandard.minimumPeakLongRunKm)
          : marathonStandard && fromEnd <= 5 && !isDeload
            ? Math.max(overloadCap, 28)
            : overloadCap
      longRunTargetKm = Math.min(longRunTargetKm, peakStepCap)
      if (longRunTargetKm > maxLong) {
        longRunTargetKm = Math.max(
          architectureId === 'hyrox' ? 8 : 10,
          maxLong,
        )
      }
      const fitted = calculateLongRunTarget({
        level,
        demandId: args.goal.demandId,
        weeklyMileage: Math.max(targetKm, 1),
        kind: longKind,
        recentLongRunKm: recentForClimb,
        preferRaceSpecific:
          preferRaceSpecific || (isHalf && longKind === 'peak'),
        weekIndex: w,
        highLevel,
        daysPerWeek,
        weekCount,
      })
      // Prefer the durability-driven target when it still fits the week.
      // Keep peak-phase race_specific when the durability path forced distance.
      const keepRaceSpecific =
        isMarathon &&
        (fromEnd === 2 || fromEnd === 3) &&
        preferRaceSpecific &&
        longKind === 'peak'
      if (fitted.preferredKm >= longRunTargetKm) {
        Object.assign(longTarget, {
          ...fitted,
          intensityProfile: keepRaceSpecific
            ? 'race_specific'
            : fitted.intensityProfile,
        })
      } else {
        Object.assign(longTarget, {
          ...fitted,
          preferredKm: longRunTargetKm,
          minKm: Math.round(longRunTargetKm * 0.92 * 2) / 2,
          maxKm: Math.round(Math.min(longRunTargetKm * 1.08, maxLong) * 2) / 2,
          weeklyRatio:
            Math.round((longRunTargetKm / Math.max(targetKm, 1)) * 100) / 100,
          intensityProfile: keepRaceSpecific
            ? 'race_specific'
            : fitted.intensityProfile,
        })
      }
    }

    // Duration floor from km × easy pace — used for slot sizing.
    const longFloorMin = architectureId === 'hyrox' ? 35 : 45
    const longRunMinMinutes = isRaceWeek
      ? 20
      : Math.max(longFloorMin, Math.round(longRunTargetKm * easyMinPerKm))

    preferAerobicLong =
      longTarget.intensityProfile === 'aerobic' ||
      longTarget.intensityProfile === 'steady_finish'

    // Race-specific / progressive longs unlock non-aerobic selection.
    if (
      longTarget.intensityProfile === 'race_specific' ||
      longTarget.intensityProfile === 'fast_finish' ||
      longTarget.intensityProfile === 'progressive'
    ) {
      preferAerobicLong = false
    }
    // HYROX longs stay aerobic support (stations carry specificity).
    if (architectureId === 'hyrox') preferAerobicLong = true

    const longRunMpKm =
      isMarathon && !isRaceWeek
        ? marathonSpecificMpKmInLong({
            kind: longKind,
            intensityProfile: longTarget.intensityProfile,
            longRunKm: longRunTargetKm,
            weekIndex: w,
            weekCount,
          })
        : 0

    if (!isRaceWeek && longRunTargetKm > 0) {
      prevLongKm = longRunTargetKm
      if (!isDeload && fromEnd > 1) {
        prevLoadingLongKm = Math.max(prevLoadingLongKm, longRunTargetKm)
        if (longRunTargetKm >= 28) runsOver28Planned += 1
        if (longRunTargetKm >= 30) runsOver30Planned += 1
      }
    }
    prevTargetKm = targetKm
    if (!isDeload && !isRaceWeek && fromEnd > 1) {
      prevLoadingTargetKm = targetKm
    }

    const label =
      phase === SeasonPhase.RECOVERY
        ? 'Recovery'
        : phase === SeasonPhase.RACE
          ? 'Taper / race'
          : architectureId === 'hyrox'
            ? preferRaceSpecific
              ? 'HYROX specific'
              : 'HYROX build'
            : architectureId === 'multi_sport'
              ? phase === SeasonPhase.BASE
                ? 'Multi base'
                : 'Multi build'
              : intensityBand === 'adaptation'
                ? 'Adaptation'
                : intensityBand === 'engine'
                  ? // Avoid internal "Engine" naming — coaches see aerobic/threshold build.
                    preferRaceSpecific
                      ? 'Threshold build'
                      : 'Aerobic build'
                  : intensityBand === 'specific'
                    ? isMarathon
                      ? 'Marathon specific'
                      : isHalf
                        ? 'HM specific'
                        : 'Specific'
                    : intensityBand === 'taper' || fromEnd === 1
                      ? 'Taper'
                      : intensityBand === 'peak'
                        ? 'Peak'
                        : // Never label a non-deload week "Recovery" — that lied to coaches.
                          'Build'

    blueprints.push({
      weekIndex: w,
      phase,
      label,
      isDeload,
      isTaper: isTaper && !isRaceWeek,
      isRaceWeek,
      volumeScale,
      targetKm,
      longRunMinMinutes,
      longRunTargetKm,
      longIntensityProfile: longTarget.intensityProfile,
      longRunMpKm,
      intensityBand,
      qualityBudgetMin,
      qualitySessions,
      preferRaceSpecific,
      preferAerobicLong,
      preferStrides,
      allowVo2,
      thresholdVolumeTargetMin,
      architectureId,
      modalityVolumes,
      stationVolumeTarget: modalityTarget(modalityVolumes, 'strength_stations'),
      bikeMinutesTarget: modalityTarget(modalityVolumes, 'bike_minutes'),
      swimMetersTarget: modalityTarget(modalityVolumes, 'swim_meters'),
    })
  }

  return blueprints
}

/** Week-aligned phase blocks for the plan canvas (no mid-week splits). */
export function buildPlanPhasesFromBlueprints(
  goal: GoalProfile,
  blueprints: WeekBlueprint[],
): {
  phase: SeasonPhase
  sport: GoalProfile['sport']
  label: string | null
  startDay: number
  endDay: number
}[] {
  if (!blueprints.length) return []
  const blocks: {
    phase: SeasonPhase
    sport: GoalProfile['sport']
    label: string | null
    startDay: number
    endDay: number
  }[] = []

  let start = 0
  let current = blueprints[0]!
  for (let w = 1; w <= blueprints.length; w += 1) {
    const next = blueprints[w]
    if (!next || next.phase !== current.phase || next.label !== current.label) {
      blocks.push({
        phase: current.phase,
        sport: goal.sport,
        label: current.label,
        startDay: start * 7,
        endDay: w * 7 - 1,
      })
      if (next) {
        start = w
        current = next
      }
    }
  }
  return blocks
}

export function blueprintToPhaseProfile(
  bp: WeekBlueprint,
  priority: PriorityProfile,
): PhaseProfile {
  const primary = priority.primary.adaptation.replaceAll('_', ' ')
  return {
    phase: bp.phase,
    phaseGoal:
      bp.phase === SeasonPhase.BASE
        ? 'aerobic_base'
        : bp.phase === SeasonPhase.RECOVERY
          ? 'recovery_absorb'
          : bp.phase === SeasonPhase.RACE
            ? 'race_week'
            : bp.preferRaceSpecific
              ? 'race_specific'
              : 'race_specific_endurance',
    weeksToRace: null,
    weekObjectives: [
      `Emphasize ${primary}`,
      ...(bp.isDeload
        ? ['Recovery week: ~90% volume, easy aerobic — no quality/threshold blocks']
        : []),
      ...(bp.isTaper ? ['Taper: keep intensity, cut volume'] : []),
      ...(bp.isRaceWeek ? ['Race week: freshness + race'] : []),
      ...(bp.preferRaceSpecific ? ['Increase race-specific work'] : []),
    ],
    isDeload: bp.isDeload,
    isTaper: bp.isTaper || bp.isRaceWeek,
    volumeScale: bp.volumeScale,
  }
}

/** Race-day session metrics by goal demand. */
export function raceDayTargets(goal: GoalProfile): {
  distanceKm: number
  durationMin: number
  title: string
  sessionType: SessionType
  sport: WorkoutType
} {
  const demand = goal.demandId
  const goalMin = parseGoalTimeMinutes(goal.target.valueLabel)

  if (demand.includes('MARATHON') && !demand.includes('HALF')) {
    return {
      distanceKm: 42.2,
      durationMin: goalMin ?? 240,
      title: 'Race: Marathon',
      sessionType: SessionType.RACE_PACE,
      sport: WorkoutType.RUN,
    }
  }
  if (demand.includes('HALF') || demand.includes('HM')) {
    return {
      distanceKm: 21.1,
      durationMin: goalMin ?? 105,
      title: 'Race: Half marathon',
      sessionType: SessionType.RACE_PACE,
      sport: WorkoutType.RUN,
    }
  }
  if (demand.includes('10K') || demand.includes('TEN')) {
    return {
      distanceKm: 10,
      durationMin: goalMin ?? 50,
      title: 'Race: 10K',
      sessionType: SessionType.RACE_PACE,
      sport: WorkoutType.RUN,
    }
  }
  if (demand.includes('5K') || demand.includes('FIVE')) {
    return {
      distanceKm: 5,
      durationMin: goalMin ?? 28,
      title: 'Race: 5K',
      sessionType: SessionType.RACE_PACE,
      sport: WorkoutType.RUN,
    }
  }
  if (demand === 'HYROX_V1' || demand.includes('HYROX')) {
    return {
      distanceKm: 8,
      durationMin: goalMin ?? 90,
      title: 'Race: HYROX',
      sessionType: SessionType.RACE_PACE,
      sport: WorkoutType.HYROX,
    }
  }
  if (demand === 'MULTI_BASE_V1' || demand.includes('MULTI') || demand.includes('TRI')) {
    return {
      distanceKm: 10,
      durationMin: goalMin ?? 120,
      title: goal.race?.name ? `Race: ${goal.race.name}` : 'Race: Multi-sport',
      sessionType: SessionType.RACE_PACE,
      sport: WorkoutType.TRIATHLON,
    }
  }
  return {
    distanceKm: goal.target.valueLabel ? 21.1 : 10,
    durationMin: goalMin ?? 90,
    title: goal.race?.name ? `Race: ${goal.race.name}` : 'Race day',
    sessionType: SessionType.RACE_PACE,
    sport: goal.sport,
  }
}
