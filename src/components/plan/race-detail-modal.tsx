'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RACE_TYPE_LABELS, WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { parseDateOnly } from '@/lib/dates'

type RaceDetailModalProps = {
  workout: PlanWorkoutDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatRaceDate(dateKey: string) {
  return parseDateOnly(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function RaceDetailModal({ workout, open, onOpenChange }: RaceDetailModalProps) {
  if (!workout.isRace || !workout.raceId || !workout.raceType) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{workout.title}</DialogTitle>
          <DialogDescription>{formatRaceDate(workout.dateKey)}</DialogDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Race</Badge>
            <Badge className={WORKOUT_TYPE_COLORS[workout.type]}>
              {WORKOUT_TYPE_LABELS[workout.type]}
            </Badge>
            <Badge variant="outline" className="bg-muted/40">
              {RACE_TYPE_LABELS[workout.raceType]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {workout.raceLocation && (
            <p>
              <span className="text-muted-foreground">Location: </span>
              {workout.raceLocation}
            </p>
          )}
          {workout.raceGoal && (
            <p>
              <span className="text-muted-foreground">Goal: </span>
              {workout.raceGoal}
            </p>
          )}
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/races/${workout.raceId}/edit`}>Edit race</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
