'use client'

import { useEffect, useState, useTransition } from 'react'
import { Check, Copy, Link2, RefreshCw } from 'lucide-react'
import { regenerateAthleteClaimLink } from '@/app/actions/athlete-claim'
import { Button } from '@/components/ui/button'
import { athleteClaimPath } from '@/lib/athlete-claim-shared'
import { cn } from '@/lib/utils'

type AthleteClaimLinkPanelProps = {
  athleteId: string
  athleteName: string
  claimToken: string
  compact?: boolean
  className?: string
}

export function AthleteClaimLinkPanel({
  athleteId,
  athleteName,
  claimToken,
  compact = false,
  className,
}: AthleteClaimLinkPanelProps) {
  const [token, setToken] = useState(claimToken)
  const [claimUrl, setClaimUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setToken(claimToken)
  }, [claimToken])

  useEffect(() => {
    setClaimUrl(`${window.location.origin}${athleteClaimPath(token)}`)
  }, [token])

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  function rotateLink() {
    setError(null)
    startTransition(async () => {
      try {
        const next = await regenerateAthleteClaimLink(athleteId)
        setToken(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not regenerate link')
      }
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        App invite for {athleteName}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p
          className={cn(
            'min-w-0 flex-1 truncate rounded-[6px] border border-border/50 bg-card px-2.5 py-2 font-mono text-xs text-foreground',
            compact && 'bg-white',
          )}
        >
          {claimUrl || athleteClaimPath(token)}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          disabled={!claimUrl}
          onClick={() => copy(claimUrl)}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          disabled={isPending}
          onClick={rotateLink}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} strokeWidth={2} />
          New link
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Send this to {athleteName}. After they register, they&apos;ll take over this profile with
        your existing plan and history.
      </p>
    </div>
  )
}
