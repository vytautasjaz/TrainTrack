'use client'

import { useState, useTransition } from 'react'
import { Settings2 } from 'lucide-react'
import type { WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateAthletePlanSportRows } from '@/app/actions/athletes'
import { CONFIGURABLE_PLAN_SPORTS, normalizePlanSportRows } from '@/lib/plan-sports'
import { WORKOUT_TYPE_COLORS, WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

type EditDefaultPlanSportsButtonProps = {
  athleteId: string
  athleteName: string
  planSportRows: WorkoutType[]
  /** Quiet toolbar text control (week Filter · Rows group). */
  quiet?: boolean
}

export function EditDefaultPlanSportsButton({
  athleteId,
  athleteName,
  planSportRows,
  quiet = false,
}: EditDefaultPlanSportsButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const selected = normalizePlanSportRows(planSportRows)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateAthletePlanSportRows(formData)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save sport rows.')
      }
    })
  }

  return (
    <>
      {quiet ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          title="Choose which sports always show for this athlete"
        >
          <Settings2 className="h-3 w-3 opacity-70" aria-hidden />
          Defaults
        </button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Settings2 className="h-3.5 w-3.5" />
          Edit default sports
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Default sport rows</DialogTitle>
            <DialogDescription>
              Sports always shown for {athleteName}. Use &ldquo;Add sport row&rdquo; for this week only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="athleteId" value={athleteId} />
            <div className="grid gap-2 sm:grid-cols-2">
              {CONFIGURABLE_PLAN_SPORTS.map((sport) => (
                <label
                  key={sport}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="planSportRows"
                    value={sport}
                    defaultChecked={selected.includes(sport)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      WORKOUT_TYPE_COLORS[sport],
                    )}
                  >
                    {WORKOUT_TYPE_LABELS[sport]}
                  </span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
