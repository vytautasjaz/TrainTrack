'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SeasonPhase } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { Select } from '@/components/ui/select'
import {
  createSeasonPhaseBlock,
  deleteSeasonPhaseBlock,
  updateSeasonPhaseBlock,
} from '@/app/actions/season-phases'
import {
  PLANNER_SPORTS,
  PLANNER_SPORT_LABELS,
  SEASON_PHASE_LABELS,
  type PlannerSport,
  type SeasonPhaseBlockData,
} from '@/lib/season-planner'

export type SeasonPhaseModalState =
  | {
      mode: 'create'
      sport?: PlannerSport
      startKey?: string
      endKey?: string
    }
  | { mode: 'edit'; block: SeasonPhaseBlockData }
  | null

type SeasonPhaseBlockModalProps = {
  state: SeasonPhaseModalState
  onOpenChange: (open: boolean) => void
}

export function SeasonPhaseBlockModal({
  state,
  onOpenChange,
}: SeasonPhaseBlockModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const open = Boolean(state)
  const editing = state?.mode === 'edit' ? state.block : null
  const defaultSport =
    state?.mode === 'create'
      ? (state.sport ?? 'RUN')
      : ((editing?.sport as PlannerSport | undefined) ?? 'RUN')
  const defaultStart =
    state?.mode === 'create'
      ? state.startKey
      : editing
        ? editing.startDate.toISOString().slice(0, 10)
        : undefined
  const defaultEnd =
    state?.mode === 'create'
      ? state.endKey
      : editing
        ? editing.endDate.toISOString().slice(0, 10)
        : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit phase' : 'Add phase'}</DialogTitle>
          <DialogDescription>
            Strategy context for the calendar — name freely; type is for
            category. Blocks start on Monday; full weeks end Sunday (a mid-week
            end is fine for race week). Phases do not create workouts.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              try {
                if (editing) {
                  fd.set('id', editing.id)
                  await updateSeasonPhaseBlock(fd)
                } else {
                  await createSeasonPhaseBlock(fd)
                }
                onOpenChange(false)
                router.refresh()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save phase')
              }
            })
          }}
        >
          <FormError message={error} />
          <FormField label="Name">
            <Input
              name="label"
              defaultValue={editing?.label ?? ''}
              placeholder="e.g. Base 1 · Marathon preparation"
              autoFocus={!editing}
            />
          </FormField>
          <FormField label="Sport">
            <Select name="sport" required defaultValue={defaultSport}>
              {PLANNER_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {PLANNER_SPORT_LABELS[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Type">
            <Select name="phase" required defaultValue={editing?.phase ?? SeasonPhase.BASE}>
              {(Object.keys(SEASON_PHASE_LABELS) as SeasonPhase[]).map((p) => (
                <option key={p} value={p}>
                  {SEASON_PHASE_LABELS[p]}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start">
              <DateField
                key={`${editing?.id ?? 'new'}-start-${defaultStart ?? ''}`}
                name="startDate"
                required
                defaultValue={defaultStart}
              />
            </FormField>
            <FormField label="End">
              <DateField
                key={`${editing?.id ?? 'new'}-end-${defaultEnd ?? ''}`}
                name="endDate"
                required
                defaultValue={defaultEnd}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save' : 'Add phase'}
            </Button>
            {editing ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => {
                  setError(null)
                  startTransition(async () => {
                    try {
                      const fd = new FormData()
                      fd.set('id', editing.id)
                      await deleteSeasonPhaseBlock(fd)
                      onOpenChange(false)
                      router.refresh()
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : 'Could not delete phase',
                      )
                    }
                  })
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
