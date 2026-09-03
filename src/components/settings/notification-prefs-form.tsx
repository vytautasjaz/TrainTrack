'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getNotificationPrefs,
  updateNotificationPrefs,
} from '@/app/actions/push-notifications'
import { FormError } from '@/components/ui/form-error'
import { toUserMessage } from '@/lib/action-error'
import type { NotificationPrefs } from '@/lib/push-notifications'

const LABELS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'messages', label: 'Chat messages', hint: 'General inbox replies' },
  { key: 'workoutAsks', label: 'Workout asks', hint: 'Questions on workouts' },
  { key: 'workoutFeedback', label: 'Workout feedback', hint: 'Post-workout notes' },
  { key: 'raceThreads', label: 'Race threads', hint: 'Race reports and replies' },
]

const DEFAULT_PREFS: NotificationPrefs = {
  messages: true,
  workoutAsks: true,
  workoutFeedback: true,
  raceThreads: true,
}

export function NotificationPrefsForm() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    void getNotificationPrefs()
      .then(setPrefs)
      .catch(() => {})
  }, [])

  function toggle(key: keyof NotificationPrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setError(null)
    startTransition(async () => {
      try {
        await updateNotificationPrefs(next)
      } catch (err) {
        setError(toUserMessage(err, 'Could not save notification preferences'))
        const restored = await getNotificationPrefs().catch(() => DEFAULT_PREFS)
        setPrefs(restored)
      }
    })
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {LABELS.map(({ key, label, hint }) => (
          <li key={key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key] !== false}
              disabled={isPending}
              onClick={() => toggle(key)}
              className={
                prefs[key] !== false
                  ? 'relative h-6 w-10 shrink-0 rounded-full bg-foreground transition-colors'
                  : 'relative h-6 w-10 shrink-0 rounded-full bg-muted transition-colors'
              }
            >
              <span
                className={
                  prefs[key] !== false
                    ? 'absolute top-0.5 left-[1.25rem] h-5 w-5 rounded-full bg-background transition-all'
                    : 'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-all'
                }
              />
            </button>
          </li>
        ))}
      </ul>
      <FormError message={error} />
    </div>
  )
}
