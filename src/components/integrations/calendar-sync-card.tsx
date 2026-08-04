'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Check, Copy, Link2, RefreshCw } from 'lucide-react'
import { CalendarFeedType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  disableGoogleCalendarSync,
  enableGoogleCalendarSync,
  rotateCalendarFeedToken,
} from '@/app/actions/preferences'
import { cn } from '@/lib/utils'

type FeedRow = {
  type: CalendarFeedType
  tokenHint: string | null
  googleSyncEnabled: boolean
}

type CalendarSyncCardProps = {
  feeds: FeedRow[]
  hasGoogleLinked: boolean
}

function feedTitle(type: CalendarFeedType): string {
  return type === CalendarFeedType.TRAINING ? 'Training' : 'Races'
}

export function CalendarSyncCard({ feeds, hasGoogleLinked }: CalendarSyncCardProps) {
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<CalendarFeedType, string | null>>({
    TRAINING: null,
    RACES: null,
  })
  const [createdUrls, setCreatedUrls] = useState<Record<CalendarFeedType, string | null>>({
    TRAINING: null,
    RACES: null,
  })
  const [copied, setCopied] = useState<CalendarFeedType | null>(null)
  const [googleEnabled, setGoogleEnabled] = useState<Record<CalendarFeedType, boolean>>({
    TRAINING: feeds.find((f) => f.type === CalendarFeedType.TRAINING)?.googleSyncEnabled ?? false,
    RACES: feeds.find((f) => f.type === CalendarFeedType.RACES)?.googleSyncEnabled ?? false,
  })

  function rotate(type: CalendarFeedType) {
    setErrors((prev) => ({ ...prev, [type]: null }))
    startTransition(async () => {
      try {
        const next = await rotateCalendarFeedToken(type)
        setCreatedUrls((prev) => ({ ...prev, [type]: next.feedUrl }))
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [type]: err instanceof Error ? err.message : 'Could not generate feed token',
        }))
      }
    })
  }

  function toggleGoogle(type: CalendarFeedType, next: boolean) {
    setErrors((prev) => ({ ...prev, [type]: null }))
    setGoogleEnabled((prev) => ({ ...prev, [type]: next }))
    startTransition(async () => {
      try {
        if (next) await enableGoogleCalendarSync(type)
        else await disableGoogleCalendarSync(type)
      } catch (err) {
        setGoogleEnabled((prev) => ({ ...prev, [type]: !next }))
        setErrors((prev) => ({
          ...prev,
          [type]: err instanceof Error ? err.message : 'Could not update Google sync',
        }))
      }
    })
  }

  async function copyUrl(type: CalendarFeedType) {
    const url = createdUrls[type]
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(type)
    setTimeout(() => setCopied((curr) => (curr === type ? null : curr)), 1200)
  }

  const rowOrder: CalendarFeedType[] = [CalendarFeedType.TRAINING, CalendarFeedType.RACES]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/15">
          <CalendarDays className="h-6 w-6 text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Calendar sync</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe to all-day feeds from today forward. TrainTrack is the source of truth.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rowOrder.map((type) => {
          const feed = feeds.find((f) => f.type === type)
          const tokenReady = Boolean(feed?.tokenHint || createdUrls[type])
          const copyReady = Boolean(createdUrls[type])
          return (
            <div key={type} className="rounded-xl border border-border/60 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{feedTitle(type)}</p>
                  <p className="text-xs text-muted-foreground">
                    ICS: {tokenReady ? `enabled (token ••••${feed?.tokenHint ?? 'new'})` : 'not set'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => rotate(type)}
                    disabled={pending}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', pending && 'animate-spin')} />
                    {tokenReady ? 'Regenerate link' : 'Generate link'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!copyReady || pending}
                    onClick={() => copyUrl(type)}
                    className="gap-1.5"
                  >
                    {copied === type ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </Button>
                </div>
              </div>

              {createdUrls[type] ? (
                <p className="mt-2 break-all rounded-md bg-muted/60 px-2 py-1.5 text-xs">
                  <Link2 className="mr-1 inline h-3 w-3" />
                  {createdUrls[type]}
                </p>
              ) : null}

              <div className="mt-3 rounded-lg border border-border/60 px-2.5 py-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={googleEnabled[type]}
                    disabled={pending || !hasGoogleLinked}
                    onChange={(e) => toggleGoogle(type, e.target.checked)}
                    className="mt-1 h-4 w-4 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">Google write sync</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Keep a dedicated Google calendar updated from TrainTrack ({feedTitle(type)}).
                    </span>
                  </span>
                </label>
                {!hasGoogleLinked ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Link Google first in Account settings to enable this.
                  </p>
                ) : null}
              </div>

              {errors[type] ? (
                <p className="mt-2 rounded-md bg-red-500/10 px-2 py-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors[type]}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Feeds are read-only and include future items only. Apple/Google may refresh subscriptions
        every few minutes to hours.
      </p>
    </div>
  )
}
