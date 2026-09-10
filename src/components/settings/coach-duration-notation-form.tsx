'use client'

import { useState, useTransition } from 'react'
import { updateCoachWorkoutBuilderPrefs } from '@/app/actions/preferences'
import { FormMessage } from '@/components/ui/form-field'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import type { DurationNotation } from '@/lib/workout-builder/duration-notation'
import type { WorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'

type Props = {
  initialPrefs: WorkoutBuilderPrefs
}

export function CoachDurationNotationForm({ initialPrefs }: Props) {
  const [notation, setNotation] = useState<DurationNotation>(
    initialPrefs.durationNotation === 'athletic' ? 'athletic' : 'standard',
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function select(next: DurationNotation) {
    setNotation(next)
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateCoachWorkoutBuilderPrefs({
          ...initialPrefs,
          durationNotation: next === 'standard' ? undefined : next,
        })
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save.')
        setNotation(
          initialPrefs.durationNotation === 'athletic' ? 'athletic' : 'standard',
        )
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        How minutes and seconds appear on workout cards (e.g. rest between intervals).
      </p>
      <SegmentedControl aria-label="Duration format" className="w-full max-w-md">
        <SegmentedControlItem
          type="button"
          active={notation === 'standard'}
          disabled={isPending}
          onClick={() => select('standard')}
          className="flex-1"
        >
          Standard · 60 sec
        </SegmentedControlItem>
        <SegmentedControlItem
          type="button"
          active={notation === 'athletic'}
          disabled={isPending}
          onClick={() => select('athletic')}
          className="flex-1"
        >
          Athletic · 1&apos;30&quot;
        </SegmentedControlItem>
      </SegmentedControl>
      <p className="text-[11px] text-muted-foreground">
        Athletic examples: 20&quot; Rest · 1&apos; Rest · 1&apos;30&quot; Rest
      </p>
      {saved ? <FormMessage variant="success">Saved</FormMessage> : null}
      {error ? <FormMessage variant="error">{error}</FormMessage> : null}
    </div>
  )
}
