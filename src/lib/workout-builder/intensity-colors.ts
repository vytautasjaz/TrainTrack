/**
 * Shared intensity → color scale for structure chart bars and builder block rails.
 * Higher effort = warmer color. Warm-up / cool-down / easy land in the same band.
 */

export type IntensityBand =
  | 'rest'
  | 'recovery'
  | 'easy'
  | 'tempo'
  | 'threshold'
  | 'vo2'

export type IntensityAccentStyles = {
  stripe: string
  handle: string
  grip: string
  /** Soft card wash so blocks read by color at a glance. */
  surface: string
  /** Left edge class (`border-l-*`). */
  edge: string
}

/** Map 0–1 effort to a discrete band (aligned with structure-chart defaults). */
export function intensityBandFromValue(intensity: number): IntensityBand {
  if (intensity < 0.2) return 'rest'
  if (intensity < 0.32) return 'recovery'
  if (intensity < 0.52) return 'easy'
  if (intensity < 0.72) return 'tempo'
  if (intensity < 0.88) return 'threshold'
  return 'vo2'
}

/** Chart bar fill — same hue family as block rails. */
export const INTENSITY_BAND_CHART_CLASS: Record<IntensityBand, string> = {
  rest: 'bg-neutral-400/70',
  recovery: 'bg-sky-400/40',
  easy: 'bg-sky-500/60',
  tempo: 'bg-amber-500/85',
  threshold: 'bg-brand',
  vo2: 'bg-fuchsia-600',
}

/** Builder block left rail / grip / card wash. */
export const INTENSITY_BAND_ACCENT: Record<IntensityBand, IntensityAccentStyles> = {
  rest: {
    stripe: 'bg-neutral-400',
    handle: 'bg-neutral-500/15',
    grip: 'text-neutral-500/55 group-hover/handle:text-neutral-600/80',
    surface: 'bg-neutral-500/[0.07]',
    edge: 'border-l-neutral-400',
  },
  recovery: {
    stripe: 'bg-sky-400',
    handle: 'bg-sky-400/18',
    grip: 'text-sky-600/50 group-hover/handle:text-sky-600/80',
    surface: 'bg-sky-400/[0.11]',
    edge: 'border-l-sky-400',
  },
  easy: {
    stripe: 'bg-sky-500',
    handle: 'bg-sky-500/16',
    grip: 'text-sky-600/50 group-hover/handle:text-sky-600/80',
    surface: 'bg-sky-500/[0.10]',
    edge: 'border-l-sky-500',
  },
  tempo: {
    stripe: 'bg-amber-500',
    handle: 'bg-amber-500/18',
    grip: 'text-amber-700/50 group-hover/handle:text-amber-700/80',
    surface: 'bg-amber-500/[0.12]',
    edge: 'border-l-amber-500',
  },
  threshold: {
    stripe: 'bg-brand',
    handle: 'bg-brand/16',
    grip: 'text-brand/55 group-hover/handle:text-brand/85',
    surface: 'bg-brand/[0.11]',
    edge: 'border-l-brand',
  },
  vo2: {
    stripe: 'bg-fuchsia-600',
    handle: 'bg-fuchsia-600/16',
    grip: 'text-fuchsia-700/50 group-hover/handle:text-fuchsia-700/80',
    surface: 'bg-fuchsia-600/[0.10]',
    edge: 'border-l-fuchsia-600',
  },
}

/** Athlete / preview block chrome (border + surface). */
export const INTENSITY_BAND_DISPLAY: Record<
  IntensityBand,
  {
    bar: string
    border: string
    surface: string
    label: string
    iconWrap: string
    badge: string
  }
> = {
  rest: {
    bar: 'bg-neutral-400',
    border: 'border-l-neutral-400',
    surface: 'bg-neutral-500/[0.06]',
    label: 'text-neutral-600 dark:text-neutral-400',
    iconWrap: 'bg-neutral-500/10 text-neutral-500',
    badge: 'bg-neutral-500/10 text-neutral-600',
  },
  recovery: {
    bar: 'bg-sky-400',
    border: 'border-l-sky-400',
    surface: 'bg-sky-400/[0.10]',
    label: 'text-sky-700 dark:text-sky-400',
    iconWrap: 'bg-sky-400/15 text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-400/15 text-sky-700 dark:text-sky-400',
  },
  easy: {
    bar: 'bg-sky-500',
    border: 'border-l-sky-500',
    surface: 'bg-sky-500/[0.08]',
    label: 'text-sky-700 dark:text-sky-400',
    iconWrap: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  },
  tempo: {
    bar: 'bg-amber-500',
    border: 'border-l-amber-500',
    surface: 'bg-amber-500/[0.10]',
    label: 'text-amber-800 dark:text-amber-400',
    iconWrap: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
  },
  threshold: {
    bar: 'bg-brand',
    border: 'border-l-brand',
    surface: 'bg-brand/[0.08]',
    label: 'text-brand',
    iconWrap: 'bg-brand/15 text-brand',
    badge: 'bg-brand/15 text-brand',
  },
  vo2: {
    bar: 'bg-fuchsia-600',
    border: 'border-l-fuchsia-600',
    surface: 'bg-fuchsia-600/[0.08]',
    label: 'text-fuchsia-800 dark:text-fuchsia-400',
    iconWrap: 'bg-fuchsia-600/15 text-fuchsia-700 dark:text-fuchsia-400',
    badge: 'bg-fuchsia-600/15 text-fuchsia-800 dark:text-fuchsia-400',
  },
}

export function intensityChartClass(intensity: number): string {
  return INTENSITY_BAND_CHART_CLASS[intensityBandFromValue(intensity)]
}

export function intensityAccentStyles(intensity: number): IntensityAccentStyles {
  return INTENSITY_BAND_ACCENT[intensityBandFromValue(intensity)]
}

/** Soft chip styles for quick-add buttons (same hue family as blocks). */
export const INTENSITY_BAND_CHIP: Record<
  IntensityBand,
  { button: string; icon: string }
> = {
  rest: {
    button:
      'border-neutral-400/50 bg-neutral-500/[0.08] text-neutral-700 hover:border-neutral-400 hover:bg-neutral-500/[0.14]',
    icon: 'text-neutral-500',
  },
  recovery: {
    button:
      'border-sky-400/45 bg-sky-400/[0.10] text-sky-800 hover:border-sky-400 hover:bg-sky-400/[0.16]',
    icon: 'text-sky-600',
  },
  easy: {
    button:
      'border-sky-500/45 bg-sky-500/[0.10] text-sky-800 hover:border-sky-500 hover:bg-sky-500/[0.16]',
    icon: 'text-sky-600',
  },
  tempo: {
    button:
      'border-amber-500/45 bg-amber-500/[0.10] text-amber-900 hover:border-amber-500 hover:bg-amber-500/[0.16]',
    icon: 'text-amber-700',
  },
  threshold: {
    button:
      'border-brand/45 bg-brand/[0.10] text-[#166534] hover:border-brand hover:bg-brand/[0.16]',
    icon: 'text-brand',
  },
  vo2: {
    button:
      'border-fuchsia-600/45 bg-fuchsia-600/[0.10] text-fuchsia-900 hover:border-fuchsia-600 hover:bg-fuchsia-600/[0.16]',
    icon: 'text-fuchsia-700',
  },
}

export function intensityChipStyles(intensity: number) {
  return INTENSITY_BAND_CHIP[intensityBandFromValue(intensity)]
}
