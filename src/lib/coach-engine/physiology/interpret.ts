/**
 * Coach-style ratings for the fitness profile dashboard.
 * Scores reflect training history and response patterns — not medical grades.
 */

export type TrainingTone = 'great' | 'good' | 'ok' | 'warn' | 'bad'

export type ProfileRating = {
  tone: TrainingTone
  /** Chip label: Very strong · Good · Developing · Caution · Needs attention */
  label: string
  /** What this means for training — actionable, not diagnostic. */
  insight: string
}

/** Optional sibling scores so insights can compare areas of the profile. */
export type ProfileRatingContext = {
  aerobicBase?: number
  thresholdCapacity?: number
  vo2Fitness?: number
}

function scoreRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'This area is currently a limiting factor. Build it gradually before adding more intensity.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'A solid foundation, with clear room to improve through consistent training.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'A strong area of your current profile. Continue progressing without forcing the pace.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'One of the stronger areas of your current profile. Protect recovery as you build further.',
  }
}

function aerobicBaseRating(
  value: number,
  ctx?: ProfileRatingContext,
): ProfileRating {
  const base = scoreRating(value)
  const threshold = ctx?.thresholdCapacity
  if (threshold != null && threshold >= value + 15) {
    return {
      ...base,
      insight:
        'Your aerobic base sits behind your threshold fitness. More consistent easy running should help close the gap.',
    }
  }
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Easy volume and consistency are the priority — build the base before stacking hard sessions.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'Your underlying easy-running engine still has room to grow. Steady weeks of easy kilometres help most.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'A solid easy-running base. Keep the majority of sessions easy while you progress quality carefully.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'A strong aerobic foundation. Protect it with easy days even when race-specific work increases.',
  }
}

function aerobicEfficiencyRating(value: number): ProfileRating {
  const base = scoreRating(value)
  if (value <= 40) {
    return {
      ...base,
      insight:
        'Pace at a given effort still has a lot of room to improve. Easy volume and relaxed form help most.',
    }
  }
  if (value <= 60) {
    return {
      ...base,
      insight:
        'Economy is developing. Faster pace at the same heart rate usually follows consistent easy running.',
    }
  }
  if (value <= 80) {
    return {
      ...base,
      insight:
        'You produce solid pace for the effort. Small gains often come from easy volume and smooth form.',
    }
  }
  return {
    ...base,
    insight:
      'Strong aerobic economy — you get a lot of pace from a given effort. Keep easy days truly easy.',
  }
}

function thresholdCapacityRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Controlled threshold work is a gap right now. Introduce short, sustainable threshold blocks once recovery is solid.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'Threshold fitness is building. Steady, controlled efforts — not all-out — tend to move this most.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'You handle controlled threshold work well. Keep progressing without turning sessions into races.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'You handle controlled threshold work well and can hold quality without a large drop-off.',
  }
}

function thresholdRepeatabilityRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Quality tends to drop when threshold work is repeated. Space hard days and protect easy running.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'Repeatability is building. Consistent easy days between quality sessions will help this climb.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'You can repeat threshold work with stable quality. Keep recovery days non-negotiable.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'You can repeat threshold sessions without a large quality drop — one of the stronger parts of your profile.',
  }
}

function vo2FitnessRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'High-intensity aerobic fitness is a limiter. Short VO₂ blocks can help once your base and recovery allow.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'VO₂ fitness is mid-range. Interval work helps, but only if easy volume and recovery stay intact.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'Solid high-intensity aerobic fitness. Use VO₂ work sparingly and recover fully between blocks.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'Strong VO₂ fitness. Further gains likely come from timing and recovery more than adding intervals.',
  }
}

function fatigueResistanceRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Quality drops quickly under load. Reduce stacking hard days until easy volume absorbs stress better.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'You absorb some training stress, but quality can fade when weeks get dense. Ease into load builds.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'You hold quality reasonably well under load. Keep one fully easy day after demanding sessions.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'You absorb training stress well before quality drops — a strong sign your load is well matched.',
  }
}

function recoveryRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Bounce-back after hard work looks slow. Prioritize sleep, easy days, and spacing quality sessions.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'Recovery is adequate but not fast. Leave more space after hard or long sessions when possible.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'You bounce back well after demanding training. Keep easy days easy so this stays an advantage.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'Fast bounce-back after hard or long sessions. You can progress carefully without forcing extra rest days.',
  }
}

