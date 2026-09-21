import { revalidatePath, revalidateTag } from 'next/cache'

/** Cache tags for narrow invalidation (use with unstable_cache / 'use cache'). */
export const cacheTags = {
  coachHome: (coachUserId: string) => `coach-home:${coachUserId}`,
  coachRoster: (coachUserId: string) => `coach-roster:${coachUserId}`,
  athletePlan: (athleteId: string) => `athlete-plan:${athleteId}`,
  athleteHome: (athleteId: string) => `athlete-home:${athleteId}`,
  inbox: (userId: string) => `inbox:${userId}`,
  workout: (workoutId: string) => `workout:${workoutId}`,
  appSettings: () => 'app-settings',
} as const

export function revalidateAppSettings() {
  revalidateTag(cacheTags.appSettings())
  revalidatePath('/dashboard')
  revalidatePath('/admin/settings')
}

export function revalidateCoachSurfaces(coachUserId: string) {
  revalidateTag(cacheTags.coachHome(coachUserId))
  revalidateTag(cacheTags.coachRoster(coachUserId))
  revalidatePath('/dashboard')
  revalidatePath('/athletes')
}

export function revalidateAthletePlanSurfaces(_athleteId: string) {
  revalidateTag(cacheTags.athletePlan(_athleteId))
  revalidateTag(cacheTags.athleteHome(_athleteId))
  revalidatePath('/training')
  revalidatePath('/dashboard')
}

export function revalidateInboxSurfaces(
  userId: string,
  opts?: {
    athleteId?: string
    workoutId?: string
    raceId?: string
  },
) {
  revalidateTag(cacheTags.inbox(userId))
  revalidatePath('/inbox')
  revalidatePath('/inbox', 'layout')
  revalidatePath('/', 'layout')
  revalidatePath('/dashboard')
  revalidatePath('/athletes')
  if (opts?.athleteId) {
    revalidateTag(cacheTags.athleteHome(opts.athleteId))
    revalidatePath(`/athletes/${opts.athleteId}`)
  }
  if (opts?.workoutId) {
    revalidateTag(cacheTags.workout(opts.workoutId))
    revalidatePath(`/workouts/${opts.workoutId}`)
  }
  if (opts?.raceId) {
    revalidatePath('/races')
    revalidatePath('/season')
  }
}
