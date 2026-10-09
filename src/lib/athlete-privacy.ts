/** Client-safe athlete privacy preference helpers (no server imports). */

import type { StravaActivity } from '@/lib/strava/types'

export type AthletePrivacyPrefs = {
  /** When true, Strava activities marked “Only you” are not imported or synced. */
  stravaSkipOnlyMe?: boolean
  /** When true, Strava “Followers” visibility activities are not imported or synced. */
  stravaSkipFollowersOnly?: boolean
  /**
   * When false, linked coaches see the training plan but not completions, metrics,
   * Strava links, or self-logged activities outside the plan.
   */
  shareWorkoutLogWithCoach?: boolean
}

export type NormalizedAthletePrivacyPrefs = Required<
  Pick<
    AthletePrivacyPrefs,
    'stravaSkipOnlyMe' | 'stravaSkipFollowersOnly' | 'shareWorkoutLogWithCoach'
  >
>

export function normalizeAthletePrivacyPrefs(
  raw: unknown,
): NormalizedAthletePrivacyPrefs {
  const prefs =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as AthletePrivacyPrefs)
      : null
  return {
    stravaSkipOnlyMe: prefs?.stravaSkipOnlyMe !== false,
    stravaSkipFollowersOnly: prefs?.stravaSkipFollowersOnly === true,
    shareWorkoutLogWithCoach: prefs?.shareWorkoutLogWithCoach !== false,
  }
}

export function athletePrivacyPrefsToJson(
  prefs: NormalizedAthletePrivacyPrefs,
): AthletePrivacyPrefs {
  return { ...prefs }
}

export function isStravaOnlyMeActivity(activity: Pick<StravaActivity, 'private' | 'visibility'>): boolean {
  if (activity.private === true) return true
  const visibility = activity.visibility?.trim().toLowerCase()
  return visibility === 'only_me'
}

export function isStravaFollowersOnlyActivity(
  activity: Pick<StravaActivity, 'visibility'>,
): boolean {
  const visibility = activity.visibility?.trim().toLowerCase()
  return visibility === 'followers_only' || visibility === 'followers'
}

/** Whether this Strava activity should be excluded from sync / manual import. */
export function shouldSkipStravaActivityForPrivacy(
  activity: Pick<StravaActivity, 'private' | 'visibility'>,
  prefs: NormalizedAthletePrivacyPrefs,
): boolean {
  if (prefs.stravaSkipOnlyMe && isStravaOnlyMeActivity(activity)) return true
  if (prefs.stravaSkipFollowersOnly && isStravaFollowersOnlyActivity(activity)) {
    return true
  }
  return false
}