function marathonReadinessRating(value: number): ProfileRating {
  if (value <= 40) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Marathon-specific readiness is still limited. Build volume and long runs before racing-specific work.',
    }
  }
  if (value <= 60) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'On the path for longer racing. Consistent volume and long runs will move this more than intensity alone.',
    }
  }
  if (value <= 80) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'Solid longer-distance readiness. Late-run quality and fueling matter more than simply adding kilometres.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'Strong marathon-oriented profile. Protect recovery; gains now come from precision more than volume.',
  }
}

function overreachRating(value: number): ProfileRating {
  if (value <= 35) {
    return {
      tone: 'great',
      label: 'Low risk',
      insight:
        'Current load looks sustainable — quality sessions are less likely to tip you over.',
    }
  }
  if (value <= 55) {
    return {
      tone: 'ok',
      label: 'Moderate',
      insight:
        'Current training load looks manageable, but adding more intensity may reduce quality.',
    }
  }
  if (value <= 75) {
    return {
      tone: 'warn',
      label: 'Caution',
      insight:
        'Load is elevated. Ease volume or intensity before stacking another hard block.',
    }
  }
  return {
    tone: 'bad',
    label: 'Needs attention',
    insight:
      'Back off hard sessions — prioritize easy running and recovery until this settles.',
  }
}

function weeklyVolumeRating(range: {
  current: number
  optimal: number
  upperLimit: number
}): ProfileRating {
  const { current, optimal, upperLimit } = range
  const opt = Math.round(optimal)
  if (upperLimit > 0 && current >= upperLimit * 0.95) {
    return {
      tone: 'warn',
      label: 'Near ceiling',
      insight: `You are close to your upper productive range (~${Math.round(upperLimit)} km/week). Hold or deload before pushing further.`,
    }
  }
  if (optimal > 0 && current >= optimal * 0.9) {
    return {
      tone: 'good',
      label: 'On track',
      insight: `Weekly run volume sits near your productive range of ~${opt} km/week.`,
    }
  }
  if (optimal > 0 && current >= optimal * 0.7) {
    return {
      tone: 'ok',
      label: 'Below target',
      insight: `Your current volume is below your usual productive range of ~${opt} km/week. If recovery is good, build gradually.`,
    }
  }
  return {
    tone: 'bad',
    label: 'Low',
    insight: `Run volume is well under your productive range (~${opt} km/week). Room to build if you feel healthy.`,
  }
}

function weeklyFrequencyRating(range: {
  current: number
  optimal: number
  upperLimit: number
}): ProfileRating {
  const { current, optimal } = range
  const days = Math.round(optimal)
  if (current >= optimal) {
    return {
      tone: 'good',
      label: 'On track',
      insight: `You're at your productive frequency (~${days} days/week). More intensity isn't necessarily needed.`,
    }
  }
  if (current >= optimal - 1) {
    return {
      tone: 'ok',
      label: 'Below target',
      insight: `Your current frequency is below your productive range of ~${days} days/week. An easy day can help more than harder work.`,
    }
  }
  return {
    tone: 'bad',
    label: 'Needs attention',
    insight: `Fewer run days than your productive range (~${days}/week). Adding an easy run often helps more than intensity.`,
  }
}

function longRunKmRating(km: number): ProfileRating {
  if (km < 16) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'Your current long-run tolerance is still limited. Build distance gradually before adding quality late in the run.',
    }
  }
  if (km < 24) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'A useful mid-range long run. Extend gradually (≤10% every 1–2 weeks) if the goal needs more distance.',
    }
  }
  if (km < 30) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'A solid long-run range for half-marathon and early marathon preparation.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'Strong long-run tolerance. Further gains are more likely from quality and consistency than simply adding distance.',
  }
}

export function rateProfileMetric(
  id: string,
  value: number,
  range?: { current: number; optimal: number; upperLimit: number } | null,
  ctx?: ProfileRatingContext,
): ProfileRating {
  switch (id) {
    case 'overreachRisk':
      return overreachRating(value)
    case 'volumeTolerance':
      return range ? weeklyVolumeRating(range) : scoreRating(50)
    case 'frequencyTolerance':
      return range ? weeklyFrequencyRating(range) : scoreRating(50)
    case 'longRunTolerance':
      return longRunKmRating(value)
    case 'aerobicStrength':
      return aerobicBaseRating(value, ctx)
    case 'aerobicEfficiency':
      return aerobicEfficiencyRating(value)
    case 'thresholdStrength':
      return thresholdCapacityRating(value)
    case 'thresholdDurability':
      return thresholdRepeatabilityRating(value)
    case 'vo2Response':
      return vo2FitnessRating(value)
    case 'fatigueResistance':
      return fatigueResistanceRating(value)
    case 'recoverySpeed':
      return recoveryRating(value)
    case 'marathonReadiness':
      return marathonReadinessRating(value)
    default:
      return scoreRating(value)
  }
}

