'use client'

import type { WorkoutBlock } from '@/lib/workout-builder/types'
import { formatBlockPrescriptionLines } from '@/lib/workout-builder/block-prescription'
import { cn } from '@/lib/utils'

type WorkoutBlockPrescriptionProps = {
  block: WorkoutBlock
  className?: string
  size?: 'sm' | 'md'
}

export function WorkoutBlockPrescription({
  block,
  className,
  size = 'sm',
}: WorkoutBlockPrescriptionProps) {
  const lines = formatBlockPrescriptionLines(block)
  const textClass = size === 'md' ? 'text-sm' : 'text-[13px]'

  return (
    <div className={cn('min-w-0 space-y-0.5 text-[#6B7280]', textClass, className)}>
      {lines.map((line, index) => {
        if (line.kind === 'repeat') {
          return (
            <p key={index} className="font-semibold tabular-nums text-[#374151]">
              {line.text}
            </p>
          )
        }
        if (line.kind === 'arrow') {
          return (
            <p key={index} className="text-xs leading-none text-muted-foreground/70" aria-hidden>
              {line.text}
            </p>
          )
        }
        return (
          <p key={index} className="leading-snug">
            {line.text}
          </p>
        )
      })}
    </div>
  )
}
