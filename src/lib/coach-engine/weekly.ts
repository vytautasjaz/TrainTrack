import type {
  AthleteLevel,
  CapacityProfile,
  MethodologyConstraint,
  MethodologySelection,
  PhaseProfile,
  PriorityProfile,
  SportArchitectureId,
  TrainingModelId,
  WeeklyArchitecture,
  WeeklySlot,
} from '@/lib/coach-engine/types'
import { defaultLevelMinutes } from '@/lib/coach-engine/brief'
import type { LongIntensityProfile } from '@/lib/coach-engine/long-run-target'
import { markKeySessions } from '@/lib/coach-engine/safety'

function dayGap(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 7 - d)
}

/** Progressive / race-specific longs count as high-load for quality spacing. */
export function longRunIsHighLoad(
  profile: LongIntensityProfile | null | undefined,
): boolean {
  return (
    profile === 'progressive' ||
    profile === 'race_specific' ||
    profile === 'fast_finish'
  )
}

type QualityPickContext = {
  trainDays: number[]
  longDay: number
  hardBudget: number
  level: AthleteLevel
  targetKm?: number | null
  longIsHighLoad?: boolean
  preferRaceSpecific?: boolean
  isDeload?: boolean
  isTaper?: boolean
}

function combinations(days: number[], k: number): number[][] {
  if (k <= 0) return [[]]
  if (k > days.length) return []
  const out: number[][] = []
  const rec = (start: number, acc: number[]) => {
    if (acc.length === k) {
      out.push([...acc])
      return
    }
    for (let i = start; i < days.length; i += 1) {
      acc.push(days[i]!)
      rec(i + 1, acc)
      acc.pop()
    }
  }
  rec(0, [])
  return out
}

/**
 * Score a candidate set of quality days.
 * Goal: coherent weekly rhythm — never consecutive, but do NOT maximize gaps.
 * Tue+Thu (gap 2) is the sweet spot for most 2-quality weeks.
 */
function scoreQualityCombo(
  combo: number[],
  ctx: QualityPickContext,
): number {
  if (combo.length === 0) return 0
  const sorted = [...combo].sort((a, b) => a - b)
  const longDay = ctx.longDay
  const level = ctx.level
  const km = ctx.targetKm ?? 0

  // Hard reject: consecutive quality days (including Sun↔Mon wrap).
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (dayGap(sorted[i]!, sorted[j]!) <= 1) return -10_000
    }
  }

  let score = 100

  // Ideal gap between successive qualities (calendar distance).
  // 2 = one non-quality day between (Tue→Thu). That is the default sweet spot.
  const idealGap =
    level === 'beginner' || (km > 0 && km < 40)
      ? 3
      : level === 'elite' && sorted.length >= 3
        ? 2
        : 2

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const gap = dayGap(sorted[i]!, sorted[i + 1]!)
    const delta = Math.abs(gap - idealGap)
    if (gap === 2) score += 45 // one easy/recovery day — preferred
    else if (gap === 3) {
      // Two days between: fine for beginners; slightly sparse for advanced.
      score += level === 'beginner' || level === 'intermediate' ? 30 : 12
    } else if (gap >= 4) {
      // Unnecessarily large gap — week becomes structurally inefficient.
      score -= level === 'beginner' ? 5 : 25
    }
    score -= delta * 4
  }

  // Classic mid-week rhythms relative to a weekend long.
  const key = sorted.join(',')
  const longIsWeekend = longDay === 5 || longDay === 6
  if (longIsWeekend && sorted.length === 2) {
    // Tue+Thu, Mon+Thu, Tue+Fri, Wed+Fri
    if (key === '1,3' || key === '0,3' || key === '1,4' || key === '2,4') {
      score += 35
    }
    // Mon+Wed leaves Thu/Fri empty before a Sat/Sun long — often too sparse.
    if (key === '0,2') score -= 20
  }
  if (sorted.length === 3 && key === '0,2,4') {
    // Mon+Wed+Fri — appropriate when level/volume support three stimuli.
    score +=
      level === 'advanced' || level === 'elite' || km >= 70 ? 40 : -30
  }

  // Prefer quality on Tue / Thu when available (common coaching rhythm).
  for (const d of sorted) {
    if (d === 1 || d === 3) score += 8
    if (d === 2 || d === 4) score += 4
  }

  // Long-run proximity: easy long tolerates closer quality; hard long does not.
  for (const d of sorted) {
    const toLong = dayGap(d, longDay)
    if (toLong === 0) score -= 80
    else if (toLong === 1) {
      score -= ctx.longIsHighLoad ? 55 : 18
    } else if (toLong === 2) {
      score -= ctx.longIsHighLoad ? 12 : 0
    }
  }

  // Avoid clustering all stress late in the week (quality + hard long).
  if (longIsWeekend && sorted.length >= 2) {
    const late = sorted.filter((d) => d >= 3).length
    if (late === sorted.length) score -= 15
    // Midpoint of qualities should sit mid-week, not Mon–Tue only.
    const mid =
      sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length)
    if (mid < 1.2) score -= 12
    if (mid >= 1.5 && mid <= 3.5) score += 10
  }

  // Training-load spacing: two qualities + hard long is expensive for
  // intermediate athletes — prefer one fewer quality day when long is high-load.
  if (ctx.longIsHighLoad && sorted.length >= 2) {
    if (level === 'beginner' || level === 'intermediate') score -= 40
    else if (level === 'advanced') score -= 12
  }

  // Second quality that is race-specific pairs well with Thu when long is weekend.
  if (ctx.preferRaceSpecific && sorted.length >= 2 && sorted.includes(3)) {
    score += 8
  }

  // Deload / taper: prefer a single earlier quality, already budget-limited.
  if (ctx.isDeload || ctx.isTaper) {
    score += sorted[0] != null && sorted[0] <= 2 ? 5 : 0
  }

  return score
}

