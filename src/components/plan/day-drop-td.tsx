'use client'

import type { ReactNode, TdHTMLAttributes } from 'react'
import type { WorkoutType } from '@prisma/client'
import { useDayDropTarget } from '@/components/plan/use-day-drop-target'
import { cn } from '@/lib/utils'

type DayDropTdProps = {
  dateKey: string
  /** Sport row for this cell — only matching sports can drop here. */
  sport?: WorkoutType
  enabled?: boolean
  className?: string
  children?: ReactNode
} & Omit<
  TdHTMLAttributes<HTMLTableCellElement>,
  'onDragOver' | 'onDragLeave' | 'onDrop'
>

/** Week-table day cell with the same full-cell drop highlight as month view. */
export function DayDropTd({
  dateKey,
  sport,
  enabled = true,
  className,
  children,
  ...rest
}: DayDropTdProps) {
  const { dropHighlightClass, dropProps } = useDayDropTarget({
    dateKey,
    sport,
    enabled,
  })

  return (
    <td className={cn(className, dropHighlightClass)} {...dropProps} {...rest}>
      {children}
    </td>
  )
}
