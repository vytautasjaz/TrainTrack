'use client'

import type { WorkoutType } from '@prisma/client'
import { AthleteNextRacesCard } from '@/components/dashboard/athlete-next-races-card'
import { HomeWeekStatsLoadCard } from '@/components/dashboard/v2/home-week-stats-load-card'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { SessionLoadThresholds } from '@/lib/training-load/session-tss'

type NextRaceLite = {
  id: string
  name: string
  date: string | Date
  location?: string | null
}

export function HomeWeekWidgets({
  workouts,
  anchorWeekStartKey,
  planSportRows = [],
  swimCssSecPer100m = null,
  thresholds,
  nextRaces,
  weekOffset,
  loadedMinOffset,
  loadedMaxOffset,
}: {
  workouts: PlanWorkoutDetail[]
  anchorWeekStartKey: string
  planSportRows?: WorkoutType[]
  swimCssSecPer100m?: number | null
  thresholds: SessionLoadThresholds
  nextRaces: NextRaceLite[]
  weekOffset?: number
  loadedMinOffset?: number
  loadedMaxOffset?: number
}) {
  return (
    <div className="tt-v2-mod-widgets">
      <HomeWeekStatsLoadCard
        workouts={workouts}
        anchorWeekStartKey={anchorWeekStartKey}
        planSportRows={planSportRows}
        swimCssSecPer100m={swimCssSecPer100m}
        thresholds={thresholds}
        weekOffset={weekOffset}
        loadedMinOffset={loadedMinOffset}
        loadedMaxOffset={loadedMaxOffset}
        className="h-full"
      />
      <AthleteNextRacesCard
        races={nextRaces}
        title="Next race"
        tone="v2"
        className="h-full"
      />
    </div>
  )
}