/**
 * Choose quality days by scoring weekly rhythms.
 * Never consecutive; preferred spacing is adaptive — not "maximize easy days".
 */
function pickQualityDays(ctx: QualityPickContext): number[] {
  const longDay = ((ctx.longDay % 7) + 7) % 7
  const budget = Math.max(0, Math.min(3, ctx.hardBudget))
  if (budget === 0) return []

  const candidates = ctx.trainDays
    .map((d) => ((d % 7) + 7) % 7)
    .filter((d, i, arr) => arr.indexOf(d) === i && d !== longDay)
    .sort((a, b) => a - b)

  if (candidates.length === 0) return []

  let best: number[] = []
  let bestScore = -Infinity

  for (let k = Math.min(budget, candidates.length); k >= 1; k -= 1) {
    // Prefer filling the full budget when possible; only drop if all combos fail.
    for (const combo of combinations(candidates, k)) {
      const score = scoreQualityCombo(combo, { ...ctx, longDay })
      if (score > bestScore) {
        bestScore = score
        best = combo
      }
    }
    if (bestScore > -5000) break
  }

  if (best.length === 0 && candidates[0] != null) {
    // Last resort: furthest from long (spacing repaired later if needed).
    best = [
      [...candidates].sort(
        (a, b) => dayGap(b, longDay) - dayGap(a, longDay) || a - b,
      )[0]!,
    ]
  }

  return best.sort((a, b) => a - b)
}

/**
 * How many sessions this week actually needs.
 * `daysPerWeek` / available days are a ceiling — not a mandate to fill every day.
 */
export function resolveTargetSessionCount(args: {
  availabilityCeiling: number
  level: AthleteLevel
  targetKm?: number | null
  isDeload?: boolean
  isRaceWeek?: boolean
  qualitySessions: number
  model?: TrainingModelId
}): number {
  const ceiling = Math.min(7, Math.max(3, args.availabilityCeiling))

  let ideal: number =
    args.level === 'beginner'
      ? 3
      : args.level === 'intermediate'
        ? 4
        : args.level === 'advanced'
          ? 5
          : 6

  if (args.targetKm != null && args.targetKm > 0) {
    if (args.targetKm < 35) ideal = Math.min(ideal, 3)
    // From ~40 km, prefer a 4th easy so volume growth is not only via the long.
    else if (args.targetKm < 40) ideal = Math.max(ideal, Math.min(4, ceiling))
    else if (args.targetKm < 70) ideal = Math.max(ideal, Math.min(4, ceiling))
    else ideal = Math.max(ideal, Math.min(5, ceiling))
    if (args.targetKm >= 90) ideal = Math.max(ideal, Math.min(6, ceiling))
  }

  // Polarized prefers fewer, higher-quality sessions — not stuffing the calendar.
  if (args.model === 'POLARIZED') {
    ideal = Math.min(ideal, args.level === 'elite' ? 6 : 5)
  }

  if (args.isDeload) ideal = Math.min(ideal, Math.max(4, ideal - 1))
  if (args.isRaceWeek) ideal = Math.min(ideal, 4)

  // long + quality(+optional 2nd) + at least one easy buffer when 2 qualities
  const minNeeded =
    1 + args.qualitySessions + (args.qualitySessions >= 2 ? 1 : 0)
  ideal = Math.max(ideal, Math.min(minNeeded, ceiling))

  return Math.min(ceiling, Math.max(3, ideal))
}

function pickRecoveryDay(
  trainDays: number[],
  longDay: number,
  qualityDays: number[],
): number | null {
  const blocked = new Set([longDay, ...qualityDays])
  // Prefer the calendar day immediately after a hard quality session.
  const afterQuality = trainDays.find(
    (d) =>
      !blocked.has(d) && qualityDays.some((q) => (q + 1) % 7 === d),
  )
  if (afterQuality != null) return afterQuality
  return trainDays.find((d) => !blocked.has(d)) ?? null
}

/**
 * Choose which days to actually train.
 * Pool = available orientation days; fill only `sessionCount` of them.
 */
