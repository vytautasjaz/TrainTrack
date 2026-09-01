import type { ProgressiveStepEvery, Target, WorkoutBlock } from './types'

export type ProgressiveStepPresetId =
  | 'gradual'
  | '1km'
  | '2km'
  | '5km'
  | '10km'
  | '1min'
  | '5min'
  | 'custom'

export const PROGRESSIVE_STEP_PRESET_OPTIONS: {
  id: ProgressiveStepPresetId
  label: string
}[] = [
  { id: 'gradual', label: 'Gradually' },
  { id: '1km', label: 'Every 1 km' },
  { id: '2km', label: 'Every 2 km' },
  { id: '5km', label: 'Every 5 km' },
  { id: '10km', label: 'Every 10 km' },
  { id: '1min', label: 'Every 1 min' },
  { id: '5min', label: 'Every 5 min' },
  { id: 'custom', label: 'Custom…' },
]

export function progressiveStepPresetId(
  step?: ProgressiveStepEvery | null,
): ProgressiveStepPresetId {
  if (!step || step.value <= 0) return 'gradual'
  if (step.mode === 'distance' && step.unit === 'km') {
    if (step.value === 1) return '1km'
    if (step.value === 2) return '2km'
    if (step.value === 5) return '5km'
    if (step.value === 10) return '10km'
  }
  if (step.mode === 'distance' && step.unit === 'm' && step.value === 1000) return '1km'
  if (step.mode === 'time' && step.unit === 'min') {
    if (step.value === 1) return '1min'
    if (step.value === 5) return '5min'
  }
  if (step.mode === 'time' && step.unit === 'sec' && step.value === 60) return '1min'
  return 'custom'
}

/** `null` clears stepEvery → gradual ramp. */
export function stepEveryFromPreset(
  id: ProgressiveStepPresetId,
): ProgressiveStepEvery | null {
  switch (id) {
    case 'gradual':
      return null
    case '1km':
      return { mode: 'distance', value: 1, unit: 'km' }
    case '2km':
      return { mode: 'distance', value: 2, unit: 'km' }
    case '5km':
      return { mode: 'distance', value: 5, unit: 'km' }
    case '10km':
      return { mode: 'distance', value: 10, unit: 'km' }
    case '1min':
      return { mode: 'time', value: 1, unit: 'min' }
    case '5min':
      return { mode: 'time', value: 5, unit: 'min' }
    case 'custom':
      // Must not match a named preset (1 km / 1 min / …) or the select snaps off Custom.
      return { mode: 'distance', value: 3, unit: 'km' }
  }
}

export function formatStepEvery(step?: ProgressiveStepEvery): string {
  if (!step) return ''
  return `${step.value} ${step.unit}`
}

export function formatProgressivePreview(block: WorkoutBlock): string {
  const start = block.startIntensity?.value?.trim() || '—'
  const end = block.endIntensity?.value?.trim() || '—'
  const preset = progressiveStepPresetId(block.stepEvery)
  if (preset === 'gradual') return `${start} → ${end} · gradually`
  if (preset === 'custom') {
    const step = formatStepEvery(block.stepEvery)
    return step ? `${start} → ${end} · every ${step}` : `${start} → ${end}`
  }
  const label =
    PROGRESSIVE_STEP_PRESET_OPTIONS.find((option) => option.id === preset)?.label ??
    'step'
  return `${start} → ${end} · ${label.toLowerCase()}`
}

/** Midpoint target for progressive estimation (v1). */
export function progressiveMidpointTarget(block: WorkoutBlock): Target | undefined {
  const start = block.startIntensity ?? block.targets?.[0]
  const end = block.endIntensity
  if (!start && !end) return undefined
  if (!end) return start
  if (!start) return end

  const zoneStart = parseZoneNumber(start.value)
  const zoneEnd = parseZoneNumber(end.value)
  if (zoneStart != null && zoneEnd != null) {
    return { type: start.type, value: `Z${Math.round((zoneStart + zoneEnd) / 2)}` }
  }

  const paceStart = parseClockPace(start.value)
  const paceEnd = parseClockPace(end.value)
  if (paceStart != null && paceEnd != null) {
    const mid = (paceStart + paceEnd) / 2
    const mins = Math.floor(mid)
    const secs = Math.round((mid - mins) * 60)
    return {
      type: start.type,
      value: `${mins}:${secs.toString().padStart(2, '0')}`,
    }
  }

  const wattsStart = parseWatts(start.value)
  const wattsEnd = parseWatts(end.value)
  if (wattsStart != null && wattsEnd != null) {
    return { type: start.type, value: String(Math.round((wattsStart + wattsEnd) / 2)) }
  }

  const hrStart = parseHr(start.value)
  const hrEnd = parseHr(end.value)
  if (hrStart != null && hrEnd != null) {
    return { type: start.type, value: String(Math.round((hrStart + hrEnd) / 2)) }
  }

  return start
}

function parseZoneNumber(value?: string): number | null {
  if (!value) return null
  const match = value.trim().match(/^z\s*([1-5])$/i)
  if (!match) return null
  return parseInt(match[1], 10)
}

function parseClockPace(value?: string): number | null {
  if (!value) return null
  const match = value.trim().match(/^(\d+):(\d{1,2})/)
  if (!match) return null
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60
}

function parseWatts(value?: string): number | null {
  if (!value) return null
  const match = value.trim().match(/^(\d+)\s*w?$/i)
  if (!match) return null
  return parseInt(match[1], 10)
}

function parseHr(value?: string): number | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{2,3})(?:\s*-\s*\d{2,3})?(?:\s*bpm)?$/i)
  if (!match) return null
  return parseInt(match[1], 10)
}
