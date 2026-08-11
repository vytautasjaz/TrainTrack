'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField, FormMessage } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { confirmPersonalBest } from '@/app/actions/personal-bests'
import { displayPersonalBestDate, type PersonalBestSuggestion } from '@/lib/personal-bests'

type PersonalBestUpdateModalProps = {
  suggestion: PersonalBestSuggestion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function PersonalBestUpdateModal({
  suggestion,
  open,
  onOpenChange,
  onSaved,
}: PersonalBestUpdateModalProps) {
  const [time, setTime] = useState(suggestion?.proposedValueLabel ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const suggestionKey = suggestion
    ? `${suggestion.raceId}:${suggestion.proposedValueLabel}`
    : ''
  const [lastKey, setLastKey] = useState(suggestionKey)
  if (suggestion && suggestionKey !== lastKey) {
    setLastKey(suggestionKey)
    setTime(suggestion.proposedValueLabel)
    setError(null)
  }

  if (!suggestion) return null

  const dateLabel = displayPersonalBestDate(suggestion.dateText)

  function handleConfirm() {
    if (!suggestion) return
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('presetKey', suggestion.presetKey)
        formData.set('time', time)
        formData.set('date', suggestion.dateText)
        formData.set('event', suggestion.event)
        formData.set('raceId', suggestion.raceId)
        if (suggestion.personalBestId) {
          formData.set('personalBestId', suggestion.personalBestId)
        }
        await confirmPersonalBest(formData)
        onOpenChange(false)
        onSaved?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save personal best.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {suggestion.name} personal best?</DialogTitle>
          <DialogDescription>
            {suggestion.previousValueLabel
              ? `Previous PB was ${suggestion.previousValueLabel}${
                  suggestion.previousEvent ? ` · ${suggestion.previousEvent}` : ''
                }.`
              : `You don’t have a ${suggestion.name} PB yet — this will add one.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <FormField label="Time" hint="Editable — m:ss or h:mm:ss">
            <Input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="font-semibold tabular-nums"
              aria-label="Personal best time"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[6px] border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{dateLabel}</p>
            </div>
            <div className="rounded-[6px] border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Event
              </p>
              <p
                className="mt-0.5 truncate text-sm font-medium text-foreground"
                title={suggestion.event}
              >
                {suggestion.event}
              </p>
            </div>
          </div>

          {error ? <FormMessage variant="error">{error}</FormMessage> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Skip
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={handleConfirm}>
              {pending ? 'Saving…' : 'Update PB'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