function selectTrainDays(args: {
  sessionCount: number
  longDay: number
  availableDays?: number[]
  qualityBudget: number
  level: AthleteLevel
  targetKm?: number | null
  longIsHighLoad?: boolean
  preferRaceSpecific?: boolean
  isDeload?: boolean
  isTaper?: boolean
}): number[] {
  const longDay = ((args.longDay % 7) + 7) % 7
  const pool = (() => {
    const explicit = (args.availableDays ?? [])
      .map((d) => ((d % 7) + 7) % 7)
      .filter((d, i, arr) => arr.indexOf(d) === i)
    if (explicit.length > 0) {
      const set = new Set(explicit)
      set.add(longDay)
      return [...set].sort((a, b) => a - b)
    }
    return [0, 1, 2, 3, 4, 5, 6]
  })()

  const sessionCount = Math.min(
    args.sessionCount,
    Math.max(3, pool.length),
  )

  const qualityDays = pickQualityDays({
    trainDays: pool,
    longDay,
    hardBudget: args.qualityBudget,
    level: args.level,
    targetKm: args.targetKm,
    longIsHighLoad: args.longIsHighLoad,
    preferRaceSpecific: args.preferRaceSpecific,
    isDeload: args.isDeload,
    isTaper: args.isTaper,
  })
  const selected = new Set<number>([longDay, ...qualityDays])

  // One non-quality day between qualities when available (not two+).
  if (qualityDays.length >= 2) {
    const [a, b] = [...qualityDays].sort((x, y) => x - y)
    for (let d = a! + 1; d < b!; d += 1) {
      if (pool.includes(d) && selected.size < sessionCount) {
        selected.add(d)
        break
      }
    }
  }

  // Day after each quality → easy/recovery when available.
  for (const q of qualityDays) {
    if (selected.size >= sessionCount) break
    const next = (q + 1) % 7
    if (pool.includes(next) && next !== longDay) selected.add(next)
  }

  // Fill remaining toward a compact weekly rhythm (not maximizing gaps).
  const hardAnchors = [longDay, ...qualityDays]
  const fillers = pool
    .filter((d) => !selected.has(d))
    .sort((a, b) => {
      const distA = Math.min(...hardAnchors.map((h) => dayGap(a, h)))
      const distB = Math.min(...hardAnchors.map((h) => dayGap(b, h)))
      // Prefer days adjacent to the existing rhythm (dist 1) over distant outliers.
      const rank = (d: number) => {
        const dist = Math.min(...hardAnchors.map((h) => dayGap(d, h)))
        if (dist === 1) return 0
        if (dist === 2) return 1
        return 2 + dist
      }
      return rank(a) - rank(b) || distA - distB || a - b
    })
  for (const d of fillers) {
    if (selected.size >= sessionCount) break
    selected.add(d)
  }

  return [...selected].sort((a, b) => a - b)
}

/**
 * Build a week skeleton from availability + volume logic,
 * then shape intensity with methodology constraints.
 */
