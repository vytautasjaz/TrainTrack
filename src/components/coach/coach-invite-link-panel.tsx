'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { coachInvitePath } from '@/lib/coach-invite-shared'
import { cn } from '@/lib/utils'

type CoachInviteLinkPanelProps = {
  coachingCode: string
  /** Compact toolbar panel vs settings card body. */
  compact?: boolean
  className?: string
}

export function CoachInviteLinkPanel({
  coachingCode,
  compact = false,
  className,
}: CoachInviteLinkPanelProps) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)

  useEffect(() => {
    setInviteUrl(`${window.location.origin}${coachInvitePath(coachingCode)}`)
  }, [coachingCode])

  async function copy(value: string, kind: 'link' | 'code') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Invite link
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p
          className={cn(
            'min-w-0 flex-1 truncate rounded-[6px] border border-border/50 bg-card px-2.5 py-2 font-mono text-xs text-foreground',
            compact && 'bg-white',
          )}
        >
          {inviteUrl || coachInvitePath(coachingCode)}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          disabled={!inviteUrl}
          onClick={() => copy(inviteUrl, 'link')}
        >
          {copied === 'link' ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          )}
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[6px] border border-border/60 px-2.5 py-1.5',
            'text-sm font-semibold tracking-wide text-foreground',
            compact && 'bg-white',
          )}
        >
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          {coachingCode}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={() => copy(coachingCode, 'code')}
        >
          {copied === 'code' ? 'Copied code' : 'Copy code'}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        After they register, they’ll be asked to accept you as their coach.
      </p>
    </div>
  )
}
