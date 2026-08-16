'use client'

import {
  useCallback,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const OFFSET = 14

type FollowTooltipState = {
  x: number
  y: number
  content: ReactNode
}

/**
 * Mouse-following detail tooltip for compressed season planner cards.
 * Renders in a portal so it isn’t clipped by the timeline scroller.
 */
export function usePlannerFollowTooltip() {
  const [tip, setTip] = useState<FollowTooltipState | null>(null)

  const show = useCallback((content: ReactNode, e: MouseEvent) => {
    setTip({ x: e.clientX, y: e.clientY, content })
  }, [])

  const move = useCallback((e: MouseEvent) => {
    setTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
  }, [])

  const hide = useCallback(() => setTip(null), [])

  const tooltip =
    tip && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            className={cn(
              'pointer-events-none fixed z-[300] max-w-[16rem] rounded-md border border-border bg-white px-2.5 py-2 shadow-md',
              'text-left text-[11px] leading-snug text-foreground',
            )}
            style={{
              left: Math.min(tip.x + OFFSET, window.innerWidth - 280),
              top: Math.min(tip.y + OFFSET, window.innerHeight - 160),
            }}
          >
            {tip.content}
          </div>,
          document.body,
        )
      : null

  return { show, move, hide, tooltip }
}

type TipRowProps = { label?: string; children: ReactNode; strong?: boolean }

export function PlannerTipTitle({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-semibold leading-snug text-foreground">{children}</p>
}

export function PlannerTipMeta({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-[10px] text-muted-foreground">{children}</p>
}

export function PlannerTipRow({ label, children, strong }: TipRowProps) {
  return (
    <p className={cn('mt-1 text-[10px]', strong ? 'font-medium text-foreground' : 'text-muted-foreground')}>
      {label ? <span className="text-muted-foreground">{label}: </span> : null}
      <span className={strong ? 'text-foreground' : undefined}>{children}</span>
    </p>
  )
}