function buildScheduleSlots(args: {
  primary: PriorityProfile['primary']['adaptation']
  secondary: PriorityProfile['secondary'][0] | undefined
  hardBudget: number
  sessionCount: number
  longRunDay: number
  availableDays?: number[]
  levelMinutes: ReturnType<typeof defaultLevelMinutes>
  preferRaceSpecific?: boolean
  level: AthleteLevel
  targetKm?: number | null
  longIsHighLoad?: boolean
  isDeload?: boolean
  isTaper?: boolean
  architectureId?: SportArchitectureId
}): WeeklySlot[] {
  const architectureId = args.architectureId ?? 'run_endurance'
  const longDay = ((args.longRunDay % 7) + 7) % 7
  const qualityContext = {
    level: args.level,
    targetKm: args.targetKm,
    longIsHighLoad: args.longIsHighLoad,
    preferRaceSpecific: args.preferRaceSpecific,
    isDeload: args.isDeload,
    isTaper: args.isTaper,
  }
  const trainList = selectTrainDays({
    sessionCount: args.sessionCount,
    longDay,
    availableDays: args.availableDays,
    qualityBudget: args.hardBudget,
    ...qualityContext,
  })
  const trainDays = new Set(trainList)

  // Session-count ceiling can drop a second quality on very short weeks,
  // but do not force gap maximization — 5-day weeks still support 2 qualities.
  const qualityCap =
    args.sessionCount <= 3 ? 1 : Math.min(args.hardBudget, 3)
  const qualityDays = pickQualityDays({
    trainDays: trainList,
    longDay,
    hardBudget: Math.min(args.hardBudget, qualityCap),
    ...qualityContext,
  })
  const recoveryDay = pickRecoveryDay(trainList, longDay, qualityDays)
  const strengthWanted =
    architectureId === 'hyrox' ||
    args.secondary?.adaptation === 'max_strength' ||
    args.primary === 'max_strength'
  const openDays = () =>
    trainList.filter(
      (d) =>
        d !== longDay &&
        !qualityDays.includes(d) &&
        d !== recoveryDay,
    )
  const strengthDay =
    strengthWanted ? openDays()[0] ?? null : null

  // Multi-sport: reserve bike + swim days (steal recovery / demote a quality if needed).
  let bikeDay: number | null = null
  let swimDay: number | null = null
  let recoveryDayFinal: number | null = recoveryDay
  if (architectureId === 'multi_sport') {
    const leftover = openDays().filter((d) => d !== strengthDay)
    bikeDay = leftover[0] ?? null
    swimDay = leftover[1] ?? null
    if (bikeDay == null && recoveryDayFinal != null) {
      bikeDay = recoveryDayFinal
      recoveryDayFinal = null
    }
    if (swimDay == null && recoveryDayFinal != null) {
      swimDay = recoveryDayFinal
      recoveryDayFinal = null
    }
    // Still short: demote quality days into bike/swim (keep ≥1 run quality).
    while (
      (bikeDay == null || swimDay == null) &&
      qualityDays.length > 1
    ) {
      const demoted = qualityDays.pop()!
      if (bikeDay == null) bikeDay = demoted
      else if (swimDay == null) swimDay = demoted
    }
    if (bikeDay == null && qualityDays.length > 0) {
      // Last resort — prefer a multi mix over pure run when days are scarce.
      bikeDay = qualityDays.pop()!
    }
  }

  // HYROX: second open day becomes a station/simulation block when available.
  let hyroxDay: number | null = null
  if (architectureId === 'hyrox') {
    hyroxDay =
      openDays().find((d) => d !== strengthDay) ?? null
  }

  const slots: WeeklySlot[] = []
  for (let day = 0; day < 7; day += 1) {
    if (!trainDays.has(day)) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'rest',
        primaryAdaptation: null,
        availableMinutes: 0,
        hard: false,
      })
      continue
    }

    if (day === longDay) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'long',
        primaryAdaptation:
          args.primary === 'long_run_tolerance' ||
          args.primary === 'aerobic_durability'
            ? args.primary
            : 'long_run_tolerance',
        availableMinutes:
          architectureId === 'hyrox'
            ? Math.min(args.levelMinutes.long, 70)
            : args.levelMinutes.long,
        hard: false,
        modality: 'run',
      })
      continue
    }

    if (strengthDay === day) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'strength',
        primaryAdaptation: 'max_strength',
        availableMinutes: Math.min(
          architectureId === 'hyrox' ? 70 : 60,
          args.levelMinutes.quality + 10,
        ),
        hard: architectureId === 'hyrox',
        modality: architectureId === 'hyrox' ? 'hyrox' : 'strength',
      })
      continue
    }

    if (hyroxDay === day) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'quality',
        primaryAdaptation: 'max_strength',
        availableMinutes: Math.min(75, args.levelMinutes.quality + 15),
        hard: true,
        preferRaceSpecific: true,
        modality: 'hyrox',
      })
      continue
    }

    if (bikeDay === day) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'bike',
        primaryAdaptation: 'aerobic_capacity',
        availableMinutes: Math.max(45, args.levelMinutes.easy + 20),
        hard: false,
        modality: 'bike',
      })
      continue
    }

    if (swimDay === day) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'swim',
        primaryAdaptation: 'aerobic_capacity',
        availableMinutes: Math.max(35, args.levelMinutes.easy),
        hard: false,
        modality: 'swim',
      })
      continue
    }

    if (qualityDays.includes(day)) {
      const isSecondary =
        qualityDays[1] === day &&
        (args.preferRaceSpecific || args.secondary?.adaptation != null)
      slots.push({
        dayOfWeek: day,
        stimulus: 'quality',
        primaryAdaptation: isSecondary
          ? args.preferRaceSpecific
            ? 'threshold'
            : args.secondary!.adaptation
          : args.primary,
        availableMinutes: args.levelMinutes.quality,
        hard: true,
        preferRaceSpecific: Boolean(isSecondary && args.preferRaceSpecific),
        modality: 'run',
      })
      continue
    }

    if (recoveryDayFinal === day) {
      slots.push({
        dayOfWeek: day,
        stimulus: 'recovery',
        primaryAdaptation: null,
        availableMinutes: args.levelMinutes.recovery,
        hard: false,
        modality: 'run',
      })
      continue
    }

    slots.push({
      dayOfWeek: day,
      stimulus: 'easy',
      primaryAdaptation: 'aerobic_capacity',
      availableMinutes: args.levelMinutes.easy,
      hard: false,
      modality: 'run',
    })
  }

  return ensureHardSessionSpacing(slots)
}

/**
 * Safety net: never leave two quality/hard days consecutive.
 * Does NOT insert extra recovery days to maximize gaps — rhythm is chosen upstream.
 */
function ensureHardSessionSpacing(slots: WeeklySlot[]): WeeklySlot[] {
  const next = slots.map((s) => ({ ...s }))
  const isHardQuality = (s: WeeklySlot) =>
    (s.hard && (s.stimulus === 'quality' || s.stimulus === 'race')) ||
    s.stimulus === 'quality'

  // Never allow consecutive hard quality days — demote the later one to easy.
  for (let i = 0; i < 7; i += 1) {
    const cur = next[i]!
    const nxt = next[(i + 1) % 7]!
    if (isHardQuality(cur) && isHardQuality(nxt)) {
      nxt.stimulus = 'easy'
      nxt.hard = false
      nxt.isKeySession = false
      nxt.preferRaceSpecific = false
      nxt.primaryAdaptation = 'aerobic_capacity'
      nxt.availableMinutes = Math.min(nxt.availableMinutes || 40, 45)
      if (nxt.availableMinutes <= 0) nxt.availableMinutes = 40
    }
  }

  return next
}

