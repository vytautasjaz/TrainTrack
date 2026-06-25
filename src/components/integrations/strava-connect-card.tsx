'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Activity, ExternalLink, RefreshCw, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { disconnectStrava, syncStravaActivities } from '@/app/actions/strava'

type StravaConnectCardProps = {
  connected: boolean
  configured: boolean
  summary?: {
    stravaAthleteId: string
    scope: string
    expiresAt: Date
    lastSyncedAt: Date | null
    linkedActivities: number
  } | null
  errorMessage?: string | null
  successMessage?: string | null
}

export function StravaConnectCard({
  connected,
  configured,
  summary,
  errorMessage,
  successMessage,
}: StravaConnectCardProps) {
  const [isPending, startTransition] = useTransition()
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleSync() {
    setActionError(null)
    setSyncResult(null)
    startTransition(async () => {
      try {
        const result = await syncStravaActivities()
        setSyncResult(
          `Synced ${result.matched} workout${result.matched === 1 ? '' : 's'} from ${result.scanned} Strava activities.`,
        )
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Sync failed')
      }
    })
  }

  function handleDisconnect() {
    setActionError(null)
    startTransition(async () => {
      try {
        await disconnectStrava()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Disconnect failed')
      }
    })
  }

  return (
    <div className="card-elevated space-y-4 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FC4C02]/15">
          <Activity className="h-6 w-6 text-[#FC4C02]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Strava</h2>
            {connected ? (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">Connected</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Import completed activities and match them to planned workouts by date and sport.
          </p>
        </div>
      </div>

      {!configured && (
        <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Add <code className="text-xs">STRAVA_CLIENT_ID</code> and{' '}
          <code className="text-xs">STRAVA_CLIENT_SECRET</code> to your environment to enable Strava.
        </p>
      )}

      {errorMessage && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-2xl bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {successMessage}
        </p>
      )}

      {actionError && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {syncResult && (
        <p className="rounded-2xl bg-brand/10 px-4 py-3 text-sm text-brand">{syncResult}</p>
      )}

      {connected && summary && (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Strava athlete ID</dt>
            <dd className="font-medium">{summary.stravaAthleteId}</dd>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Linked activities</dt>
            <dd className="font-medium">{summary.linkedActivities}</dd>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Last sync</dt>
            <dd className="font-medium">
              {summary.lastSyncedAt
                ? summary.lastSyncedAt.toLocaleString()
                : 'Never'}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Scopes</dt>
            <dd className="font-medium">{summary.scope}</dd>
          </div>
        </dl>
      )}

      <div className="flex flex-wrap gap-2">
        {!connected && configured && (
          <Button asChild variant="secondary">
            <Link href="/api/strava/connect">Connect with Strava</Link>
          </Button>
        )}

        {connected && (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={handleSync}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              {isPending ? 'Syncing…' : 'Sync activities'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={handleDisconnect}
              className="gap-2"
            >
              <Unplug className="h-4 w-4" />
              Disconnect
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <a href="https://www.strava.com/athlete/training" target="_blank" rel="noreferrer">
                Open Strava
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Requires scopes <code>read</code>, <code>activity:read_all</code>, and{' '}
        <code>profile:read_all</code>. Activities are matched to planned workouts on the same day
        with a compatible sport type.
      </p>
    </div>
  )
}
