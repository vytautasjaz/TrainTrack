import type { WorkoutType } from '@prisma/client'
import type { WorkoutBlock } from './types'
import { formatProgressivePreview } from './progressive'
import { effectiveIntervalSegment } from './segment-estimation'
import { formatIntervalRecoveryLabel, formatSegment, formatTargets } from './utils'

export type BlockCompactColumn = {
  label: string
  value: string
}

export type BlockCompactDisplay =
  | { layout: 'continuous'; duration: string; intensity: string }
  | { layout: 'interval'; columns: BlockCompactColumn[] }
  | { layout: 'repetition'; repeat: string; effort: string }
  | { layout: 'progressive'; duration: string; preview: string }
  | { layout: 'text'; preview: string }

function continuousDuration(block: WorkoutBlock): string {
  if (block.durationType === 'distance') {
    const unit = block.distanceUnit ?? 'km'
    return `${block.distance ?? 0} ${unit}`
  }
  return `${block.time ?? 0} min`
}

function formatWorkLine(work: string, workTarget: string): string {
  if (work && workTarget) return `${work} @ ${workTarget}`
  return work || workTarget || '—'
}

export function getBlockCompactDisplay(
  block: WorkoutBlock,
  sportType?: WorkoutType | null,
): BlockCompactDisplay {
  if (block.type === 'FREE_TEXT') {
    const preview = block.text?.trim() || 'Notes'
    return {
      layout: 'text',
      preview: preview.length > 48 ? `${preview.slice(0, 48)}…` : preview,
    }
  }

  if (block.type === 'PROGRESSIVE') {
    return {
      layout: 'progressive',
      duration: continuousDuration(block),
      preview: formatProgressivePreview(block),
    }
  }

  if (block.type === 'INTERVAL') {
    const reps = block.repetitions ?? 1
    const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
    const recSeg = effectiveIntervalSegment(block.recovery, 'recovery', block.targets, sportType)
    const work = formatSegment(workSeg)
    const recovery = formatIntervalRecoveryLabel(recSeg, block.targets, sportType ?? 'RUN')
    const workTarget = block.targets?.[0] ? formatTargets([block.targets[0]]) : ''

    return {
      layout: 'interval',
      columns: [
        { label: 'Repeat', value: `${reps}×` },
        { label: 'Work', value: formatWorkLine(work, workTarget) },
        { label: 'Recovery', value: recovery || '—' },
      ],
    }
  }

  if (block.type === 'REPETITION') {
    const work = formatSegment(block.work)
    return {
      layout: 'repetition',
      repeat: `${block.repetitions ?? 1}×`,
      effort: work || '—',
    }
  }

  return {
    layout: 'continuous',
    duration: continuousDuration(block),
    intensity: formatTargets(block.targets) || '—',
  }
}
