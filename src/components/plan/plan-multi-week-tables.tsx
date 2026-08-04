'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { WorkoutType } from '@prisma/client'
import { Columns2, Minus, Plus, Rows2 } from 'lucide-react'
import { PlanTableView } from '@/components/plan/plan-table-view'
import { PlanWeekDndProvider } from '@/components/plan/plan-week-dnd'
import { CalendarPeriodNav } from '@/components/plan/calendar-period-nav'
import { EditDefaultPlanSportsButton } from '@/components/coach/edit-default-plan-sports-button'
import { AddPlanSportRowButton } from '@/components/coach/add-plan-sport-row-button'
import { availableExtraPlanSports } from '@/lib/plan-sports'
import type { PlanDay } from '@/lib/plan-week'
import { cn } from '@/lib/utils'

const COMBINE_WEEKS_STORAGE_KEY = 'tt-combine-weeks'

export type PlanMultiWeekBlock = {
  weekStartKey: string
  weekLabel: string
  planDays: PlanDay[]
  weekExtraPlanSportRows: WorkoutType[]
  weekHiddenPlanSportRows: WorkoutType[]
}

type PlanMultiWeekTablesProps = {
  weeks: PlanMultiWeekBlock[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  athleteName?: string
  planSportRows?: WorkoutType[]
  prevWeekHref: string
  nextWeekHref: string
  addWeekHref?: string | null
  removeWeekHref?: string | null
  header?: ReactNode
  swimCssSecPer100m?: number | null
}

function CombinedWeeksTable({
  weeks,
  isCoach,
  canEditDayNotes,
  athleteId,
  athleteName,
  planSportRows,
  prevWeekHref,
  nextWeekHref,
  combinedLabel,
  swimCssSecPer100m,
}: {
  weeks: PlanMultiWeekBlock[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  athleteName?: string
  planSportRows: WorkoutType[]
  prevWeekHref: string
  nextWeekHref: string
  combinedLabel: string
  swimCssSecPer100m?: number | null
}) {
  const first = weeks[0]
  const typesInFirst = new Set(
    (first?.planDays ?? []).flatMap((d) => d.workouts.map((w) => w.type)),
  )
  const addableSports =
    isCoach && athleteId && first
      ? availableExtraPlanSports(
          planSportRows,
          first.weekExtraPlanSportRows,
          typesInFirst,
          first.weekHiddenPlanSportRows,
        )
      : []

  const table = (
    <div className="hidden w-full landscape:max-lg:block lg:block">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <CalendarPeriodNav
          label={combinedLabel}
          prevHref={prevWeekHref}
          nextHref={nextWeekHref}
          prevAriaLabel="Previous week"
          nextAriaLabel="Next week"
          align="start"
          className="mb-0"
        />
        {isCoach && athleteId && athleteName && first && (
          <div className="flex flex-wrap items-center gap-1">
            <EditDefaultPlanSportsButton
              athleteId={athleteId}
              athleteName={athleteName}
              planSportRows={planSportRows}
            />
            <AddPlanSportRowButton
              athleteId={athleteId}
              weekStartKey={first.weekStartKey}
              availableSports={addableSports}
            />
          </div>
        )}
      </div>
      <div className="@container overflow-x-auto rounded-[6px] border border-foreground/15 bg-card shadow-none">
        <table className="w-full table-fixed border-collapse text-left landscape:max-lg:text-[9px] lg:text-sm">
          <colgroup>
            <col className="w-[11%]" />
            <col span={7} />
          </colgroup>
          {weeks.map((block, index) => (
            <PlanTableView
              key={block.weekStartKey}
              days={block.planDays}
              isCoach={isCoach}
              canEditDayNotes={canEditDayNotes}
              athleteId={athleteId}
              athleteName={athleteName}
              weekStartKey={block.weekStartKey}
              planSportRows={planSportRows}
              weekExtraPlanSportRows={block.weekExtraPlanSportRows}
              weekHiddenPlanSportRows={block.weekHiddenPlanSportRows}
              swimCssSecPer100m={swimCssSecPer100m}
              hideFooterRows
              tableFragment={index === 0 ? 'thead' : 'tbody-row'}
              skipDndProvider
            />
          ))}
        </table>
      </div>
    </div>
  )

  // Portrait: stack day views without volume/+ chrome between weeks.
  const portrait = (
    <div className="space-y-4 portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
      {weeks.map((block, index) => (
        <PlanTableView
          key={block.weekStartKey}
          days={block.planDays}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
          athleteName={athleteName}
          weekStartKey={block.weekStartKey}
          planSportRows={planSportRows}
          weekExtraPlanSportRows={block.weekExtraPlanSportRows}
          weekHiddenPlanSportRows={block.weekHiddenPlanSportRows}
          swimCssSecPer100m={swimCssSecPer100m}
          weekLabel={block.weekLabel}
          prevWeekHref={index === 0 ? prevWeekHref : undefined}
          nextWeekHref={index === 0 ? nextWeekHref : undefined}
          hideFooterRows
          skipDndProvider
        />
      ))}
    </div>
  )

  return (
    <>
      {portrait}
      {table}
    </>
  )
}

export function PlanMultiWeekTables({
  weeks,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  athleteName,
  planSportRows = [],
  prevWeekHref,
  nextWeekHref,
  addWeekHref,
  removeWeekHref,
  header,
  swimCssSecPer100m = null,
}: PlanMultiWeekTablesProps) {
  const canCombine = weeks.length > 1
  const [combined, setCombined] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMBINE_WEEKS_STORAGE_KEY)
      // Default is combined; only separate when explicitly stored as off.
      if (stored === '0') setCombined(false)
      else setCombined(true)
    } catch {
      setCombined(true)
    }
  }, [])

  function setCombineWeeks(next: boolean) {
    setCombined(next)
    try {
      localStorage.setItem(COMBINE_WEEKS_STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  // Combined is the default whenever more than one week is shown.
  const showCombined = canCombine && combined

  const combinedLabel = useMemo(() => {
    if (weeks.length === 0) return ''
    const first = weeks[0]?.weekLabel ?? ''
    const last = weeks[weeks.length - 1]?.weekLabel ?? ''
    if (weeks.length === 1) return first
    const start = first.split('–')[0]?.trim() ?? first
    const end = last.includes('–')
      ? last.split('–').slice(1).join('–').trim()
      : last
    return `${start} – ${end}`
  }, [weeks])

  const spanControls = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {canCombine && (
        <button
          type="button"
          onClick={() => setCombineWeeks(!showCombined)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5',
            'text-xs font-medium transition',
            showCombined
              ? 'border-foreground/30 text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={showCombined}
        >
          {showCombined ? (
            <Columns2 className="h-3.5 w-3.5" />
          ) : (
            <Rows2 className="h-3.5 w-3.5" />
          )}
          {showCombined ? 'Separate weeks' : 'Combine weeks'}
        </button>
      )}
      {addWeekHref && (
        <Link
          href={addWeekHref}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5',
            'text-xs font-medium text-muted-foreground transition hover:text-foreground',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Add week
        </Link>
      )}
      {removeWeekHref && (
        <Link
          href={removeWeekHref}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5',
            'text-xs font-medium text-muted-foreground transition hover:text-foreground',
          )}
        >
          <Minus className="h-3.5 w-3.5" />
          Remove week
        </Link>
      )}
    </div>
  )

  const combinedContent = (
    <CombinedWeeksTable
      weeks={weeks}
      isCoach={isCoach}
      canEditDayNotes={canEditDayNotes}
      athleteId={athleteId}
      athleteName={athleteName}
      planSportRows={planSportRows}
      prevWeekHref={prevWeekHref}
      nextWeekHref={nextWeekHref}
      combinedLabel={combinedLabel}
      swimCssSecPer100m={swimCssSecPer100m}
    />
  )

  return (
    <div className="space-y-6">
      {header}
      {showCombined ? (
        isCoach ? (
          <PlanWeekDndProvider>{combinedContent}</PlanWeekDndProvider>
        ) : (
          combinedContent
        )
      ) : (
        weeks.map((block, index) => (
          <PlanTableView
            key={block.weekStartKey}
            days={block.planDays}
            isCoach={isCoach}
            canEditDayNotes={canEditDayNotes}
            athleteId={athleteId}
            athleteName={athleteName}
            weekStartKey={block.weekStartKey}
            planSportRows={planSportRows}
            weekExtraPlanSportRows={block.weekExtraPlanSportRows}
            weekHiddenPlanSportRows={block.weekHiddenPlanSportRows}
            swimCssSecPer100m={swimCssSecPer100m}
            weekLabel={block.weekLabel}
            prevWeekHref={index === 0 ? prevWeekHref : undefined}
            nextWeekHref={index === 0 ? nextWeekHref : undefined}
          />
        ))
      )}
      {spanControls}
    </div>
  )
}
