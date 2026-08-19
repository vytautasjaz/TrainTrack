import type { IncludePlacementHint } from '@/lib/workout-builder/types'

export const INCLUDE_PLACEMENTS = [
  'beginning',
  'after_warmup',
  'anywhere',
  'before_cooldown',
  'end',
] as const satisfies readonly IncludePlacementHint[]

export const INCLUDE_PLACEMENT_LABELS: Record<IncludePlacementHint, string> = {
  beginning: 'At the beginning',
  after_warmup: 'After warm up',
  anywhere: 'Anywhere in the workout',
  before_cooldown: 'Before cool down',
  end: 'At the end of the workout',
}

export const INCLUDE_PLACEMENT_SHORT_LABELS: Record<IncludePlacementHint, string> = {
  beginning: 'Start',
  after_warmup: 'After WU',
  anywhere: 'Anywhere',
  before_cooldown: 'Before CD',
  end: 'End',
}

const LEGACY_PLACEMENT: Record<string, IncludePlacementHint> = {
  before_main: 'after_warmup',
  inside_main: 'anywhere',
  after_main: 'before_cooldown',
}

export function normalizeIncludePlacement(value: unknown): IncludePlacementHint {
  if (typeof value !== 'string') return 'anywhere'
  if ((INCLUDE_PLACEMENTS as readonly string[]).includes(value)) {
    return value as IncludePlacementHint
  }
  return LEGACY_PLACEMENT[value] ?? 'anywhere'
}

/** Where an include splits the single easy-run bar (0 = start, 1 = end). */
export const INCLUDE_PLACEMENT_SPLIT: Record<IncludePlacementHint, number> = {
  beginning: 0,
  after_warmup: 0.18,
  anywhere: 0.5,
  before_cooldown: 0.82,
  end: 1,
}
