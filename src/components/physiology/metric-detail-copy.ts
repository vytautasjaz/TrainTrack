/**
 * Progressive-disclosure copy for Fitness metric detail panels.
 * Score labels/insights still come from interpret.ts — this adds Why / Implication / Scale.
 */

export type MetricDetailCopy = {
  why: string
  implication: string
  /**
   * What the number means on its scale (usually 0–100).
   * Answers: is 100 elite? beginner→advanced? or a personal model ceiling?
   */
  scale: string
}

/** Shared guide for every 0–100 fitness index (not km / days metrics). */
export const FITNESS_SCORE_GUIDE = {
  title: 'How to read 0–100',
  summary:
    'These scores are a coaching model of your training history — not a medical grade and not a world ranking. 100 is the top of this model for consistency and capacity in that area, not “elite athlete.”',
  bands: [
    {
      range: '0–40',
      tone: 'bad' as const,
      label: 'Needs attention',
      meaning: 'A clear limiter. Build this gradually before stacking hard work.',
    },
    {
      range: '41–60',
      tone: 'ok' as const,
      label: 'Developing',
      meaning: 'Usable foundation with obvious room to grow through steady weeks.',
    },
    {
      range: '61–80',
      tone: 'good' as const,
      label: 'Good / on track',
      meaning:
        'A solid, productive part of your profile — keep progressing without forcing.',
    },
    {
      range: '81–100',
      tone: 'great' as const,
      label: 'Very strong',
      meaning:
        'Among the stronger areas for you. Protect recovery as you build further.',
    },
  ],
  note: 'Typical trained athletes often sit around 50–80 on areas they train regularly. Hitting 100 everywhere is not the goal.',
} as const

export const FITNESS_OVERREACH_SCALE_GUIDE = {
  title: 'How to read overreach risk',
  summary:
    'Unlike other scores, lower is better. The number estimates how close current load is to unproductive fatigue — still a 0–100 model score, not a diagnosis.',
  bands: [
    {
      range: '0–35',
      label: 'Low risk',
      meaning: 'Load looks absorbable. Keep easy days easy.',
    },
    {
      range: '36–55',
      label: 'Watch',
      meaning: 'Manageable, but leave space after hard or long sessions.',
    },
    {
      range: '56–75',
      label: 'Elevated',
      meaning: 'Ease intensity or volume before quality drops.',
    },
    {
      range: '76–100',
      label: 'Needs attention',
      meaning: 'High risk of digging a hole — prioritize recovery.',
    },
  ],
  note: '100 here means very high modeled risk, not a fitness achievement.',
} as const

