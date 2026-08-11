'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ListFilter } from 'lucide-react'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  FILTERABLE_PLAN_SPORTS,
  PLAN_COLOR_MODE_OPTIONS,
  PLAN_STATUS_FILTER_OPTIONS,
} from '@/lib/plan-sport-filter'
import { usePlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { WORKOUT_TYPE_DOT_CLASS } from '@/lib/workout-display'
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
    colorMode,
    setColorMode,
    visibleStatusSet,
    setStatusVisible,
    resetFilters,
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
        aria-label="Training filters"
      >
        <ListFilter className="h-3.5 w-3.5" />
        <span className={cn(compactOnMobile && 'hidden sm:inline')}>Filters</span>
        {isFiltered ? (
          <span className="rounded-[4px] bg-muted px-1 py-px text-[10px] tabular-nums text-muted-foreground">
            on
          </span>
        ) : null}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[200] w-[min(100vw-2rem,18rem)] rounded-[6px] border border-border bg-card p-1 shadow-none"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Filters
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Reset
            </button>
          </div>

          <div className="px-2 pb-1.5 pt-0.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Card color
            </p>
            <div className="space-y-0.5">
              {PLAN_COLOR_MODE_OPTIONS.map((opt) => {
                const checked = colorMode === opt.id
                return (
                  <DropdownMenu.CheckboxItem
                    key={opt.id}
                    checked={checked}
                    onCheckedChange={() => setColorMode(opt.id)}
                    onSelect={(e) => e.preventDefault()}
                    className={cn(
                      'relative flex cursor-pointer select-none flex-col gap-0.5 rounded-[4px] px-2 py-1.5 text-sm outline-none',
                      'data-[highlighted]:bg-muted/70',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          checked
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card',
                        )}
                        aria-hidden
                      >
                        {checked ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-background" />
                        ) : null}
                      </span>
                      <span className="font-medium">{opt.label}</span>
                    </span>
                    <span className="pl-6 text-[11px] text-muted-foreground">
                      {opt.hint}
                    </span>
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <div className="px-2 pb-1 pt-0.5">
            <div className="mb-1 flex items-center justify-between gap-2">
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
                  All
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
                  None
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
                      {checked ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        WORKOUT_TYPE_DOT_CLASS[sport],
                      )}
                      aria-hidden
                    />
                    {WORKOUT_TYPE_LABELS[sport]}
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <div className="px-2 pb-1.5 pt-0.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="py-0.5">
              {PLAN_STATUS_FILTER_OPTIONS.map((opt) => {
                const checked = visibleStatusSet.has(opt.id)
                return (
                  <DropdownMenu.CheckboxItem
                    key={opt.id}
                    checked={checked}
                    onCheckedChange={(next) =>
                      setStatusVisible(opt.id, next === true)
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
                      {checked ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : null}
                    </span>
                    {opt.label}
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
