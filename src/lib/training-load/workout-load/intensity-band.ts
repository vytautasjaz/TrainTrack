import type { Target } from '@/lib/workout-builder/types'
import {
  numericRpeToEffort,
  parseNamedEffort,
  type EffortPreset,
} from '@/lib/workout-builder/effort-presets'
import type { IntensityBand } from '@/lib/training-load/workout-load/types'

const EFFORT_TO_BAND: Record<EffortPreset, IntensityBand> = {
  Recovery: 'RECOVERY',
  Easy: 'EASY',
  Steady: 'STEADY',
  Moderate: 'TEMPO',
  Tempo: 'TEMPO',
  Threshold: 'THRESHOLD',
  Hard: 'VO2',
  Max: 'SPRINT',
}

/**
 * Map a builder target (effort / pace text / zone) to a planning intensity band.
 */
export function intensityBandFromTarget(
  target: Target | undefined | null,
  fallback: IntensityBand = 'EASY',
): IntensityBand {
  if (!target) return fallback
  const raw = (target.value ?? '').trim()
  if (!raw) return fallback
  const lower = raw.toLowerCase()

  const zone =
    lower.match(/^z\s*([1-6])$/) ??
    lower.match(/^zone\s*([1-6])$/) ??
    (target.type === 'heartRateZone'
      ? lower.match(/([1-6])/)
      : null)
  if (zone) {
    const z = parseInt(zone[1]!, 10)
    if (z <= 1) return 'RECOVERY'
    if (z === 2) return 'EASY'
    if (z === 3) return 'STEADY'
    if (z === 4) return 'THRESHOLD'
    if (z === 5) return 'VO2'
    return 'SPRINT'
  }

  if (/\b(sprint|all[-\s]?out|neuromuscular)\b/i.test(raw)) return 'SPRINT'
  if (/\b(stride|pickup|speed)\b/i.test(raw) && !/\bthreshold\b/i.test(raw)) {
    return 'SPEED'
  }
  if (/\b(vo\s*2|vo₂|v\.?o\.?\s*2)\b/i.test(raw)) return 'VO2'
  if (/\b(hm|half[-\s]?marathon)\b/i.test(raw)) return 'HM_PACE'
  if (/\b(mp|marathon[-\s]?pace|marathon)\b/i.test(raw)) return 'MARATHON_PACE'
  if (/\b(threshold|lt|cruise|critical)\b/i.test(raw)) return 'THRESHOLD'
  if (/\b(tempo|sweet\s*spot)\b/i.test(raw)) return 'TEMPO'
  if (/\b(steady)\b/i.test(raw)) return 'STEADY'
  if (/\b(recovery|recover|jog|walk)\b/i.test(raw)) return 'RECOVERY'
  if (/\b(easy|aerobic|endurance)\b/i.test(raw)) return 'EASY'
  if (/\b(5k|10k|race[-\s]?pace|race[-\s]?feel)\b/i.test(raw)) return 'HM_PACE'

  const named = parseNamedEffort(raw) ?? numericRpeToEffort(raw)
  if (named) return EFFORT_TO_BAND[named]

  if (target.type === 'rpe') {
    const n = parseFloat(raw)
    if (Number.isFinite(n) && n > 0) {
      const effort = numericRpeToEffort(String(n))
      if (effort) return EFFORT_TO_BAND[effort]
    }
  }

  return fallback
}

export function intensityBandFromText(
  text: string | null | undefined,
  fallback: IntensityBand = 'EASY',
): IntensityBand {
  if (!text?.trim()) return fallback
  return intensityBandFromTarget({ type: 'rpe', value: text }, fallback)
}

export function isQualityBand(band: IntensityBand): boolean {
  return (
    band === 'TEMPO' ||
    band === 'THRESHOLD' ||
    band === 'HM_PACE' ||
    band === 'MARATHON_PACE' ||
    band === 'VO2' ||
    band === 'SPEED' ||
    band === 'SPRINT'
  )
}
