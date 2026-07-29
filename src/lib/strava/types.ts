export type StravaTokenResponse = {
  token_type: string
  expires_at: number
  expires_in: number
  refresh_token: string
  access_token: string
  athlete: StravaAthleteSummary
}

/** Subset of Strava athlete fields used for profile sync. */
export type StravaAthleteSummary = {
  id: number
  firstname?: string
  lastname?: string
  /** Large profile image URL */
  profile?: string
  /** Medium profile image URL */
  profile_medium?: string
}

export function pickStravaAvatarUrl(athlete: StravaAthleteSummary): string | null {
  const url = athlete.profile || athlete.profile_medium
  if (!url || url.includes('avatar/athlete/large.png') || url.includes('avatar/athlete/medium.png')) {
    return null
  }
  return url
}

export type StravaActivity = {
  id: number
  name: string
  /** Present on detailed activity; usually missing from list summaries. */
  description?: string | null
  type: string
  sport_type?: string
  start_date: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  /** True when the athlete marked the activity as a commute on Strava. */
  commute?: boolean
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
}
