'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, Link2, RefreshCw } from 'lucide-react'
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
  /** Nested under a SettingsPanel titled “Calendar”. */
  compact?: boolean
}

function feedTitle(type: CalendarFeedType): string {
  return type === CalendarFeedType.TRAINING ? 'Training' : 'Races'
}

export function CalendarSyncCard({
  feeds,
  hasGoogleLinked,
  compact = false,
}: CalendarSyncCardProps) {
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
    <div className="tt-integration-block space-y-3">
      {!compact ? <h2 className="text-base font-semibold">Calendar</h2> : null}

      <div className="space-y-2">
        {rowOrder.map((type) => {
          const feed = feeds.find((f) => f.type === type)
          const tokenReady = Boolean(feed?.tokenHint || createdUrls[type])
          const copyReady = Boolean(createdUrls[type])
          return (
            <div key={type} className="tt-integration-feed">
              <div className="tt-integration-feed-head">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{feedTitle(type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {tokenReady ? 'ICS link ready' : 'No ICS link yet'}
                  </p>
                </div>
                <div className="tt-integration-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => rotate(type)}
                    disabled={pending}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', pending && 'animate-spin')} />
                    {tokenReady ? 'Refresh' : 'Create link'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!copyReady || pending}
                    onClick={() => copyUrl(type)}
                    className="gap-1.5"
                  >
                    {copied === type ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
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

              <label className="tt-integration-check mt-2">
                <input
                  type="checkbox"
                  checked={googleEnabled[type]}
                  disabled={pending || !hasGoogleLinked}
                  onChange={(e) => toggleGoogle(type, e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                <span>Google sync</span>
              </label>
              {!hasGoogleLinked ? (
                <p className="mt-1 text-xs text-muted-foreground">Link Google under Sign-in first.</p>
              ) : null}

              {errors[type] ? (
                <p className="mt-2 rounded-md bg-red-500/10 px-2 py-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors[type]}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
