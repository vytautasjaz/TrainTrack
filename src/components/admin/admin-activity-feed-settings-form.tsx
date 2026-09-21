'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminUpdateActivityFeedSettings } from '@/app/actions/admin'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'

type AdminActivityFeedSettingsFormProps = {
  coachActivityFeedEnabled: boolean
  athleteActivityFeedEnabled: boolean
}

export function AdminActivityFeedSettingsForm({
  coachActivityFeedEnabled: initialCoach,
  athleteActivityFeedEnabled: initialAthlete,
}: AdminActivityFeedSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [coachEnabled, setCoachEnabled] = useState(initialCoach)
  const [athleteEnabled, setAthleteEnabled] = useState(initialAthlete)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function persist(next: { coach: boolean; athlete: boolean }) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await adminUpdateActivityFeedSettings({
          coachActivityFeedEnabled: next.coach,
          athleteActivityFeedEnabled: next.athlete,
        })
        setSaved(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save settings')
      }
    })
  }

  return (
    <div className="space-y-5 rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--tt-ink,#111)]">Activity feed</h2>
        <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
          When off, home dashboards skip the feed UI and the heavy workout queries behind it.
          Defaults are on.
        </p>
      </div>

      <FeedToggleRow
        label="Coach home feed"
        description="Recent athlete workouts and races on the coach dashboard."
        enabled={coachEnabled}
        disabled={isPending}
        onChange={(enabled) => {
          setCoachEnabled(enabled)
          persist({ coach: enabled, athlete: athleteEnabled })
        }}
      />

      <FeedToggleRow
        label="Athlete home feed"
        description="Recent completed workouts on the athlete dashboard."
        enabled={athleteEnabled}
        disabled={isPending}
        onChange={(enabled) => {
          setAthleteEnabled(enabled)
          persist({ coach: coachEnabled, athlete: enabled })
        }}
      />

      {error ? (
        <p className="text-[12px] text-red-600">{error}</p>
      ) : saved ? (
        <p className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">Saved</p>
      ) : null}
    </div>
  )
}

function FeedToggleRow({
  label,
  description,
  enabled,
  disabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  disabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">{label}</p>
        <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">{description}</p>
      </div>
      <SegmentedControl aria-label={label} className="w-full sm:w-auto">
        <SegmentedControlItem
          type="button"
          active={enabled}
          disabled={disabled}
          onClick={() => onChange(true)}
          className={cn('flex-1 px-3 sm:flex-none')}
        >
          On
        </SegmentedControlItem>
        <SegmentedControlItem
          type="button"
          active={!enabled}
          disabled={disabled}
          onClick={() => onChange(false)}
          className={cn('flex-1 px-3 sm:flex-none')}
        >
          Off
        </SegmentedControlItem>
      </SegmentedControl>
    </div>
  )
}