function applyModelShape(
  slots: WeeklySlot[],
  model: TrainingModelId,
  constraints: MethodologyConstraint[],
  opts?: { preferRaceSpecific?: boolean; qualitySessions?: number },
): WeeklySlot[] {
  const next = slots.map((s) => ({ ...s }))
  const quality = next.filter((s) => s.hard && s.stimulus === 'quality')
  const second = quality[1]
  const wantSecond =
    (opts?.qualitySessions ?? 1) >= 2 || Boolean(opts?.preferRaceSpecific)

  if (model === 'POLARIZED' && second && !wantSecond) {
    second.stimulus = 'easy'
    second.hard = false
    second.primaryAdaptation = 'aerobic_capacity'
    second.availableMinutes = Math.min(second.availableMinutes, 50)
    second.isKeySession = false
    second.preferRaceSpecific = false
  }

  if (model === 'THRESHOLD' && second) {
    const activeCount = next.filter((s) => s.stimulus !== 'rest').length
    if (activeCount >= 5) {
      // Second quality = durability / race-specific — not a second smash day.
      second.primaryAdaptation = 'threshold'
      second.preferRaceSpecific = true
      second.stimulus = 'quality'
      second.hard = true
      second.isKeySession = false
    } else {
      second.stimulus = 'easy'
      second.hard = false
      second.isKeySession = false
      second.preferRaceSpecific = false
      second.primaryAdaptation = 'aerobic_capacity'
    }
  }

  // Norwegian shaping (same-day doubles + recovery) is applied separately.

  if (model === 'RACE_SPECIFIC') {
    const first = quality[0]
    if (first) {
      first.primaryAdaptation = 'threshold'
      first.preferRaceSpecific = true
    }
    const long = next.find((s) => s.stimulus === 'long')
    if (long) {
      long.primaryAdaptation = 'long_run_tolerance'
      long.availableMinutes = Math.max(long.availableMinutes, 100)
    }
  }

  // Pyramidal: keep at most one threshold; second quality → race-specific (not another TH).
  if (
    model === 'PYRAMIDAL' &&
    constraints.includes('limit_moderate_intensity_accumulation') &&
    second
  ) {
    if (wantSecond || opts?.preferRaceSpecific) {
      second.stimulus = 'quality'
      second.hard = true
      second.primaryAdaptation = 'threshold'
      second.preferRaceSpecific = true
      second.isKeySession = false
    } else {
      second.stimulus = 'easy'
      second.hard = false
      second.isKeySession = false
      second.preferRaceSpecific = false
      second.primaryAdaptation = 'aerobic_capacity'
    }
  }

  return next
}

function toRecoverySlot(slot: WeeklySlot, minutes: number): void {
  slot.stimulus = 'recovery'
  slot.hard = false
  slot.isKeySession = false
  slot.preferRaceSpecific = false
  slot.doubleThreshold = false
  slot.primaryAdaptation = null
  slot.availableMinutes = Math.max(25, Math.min(50, minutes || 35))
}

function toEasySlot(slot: WeeklySlot, minutes: number): void {
  slot.stimulus = 'easy'
  slot.hard = false
  slot.isKeySession = false
  slot.preferRaceSpecific = false
  slot.doubleThreshold = false
  slot.primaryAdaptation = 'aerobic_capacity'
  slot.availableMinutes = Math.max(30, Math.min(55, minutes || 40))
}

/**
 * Norwegian double-threshold:
 * - One (sometimes two) calendar days with AM+PM controlled threshold.
 * - The NEXT day after every double-threshold day is mandatory recovery/easy.
 * - Do not treat "double threshold" as two separate mid-week quality days.
 */
