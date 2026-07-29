'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Unlink } from 'lucide-react'
import {
  attachStravaActivityToWorkout,
  isStravaConnected,
  listStravaActivitiesForWorkout,
  unlinkStravaFromWorkout,
} from '@/app/actions/strava'
import type { StravaActivityPickItem } from '@/lib/strava/sync'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Caption } from '@/components/ui/typography'
import { formatDistance, formatDuration, cn } from '@/lib/utils'

type StravaDetachButtonProps = {
  workoutId: string
  onDetached?: () => void
}

export function StravaDetachButton({ workoutId, onDetached }: StravaDetachButtonProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await unlinkStravaFromWorkout(workoutId)
      setConfirmOpen(false)
      router.refresh()
      onDetached?.()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => setConfirmOpen(true)}
      >
        <Unlink className="h-3.5 w-3.5" />
        Detach Strava
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Detach Strava activity?"
        description="This clears the linked Strava data and returns the workout to planned so you can log it manually or pick a different activity."
        confirmLabel="Detach"
        cancelLabel="Cancel"
        tone="default"
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  )
}

type StravaLinkPickerProps = {
  workoutId: string
  onLinked?: () => void
}

export function StravaLinkPicker({ workoutId, onLinked }: StravaLinkPickerProps) {
  const router = useRouter()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<StravaActivityPickItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    void isStravaConnected()
      .then((value) => {
        if (!cancelled) setConnected(value)
      })
      .catch(() => {
        if (!cancelled) setConnected(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function openPicker() {
    setOpen(true)
    setLoading(true)
    setLoadError(null)
    try {
      const next = await listStravaActivitiesForWorkout(workoutId)
      setItems(next)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load Strava activities')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  function handleAttach(activityId: string) {
    setAttachingId(activityId)
    startTransition(async () => {
      try {
        await attachStravaActivityToWorkout(workoutId, activityId)
        setOpen(false)
        router.refresh()
        onLinked?.()
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not link activity')
      } finally {
        setAttachingId(null)
      }
    })
  }

  if (connected === false) return null
  if (connected === null) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-[#FC4C02] hover:text-[#FC4C02]"
        onClick={() => void openPicker()}
      >
        <Link2 className="h-3.5 w-3.5" />
        Link Strava activity
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="z-[70] max-h-[min(85vh,32rem)] max-w-md gap-4 overflow-hidden p-0"
          overlayClassName="z-[70]"
        >
          <DialogHeader className="space-y-1 border-b border-border/50 px-5 py-4 pr-12">
            <DialogTitle>Link Strava activity</DialogTitle>
            <DialogDescription>
              Choose a same-day activity that matches this workout. Commute activities are
              disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
            {loading ? (
              <Caption>Loading activities…</Caption>
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : items.length === 0 ? (
              <Caption>No matching Strava activities found for this day.</Caption>
            ) : (
              items.map((item) => {
                const disabled =
                  item.commute || (item.linked && !item.linkedToThisWorkout) || pending
                const meta = [
                  item.startTimeLocal,
                  item.distanceKm != null ? formatDistance(item.distanceKm) : null,
                  formatDuration(item.durationMin),
                  item.commute ? 'Commute' : null,
                  item.linked && !item.linkedToThisWorkout ? 'Already linked' : null,
                  item.linkedToThisWorkout ? 'Current link' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled || attachingId === item.id}
                    onClick={() => handleAttach(item.id)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-[6px] border border-border/60 px-3 py-2.5 text-left transition',
                      disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:border-[#FC4C02]/40 hover:bg-[#FC4C02]/5',
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.type}
                      {meta ? ` · ${meta}` : ''}
                      {attachingId === item.id ? ' · Linking…' : ''}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
