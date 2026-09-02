'use client'

import { usePathname } from 'next/navigation'
import { CoachAthleteBar, type CoachAthleteBarItem } from '@/components/coach/coach-athlete-bar'

const COACH_ATHLETE_BAR_PREFIXES = ['/training', '/season', '/progress'] as const

function shouldShowCoachAthleteBar(pathname: string) {
  return COACH_ATHLETE_BAR_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

type CoachAthleteBarGateProps = {
  athletes: CoachAthleteBarItem[]
  selectedAthleteId: string
}

export function CoachAthleteBarGate({ athletes, selectedAthleteId }: CoachAthleteBarGateProps) {
  const pathname = usePathname()
  if (!shouldShowCoachAthleteBar(pathname)) return null
  return <CoachAthleteBar athletes={athletes} selectedAthleteId={selectedAthleteId} />
}