/** @deprecated Prefer rateProfileMetric */
export const ratePhysiologyMetric = rateProfileMetric

export function rateTrainingResponse(value0to1: number): ProfileRating {
  const v = value0to1 * 100
  if (v < 45) {
    return {
      tone: 'bad',
      label: 'Needs attention',
      insight:
        'Your training history suggests a weaker response to this stimulus right now.',
    }
  }
  if (v < 65) {
    return {
      tone: 'ok',
      label: 'Developing',
      insight:
        'Useful, but your history suggests a clearer response to other training types.',
    }
  }
  if (v < 82) {
    return {
      tone: 'good',
      label: 'Good',
      insight:
        'This stimulus tends to produce a solid response for you — keep it in the mix.',
    }
  }
  return {
    tone: 'great',
    label: 'Very strong',
    insight:
      'Your training history suggests a strong response to this stimulus — prioritize it when gaps match.',
  }
}

/** @deprecated Prefer rateTrainingResponse */
export const rateResponder = rateTrainingResponse

export const TRAINING_RESPONSE_INSIGHTS = {
  volume:
    'Easy volume tends to produce a strong return for you.',
  frequency:
    'Adding an easy run day tends to help more than adding harder work.',
  threshold:
    'Controlled threshold work is one of your strongest training levers.',
  vo2: 'VO₂ work helps, but your response is stronger to other stimuli.',
  longRun: 'Long runs consistently support your endurance development.',
} as const

export function trainingResponseInsight(
  key: keyof typeof TRAINING_RESPONSE_INSIGHTS,
  value0to1: number,
): string {
  const v = value0to1 * 100
  if (key === 'vo2' && v >= 82) {
    return 'VO₂ blocks tend to produce a strong response when recovery keeps up.'
  }
  if (key === 'volume' && v < 65) {
    return 'Easy volume helps, but other stimuli may move the needle more right now.'
  }
  if (key === 'frequency' && v < 65) {
    return 'Extra run days can help, but they are not your clearest lever right now.'
  }
  if (key === 'threshold' && v < 65) {
    return 'Threshold work helps, but your stronger responses may sit elsewhere for now.'
  }
  if (key === 'longRun' && v < 65) {
    return 'Long runs help endurance, but other levers may give a clearer response right now.'
  }
  return TRAINING_RESPONSE_INSIGHTS[key]
}

export const TONE_LEGEND: { tone: TrainingTone; label: string }[] = [
  { tone: 'great', label: 'Very strong' },
  { tone: 'good', label: 'Good / on track' },
  { tone: 'ok', label: 'Developing' },
  { tone: 'warn', label: 'Caution' },
  { tone: 'bad', label: 'Needs attention' },
]

/** Coaching readout of what the fitness radar shape implies. */
export type ProfileShapeReadout = {
  /** Short athlete-type label, e.g. "Threshold-oriented". */
  typeLabel: string
  /** 1–2 sentences: strengths, relative gaps, training implication. */
  summary: string
}

type ProfilePillarId =
  | 'aerobic'
  | 'threshold'
  | 'vo2'
  | 'endurance'
  | 'recovery'

