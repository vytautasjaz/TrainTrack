'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Unlink } from 'lucide-react'
import {
  attachStravaActivityToRace,
  attachStravaActivityToRaceLeg,
  isStravaConnected,
  listStravaActivitiesForRace,
  unlinkStravaFromRace,
  unlinkStravaFromRaceLeg,
} from '@/app/actions/strava'
import type { StravaRaceActivityPickItem } from '@/lib/strava/sync'
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

type RaceStravaLinkPickerProps = {
  raceId: string
  /** When set, links to a triathlon leg instead of the race overall. */
  legId?: string
  linkedUrl?: string | null
  linkedName?: string | null
  onChanged?: () => void
  compact?: boolean
}

export function RaceStravaLinkPicker({
  raceId,
  legId,
  linkedUrl,
  linkedName,
  onChanged,
  compact = false,
}: RaceStravaLinkPickerProps) {
  const router = useRouter()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [detachOpen, setDetachOpen] = useState(false)
  const [items, setItems] = useState<StravaRaceActivityPickItem[]>([])
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

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void listStravaActivitiesForRace(raceId, legId)
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load Strava activities')
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, raceId, legId])

  function handleAttach(activityId: string) {
    setAttachingId(activityId)
    startTransition(async () => {
      try {
        if (legId) {
          await attachStravaActivityToRaceLeg(legId, activityId)
        } else {
          await attachStravaActivityToRace(raceId, activityId)
        }
        setOpen(false)
        router.refresh()
        onChanged?.()
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not link activity')
      } finally {
        setAttachingId(null)
      }
    })
  }

  function handleDetach() {
    startTransition(async () => {
      if (legId) {
        await unlinkStravaFromRaceLeg(legId)
      } else {
        await unlinkStravaFromRace(raceId)
      }
      setDetachOpen(false)
      router.refresh()
      onChanged?.()
    })
  }

  if (connected === false || connected === null) return null

  if (linkedUrl) {
    return (
      <>
        <div className={cn('flex flex-wrap items-center gap-2', compact && 'gap-1.5')}>
          <a
            href={linkedUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs font-medium text-[#FC4C02] hover:underline"
          >
            {linkedName || 'View on Strava'}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-muted-foreground"
            onClick={() => setDetachOpen(true)}
          >
            <Unlink className="h-3 w-3" />
            Detach
          </Button>
        </div>
        <ConfirmDialog
          open={detachOpen}
          onOpenChange={setDetachOpen}
          title="Detach Strava activity?"
          description="Removes the Strava link from this race segment. Split time is kept."
          confirmLabel="Detach"
          cancelLabel="Cancel"
          tone="default"
          pending={pending}
          onConfirm={handleDetach}
        />
      </>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('gap-1.5 text-[#FC4C02] hover:text-[#FC4C02]', compact && 'h-7 px-2')}
        onClick={() => setOpen(true)}
      >
        <Link2 className="h-3.5 w-3.5" />
        Link Strava
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="z-[70] max-h-[min(85vh,32rem)] max-w-md gap-4 overflow-hidden p-0"
          overlayClassName="z-[70]"
        >
          <DialogHeader className="space-y-1 border-b border-border/50 px-5 py-4 pr-12">
            <DialogTitle>Link Strava activity</DialogTitle>
            <DialogDescription>
              Choose a same-day activity. Commute activities are disabled.
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
                  item.commute || (item.linked && !item.linkedToThisTarget) || pending
                const meta = [
                  item.startTimeLocal,
                  item.distanceKm != null ? formatDistance(item.distanceKm) : null,
                  formatDuration(item.durationMin),
                  item.commute ? 'Commute' : null,
                  item.linked && !item.linkedToThisTarget ? 'Already linked' : null,
                  item.linkedToThisTarget ? 'Current link' : null,
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
