import { ActionError } from '@/lib/action-error'

export type StravaErrorKind =
  | 'not_connected'
  | 'auth_expired'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'network'
  | 'not_configured'
  | 'validation'
  | 'unknown'

/**
 * Athlete-facing Strava failure. Prefer throwing this from the Strava client /
 * sync layer so UI never surfaces raw API bodies or stack traces.
 */
export class StravaError extends ActionError {
  readonly kind: StravaErrorKind
  readonly status?: number

  constructor(
    message: string,
    kind: StravaErrorKind = 'unknown',
    options?: { status?: number; code?: ActionError['code'] },
  ) {
    super(message, options?.code ?? (kind === 'validation' ? 'VALIDATION' : 'UNKNOWN'))
    this.name = 'StravaError'
    this.kind = kind
    this.status = options?.status
  }
}

const FRIENDLY: Record<StravaErrorKind, string> = {
  not_connected: 'Strava is not connected. Connect it in Settings → Integrations.',
  auth_expired:
    'Your Strava connection expired or was revoked. Disconnect and connect again in Settings.',
  forbidden:
    'Strava denied access. Reconnect Strava in Settings and approve activity read permissions.',
  rate_limited:
    'Strava is temporarily limiting requests. Wait a few minutes, then try sync again.',
  not_found: 'That Strava activity could not be found. It may have been deleted.',
  network: 'Could not reach Strava. Check your connection and try again.',
  not_configured: 'Strava is not configured on this server yet.',
  validation: 'Check the dates or options you selected and try again.',
  unknown: 'Could not sync with Strava right now. Please try again in a moment.',
}

type Op =
  | 'token_exchange'
  | 'token_refresh'
  | 'activities'
  | 'activity'
  | 'athlete'
  | 'streams'
  | 'sync'
  | 'generic'

function parseStravaBodyMessage(body: string): string | null {
  const trimmed = body.trim()
  if (!trimmed) return null
  try {
    const json = JSON.parse(trimmed) as {
      message?: unknown
      errors?: Array<{ code?: unknown; field?: unknown; resource?: unknown }>
    }
    const parts: string[] = []
    if (typeof json.message === 'string' && json.message.trim()) {
      parts.push(json.message.trim())
    }
    if (Array.isArray(json.errors)) {
      for (const err of json.errors) {
        const code = typeof err.code === 'string' ? err.code : ''
        const field = typeof err.field === 'string' ? err.field : ''
        if (code && field) parts.push(`${field}: ${code}`)
        else if (code) parts.push(code)
      }
    }
    return parts.length > 0 ? parts.join(' — ') : null
  } catch {
    // Non-JSON body (HTML error pages, etc.) — never show raw to athletes.
    return null
  }
}

function kindFromStatus(status: number, bodyHint: string | null): StravaErrorKind {
  if (status === 401) return 'auth_expired'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'unknown'
  const hint = (bodyHint ?? '').toLowerCase()
  if (hint.includes('rate limit') || hint.includes('too many')) return 'rate_limited'
  if (hint.includes('authorization') || hint.includes('access_token')) return 'auth_expired'
  if (hint.includes('forbidden')) return 'forbidden'
  return 'unknown'
}

function messageForOp(kind: StravaErrorKind, op: Op): string {
  if (kind === 'auth_expired' && (op === 'token_refresh' || op === 'token_exchange')) {
    return FRIENDLY.auth_expired
  }
  if (kind === 'rate_limited') return FRIENDLY.rate_limited
  if (kind === 'forbidden') return FRIENDLY.forbidden
  if (kind === 'not_found' && op === 'activity') return FRIENDLY.not_found
  if (kind === 'not_connected') return FRIENDLY.not_connected
  if (kind === 'network') return FRIENDLY.network
  if (kind === 'not_configured') return FRIENDLY.not_configured

  switch (op) {
    case 'activities':
    case 'sync':
      return 'Could not load activities from Strava. Please try again in a moment.'
    case 'activity':
      return 'Could not load that Strava activity. Please try again.'
    case 'athlete':
      return 'Could not load your Strava profile. Try reconnecting Strava in Settings.'
    case 'streams':
      return 'Activity details from Strava could not be loaded. Try sync again later.'
    case 'token_exchange':
      return 'Could not finish connecting to Strava. Please try connecting again.'
    case 'token_refresh':
      return FRIENDLY.auth_expired
    default:
      return FRIENDLY[kind]
  }
}

/** Map a failed Strava HTTP response into an athlete-safe error. */
export function stravaHttpError(
  status: number,
  body: string,
  op: Op = 'generic',
): StravaError {
  const bodyHint = parseStravaBodyMessage(body)
  const kind = kindFromStatus(status, bodyHint)
  return new StravaError(messageForOp(kind, op), kind, { status })
}

/** Map fetch/network failures (TypeError, AbortError, etc.). */
export function stravaNetworkError(cause?: unknown): StravaError {
  if (cause instanceof StravaError) return cause
  const message =
    cause instanceof Error ? cause.message.toLowerCase() : String(cause ?? '').toLowerCase()
  if (message.includes('abort') || message.includes('timeout')) {
    return new StravaError(
      'The Strava request timed out. Try again in a moment.',
      'network',
    )
  }
  return new StravaError(FRIENDLY.network, 'network')
}

/**
 * Convert any thrown value into a short athlete-facing Strava message.
 * Never returns raw API JSON / Prisma / stack noise.
 */
export function toStravaUserMessage(
  error: unknown,
  fallback = FRIENDLY.unknown,
): string {
  if (error instanceof StravaError) return error.message

  if (error instanceof ActionError) {
    // Already curated (validation from sync layer, etc.).
    return error.message
  }

  if (error instanceof Error) {
    const raw = error.message.trim()
    if (!raw) return fallback

    // Known sync / client messages that are already athlete-safe.
    const knownSafe = [
      /^Strava is not connected/i,
      /^Enter a valid date/i,
      /^End date must be/i,
      /^Date range cannot exceed/i,
      /^That Strava activity/i,
      /^Commute activities/i,
      /^Detach the current Strava/i,
      /^Pick a Strava activity/i,
      /^Cannot reschedule/i,
      /^This workout is not linked/i,
      /^You can only/i,
      /^Workout not found/i,
      /^Athlete not found/i,
      /^Invalid Strava activity/i,
      /^This is a placeholder/i,
    ]
    if (knownSafe.some((re) => re.test(raw)) && !looksLikeRawApiDump(raw)) {
      return raw
    }

    if (/token refresh failed|authorization error|invalid.*access_token/i.test(raw)) {
      return FRIENDLY.auth_expired
    }
    if (/rate limit|too many requests|429/i.test(raw)) {
      return FRIENDLY.rate_limited
    }
    if (/not connected/i.test(raw)) {
      return FRIENDLY.not_connected
    }
    if (/STRAVA_CLIENT|not configured/i.test(raw)) {
      return FRIENDLY.not_configured
    }
    if (/fetch failed|network|ECONNREFUSED|ENOTFOUND|Failed to fetch/i.test(raw)) {
      return FRIENDLY.network
    }
    if (looksLikeRawApiDump(raw)) {
      return fallback
    }
  }

  return fallback
}

function looksLikeRawApiDump(message: string): boolean {
  if (message.length > 180) return true
  if (/^\s*\{/.test(message) || /"errors"\s*:/.test(message)) return true
  if (/Strava .+ failed:/i.test(message)) return true
  if (/prisma|ECONNREFUSED|stack|at Object\./i.test(message)) return true
  return false
}

export function logStravaError(context: string, error: unknown) {
  console.error(`[strava:${context}]`, error)
}
