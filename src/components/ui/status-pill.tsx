import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusPillTone = 'planned' | 'watching' | 'completed' | 'skipped' | 'neutral'

const TONE_CLASS: Record<StatusPillTone, string> = {
  planned: 'tt-status-planned',
  watching: 'tt-status-watching',
  completed: 'tt-status-completed',
  skipped: 'tt-status-skipped',
  neutral: 'tt-status-neutral',
}

type StatusPillProps = {
  tone: StatusPillTone
  children: ReactNode
  className?: string
}

/** Light status chip for list tables — Planned / Watching / Completed. */
export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span className={cn('tt-status-pill', TONE_CLASS[tone], className)}>{children}</span>
  )
}
