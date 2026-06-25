'use client'

import type { WorkoutType } from '@prisma/client'
import { PlanTableView } from '@/components/plan/plan-table-view'
import { TrainingListView } from '@/components/training/training-list-view'
import type { PlanDay } from '@/lib/plan-week'
import type { TrainingDay } from '@/lib/training-timeline'
import type { ReactNode } from 'react'

type TrainingMobileWeekViewProps = {
  days: TrainingDay[]
  planDays: PlanDay[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  header?: ReactNode
  prevWeekHref: string
  nextWeekHref: string
  weekLabel?: string
  athleteName?: string
  weekStartKey?: string
  planSportRows?: WorkoutType[]
  weekExtraPlanSportRows?: WorkoutType[]
  weekHiddenPlanSportRows?: WorkoutType[]
}

export function TrainingMobileWeekView({
  days,
  planDays,
  isCoach,
  canEditDayNotes,
  athleteId,
  header,
  prevWeekHref,
  nextWeekHref,
  weekLabel,
  athleteName,
  weekStartKey,
  planSportRows,
  weekExtraPlanSportRows,
  weekHiddenPlanSportRows,
}: TrainingMobileWeekViewProps) {
  return (
    <>
      <div className="portrait:max-lg:block landscape:max-lg:hidden">
        <TrainingListView
          key={weekStartKey}
          days={days}
          planDays={planDays}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
          header={header}
          prevWeekHref={prevWeekHref}
          nextWeekHref={nextWeekHref}
          variant="fixed"
        />
      </div>

      <div className="hidden space-y-4 landscape:max-lg:block">
        {header}
        <PlanTableView
          days={planDays}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
          athleteName={athleteName}
          weekStartKey={weekStartKey}
          planSportRows={planSportRows}
          weekExtraPlanSportRows={weekExtraPlanSportRows}
          weekHiddenPlanSportRows={weekHiddenPlanSportRows}
          weekLabel={weekLabel}
          prevWeekHref={prevWeekHref}
          nextWeekHref={nextWeekHref}
        />
      </div>
    </>
  )
}
