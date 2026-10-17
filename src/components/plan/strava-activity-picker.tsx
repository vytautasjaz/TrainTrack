/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Unlink } from 'lucide-react'
import {
  attachStravaActivityToWorkout,
  isStravaConnected,
  listStravaActivitiesForWorkout,
  unlinkStravaFromWorkout,
} from '@/app/actions/strava'
import { toStravaUserMessage } from '@/lib/strava/errors'
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
import { formatDateKeyCompact } from '@/lib/dates'
import { formatDistance, formatDuration, cn } from '@/lib/utils'
import Link from 'next/link'

/** Session-scoped cache so menu → picker doesn't wait on a second round-trip. */
let stravaConnectedCache: boolean | null = null
let stravaConnectedInflight: Promise<boolean> | null = null

function readStravaConnected(): Promise<boolean> {
  if (stravaConnectedCache != null) return Promise.resolve(stravaConnectedCache)
  if (!stravaConnectedInflight) {
    stravaConnectedInflight = isStravaConnected()
      .then((value) => {
        stravaConnectedCache = value
        return value
      })
      .catch(() => {
        stravaConnectedCache = false
        return false
      })
      .finally(() => {
        stravaConnectedInflight = null
      })
  }
  return stravaConnectedInflight
}

type StravaDetachButtonProps = {
  workoutId: string
  /** Self-logged imports are removed from the plan on detach. */
  selfLogged?: boolean
  onDetached?: (result?: { removed: boolean }) => void
  /** Hide the default button; control the confirm dialog from outside. */
  hideTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StravaDetachButton({
  workoutId,
  selfLogged = false,
  onDetached,
  hideTrigger = false,
  open: openControlled,
  onOpenChange,
}: StravaDetachButtonProps) {
  const router = useRouter()
  const [confirmOpenUncontrolled, setConfirmOpenUncontrolled] = useState(false)
  const [pending, startTransition] = useTransition()
  const confirmOpen = openControlled ?? confirmOpenUncontrolled
  const setConfirmOpen = onOpenChange ?? setConfirmOpenUncontrolled

  function handleConfirm() {
    startTransition(async () => {
      const result = await unlinkStravaFromWorkout(workoutId)
      setConfirmOpen(false)
      router.refresh()
      onDetached?.(result)
    })
  }

  return (
    <>
      {!hideTrigger ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setConfirmOpen(true)}
        >
          <Unlink className="h-3.5 w-3.5" />
          {selfLogged ? 'Remove from plan' : 'Detach Strava'}
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={selfLogged ? 'Remove this workout?' : 'Detach Strava activity?'}
        description={
          selfLogged
            ? 'This self-added workout came from Strava. Detaching removes it from your plan.'
            : 'This clears the linked Strava data and returns the workout to planned so you can log it manually or pick a different activity.'
        }
        confirmLabel={selfLogged ? 'Remove' : 'Detach'}
        cancelLabel="Cancel"
        tone={selfLogged ? 'danger' : 'default'}
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  )
}

type StravaLinkPickerProps = {
  workoutId: string
  onLinked?: () => void
  /** Hide the default button; control the picker dialog from outside. */
  hideTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StravaLinkPicker({
  workoutId,
  onLinked,
  hideTrigger = false,
  open: openControlled,
  onOpenChange,
}: StravaLinkPickerProps) {
  const router = useRouter()
  const [connected, setConnected] = useState<boolean | null>(() => stravaConnectedCache)
  const [openUncontrolled, setOpenUncontrolled] = useState(false)
  const [items, setItems] = useState<StravaActivityPickItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const open = openControlled ?? openUncontrolled
  const setOpen = onOpenChange ?? setOpenUncontrolled

  useEffect(() => {
    let cancelled = false
    void readStravaConnected().then((value) => {
      if (!cancelled) setConnected(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open || connected !== true) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void listStravaActivitiesForWorkout(workoutId)
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            toStravaUserMessage(err, 'Could not load Strava activities. Please try again.'),
          )
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, workoutId, connected])

  const planDateKey = items[0]?.planDateKey ?? null
  const grouped = useMemo(() => {
    const map = new Map<string, StravaActivityPickItem[]>()
    for (const item of items) {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    }
    return [...map.entries()]
  }, [items])

  function handleAttach(activityId: string) {
    setAttachingId(activityId)
    startTransition(async () => {
      try {
        await attachStravaActivityToWorkout(workoutId, activityId)
        setOpen(false)
        router.refresh()
        onLinked?.()
      } catch (err) {
        setLoadError(toStravaUserMessage(err, 'Could not link that Strava activity.'))
      } finally {
        setAttachingId(null)
      }
    })
  }

  // Inline trigger only when connected; controlled (hideTrigger) always mounts so
  // the workout ⋮ menu can open the dialog without waiting on the connection check.
  if (!hideTrigger && connected !== true) return null

  return (
    <>
      {!hideTrigger ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[#FC4C02] hover:text-[#FC4C02]"
          onClick={() => setOpen(true)}
        >
          <Link2 className="h-3.5 w-3.5" />
          Link Strava activity
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="z-[110] max-h-[min(85vh,36rem)] max-w-md gap-4 overflow-hidden p-0"
          overlayClassName="z-[110]"
        >
          <DialogHeader className="space-y-1 border-b border-border/50 px-5 py-4 pr-12">
            <DialogTitle>Link Strava activity</DialogTitle>
            <DialogDescription>
              {connected === false
                ? 'Connect Strava in Settings to link activities to planned workouts.'
                : 'Pick a matching activity from this day or nearby days. Linking a different day marks the workout as rescheduled and completed. Commutes are disabled.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
            {connected === null ? (
              <Caption>Checking Strava…</Caption>
            ) : connected === false ? (
              <div className="space-y-3">
                <Caption>Your account isn’t connected to Strava yet.</Caption>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/settings">Open Settings</Link>
                </Button>
              </div>
            ) : loading ? (
              <Caption>Loading activities…</Caption>
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : items.length === 0 ? (
              <Caption>
                No matching Strava activities found in the last few weeks for this sport.
              </Caption>
            ) : (
              grouped.map(([dateKey, dayItems]) => {
                const isPlanDay = planDateKey != null && dateKey === planDateKey
                return (
                  <div key={dateKey} className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      {formatDateKeyCompact(dateKey)}
                      {isPlanDay ? ' · Planned day' : ' · Other day · will reschedule'}
                    </p>
                    {dayItems.map((item) => {
                      const disabled =
                        item.commute || (item.linked && !item.linkedToThisWorkout) || pending
                      const meta = [
                        item.startTimeLocal,
                        item.distanceKm != null ? formatDistance(item.distanceKm) : null,
                        formatDuration(item.durationMin),
                        item.willReschedule ? 'Reschedule + complete' : null,
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
                    })}
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
