import type { WorkoutType } from '@prisma/client'
import type { WorkoutBlock } from './types'
import {
  effectiveIntervalSegment,
  formatPlanBlockSummary,
} from './segment-estimation'
import { formatIntervalRecoveryLabel, formatSegment, formatTargets } from './utils'

export type PrescriptionLineKind = 'repeat' | 'line' | 'arrow'

export type PrescriptionLine = {
  kind: PrescriptionLineKind
  text: string
}

export function formatBlockPrescriptionLines(
  block: WorkoutBlock,
  sportType?: WorkoutType | null,
): PrescriptionLine[] {
  if (block.type === 'FREE_TEXT') {
    const text = block.text?.trim()
    return text ? [{ kind: 'line', text }] : [{ kind: 'line', text: 'Notes' }]
  }

  if (block.type === 'INTERVAL') {
    const reps = block.repetitions ?? 1
    const workSeg = effectiveIntervalSegment(block.work, 'work', block.targets, sportType)
    const recSeg = effectiveIntervalSegment(block.recovery, 'recovery', block.targets, sportType)
    const work = formatSegment(workSeg)
    const recovery = formatIntervalRecoveryLabel(recSeg, block.targets, sportType ?? 'RUN')
    const workTarget = block.targets?.[0] ? formatTargets([block.targets[0]]) : ''

    const lines: PrescriptionLine[] = [{ kind: 'repeat', text: `${reps}×` }]

    const workLine = work
      ? workTarget
        ? `${work} @ ${workTarget}`
        : work
      : workTarget || 'Work'
    lines.push({ kind: 'line', text: workLine })

    if (recovery) {
      lines.push({ kind: 'arrow', text: '↓' })
      lines.push({ kind: 'line', text: recovery })
    }

    return lines
  }

  return [{ kind: 'line', text: formatPlanBlockSummary(block) }]
}
