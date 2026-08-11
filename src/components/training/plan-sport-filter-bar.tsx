'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { type ReactNode } from 'react'
import { WorkoutType } from '@prisma/client'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import {
  FILTERABLE_PLAN_SPORTS,
  PLAN_STATUS_FILTER_OPTIONS,
  type PlanColorMode,
} from '@/lib/plan-sport-filter'
import { usePlanSportFilter } from '@/components/training/plan-sport-filter-context'
import { WORKOUT_TYPE_DOT_CLASS } from '@/lib/workout-display'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'

const VIEW_MODE_OPTIONS: { id: PlanColorMode; label: string }[] = [
  { id: 'sport', label: 'Color' },
  { id: 'white', label: 'Plain' },
  { id: 'completion', label: 'Completion' },
]

/** Quiet text control — no bordered chips. */
const QUIET_BTN =
  'inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-xs font-medium transition'
const QUIET_IDLE = 'text-muted-foreground hover:text-foreground'
const QUIET_ON = 'text-foreground'

export function ToolbarDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn('mx-1 h-4 w-px shrink-0 bg-border', className)}
      aria-hidden
    />
  )
}

/** Color / Plain / Completion — soft segmented control. */
export function PlanViewModeControl({ className }: { className?: string }) {
  const { colorMode, setColorMode } = usePlanSportFilter()

  return (
    <SegmentedControl
      aria-label="View mode"
      className={cn('shrink-0', className)}
    >
      {VIEW_MODE_OPTIONS.map((opt) => (
        <SegmentedControlItem
          key={opt.id}
          type="button"
          active={colorMode === opt.id}
          onClick={() => setColorMode(opt.id)}
          className="px-2.5 sm:px-3"
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

function MenuCheckRow({
  checked,
  label,
  dotClass,
}: {
  checked: boolean
  label: string
  dotClass?: string
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border',
          checked
            ? 'border-foreground/40 text-foreground'
            : 'border-border text-transparent',
        )}
        aria-hidden
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      {dotClass ? (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  )
}

/** Sports menu — quiet trigger, checklist panel. */
export function PlanSportsMenu({ className }: { className?: string }) {
  const { visibleSportSet, setSportVisible, setAllVisible } =
    usePlanSportFilter()

  const allVisible = visibleSportSet.size === FILTERABLE_PLAN_SPORTS.length
  const noneVisible = visibleSportSet.size === 0
  const filtered = !allVisible

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          QUIET_BTN,
          filtered ? QUIET_ON : QUIET_IDLE,
          className,
        )}
        aria-label="Sports filter"
      >
        Sports
        <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[200] w-44 rounded-[6px] border border-border bg-card p-1 shadow-none"
        >
          <div className="flex items-center gap-3 border-b border-border px-2 py-1.5">
            <button
              type="button"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              onClick={() => setAllVisible(true)}
              disabled={allVisible}
            >
              All
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
              onClick={() => setAllVisible(false)}
              disabled={noneVisible}
            >
              None
            </button>
          </div>
          <div className="py-0.5">
            {FILTERABLE_PLAN_SPORTS.map((sport: WorkoutType) => {
              const checked = visibleSportSet.has(sport)
              return (
                <DropdownMenu.CheckboxItem
                  key={sport}
                  checked={checked}
                  onCheckedChange={(next) =>
                    setSportVisible(sport, next === true)
                  }
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer rounded-[4px] px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-muted/60"
                >
                  <MenuCheckRow
                    checked={checked}
                    label={WORKOUT_TYPE_LABELS[sport]}
                    dotClass={WORKOUT_TYPE_DOT_CLASS[sport]}
                  />
                </DropdownMenu.CheckboxItem>
              )
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** Status filter menu — Done / Open / Skipped. */
export function PlanStatusMenu({ className }: { className?: string }) {
  const { visibleStatusSet, setStatusVisible } = usePlanSportFilter()

  const filtered =
    visibleStatusSet.size !== PLAN_STATUS_FILTER_OPTIONS.length

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          QUIET_BTN,
          filtered ? QUIET_ON : QUIET_IDLE,
          className,
        )}
        aria-label="Status filter"
      >
        Status
        <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[200] w-36 rounded-[6px] border border-border bg-card p-1 shadow-none"
        >
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
                className="cursor-pointer rounded-[4px] px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-muted/60"
              >
                <MenuCheckRow checked={checked} label={opt.label} />
              </DropdownMenu.CheckboxItem>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** Quiet text toggle for Notes / Events / Stats. */
export function ToolbarTextToggle({
  pressed,
  onClick,
  children,
  title,
  className,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={title}
      className={cn(QUIET_BTN, pressed ? QUIET_ON : QUIET_IDLE, className)}
    >
      {children}
    </button>
  )
}

/** Content filters only: Sports + Status. */
export function PlanSportFilterBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-nowrap items-center gap-0.5',
        className,
      )}
      role="group"
      aria-label="Content filters"
    >
      <PlanSportsMenu />
      <PlanStatusMenu />
    </div>
  )
}
