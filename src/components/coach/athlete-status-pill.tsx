'use client'

import { useTransition } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { AthleteStatus } from '@prisma/client'
import { ChevronDown } from 'lucide-react'
import { updateAthleteStatusByCoach } from '@/app/actions/athletes'
import {
  ATHLETE_STATUS_OPTIONS,
  athleteStatusBadgeClass,
  athleteStatusLabel,
} from '@/lib/athlete-status'
import { cn } from '@/lib/utils'

type AthleteStatusPillProps = {
  athleteId: string
  status: AthleteStatus
  size?: 'sm' | 'md'
  className?: string
  /** When true, hide the pill for Active athletes (read-only surfaces). */
  hideWhenActive?: boolean
}

export function AthleteStatusPill({
  athleteId,
  status,
  size = 'md',
  className,
  hideWhenActive = false,
}: AthleteStatusPillProps) {
  const [isPending, startTransition] = useTransition()

  if (hideWhenActive && status === 'ACTIVE') return null

  function setStatus(next: AthleteStatus) {
    if (next === status) return
    startTransition(async () => {
      await updateAthleteStatusByCoach(athleteId, next)
    })
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={isPending}
        data-athlete-status-trigger=""
        data-no-row-expand=""
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full font-medium transition',
          'outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-foreground/20',
          'disabled:opacity-60',
          size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-xs',
          athleteStatusBadgeClass(status),
          className,
        )}
        aria-label={`Athlete status: ${athleteStatusLabel(status)}. Change status`}
      >
        {athleteStatusLabel(status)}
        <ChevronDown className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3', 'opacity-70')} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          data-no-row-expand=""
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="z-[200] min-w-[9rem] overflow-hidden rounded-[6px] border border-border bg-card p-1 shadow-lg"
        >
          {ATHLETE_STATUS_OPTIONS.map(({ value, label }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={(e) => {
                e.preventDefault()
                setStatus(value)
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'cursor-pointer rounded-[4px] px-2.5 py-1.5 text-sm outline-none',
                'data-[highlighted]:bg-foreground/[0.04]',
                value === status && 'font-semibold',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    value === 'ACTIVE' && 'bg-emerald-500',
                    value === 'INACTIVE' && 'bg-amber-500',
                    value === 'ARCHIVED' && 'bg-zinc-400',
                  )}
                  aria-hidden
                />
                {label}
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