export const FITNESS_METRIC_DETAIL: Record<string, MetricDetailCopy> = {
  volumeResponder: {
    why: 'Shows how much your fitness tends to improve when easy kilometres increase.',
    implication:
      'If this is a strong lever, add volume gradually before stacking harder sessions.',
    scale:
      '0–100 response score from your history. Higher = easy volume has usually paid off well for you. It is not “how many km you should run.”',
  },
  frequencyResponder: {
    why: 'Shows whether extra easy run days tend to help more than harder work.',
    implication:
      'A strong frequency response often means an easy day beats another quality session.',
    scale:
      '0–100 response score. Higher = your history favors more frequent easy days as a lever.',
  },
  thresholdResponder: {
    why: 'Shows how well controlled threshold work pays off for you historically.',
    implication:
      'Prioritize sustainable threshold blocks when this is among your strongest responses.',
    scale:
      '0–100 response score. Higher = threshold sessions have been a productive stimulus for you.',
  },
  vo2Responder: {
    why: 'Shows your typical return from VO₂ / interval stimulus.',
    implication:
      'Use VO₂ sparingly when other levers are stronger — protect recovery between blocks.',
    scale:
      '0–100 response score. Higher = VO₂ / intervals have moved the needle in your history.',
  },
  longRunResponder: {
    why: 'Shows how much long runs support your endurance development.',
    implication:
      'Keep long runs in the plan when gaps point at endurance, and progress distance gradually.',
    scale:
      '0–100 response score. Higher = long runs have been a strong endurance driver for you.',
  },
  aerobicStrength: {
    why: 'Reflects your underlying easy-running engine from volume and consistency.',
    implication:
      'Close gaps here with steady easy kilometres before adding more intensity.',
    scale:
      '0–100 capacity index from your volume, consistency, and related history. ~50–60 is a developing base; 80+ is a strong personal aerobic foundation — not an elite ranking.',
  },
  aerobicEfficiency: {
    why: 'Pace you produce at a given effort / heart rate — economy of movement.',
    implication:
      'Improve with consistent easy running and relaxed form, not harder intervals alone.',
    scale:
      '0–100 efficiency index. Higher means better pace for a given effort/HR in your recent data. 100 is excellent economy in this model, not a world-class label.',
  },
  volumeTolerance: {
    why: 'Where weekly run volume sits vs your productive range.',
    implication:
      'Build toward the productive range if recovery is solid; hold near the ceiling.',
    scale:
      'Shown vs your personal productive weekly volume (km), not a 0–100 athlete grade.',
  },
  frequencyTolerance: {
    why: 'Run days per week vs what you usually tolerate productively.',
    implication:
      'Match productive frequency before adding intensity on top.',
    scale:
      'Shown as days/week vs your productive range — personal tolerance, not a ranking.',
  },
  thresholdStrength: {
    why: 'How strong your controlled threshold work currently is.',
    implication:
      'Progress threshold carefully — controlled efforts, not race efforts.',
    scale:
      '0–100 capacity index for sustainable threshold work. Mid-range is normal while building; high 80s means this is a strong personal quality, not “elite.”',
  },
  thresholdDurability: {
    why: 'How consistently you can repeat threshold work without quality falling off.',
    implication:
      'Space quality sessions and protect easy days so repeatability stays high.',
    scale:
      '0–100 repeatability index. Higher = you hold threshold quality across sessions better in the model.',
  },
  vo2Response: {
    why: 'Current high-intensity aerobic fitness from recent VO₂-type work.',
    implication:
      'Add short VO₂ blocks only when base and recovery can absorb them.',
    scale:
      '0–100 high-intensity fitness index from recent VO₂-type training. Not a lab VO₂max score.',
  },
  fatigueResistance: {
    why: 'How much training stress you absorb before quality drops.',
    implication:
      'If low, reduce stacking hard days until easy volume absorbs load better.',
    scale:
      '0–100 durability index. Higher = you absorb load longer before quality fades in the model.',
  },
  overreachRisk: {
    why: 'Risk that current load tips into unproductive fatigue (lower is better).',
    implication:
      'Ease intensity or volume when elevated; keep easy days truly easy.',
    scale:
      '0–100 risk score — lower is better. High numbers mean elevated modeled overreach risk, not higher fitness.',
  },
  recoverySpeed: {
    why: 'How quickly performance returns after demanding training.',
    implication:
      'Leave more space after hard or long sessions when bounce-back is slow.',
    scale:
      '0–100 recovery index. Higher = bounce-back looks faster in your recent pattern.',
  },
  longRunTolerance: {
    why: 'Shows how well you can handle longer distance without a large quality drop.',
    implication:
      'Increase long runs gradually. Keep most of the volume easy and build consistency.',
    scale:
      'Shown in kilometres (longest sustainable long-run type capacity in the model). The bar is scaled toward ~42 km as a full marathon-oriented ceiling — the km number is what matters, not “/ 100.”',
  },
  marathonReadiness: {
    why: 'Combined readiness for longer racing from volume, long runs, and consistency.',
    implication:
      'Build volume and long runs before race-specific work if this is still developing.',
    scale:
      '0–100 readiness index combining volume, long runs, and consistency. Mid scores mean you are building toward longer racing; high scores mean the model sees strong marathon-oriented preparation — still not a race prediction or elite label.',
  },
}
