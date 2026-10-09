'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getAthletePrivacyPrefs,
  updateAthletePrivacyPrefs,
} from '@/app/actions/athlete-privacy'
import { FormError } from '@/components/ui/form-error'
import { toUserMessage } from '@/lib/action-error'
import {
  normalizeAthletePrivacyPrefs,
  type NormalizedAthletePrivacyPrefs,
} from '@/lib/athlete-privacy'

const DEFAULT_PREFS = normalizeAthletePrivacyPrefs(null)

type ToggleKey = keyof NormalizedAthletePrivacyPrefs

const ROWS: {
  key: ToggleKey
  label: string
  hint: string
  /** When true, the switch is ON when the stored value is true. */
  positive: boolean
}[] = [
  {
    key: 'stravaSkipOnlyMe',
    label: 'Skip Strava “Only you” activities',
    hint: 'Activities you mark private on Strava will not be imported or auto-linked in TrainTrack.',
    positive: true,
  },
  {
    key: 'stravaSkipFollowersOnly',
    label: 'Skip Strava “Followers” activities',
    hint: 'Also exclude activities visible only to your Strava followers.',
    positive: true,
  },
  {
    key: 'shareWorkoutLogWithCoach',
    label: 'Share workout log with coach',
    hint: 'When off, your coach still sees the plan but not completions, metrics, Strava links, or extra self-logged workouts.',
    positive: true,
  },
]

export function AthletePrivacyPrefsForm() {
  const [prefs, setPrefs] = useState<NormalizedAthletePrivacyPrefs>(DEFAULT_PREFS)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    void getAthletePrivacyPrefs()
      .then(setPrefs)
      .catch(() => {})
  }, [])

  function save(next: NormalizedAthletePrivacyPrefs) {
    setPrefs(next)
    setError(null)
    startTransition(async () => {
      try {
        const saved = await updateAthletePrivacyPrefs(next)
        setPrefs(saved)
      } catch (err) {
        setError(toUserMessage(err, 'Could not save privacy settings'))
        const restored = await getAthletePrivacyPrefs().catch(() => DEFAULT_PREFS)
        setPrefs(restored)
      }
    })
  }

  function toggle(key: ToggleKey) {
    save({ ...prefs, [key]: !prefs[key] })
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <ul className="space-y-4">
        {ROWS.map(({ key, label, hint, positive }) => {
          const on = positive ? prefs[key] : !prefs[key]
          return (
            <li key={key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={isPending}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow ring-0 transition-transform ${
                    on ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
