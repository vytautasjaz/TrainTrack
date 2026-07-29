'use client'

import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { hasStructureContent } from '@/lib/workout-builder/utils'
import {
  WorkoutStructureChart,
  type StructureChartTone,
} from '@/components/workout-builder/workout-structure-chart'

type DiagramDensity = 'week' | 'list' | 'month'

type WorkoutCardDiagramProps = {
  workout: PlanWorkoutDetail
  completed: boolean
  skipped?: boolean
  density: DiagramDensity
  className?: string
}

const CHART_SIZE = {
  week: 'card',
  list: 'cardLg',
  month: 'xs',
} as const

export function WorkoutCardDiagram({
  workout,
  completed,
  skipped = false,
  density,
  className,
}: WorkoutCardDiagramProps) {
  if (!workout.structure || !hasStructureContent(workout.structure)) {
    return null
  }

  const tone: StructureChartTone = completed
    ? 'completed'
    : skipped
      ? 'skipped'
      : 'muted'

  return (
    <WorkoutStructureChart
      structure={workout.structure}
      size={CHART_SIZE[density]}
      showCaption={false}
      tone={tone}
      className={className}
    />
  )
}
