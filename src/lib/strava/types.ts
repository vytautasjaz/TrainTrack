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

export function stravaRoutePolyline(
  map?: {
    polyline?: string | null
    summary_polyline?: string | null
  } | null,
): string | null {
  const summary = map?.summary_polyline?.trim()
  if (summary) return summary
  const detailed = map?.polyline?.trim()
  return detailed || null
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
  /** True when visibility is “Only you” on Strava. */
  private?: boolean
  /** everyone | followers_only | only_me */
  visibility?: string | null
  average_speed?: number
  max_speed?: number
  total_elevation_gain?: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  kilojoules?: number
  calories?: number
  average_watts?: number
  weighted_average_watts?: number
  suffer_score?: number
  map?: {
    id?: string
    polyline?: string | null
    summary_polyline?: string | null
    resource_state?: number
  } | null
  laps?: StravaLap[]
  splits_metric?: StravaSplit[]
  splits_standard?: StravaSplit[]
}

export type StravaLap = {
  id?: number
  name?: string
  lap_index?: number
  split?: number
  distance: number
  elapsed_time: number
  moving_time?: number
  average_speed?: number
  average_heartrate?: number
  average_watts?: number
  total_elevation_gain?: number
}

export type StravaSplit = {
  split: number
  distance: number
  elapsed_time: number
  moving_time?: number
  average_speed?: number
  elevation_difference?: number
  average_heartrate?: number
}
