import { WorkoutStatus } from '@prisma/client'
import {
  buildCoachHomeActivityTableRows,
  type CoachHomeWorkoutActivityRow,
} from '@/lib/coach-home'
import type { CoachHomeActivityFeedItem } from '@/lib/coach-roster'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutCompletionSource } from '@/lib/workout-history'

export function buildAthleteHomeActivityRows(
  workouts: PlanWorkoutDetail[],
): CoachHomeWorkoutActivityRow[] {
  const items: CoachHomeActivityFeedItem[] = workouts.map((workout) => {
    const kind = workout.status === WorkoutStatus.SKIPPED ? 'skipped' : 'completed'
    return {
      athleteId: '',
      athleteName: '',
      avatarUrl: null,
      activityAt: `${workout.dateKey}T12:00:00.000Z`,
      kind,
      source:
        kind === 'completed'
          ? getWorkoutCompletionSource({
              selfLogged: workout.selfLogged ?? false,
              result: workout.result,
            })
          : null,
      workout,
      feedbackThread: null,
    }
  })

  // Athlete feed always shows the athlete’s own notes (including private).
  return buildCoachHomeActivityTableRows(items).map((row) => {
    const ownNotes = row.workout.result?.athleteNotes?.trim() || null
    return {
      ...row,
      feedbackNotes: ownNotes ?? row.feedbackNotes,
      hasFeedback: Boolean(
        row.feedbackFeeling != null || ownNotes || row.feedbackReply,
      ),
    }
  })
}
