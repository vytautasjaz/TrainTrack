import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  stravaHttpError,
  toStravaUserMessage,
  StravaError,
} from './errors'

describe('strava errors', () => {
  it('maps 401 to reconnect guidance', () => {
    const err = stravaHttpError(
      401,
      JSON.stringify({ message: 'Authorization Error' }),
      'token_refresh',
    )
    assert.equal(err.kind, 'auth_expired')
    assert.match(err.message, /reconnect|Disconnect and connect/i)
  })

  it('maps 429 to rate-limit guidance', () => {
    const err = stravaHttpError(429, 'Too Many Requests', 'activities')
    assert.equal(err.kind, 'rate_limited')
    assert.match(err.message, /few minutes/i)
  })

  it('hides raw API JSON dumps from athletes', () => {
    const message = toStravaUserMessage(
      new Error(
        `Strava activities fetch failed: ${JSON.stringify({
          message: 'Authorization Error',
          errors: [{ resource: 'Athlete', field: 'access_token', code: 'invalid' }],
        })}`,
      ),
    )
    assert.doesNotMatch(message, /access_token/)
    assert.doesNotMatch(message, /\{/)
    assert.match(message, /Strava|reconnect|try again/i)
  })

  it('keeps curated StravaError messages', () => {
    const err = new StravaError('Enter a valid date or date range (YYYY-MM-DD).', 'validation')
    assert.equal(toStravaUserMessage(err), err.message)
  })
})
