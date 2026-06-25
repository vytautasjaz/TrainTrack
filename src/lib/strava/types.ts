export type StravaTokenResponse = {
  token_type: string
  expires_at: number
  expires_in: number
  refresh_token: string
  access_token: string
  athlete: {
    id: number
    firstname?: string
    lastname?: string
  }
}

export type StravaActivity = {
  id: number
  name: string
  type: string
  sport_type?: string
  start_date: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
}
