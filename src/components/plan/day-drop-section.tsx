'use client'

import type { ReactNode } from 'react'
import type { WorkoutType } from '@prisma/client'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import { cn } from '@/lib/utils'

type DayDropSectionProps = {
  dateKey: string
  /** When set, only matching sports can drop on this section. */
  sport?: WorkoutType
  enabled?: boolean
  className?: string
  id?: string
  children: ReactNode
}

/** Day container that accepts library template drops and plan workout moves. */
export function DayDropSection({
  dateKey,
  sport,
  enabled = true,
  className,
  id,
  children,
}: DayDropSectionProps) {
  const { dropHighlightClass, dropProps } = useDayDropTarget({
    dateKey,
    sport,
    enabled,
  })

  return (
    <section
      id={id}
      data-plan-day-section={dateKey}
      className={cn(className, dropHighlightClass)}
      {...dropProps}
    >
      {children}
    </section>
  )
}
