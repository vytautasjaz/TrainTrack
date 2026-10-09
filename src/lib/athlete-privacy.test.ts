import { describe, expect, it } from 'vitest'
import {
  normalizeAthletePrivacyPrefs,
  shouldSkipStravaActivityForPrivacy,
} from '@/lib/athlete-privacy'

describe('athlete privacy prefs', () => {
  it('defaults to skipping Strava only-me and sharing logs with coach', () => {
    expect(normalizeAthletePrivacyPrefs(null)).toEqual({
      stravaSkipOnlyMe: true,
      stravaSkipFollowersOnly: false,
      shareWorkoutLogWithCoach: true,
    })
  })

  it('skips only-me Strava activities when enabled', () => {
    const prefs = normalizeAthletePrivacyPrefs({ stravaSkipOnlyMe: true })
    expect(
      shouldSkipStravaActivityForPrivacy({ private: true }, prefs),
    ).toBe(true)
    expect(
      shouldSkipStravaActivityForPrivacy({ visibility: 'only_me' }, prefs),
    ).toBe(true)
    expect(
      shouldSkipStravaActivityForPrivacy({ visibility: 'everyone' }, prefs),
    ).toBe(false)
  })

  it('respects followers-only skip when opted in', () => {
    const prefs = normalizeAthletePrivacyPrefs({ stravaSkipFollowersOnly: true })
    expect(
      shouldSkipStravaActivityForPrivacy(
        { visibility: 'followers_only' },
        prefs,
      ),
    ).toBe(true)
  })
})
