import { prisma } from '@/lib/prisma'
import { pickAthletePreferences, type AthletePreferences } from '@/lib/athlete-preferences'

const ATHLETE_PACE_SELECT = {
  paceRecoveryMinPerKm: true,
  paceEasyMinPerKm: true,
  paceTempoMinPerKm: true,
  paceThresholdMinPerKm: true,
  paceVo2MaxMinPerKm: true,
  bikeSpeedRecoveryKph: true,
  bikeSpeedEasyKph: true,
  bikeSpeedTempoKph: true,
  bikeSpeedThresholdKph: true,
  bikeSpeedVo2MaxKph: true,
  bikeFtpWatts: true,
  swimCssSecPer100m: true,
  hrMax: true,
  hrResting: true,
  hrZone1Max: true,
  hrZone2Max: true,
  hrZone3Max: true,
  hrZone4Max: true,
} as const

export async function loadAthletePreferencesForBuilder(
  athleteId: string | null | undefined,
): Promise<AthletePreferences | null> {
  if (!athleteId) return null

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: ATHLETE_PACE_SELECT,
  })

  return athlete ? pickAthletePreferences(athlete) : null
}