type ProfilePillar = {
  id: ProfilePillarId
  label: string
  score: number
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

function cardValue(
  byId: Map<string, { value: number }>,
  id: string,
): number | null {
  const c = byId.get(id)
  if (!c) return null
  return Math.min(100, Math.max(0, c.value))
}

function buildProfilePillars(
  cards: Array<{ id: string; value: number }>,
): ProfilePillar[] {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const pillars: ProfilePillar[] = []

  const aerobic = avg(
    [cardValue(byId, 'aerobicStrength'), cardValue(byId, 'aerobicEfficiency')].filter(
      (v): v is number => v != null,
    ),
  )
  if (aerobic != null) {
    pillars.push({ id: 'aerobic', label: 'aerobic base', score: aerobic })
  }

  const threshold = avg(
    [
      cardValue(byId, 'thresholdStrength'),
      cardValue(byId, 'thresholdDurability'),
    ].filter((v): v is number => v != null),
  )
  if (threshold != null) {
    pillars.push({ id: 'threshold', label: 'threshold', score: threshold })
  }

  const vo2 = cardValue(byId, 'vo2Response')
  if (vo2 != null) {
    pillars.push({ id: 'vo2', label: 'VO₂ / speed', score: vo2 })
  }

  const endurance = avg(
    [
      cardValue(byId, 'fatigueResistance'),
      cardValue(byId, 'marathonReadiness'),
    ].filter((v): v is number => v != null),
  )
  if (endurance != null) {
    pillars.push({
      id: 'endurance',
      label: 'long-endurance',
      score: endurance,
    })
  }

  const overreach = cardValue(byId, 'overreachRisk')
  const recoverySpeed = cardValue(byId, 'recoverySpeed')
  const recoveryParts: number[] = []
  if (overreach != null) recoveryParts.push(100 - overreach)
  if (recoverySpeed != null) recoveryParts.push(recoverySpeed)
  const recovery = avg(recoveryParts)
  if (recovery != null) {
    pillars.push({ id: 'recovery', label: 'recovery / freshness', score: recovery })
  }

  return pillars
}

const PILLAR_TYPE: Record<ProfilePillarId, string> = {
  aerobic: 'Aerobic / base-oriented',
  threshold: 'Threshold-oriented',
  vo2: 'Speed / VO₂-leaning',
  endurance: 'Endurance / marathon-oriented',
  recovery: 'Durable / recovery-strong',
}

/**
 * Infer a readable athlete type from 0–100 profile cards
 * (radar axes), optionally nudged by fingerprint responders.
 */
export function describeProfileShape(
  cards: Array<{ id: string; value: number }>,
  fingerprint?: {
    volumeResponder: number
    thresholdResponder: number
    vo2Responder: number
    longRunResponder: number
    frequencyResponder: number
  } | null,
): ProfileShapeReadout | null {
  const pillars = buildProfilePillars(cards)
  if (pillars.length < 3) return null

  const sorted = [...pillars].sort((a, b) => b.score - a.score)
  const top = sorted[0]!
  const second = sorted[1]!
  const bottom = sorted[sorted.length - 1]!
  const mean = avg(pillars.map((p) => p.score))!
  const spread = top.score - bottom.score

  const recovery = pillars.find((p) => p.id === 'recovery')

  let typeLabel: string
  let summary: string

  if (recovery != null && recovery.score <= 40) {
    typeLabel = 'Load-stressed right now'
    summary = `Recovery and freshness are the limiting edge of this profile (${Math.round(recovery.score)} / 100). Protect easy volume and sleep before chasing the stronger qualities (${top.label} leads at ${Math.round(top.score)}).`
  } else if (spread <= 12) {
    typeLabel =
      mean >= 70
        ? 'Balanced high-rounder'
        : mean >= 55
          ? 'Balanced all-rounder'
          : 'Evenly developing'
    summary =
      mean >= 55
        ? `No single quality dominates — your shape is fairly even around ${Math.round(mean)} / 100. Build the weakest edge (${bottom.label}, ${Math.round(bottom.score)}) without neglecting what already works.`
        : `The profile is still filling in evenly (around ${Math.round(mean)} / 100). Consistent easy work will lift the whole shape before specializing hard.`
  } else if (top.score - second.score < 8) {
    typeLabel = `${capitalize(top.label)} + ${second.label}`
    summary = `Two qualities lead together — ${top.label} (${Math.round(top.score)}) and ${second.label} (${Math.round(second.score)}) — while ${bottom.label} sits softer (${Math.round(bottom.score)}). Keep the dual strengths sharp and lift the lagging edge gradually.`
  } else {
    typeLabel = PILLAR_TYPE[top.id]
    summary = `${capitalize(top.label)} is the standout (${Math.round(top.score)} / 100), with ${bottom.label} relatively softer (${Math.round(bottom.score)}). Train with that shape in mind — lean on the strength, and raise the lagging edge gradually.`
  }

  if (fingerprint) {
    const responders: { label: string; value: number }[] = [
      { label: 'volume', value: fingerprint.volumeResponder },
      { label: 'frequency', value: fingerprint.frequencyResponder },
      { label: 'threshold', value: fingerprint.thresholdResponder },
      { label: 'VO₂', value: fingerprint.vo2Responder },
      { label: 'long-run', value: fingerprint.longRunResponder },
    ]
    const best = [...responders].sort((a, b) => b.value - a.value)[0]
    if (best && best.value >= 0.7) {
      summary += ` History also responds strongly to ${best.label} work.`
    }
  }

  return { typeLabel, summary }
}

/** @deprecated */
export type PhysiologyTone = TrainingTone
/** @deprecated */
export type PhysiologyRating = ProfileRating
