import type { AuthResponse, HomeResponse, MobileUser, WorkoutDetail } from '@/types/api'

const TOKEN_HEADER = 'Authorization'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function apiBase(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (!raw) {
    throw new ApiError(
      0,
      'EXPO_PUBLIC_API_URL is not set. Use your Mac LAN IP, e.g. http://192.168.1.10:3000',
    )
  }
  return raw.replace(/\/$/, '')
}

export function apiBaseUrl() {
  return apiBase()
}

/** Host for Google OAuth start (must be localhost / tunnel / public domain — not LAN IP). */
export function googleOAuthBaseUrl() {
  const oauth = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_URL?.trim()
  if (oauth) return oauth.replace(/\/$/, '')
  return apiBase()
}

type FetchOpts = {
  method?: string
  body?: unknown
  token?: string | null
  onUnauthorized?: () => void
}

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (opts.token) {
    headers[TOKEN_HEADER] = `Bearer ${opts.token}`
  }

  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(
      0,
      'Cannot reach TrainTrack API. Is Next.js running and EXPO_PUBLIC_API_URL correct?',
    )
  }

  if (res.status === 401) {
    opts.onUnauthorized?.()
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
  } & T

  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`)
  }
  return data
}

export function loginWithEmail(email: string, password: string) {
  return apiFetch<AuthResponse>('/api/mobile/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function loginWithGoogleIdToken(idToken: string) {
  return apiFetch<AuthResponse>('/api/mobile/auth/google', {
    method: 'POST',
    body: { idToken },
  })
}

export function fetchMe(token: string, onUnauthorized?: () => void) {
  return apiFetch<{ user: MobileUser }>('/api/mobile/auth/me', {
    token,
    onUnauthorized,
  })
}

export function fetchHome(
  token: string,
  weekOffset: number,
  onUnauthorized?: () => void,
) {
  return apiFetch<HomeResponse>(
    `/api/mobile/home?weekOffset=${encodeURIComponent(String(weekOffset))}`,
    { token, onUnauthorized },
  )
}

export function fetchWorkout(
  token: string,
  id: string,
  onUnauthorized?: () => void,
) {
  return apiFetch<{ workout: WorkoutDetail }>(
    `/api/mobile/workouts/${encodeURIComponent(id)}`,
    { token, onUnauthorized },
  )
}

export function hasApiUrlConfigured() {
  return Boolean(process.env.EXPO_PUBLIC_API_URL?.trim())
}

/** Client ids for Expo Google AuthSession (Expo Go needs the Web client). */
export function googleClientIds() {
  const legacy = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() || ''
  const web =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || legacy
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || ''
  const android =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || ''
  return { web, ios, android, configured: Boolean(web || ios || android) }
}

/** @deprecated use googleClientIds().web */
export function googleClientId() {
  return googleClientIds().web
}
