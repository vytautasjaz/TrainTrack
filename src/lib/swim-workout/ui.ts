import { SwimEnvironment } from '@prisma/client'

export const SWIM_STROKE_SUGGESTIONS = [
  'Freestyle',
  'Backstroke',
  'Breaststroke',
  'Butterfly',
  'IM',
  'Kick',
  'Pull',
  'Drill',
  'Choice',
] as const

export const SWIM_TARGET_SUGGESTIONS = [
  'Easy',
  'Moderate',
  'Threshold',
  'Race Pace',
  'Sprint',
  'CSS',
  'Build',
  'Fast',
  'Strong',
  'Negative Split',
  'RPE 7',
  'HR Zone 2',
] as const

export const SWIM_RECOVERY_SUGGESTIONS = [
  ':15 Rest',
  ':20 Rest',
  ':30 Rest',
  '1:00 Rest',
  'On 1:30',
  'On 1:45',
  'On 2:00',
  'On 3:00',
  'Every 5:00',
] as const

export const SWIM_SECTION_OPTIONS = [
  'Warm Up',
  'Main Set',
  'Drill',
  'Kick',
  'Pull',
  'Technique',
  'Cool Down',
  'Custom',
] as const

export type SwimSectionAccent = {
  bar: string
  surface: string
  chip: string
}

export function swimSectionAccent(title: string): SwimSectionAccent {
  const t = title.toLowerCase()
  if (t.includes('warm')) {
    return {
      bar: 'bg-emerald-500',
      surface: 'bg-emerald-500/[0.04]',
      chip: 'bg-emerald-500/15 text-emerald-800',
    }
  }
  if (t.includes('cool')) {
    return {
      bar: 'bg-cyan-500',
      surface: 'bg-cyan-500/[0.04]',
      chip: 'bg-cyan-500/15 text-cyan-800',
    }
  }
  if (t.includes('drill') || t.includes('technique')) {
    return {
      bar: 'bg-orange-500',
      surface: 'bg-orange-500/[0.04]',
      chip: 'bg-orange-500/15 text-orange-800',
    }
  }
  if (t.includes('kick')) {
    return {
      bar: 'bg-sky-500',
      surface: 'bg-sky-500/[0.04]',
      chip: 'bg-sky-500/15 text-sky-800',
    }
  }
  if (t.includes('pull')) {
    return {
      bar: 'bg-indigo-500',
      surface: 'bg-indigo-500/[0.04]',
      chip: 'bg-indigo-500/15 text-indigo-800',
    }
  }
  if (t.includes('main') || t.includes('threshold') || t.includes('sprint')) {
    return {
      bar: 'bg-violet-500',
      surface: 'bg-violet-500/[0.04]',
      chip: 'bg-violet-500/15 text-violet-800',
    }
  }
  return {
    bar: 'bg-zinc-400',
    surface: 'bg-zinc-500/[0.04]',
    chip: 'bg-zinc-500/15 text-zinc-700',
  }
}

export function swimEnvironmentShortLabel(env: SwimEnvironment): string {
  return env === SwimEnvironment.OPEN_WATER ? 'Open Water' : 'Pool'
}

/** Badge styles for common intensity/target labels on athlete view. */
export function swimTargetBadgeClass(target: string): string {
  const t = target.trim().toLowerCase()
  if (t === 'easy' || t === 'recovery') {
    return 'bg-violet-100 text-violet-800'
  }
  if (t === 'moderate' || t === 'build' || t === 'strong') {
    return 'bg-violet-200 text-violet-900'
  }
  if (t === 'threshold' || t === 'css' || t.includes('race')) {
    return 'bg-violet-600 text-white'
  }
  if (t === 'sprint' || t === 'fast') {
    return 'bg-fuchsia-600 text-white'
  }
  // Custom targets (pace, RPE, etc.) — still show as a subtle chip
  return 'bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200/80'
}

