'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ListFilter } from 'lucide-react'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  FILTERABLE_PLAN_SPORTS,
} from '@/lib/plan-sport-filter'
import { usePlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { cn } from '@/lib/utils'

type PlanSportFilterControlProps = {
  /** Icon-only on small screens so controls fit one row. */
  compactOnMobile?: boolean
}

export function PlanSportFilterControl({
  compactOnMobile = false,
}: PlanSportFilterControlProps = {}) {
  const {
    visibleSportSet,
    isFiltered,
    setSportVisible,
    setAllVisible,
  } = usePlanSportFilter()

  const allVisible = visibleSportSet.size === FILTERABLE_PLAN_SPORTS.length
  const noneVisible = visibleSportSet.size === 0

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-border bg-card',
          'text-xs font-medium transition',
          compactOnMobile ? 'px-2 py-1.5 sm:px-3' : 'px-3 py-1.5',
          isFiltered
            ? 'border-foreground/30 text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label="Filter sports"
      >
        <ListFilter className="h-3.5 w-3.5" />
        <span className={cn(compactOnMobile && 'hidden sm:inline')}>Filters</span>
        {isFiltered ? (
          <span className="rounded-[4px] bg-muted px-1 py-px text-[10px] tabular-nums text-muted-foreground">
            {visibleSportSet.size}/{FILTERABLE_PLAN_SPORTS.length}
          </span>
        ) : null}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[200] min-w-52 rounded-[6px] border border-border bg-card p-1 shadow-none"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Sports
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  'text-[10px] font-medium transition',
                  allVisible
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setAllVisible(true)}
                disabled={allVisible}
              >
                Show all
              </button>
              <button
                type="button"
                className={cn(
                  'text-[10px] font-medium transition',
                  noneVisible
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setAllVisible(false)}
                disabled={noneVisible}
              >
                Show none
              </button>
            </div>
          </div>
          <div className="py-0.5">
            {FILTERABLE_PLAN_SPORTS.map((sport) => {
              const checked = visibleSportSet.has(sport)
              return (
                <DropdownMenu.CheckboxItem
                  key={sport}
                  checked={checked}
                  onCheckedChange={(next) =>
                    setSportVisible(sport, next === true)
                  }
                  onSelect={(e) => e.preventDefault()}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-[4px] px-2 py-1.5 text-sm outline-none',
                    'data-[highlighted]:bg-muted/70',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border',
                      checked
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card',
                    )}
                    aria-hidden
                  >
                    {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  {WORKOUT_TYPE_LABELS[sport]}
                </DropdownMenu.CheckboxItem>
              )
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
