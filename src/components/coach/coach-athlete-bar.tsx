'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import type { AthleteStatus } from '@prisma/client'
import { switchAthlete } from '@/app/actions/session'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteStatusPill } from '@/components/coach/athlete-status-pill'
import { SELECT_DROPDOWN_CONTENT_CLASS } from '@/components/ui/select-dropdown'
import { useCurrentPath } from '@/hooks/use-current-path'
import { athleteStatusLabel } from '@/lib/athlete-status'
import { cn } from '@/lib/utils'

export type CoachAthleteBarItem = {
  id: string
  name: string
  status: AthleteStatus
  avatarUrl?: string | null
}

type CoachAthleteBarProps = {
  athletes: CoachAthleteBarItem[]
  selectedAthleteId: string
}

/** ACTIVE athletes first (name asc), then the rest — for cycling order. */
export function sortAthletesForCycling(athletes: CoachAthleteBarItem[]): CoachAthleteBarItem[] {
  return [...athletes].sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1
    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1
    return a.name.localeCompare(b.name)
  })
}

export function CoachAthleteBar({ athletes, selectedAthleteId }: CoachAthleteBarProps) {
  const redirectTo = useCurrentPath()
  const [isPending, startTransition] = useTransition()
  if (athletes.length === 0) return null

  const ordered = sortAthletesForCycling(athletes)
  const selected =
    ordered.find((a) => a.id === selectedAthleteId) ?? ordered[0]

  function selectAthlete(athleteId: string) {
    if (athleteId === selected.id) return
    const formData = new FormData()
    formData.set('athleteId', athleteId)
    formData.set('redirectTo', redirectTo)
    startTransition(() => {
      void switchAthlete(formData)
    })
  }

  return (
    <div className="border-b border-border/40 bg-card/90 px-3 py-2.5 sm:px-4 lg:px-8 lg:py-3">
      <div className="flex min-w-0 items-center gap-3 lg:gap-3.5">
        <Link
          href={`/athletes/${selected.id}`}
          className="shrink-0 rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={`Edit ${selected.name}'s profile`}
          title="Edit profile"
        >
          <AthleteAvatar name={selected.name} avatarUrl={selected.avatarUrl} size="bar" />
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              disabled={isPending || ordered.length <= 1}
              aria-label="Select athlete"
              className={cn(
                'group inline-flex max-w-full items-center gap-1 rounded-lg text-left outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand/30',
                'disabled:cursor-default',
                isPending && 'opacity-70',
              )}
            >
              <span className="truncate text-base font-semibold tracking-tight text-foreground lg:text-lg">
                {selected.name}
              </span>
              {ordered.length > 1 ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground group-data-[state=open]:rotate-180 group-data-[state=open]:text-foreground lg:h-5 lg:w-5" />
              ) : null}
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className={cn(SELECT_DROPDOWN_CONTENT_CLASS, 'min-w-[12rem]')}
              >
                {ordered.map((athlete) => {
                  const active = athlete.id === selected.id
                  return (
                    <DropdownMenu.Item
                      key={athlete.id}
                      onSelect={() => selectAthlete(athlete.id)}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center gap-2.5 px-3 py-2 text-sm outline-none',
                        'data-[highlighted]:bg-foreground/[0.04]',
                        active && 'font-semibold',
                      )}
                    >
                      <AthleteAvatar
                        name={athlete.name}
                        avatarUrl={athlete.avatarUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate">{athlete.name}</span>
                      {athlete.status !== 'ACTIVE' ? (
                        <span className="text-[10px] text-muted-foreground">
                          {athleteStatusLabel(athlete.status)}
                        </span>
                      ) : null}
                      {active ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                    </DropdownMenu.Item>
                  )
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <AthleteStatusPill
            athleteId={selected.id}
            status={selected.status}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
