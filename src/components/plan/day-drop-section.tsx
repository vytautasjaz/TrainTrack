'use client'

import type { ReactNode } from 'react'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import { cn } from '@/lib/utils'

type DayDropSectionProps = {
  dateKey: string
  enabled?: boolean
  className?: string
  id?: string
  children: ReactNode
}

/** Day container that accepts library template drops and plan workout moves. */
export function DayDropSection({
  dateKey,
  enabled = true,
  className,
  id,
  children,
}: DayDropSectionProps) {
  const { dropHighlightClass, dropProps } = useDayDropTarget({
    dateKey,
    enabled,
  })

  return (
    <section
      id={id}
      className={cn(className, dropHighlightClass)}
      {...dropProps}
    >
      {children}
    </section>
  )
}
