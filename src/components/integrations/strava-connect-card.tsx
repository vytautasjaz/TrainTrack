/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw, Unplug, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { DateField } from '@/components/ui/date-field'
import { todayDateKey } from '@/lib/dates'
import {
  disconnectStrava,
  setStravaAutoSyncEnabled,
  syncStravaActivities,
  syncStravaActivitiesForDateRange,
  syncStravaHistoryForFitness,
} from '@/app/actions/strava'
import { toStravaUserMessage } from '@/lib/strava/errors'
import { cn } from '@/lib/utils'

type StravaConnectCardProps = {
  connected: boolean
  configured: boolean
  summary?: {
    stravaAthleteId: string
    scope: string
    expiresAt: Date
    lastSyncedAt: Date | null
    autoSyncEnabled: boolean
    linkedActivities: number
  } | null
  errorMessage?: string | null
  successMessage?: string | null
  /** Nested under a SettingsPanel titled “Strava”. */
  compact?: boolean
}

function formatLastSync(value: Date | null): string {
  if (!value) return 'Never'
  return value.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StravaConnectCard({
  connected,
  configured,
  summary,
  errorMessage,
  successMessage,
  compact = false,
}: StravaConnectCardProps) {
  const [isPending, startTransition] = useTransition()
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(summary?.autoSyncEnabled ?? true)
  const [showRange, setShowRange] = useState(false)
  const [fromKey, setFromKey] = useState(todayDateKey())
  const [toKey, setToKey] = useState(todayDateKey())

  useEffect(() => {
    if (summary) setAutoSyncEnabled(summary.autoSyncEnabled)
  }, [summary?.autoSyncEnabled, summary])

  function formatSyncOutcome(
    result: { matched: number; imported: number; scanned: number },
    rangeLabel?: string,
  ) {
    const parts = [
      result.matched > 0 ? `${result.matched} matched` : null,
      result.imported > 0 ? `${result.imported} imported` : null,
    ].filter(Boolean)
    const suffix = rangeLabel ? ` · ${rangeLabel}` : ''
    return parts.length > 0
      ? `${parts.join(', ')}${suffix}`
      : `Nothing new${suffix}`
  }

  function handleSyncRecent() {
    setActionError(null)
    setSyncResult(null)
    startTransition(async () => {
      try {
        setSyncResult(formatSyncOutcome(await syncStravaActivities()))
      } catch (err) {
        setActionError(toStravaUserMessage(err, 'Could not sync with Strava. Please try again.'))
      }
    })
  }

  function handleSyncHistory() {
    setActionError(null)
    setSyncResult(null)
    startTransition(async () => {
      try {
        setSyncResult(formatSyncOutcome(await syncStravaHistoryForFitness(), '3 months'))
      } catch (err) {
        setActionError(
          toStravaUserMessage(err, 'Could not import Strava history. Please try again.'),
        )
      }
    })
  }

  function handleSyncRange() {
    setActionError(null)
    setSyncResult(null)
    startTransition(async () => {
      try {
        const result = await syncStravaActivitiesForDateRange(fromKey, toKey)
        const rangeLabel = fromKey === toKey ? fromKey : `${fromKey} → ${toKey}`
        setSyncResult(formatSyncOutcome(result, rangeLabel))
      } catch (err) {
        setActionError(toStravaUserMessage(err, 'Could not sync with Strava. Please try again.'))
      }
    })
  }

  function handleAutoSyncToggle(next: boolean) {
    setActionError(null)
    setAutoSyncEnabled(next)
    startTransition(async () => {
      try {
        await setStravaAutoSyncEnabled(next)
        setSyncResult(next ? 'Auto-sync on.' : 'Auto-sync off.')
      } catch (err) {
        setAutoSyncEnabled(!next)
        setActionError(
          toStravaUserMessage(err, 'Could not update auto-sync. Please try again.'),
        )
      }
    })
  }

  function handleDisconnect() {
    setActionError(null)
    startTransition(async () => {
      try {
        await disconnectStrava()
      } catch (err) {
        setActionError(
          toStravaUserMessage(err, 'Could not disconnect Strava. Please try again.'),
        )
      }
    })
  }

  return (
    <div className="tt-integration-block space-y-3">
      {!compact ? (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">Strava</h2>
          <Badge
            variant={connected ? 'default' : 'outline'}
            className={
              connected ? 'bg-green-500/15 text-green-700 dark:text-green-400' : undefined
            }
          >
            {connected ? 'Connected' : 'Not connected'}
          </Badge>
        </div>
      ) : (
        <div className="tt-integration-status-row">
          <Badge
            variant={connected ? 'default' : 'outline'}
            className={
              connected ? 'bg-green-500/15 text-green-700 dark:text-green-400' : undefined
            }
          >
            {connected ? 'Connected' : 'Not connected'}
          </Badge>
          {connected && summary ? (
            <p className="text-xs text-muted-foreground">
              {summary.linkedActivities} linked · Last sync {formatLastSync(summary.lastSyncedAt)}
            </p>
          ) : null}
        </div>
      )}

      {!configured ? (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          Strava is not configured on this server.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          {successMessage}
        </p>
      ) : null}
      {actionError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      ) : null}
      {syncResult ? (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{syncResult}</p>
      ) : null}

      {!connected && configured ? (
        <Button asChild className="w-full sm:w-auto">
          <Link href="/api/strava/connect">Connect Strava</Link>
        </Button>
      ) : null}

      {connected ? (
        <>
          <label className="tt-integration-check">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#FC4C02]"
              checked={autoSyncEnabled}
              disabled={isPending}
              onChange={(e) => handleAutoSyncToggle(e.target.checked)}
            />
            <span>Auto-sync</span>
          </label>

          <div className="tt-integration-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={handleSyncHistory}
              className="gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
              {isPending ? 'Syncing…' : 'Import 3 months'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleSyncRecent}
            >
              Sync recent
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setShowRange((v) => !v)}
            >
              {showRange ? 'Hide dates' : 'Custom dates'}
            </Button>
          </div>

          {showRange ? (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <FormField label="From">
                  <DateField
                    value={fromKey}
                    max={todayDateKey()}
                    onChange={(next) => {
                      setFromKey(next)
                      if (toKey < next) setToKey(next)
                    }}
                    disabled={isPending}
                  />
                </FormField>
                <FormField label="To">
                  <DateField
                    value={toKey}
                    min={fromKey}
                    max={todayDateKey()}
                    onChange={setToKey}
                    disabled={isPending}
                  />
                </FormField>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending || !fromKey || !toKey}
                onClick={handleSyncRange}
              >
                Sync range
              </Button>
            </div>
          ) : null}

          <div className="tt-integration-actions tt-integration-actions--secondary">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/api/strava/connect?switch=1">
                <Users className="h-3.5 w-3.5" />
                Switch account
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleDisconnect}
              className="gap-1.5"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <a href="https://www.strava.com/athlete/training" target="_blank" rel="noreferrer">
                Open
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