export function applyNorwegianDoubleThreshold(
  slots: WeeklySlot[],
  args: {
    constraints: MethodologyConstraint[]
    level: AthleteLevel
    qualitySessions: number
    preferRaceSpecific?: boolean
    isDeload?: boolean
    isTaper?: boolean
    isRaceWeek?: boolean
    targetKm?: number | null
  },
): WeeklySlot[] {
  const next = slots.map((s) => ({ ...s }))
  const allowDt =
    args.constraints.includes('allow_double_threshold_day') &&
    !args.constraints.includes('no_double_threshold')

  if (
    !allowDt ||
    args.isDeload ||
    args.isTaper ||
    args.isRaceWeek
  ) {
    // Proxy / blocked mode: keep at most one or two spaced singles; no same-day doubles.
    for (const s of next) s.doubleThreshold = false
    const qualities = next.filter((s) => s.stimulus === 'quality' && s.hard)
    if (qualities.length >= 2 && args.preferRaceSpecific) {
      qualities[1]!.preferRaceSpecific = true
    }
    return next
  }

  const qualities = next
    .filter((s) => s.stimulus === 'quality' && s.hard)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  if (qualities.length === 0) return next

  // How many double-threshold DAYS this week?
  // Elite / high volume can support 2 (e.g. Tue + Thu) with easy between.
  // Most athletes: 1 DT day is the correct dose.
  const wantTwoDtDays =
    args.qualitySessions >= 2 &&
    (args.level === 'elite' ||
      (args.level === 'advanced' && (args.targetKm ?? 0) >= 75))

  const dtDays = wantTwoDtDays
    ? qualities.slice(0, 2)
    : qualities.slice(0, 1)

  const dtDayNums = new Set(dtDays.map((s) => s.dayOfWeek))

  for (const slot of next) {
    if (dtDayNums.has(slot.dayOfWeek) && slot.stimulus === 'quality') {
      slot.doubleThreshold = true
      slot.primaryAdaptation = 'threshold'
      slot.preferRaceSpecific = false
      slot.hard = true
      // Combined day budget — split across AM (longer) + PM (shorter) in pipeline.
      slot.availableMinutes = Math.max(
        75,
        Math.min(110, Math.round((slot.availableMinutes || 60) * 1.35)),
      )
      slot.isKeySession = slot === dtDays[0] ? true : slot.isKeySession
    } else if (slot.stimulus === 'quality' && slot.hard) {
      // Extra quality days beyond DT budget → easy aerobic.
      toEasySlot(slot, slot.availableMinutes)
    }
  }

  // Mandatory recovery the calendar day after every DT day.
  for (const dt of dtDays) {
    const afterIdx = (dt.dayOfWeek + 1) % 7
    const after = next.find((s) => s.dayOfWeek === afterIdx)
    if (!after) continue
    if (after.stimulus === 'long' || after.stimulus === 'race') {
      // Never demote long/race — move DT earlier would be ideal; soften DT instead.
      dt.availableMinutes = Math.min(dt.availableMinutes, 85)
      continue
    }
    toRecoverySlot(after, after.availableMinutes || 35)
  }

  // If two DT days ended up adjacent (shouldn't), demote the later.
  const marked = next
    .filter((s) => s.doubleThreshold)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  for (let i = 0; i < marked.length - 1; i += 1) {
    if (dayGap(marked[i]!.dayOfWeek, marked[i + 1]!.dayOfWeek) <= 1) {
      toEasySlot(marked[i + 1]!, marked[i + 1]!.availableMinutes)
    }
  }

  return next
}

/**
 * Weekly skeleton shaped by schedule brief + methodology + capacity + phase + blueprint.
 */
