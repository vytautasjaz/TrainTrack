'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getNotificationPrefs,
  updateNotificationPrefs,
} from '@/app/actions/push-notifications'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { toUserMessage } from '@/lib/action-error'
import {
  MAX_COMPLIANCE_ALERT_BELOW_PCT,
  MAX_UNDER_PLANNED_ALERT_BELOW_DAYS,
  MIN_COMPLIANCE_ALERT_BELOW_PCT,
  MIN_UNDER_PLANNED_ALERT_BELOW_DAYS,
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/notification-prefs'

const INBOX_LABELS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'messages', label: 'Chat messages', hint: 'General inbox replies' },
  { key: 'workoutAsks', label: 'Workout asks', hint: 'Questions on workouts' },
  { key: 'workoutFeedback', label: 'Workout feedback', hint: 'Post-workout notes' },
  { key: 'raceThreads', label: 'Race threads', hint: 'Race reports and replies' },
]

const DEFAULT_PREFS = normalizeNotificationPrefs(null)

type Props = {
  /** When true, also show coach Home “Needs attention” toggles. */
  coachView?: boolean
}

export function NotificationPrefsForm({ coachView = false }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    void getNotificationPrefs()
      .then(setPrefs)
      .catch(() => {})
  }, [])

  function save(next: NotificationPrefs) {
    setPrefs(next)
    setError(null)
    startTransition(async () => {
      try {
        const saved = await updateNotificationPrefs(next)
        setPrefs(saved)
      } catch (err) {
        setError(toUserMessage(err, 'Could not save notification preferences'))
        const restored = await getNotificationPrefs().catch(() => DEFAULT_PREFS)
        setPrefs(restored)
      }
    })
  }

  function toggle(key: 'messages' | 'workoutAsks' | 'workoutFeedback' | 'raceThreads' | 'complianceAlerts' | 'underPlannedAlerts') {
    save({ ...prefs, [key]: prefs[key] === false })
  }

  function renderToggle(
    key: 'messages' | 'workoutAsks' | 'workoutFeedback' | 'raceThreads' | 'complianceAlerts' | 'underPlannedAlerts',
    label: string,
    hint: string,
  ) {
    const on = prefs[key] !== false
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
          className={
            on
              ? 'relative h-6 w-10 shrink-0 rounded-full bg-foreground transition-colors'
              : 'relative h-6 w-10 shrink-0 rounded-full bg-muted transition-colors'
          }
        >
          <span
            className={
              on
                ? 'absolute top-0.5 left-[1.25rem] h-5 w-5 rounded-full bg-background transition-all'
                : 'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-all'
            }
          />
        </button>
      </li>
    )
  }

  const complianceOn = prefs.complianceAlerts !== false
  const underPlannedOn = prefs.underPlannedAlerts !== false
  const compliancePct = prefs.complianceAlertBelowPct ?? DEFAULT_PREFS.complianceAlertBelowPct
  const underPlannedDays =
    prefs.underPlannedAlertBelowDays ?? DEFAULT_PREFS.underPlannedAlertBelowDays

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {INBOX_LABELS.map(({ key, label, hint }) =>
          renderToggle(
            key as 'messages' | 'workoutAsks' | 'workoutFeedback' | 'raceThreads',
            label,
            hint,
          ),
        )}
      </ul>
      {coachView ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium">Coach home alerts</p>
            <p className="text-xs text-muted-foreground">
              Control Needs attention items and thresholds. Missed-plan alerts only show after the
              week has finished — not mid-week.
            </p>
          </div>
          <ul className="space-y-3">
            <li className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Missed plan (last week)</p>
                  <p className="text-xs text-muted-foreground">
                    Alert when last week’s completion is below your threshold
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={complianceOn}
                  disabled={isPending}
                  onClick={() => toggle('complianceAlerts')}
                  className={
                    complianceOn
                      ? 'relative h-6 w-10 shrink-0 rounded-full bg-foreground transition-colors'
                      : 'relative h-6 w-10 shrink-0 rounded-full bg-muted transition-colors'
                  }
                >
                  <span
                    className={
                      complianceOn
                        ? 'absolute top-0.5 left-[1.25rem] h-5 w-5 rounded-full bg-background transition-all'
                        : 'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-all'
                    }
                  />
                </button>
              </div>
              {complianceOn ? (
                <label className="flex items-center gap-2 pl-0 text-xs text-muted-foreground">
                  <span>Alert below</span>
                  <Input
                    type="number"
                    min={MIN_COMPLIANCE_ALERT_BELOW_PCT}
                    max={MAX_COMPLIANCE_ALERT_BELOW_PCT}
                    value={compliancePct}
                    disabled={isPending}
                    className="h-8 w-20"
                    aria-label="Compliance alert threshold percent"
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setPrefs((prev) => ({ ...prev, complianceAlertBelowPct: value }))
                    }}
                    onBlur={(e) => {
                      save({
                        ...prefs,
                        complianceAlertBelowPct: Number(e.target.value),
                      })
                    }}
                  />
                  <span>% completed</span>
                </label>
              ) : null}
            </li>
            <li className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Under-planned athletes</p>
                  <p className="text-xs text-muted-foreground">
                    Alert when plan coverage ahead drops below your day threshold
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={underPlannedOn}
                  disabled={isPending}
                  onClick={() => toggle('underPlannedAlerts')}
                  className={
                    underPlannedOn
                      ? 'relative h-6 w-10 shrink-0 rounded-full bg-foreground transition-colors'
                      : 'relative h-6 w-10 shrink-0 rounded-full bg-muted transition-colors'
                  }
                >
                  <span
                    className={
                      underPlannedOn
                        ? 'absolute top-0.5 left-[1.25rem] h-5 w-5 rounded-full bg-background transition-all'
                        : 'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-all'
                    }
                  />
                </button>
              </div>
              {underPlannedOn ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Alert when under</span>
                  <Input
                    type="number"
                    min={MIN_UNDER_PLANNED_ALERT_BELOW_DAYS}
                    max={MAX_UNDER_PLANNED_ALERT_BELOW_DAYS}
                    value={underPlannedDays}
                    disabled={isPending}
                    className="h-8 w-20"
                    aria-label="Under-planned alert threshold days"
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setPrefs((prev) => ({ ...prev, underPlannedAlertBelowDays: value }))
                    }}
                    onBlur={(e) => {
                      save({
                        ...prefs,
                        underPlannedAlertBelowDays: Number(e.target.value),
                      })
                    }}
                  />
                  <span>days of plan left</span>
                </label>
              ) : null}
            </li>
          </ul>
        </div>
      ) : null}
      <FormError message={error} />
    </div>
  )
}
