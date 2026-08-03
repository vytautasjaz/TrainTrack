'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { RaceDetailSheet } from '@/components/races/race-detail-sheet'
import { getSeasonRaceDetail } from '@/app/actions/races'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { SeasonRace } from '@/lib/season-races'

type RaceDetailModalProps = {
  workout: PlanWorkoutDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function reviveSeasonRace(raw: SeasonRace): SeasonRace {
  return {
    ...raw,
    date: raw.date instanceof Date ? raw.date : new Date(raw.date),
  }
}

/**
 * Opens the shared RaceDetailSheet from a plan/training race card.
 * Loads full SeasonRace by raceId so Training matches the Races modal.
 */
export function RaceDetailModal({ workout, open, onOpenChange }: RaceDetailModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const raceId = workout.isRace ? workout.raceId : null
  const [race, setRace] = useState<SeasonRace | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open || !raceId) {
      setRace(null)
      setFailed(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setFailed(false)

    void getSeasonRaceDetail(raceId).then((result) => {
      if (cancelled) return
      if (!result) {
        setRace(null)
        setFailed(true)
      } else {
        setRace(reviveSeasonRace(result))
        setFailed(false)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, raceId])

  if (!raceId) return null

  if (open && loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="sr-only">Loading race</DialogTitle>
          <DialogDescription className="sr-only">Loading race details</DialogDescription>
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        </DialogContent>
      </Dialog>
    )
  }

  if (open && failed) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Race unavailable</DialogTitle>
          <DialogDescription>
            This race could not be loaded. It may have been removed.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <RaceDetailSheet
      race={race}
      open={open && Boolean(race)}
      onOpenChange={onOpenChange}
      returnTo={pathname || '/training'}
      onChanged={() => router.refresh()}
    />
  )
}
