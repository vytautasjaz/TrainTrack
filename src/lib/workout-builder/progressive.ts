import type { ProgressiveStepEvery, Target, WorkoutBlock } from './types'

export function formatStepEvery(step?: ProgressiveStepEvery): string {
  if (!step) return ''
  return `${step.value} ${step.unit}`
}

export function formatProgressivePreview(block: WorkoutBlock): string {
  const start = block.startIntensity?.value?.trim() || '—'
  const end = block.endIntensity?.value?.trim() || '—'
  const step = formatStepEvery(block.stepEvery)
  return step ? `${start} → ${end} · step every ${step}` : `${start} → ${end}`
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
