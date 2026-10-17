/**
 * Progressive-disclosure copy for Fitness metric detail panels.
 * Score labels/insights still come from interpret.ts — this adds Why / Implication.
 */

export type MetricDetailCopy = {
  why: string
  implication: string
}

export const FITNESS_METRIC_DETAIL: Record<string, MetricDetailCopy> = {
  volumeResponder: {
    why: 'Shows how much your fitness tends to improve when easy kilometres increase.',
    implication:
      'If this is a strong lever, add volume gradually before stacking harder sessions.',
  },
  frequencyResponder: {
    why: 'Shows whether extra easy run days tend to help more than harder work.',
    implication:
      'A strong frequency response often means an easy day beats another quality session.',
  },
  thresholdResponder: {
    why: 'Shows how well controlled threshold work pays off for you historically.',
    implication:
      'Prioritize sustainable threshold blocks when this is among your strongest responses.',
  },
  vo2Responder: {
    why: 'Shows your typical return from VO₂ / interval stimulus.',
    implication:
      'Use VO₂ sparingly when other levers are stronger — protect recovery between blocks.',
  },
  longRunResponder: {
    why: 'Shows how much long runs support your endurance development.',
    implication:
      'Keep long runs in the plan when gaps point at endurance, and progress distance gradually.',
  },
  aerobicStrength: {
    why: 'Reflects your underlying easy-running engine from volume and consistency.',
    implication:
      'Close gaps here with steady easy kilometres before adding more intensity.',
  },
  aerobicEfficiency: {
    why: 'Pace you produce at a given effort / heart rate — economy of movement.',
    implication:
      'Improve with consistent easy running and relaxed form, not harder intervals alone.',
  },
  volumeTolerance: {
    why: 'Where weekly run volume sits vs your productive range.',
    implication:
      'Build toward the productive range if recovery is solid; hold near the ceiling.',
  },
  frequencyTolerance: {
    why: 'Run days per week vs what you usually tolerate productively.',
    implication:
      'Match productive frequency before adding intensity on top.',
  },
  thresholdStrength: {
    why: 'How strong your controlled threshold work currently is.',
    implication:
      'Progress threshold carefully — controlled efforts, not race efforts.',
  },
  thresholdDurability: {
    why: 'How consistently you can repeat threshold work without quality falling off.',
    implication:
      'Space quality sessions and protect easy days so repeatability stays high.',
  },
  vo2Response: {
    why: 'Current high-intensity aerobic fitness from recent VO₂-type work.',
    implication:
      'Add short VO₂ blocks only when base and recovery can absorb them.',
  },
  fatigueResistance: {
    why: 'How much training stress you absorb before quality drops.',
    implication:
      'If low, reduce stacking hard days until easy volume absorbs load better.',
  },
  overreachRisk: {
    why: 'Risk that current load tips into unproductive fatigue (lower is better).',
    implication:
      'Ease intensity or volume when elevated; keep easy days truly easy.',
  },
  recoverySpeed: {
    why: 'How quickly performance returns after demanding training.',
    implication:
      'Leave more space after hard or long sessions when bounce-back is slow.',
  },
  longRunTolerance: {
    why: 'Shows how well you can handle longer distance without a large quality drop.',
    implication:
      'Increase long runs gradually. Keep most of the volume easy and build consistency.',
  },
  marathonReadiness: {
    why: 'Combined readiness for longer racing from volume, long runs, and consistency.',
    implication:
      'Build volume and long runs before race-specific work if this is still developing.',
  },
}