export function buildWeeklyArchitecture(args: {
  priority: PriorityProfile
  capacity: CapacityProfile
  phase: PhaseProfile
  methodology?: MethodologySelection
  daysPerWeek?: number
  longRunDay?: number
  availableDays?: number[]
  level?: AthleteLevel
  /** Override hard-session count from week blueprint (0–2). */
  qualitySessions?: number
  preferRaceSpecific?: boolean
  longRunMinMinutes?: number
  /** Week target km — drives how many sessions are actually needed. */
  targetKm?: number | null
  isRaceWeek?: boolean
  raceDurationMin?: number
  /** Weekday for the race in the final week (0=Mon…6=Sun). */
  raceWeekday?: number | null
  /** Long-run intensity family — affects quality spacing near the long. */
  longIntensityProfile?: LongIntensityProfile | null
  /** Sport architecture — drives bike/swim/station slot mix. */
  architectureId?: SportArchitectureId
}): WeeklyArchitecture {
  const primary = args.priority.primary.adaptation
  const secondary = args.priority.secondary[0]
  const model = args.methodology?.selectedModel ?? 'PYRAMIDAL'
  const constraints = args.methodology?.constraints ?? []
  let availabilityCeiling = Math.min(
    args.capacity.maxSessionsPerWeek,
    Math.max(
      3,
      args.availableDays?.length ||
        args.daysPerWeek ||
        args.capacity.maxSessionsPerWeek,
    ),
  )
  // Marathon durability weeks: allow a 4th easy even on a 3-day declaration
  // so volume growth is not loaded entirely onto the long run.
  if (
    (args.architectureId === 'run_endurance' ||
      args.capacity.architectureId === 'run_endurance') &&
    (args.targetKm ?? 0) >= 40 &&
    availabilityCeiling < 4
  ) {
    availabilityCeiling = Math.min(4, args.capacity.maxSessionsPerWeek)
  }
  const longRunDay = args.longRunDay ?? 5
  const raceWeekday =
    args.raceWeekday != null
      ? ((args.raceWeekday % 7) + 7) % 7
      : null
  const levelMinutes = defaultLevelMinutes(args.level ?? 'intermediate')
  const preferRaceSpecific = Boolean(args.preferRaceSpecific)
  const qualitySessions =
    args.qualitySessions ??
    Math.min(2, args.capacity.maxHardSessionsPerWeek)

  let hardBudget = Math.min(
    args.capacity.maxHardSessionsPerWeek,
    Math.max(0, qualitySessions),
  )
  if (args.phase.isDeload) {
    hardBudget = 0
  } else if (args.phase.isTaper) {
    hardBudget = Math.min(hardBudget, 1)
  }
  if (args.isRaceWeek || args.phase.phase === 'RACE') {
    hardBudget = Math.min(hardBudget, 1)
  }
  // Intermediate athletes: hard long + 2 quality = too much by default.
  if (
    longRunIsHighLoad(args.longIntensityProfile) &&
    (args.level === 'beginner' || args.level === 'intermediate') &&
    hardBudget >= 2
  ) {
    hardBudget = 1
  }

  const architectureId =
    args.architectureId ?? args.capacity.architectureId ?? 'run_endurance'
  let sessionCount = resolveTargetSessionCount({
    availabilityCeiling,
    level: args.level ?? 'intermediate',
    targetKm: args.targetKm,
    isDeload: args.phase.isDeload,
    isRaceWeek: args.isRaceWeek || args.phase.phase === 'RACE',
    qualitySessions: hardBudget,
    model,
  })
  // Multi-sport needs room for bike + swim alongside run long/quality.
  if (
    architectureId === 'multi_sport' &&
    !args.isRaceWeek &&
    args.phase.phase !== 'RACE'
  ) {
    sessionCount = Math.min(
      availabilityCeiling,
      Math.max(sessionCount, 5),
    )
  }
  // HYROX needs station + run quality + aerobic support.
  if (
    architectureId === 'hyrox' &&
    !args.isRaceWeek &&
    args.phase.phase !== 'RACE'
  ) {
    sessionCount = Math.min(
      availabilityCeiling,
      Math.max(sessionCount, 4),
    )
  }

  let slots = markKeySessions(
    buildScheduleSlots({
      primary,
      secondary,
      hardBudget,
      sessionCount,
      longRunDay,
      availableDays: args.availableDays,
      levelMinutes,
      preferRaceSpecific,
      level: args.level ?? 'intermediate',
      targetKm: args.targetKm,
      longIsHighLoad: longRunIsHighLoad(args.longIntensityProfile),
      isDeload: args.phase.isDeload,
      isTaper: args.phase.isTaper,
      architectureId,
    }),
  )
  slots = applyModelShape(slots, model, constraints, {
    preferRaceSpecific,
    qualitySessions: hardBudget,
  })
  if (model === 'NORWEGIAN') {
    slots = applyNorwegianDoubleThreshold(slots, {
      constraints,
      level: args.level ?? 'intermediate',
      qualitySessions: hardBudget,
      preferRaceSpecific,
      isDeload: args.phase.isDeload,
      isTaper: args.phase.isTaper,
      isRaceWeek: args.isRaceWeek || args.phase.phase === 'RACE',
      targetKm: args.targetKm,
    })
  }
  // Re-apply spacing after model shape may have restored a second quality.
  slots = ensureHardSessionSpacing(slots)
  // DT next-day recovery must survive spacing pass (never promote to quality).
  if (model === 'NORWEGIAN') {
    for (const s of slots) {
      if (!s.doubleThreshold) continue
      const after = slots.find((x) => x.dayOfWeek === (s.dayOfWeek + 1) % 7)
      if (
        after &&
        after.stimulus !== 'long' &&
        after.stimulus !== 'race' &&
        after.stimulus !== 'recovery'
      ) {
        toRecoverySlot(after, after.availableMinutes || 35)
      }
    }
  }

  let active = slots.filter((s) => s.stimulus !== 'rest').length
  while (active > sessionCount) {
    const easy = [...slots]
      .reverse()
      .find(
        (s) =>
          (s.stimulus === 'easy' || s.stimulus === 'recovery') &&
          !s.isKeySession,
      )
    if (!easy) break
    easy.stimulus = 'rest'
    easy.primaryAdaptation = null
    easy.availableMinutes = 0
    easy.hard = false
    easy.isKeySession = false
    active -= 1
  }
  while (active > args.capacity.maxSessionsPerWeek) {
    const easy = [...slots].reverse().find((s) => s.stimulus === 'easy')
    if (!easy) break
    easy.stimulus = 'rest'
    easy.primaryAdaptation = null
    easy.availableMinutes = 0
    easy.hard = false
    easy.isKeySession = false
    active -= 1
  }

  if (args.phase.isDeload) {
    for (const s of slots) {
      if (s.stimulus === 'race') continue
      if (s.stimulus === 'long') {
        s.hard = false
        s.isKeySession = true
        s.preferRaceSpecific = false
        continue
      }
      if (s.hard || s.stimulus === 'quality') {
        s.stimulus = 'easy'
        s.hard = false
        s.isKeySession = false
        s.preferRaceSpecific = false
        s.primaryAdaptation = 'aerobic_capacity'
        s.availableMinutes = Math.min(s.availableMinutes, 50)
      }
    }
  }

  if (args.phase.isTaper) {
    const qualities = slots.filter((s) => s.stimulus === 'quality' && s.hard)
    for (const s of slots) {
      if (
        s.stimulus === 'quality' &&
        s.hard &&
        qualities.length > 1 &&
        s !== qualities[0]
      ) {
        s.stimulus = 'easy'
        s.hard = false
        s.isKeySession = false
        s.preferRaceSpecific = false
        s.primaryAdaptation = 'aerobic_capacity'
        s.availableMinutes = Math.min(s.availableMinutes, 45)
      } else if (s.hard && !s.isKeySession && s.stimulus !== 'race') {
        s.stimulus = 'easy'
        s.hard = false
        s.isKeySession = false
        s.preferRaceSpecific = false
        s.availableMinutes = Math.min(s.availableMinutes, 40)
      }
      if (s.stimulus === 'long') {
        s.availableMinutes = Math.max(
          55,
          Math.round(s.availableMinutes * 0.85),
        )
      }
    }
  }

  // Race week: place race on raceWeekday; nothing after it.
  if (args.isRaceWeek || args.phase.phase === 'RACE') {
    const raceDay =
      raceWeekday ??
      (((args.longRunDay ?? 6) % 7) + 7) % 7

    // Ensure a slot exists for the race day.
    let raceSlot = slots.find((s) => s.dayOfWeek === raceDay)
    if (!raceSlot) {
      raceSlot = {
        dayOfWeek: raceDay,
        stimulus: 'race',
        primaryAdaptation: 'threshold',
        availableMinutes: Math.max(40, args.raceDurationMin ?? 120),
        hard: true,
        isKeySession: true,
        preferRaceSpecific: true,
      }
      slots = [...slots.filter((s) => s.dayOfWeek !== raceDay), raceSlot].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek,
      )
    }

    for (const s of slots) {
      if (s.dayOfWeek === raceDay) {
        s.stimulus = 'race'
        s.hard = true
        s.isKeySession = true
        s.preferRaceSpecific = true
        s.primaryAdaptation = 'threshold'
        s.availableMinutes = Math.max(40, args.raceDurationMin ?? 120)
      } else if (s.dayOfWeek > raceDay) {
        // After the race: no more workouts in the plan.
        s.stimulus = 'rest'
        s.primaryAdaptation = null
        s.availableMinutes = 0
        s.hard = false
        s.isKeySession = false
        s.preferRaceSpecific = false
      } else if (s.stimulus === 'long') {
        // Long was on another day — keep a short aerobic shakeout only.
        s.stimulus = 'easy'
        s.hard = false
        s.isKeySession = false
        s.preferRaceSpecific = false
        s.primaryAdaptation = 'aerobic_capacity'
        s.availableMinutes = Math.min(35, Math.max(25, s.availableMinutes))
      } else if (s.stimulus === 'quality' && s.hard) {
        // Race-week sharpening: short MP / controlled openers, not full threshold.
        s.availableMinutes = Math.min(s.availableMinutes, 35)
        s.preferRaceSpecific = true
      } else if (s.stimulus === 'easy' || s.stimulus === 'recovery') {
        s.availableMinutes = Math.min(40, Math.max(25, s.availableMinutes))
      }
    }

    // Drop mid-week filler so Mon–Sat training stays ~20–25 km before race.
    const preRace = slots
      .filter(
        (s) =>
          s.dayOfWeek < raceDay &&
          (s.stimulus === 'easy' || s.stimulus === 'recovery'),
      )
      .sort((a, b) => b.dayOfWeek - a.dayOfWeek)
    // Keep at most 3 easy/recovery days before race (plus optional quality).
    for (let i = 3; i < preRace.length; i += 1) {
      const drop = preRace[i]!
      drop.stimulus = 'rest'
      drop.primaryAdaptation = null
      drop.availableMinutes = 0
      drop.hard = false
      drop.isKeySession = false
      drop.preferRaceSpecific = false
    }
  }

  const scale = args.phase.volumeScale ?? 1
  const longFloor =
    args.longRunMinMinutes ??
    (args.phase.phase === 'RACE' || args.isRaceWeek
      ? 20
      : args.phase.isTaper
        ? 55
        : args.level === 'beginner'
          ? 55
          : args.level === 'advanced' || args.level === 'elite'
            ? 80
            : 70)

  if (scale !== 1) {
    for (const s of slots) {
      if (s.availableMinutes > 0 && s.stimulus !== 'race') {
        const scaled = Math.round(s.availableMinutes * scale)
        if (s.stimulus === 'long') {
          const floor = args.phase.isDeload
            ? Math.min(longFloor, Math.round(scaled * 1.05))
            : longFloor
          s.availableMinutes = Math.max(floor, scaled)
        } else {
          s.availableMinutes = Math.max(25, scaled)
        }
      }
    }
  } else {
    for (const s of slots) {
      if (s.stimulus === 'long') {
        s.availableMinutes = Math.max(longFloor, s.availableMinutes)
      }
    }
  }

  // Final deload pass: keep long shorter than loading weeks, but not a mini-break.
  if (args.phase.isDeload) {
    for (const s of slots) {
      if (s.stimulus === 'long') {
        s.availableMinutes = Math.max(
          50,
          Math.min(s.availableMinutes, Math.round(longFloor * 1.02)),
        )
      }
    }
  }

  return { slots, phase: args.phase, model }
}
