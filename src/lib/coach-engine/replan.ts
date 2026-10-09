/**
 * Replanning helpers for remaining weeks after missed / failed sessions.
 * Full calendar integration lands with the apply-plan feedback loop.
 */
import type {
  AthleteState,
  MethodologySelection,
  PlannedSession,
  PriorityProfile,
  ResponseComparison,
} from '@/lib/coach-engine/types'
import { missedWorkoutAction } from '@/lib/coach-engine/learning'

export type ReplanHint = {
  action: 'keep' | 'drop_missed_stimulus' | 'reduce_next_hard' | 'rebuild_remaining'
  message: string
}

export function replanAfterMissedSession(args: {
  missed: PlannedSession
  remaining: PlannedSession[]
  state: AthleteState
  longDayOfWeek: number
}): ReplanHint {
  const daysUntilLong =
    (args.longDayOfWeek - args.missed.dayOfWeek + 7) % 7
  const action = missedWorkoutAction({
    missedIsKey: Boolean(args.missed.isKeySession),
    daysUntilLong,
    readinessScore: args.state.readiness.score,
  })
  if (action === 'skip_stimulus') {
    return {
      action: 'drop_missed_stimulus',
      message:
        'Missed key session was not moved. Protect the long run; recover the stimulus next week if needed.',
    }
  }
  if (action === 'reduce_later') {
    return {
      action: 'reduce_next_hard',
      message:
        'Missed key session: keep the schedule but reduce the next hard session volume.',
    }
  }
  return {
    action: 'keep',
    message: 'Non-key miss: keep remaining sessions as planned.',
  }
}

export function replanFromResponse(args: {
  comparison: ResponseComparison
  methodology: MethodologySelection
  priority: PriorityProfile
}): ReplanHint {
  if (args.comparison.recommendedAction === 'do_not_reschedule') {
    return {
      action: 'drop_missed_stimulus',
      message: 'Do not blindly reschedule. Recalculate remaining capacity first.',
    }
  }
  if (args.comparison.recommendedAction === 'reduce_next_hard') {
    return {
      action: 'reduce_next_hard',
      message: `Response was harder than expected under ${args.methodology.selectedModel}. Reduce next hard ${args.priority.primary.adaptation} stimulus.`,
    }
  }
  if (args.comparison.recommendedAction === 'replan_week') {
    return {
      action: 'rebuild_remaining',
      message: 'Under-completed session: rebuild remaining week with lower dose.',
    }
  }
  return {
    action: 'keep',
    message: 'Response on track — keep the plan.',
  }
}

/** When methodology confidence is low, run a 3-week experiment. */
export function methodologyExperimentPlan(confidence: number): {
  experimentWeeks: number
  evaluateAfter: boolean
} {
  if (confidence >= 0.7) {
    return { experimentWeeks: 0, evaluateAfter: false }
  }
  return { experimentWeeks: 3, evaluateAfter: true }
}
