'use client'

import { useEffect, useState } from 'react'
import { getAthleteClaimLinkForCoach } from '@/app/actions/athlete-claim'
import { AthleteClaimLinkPanel } from '@/components/coach/athlete-claim-link-panel'

type AthleteClaimInviteSectionProps = {
  athleteId: string
  athleteName: string
  compact?: boolean
}

export function AthleteClaimInviteSection({
  athleteId,
  athleteName,
  compact = false,
}: AthleteClaimInviteSectionProps) {
  const [claimToken, setClaimToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void getAthleteClaimLinkForCoach(athleteId)
      .then((token) => {
        if (!cancelled) setClaimToken(token)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load invite link')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (loading) {
    return (
      <p className="text-[13px] text-[var(--tt-ink-faint)]">Loading invite link…</p>
    )
  }

  if (error) {
    return <p className="text-[13px] text-destructive">{error}</p>
  }

  if (!claimToken) {
    return (
      <p className="text-[13px] text-[var(--tt-ink-faint)]">
        This athlete already has an app account linked.
      </p>
    )
  }

  return (
    <AthleteClaimLinkPanel
      athleteId={athleteId}
      athleteName={athleteName}
      claimToken={claimToken}
      compact={compact}
    />
  )
}
