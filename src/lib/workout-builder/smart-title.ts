import { SessionType, type WorkoutType } from '@prisma/client'
import type { WorkoutStructure } from './types'
import { inferSmartBlockLabel } from './smart-blocks'
import { flattenStructure } from './structure-list'
import {
  estimateStructureDistanceKm,
  formatPlanBlockSummary,
} from './segment-estimation'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import { formatEstimatedDistanceLabel } from './workout-summary'
import { getSessionTypeLabel } from './session-modes'

function targetMatchesKeywords(block: { targets?: { value?: string }[] }, keywords: string[]): boolean {
  const values = (block.targets ?? [])
    .map((t) => t.value?.toLowerCase() ?? '')
    .join(' ')
  return keywords.some((k) => values.includes(k))
}

export function inferDominantSessionType(structure: WorkoutStructure): SessionType {
  const items = flattenStructure(structure)
  if (items.length === 0) return SessionType.CUSTOM

  const mainBlocks = items.filter((i) => i.section === 'mainSet').map((i) => i.block)
  if (mainBlocks.length === 0) return SessionType.CUSTOM

  const hasThreshold = mainBlocks.some(
    (b) =>
      b.type === 'INTERVAL' &&
      targetMatchesKeywords(b, ['threshold', 'z4']),
  )
  if (hasThreshold) return SessionType.THRESHOLD

  const hasVo2 = mainBlocks.some(
    (b) =>
      b.type === 'INTERVAL' &&
      (targetMatchesKeywords(b, ['vo2', '5k', 'z5']) ||
        (b.work?.value === 400 && b.work?.unit === 'm')),
  )
  if (hasVo2) return SessionType.VO2_MAX

  const hasHills = mainBlocks.some(
    (b) => b.type === 'REPETITION' && b.work?.description?.toLowerCase().includes('hill'),
  )
  if (hasHills) return SessionType.HILL_REPEATS

  const hasTempo = mainBlocks.some(
    (b) => b.type === 'CONTINUOUS' && targetMatchesKeywords(b, ['tempo']),
  )
  if (hasTempo) return SessionType.TEMPO

  const hasRacePace = mainBlocks.some(
    (b) => b.type === 'CONTINUOUS' && targetMatchesKeywords(b, ['race']),
  )
  if (hasRacePace) return SessionType.RACE_PACE

  const longContinuous = mainBlocks.find(
    (b) =>
      b.type === 'CONTINUOUS' &&
      b.durationType === 'distance' &&
      (b.distance ?? 0) >= 15,
  )
  if (longContinuous) return SessionType.LONG_RUN

  const easyContinuous = mainBlocks.some(
    (b) =>
      b.type === 'CONTINUOUS' &&
      targetMatchesKeywords(b, ['easy', 'recovery']),
  )
  if (easyContinuous && mainBlocks.length === 1) return SessionType.EASY_RUN

  const recoveryOnly = mainBlocks.every((b) => b.type === 'RECOVERY' || b.type === 'REST')
  if (recoveryOnly) return SessionType.RECOVERY_RUN

  if (mainBlocks.some((b) => b.type === 'INTERVAL')) return SessionType.INTERVALS

  return SessionType.CUSTOM
}

export function deriveSmartWorkoutTitle(
  structure: WorkoutStructure,
  athletePreferences?: AthletePreferences | null,
  sportType?: WorkoutType,
): string {
  const items = flattenStructure(structure)
  if (items.length === 0) return ''

  const sessionType = inferDominantSessionType(structure)
  const distanceKm = estimateStructureDistanceKm(structure, athletePreferences, sportType)
  const distanceLabel = formatEstimatedDistanceLabel(distanceKm)

  const mainItems = items.filter((i) => i.section === 'mainSet')
  const primaryMain = mainItems[0]
  if (!primaryMain) return ''

  const primaryLabel = inferSmartBlockLabel(
    primaryMain.block,
    primaryMain.section,
    sportType,
  ).label
  const primaryDetail = formatPlanBlockSummary(primaryMain.block)

  const lines: string[] = []

  if (sessionType === SessionType.LONG_RUN) {
    const hasMarathon = mainItems.some(({ block }) =>
      targetMatchesKeywords(block, ['marathon']),
    )
    if (hasMarathon && mainItems.length > 1) {
      lines.push(sportType === 'BIKE' ? 'Progressive Long Ride' : 'Progressive Long Run')
      if (distanceKm > 0) lines.push(distanceLabel)
      const mpBlock = mainItems.find(({ block }) =>
        targetMatchesKeywords(block, ['marathon']),
      )
      if (mpBlock) {
        const mpDetail = formatPlanBlockSummary(mpBlock.block)
        if (mpDetail) lines.push(`Last ${mpDetail}`)
      }
      return lines.join('\n')
    }
    lines.push(getSessionTypeLabel(SessionType.LONG_RUN, sportType ?? 'RUN'))
    if (distanceKm > 0) lines.push(distanceLabel)
    return lines.join('\n')
  }

  lines.push(primaryLabel)
  if (primaryDetail && primaryMain.block.type === 'INTERVAL') {
    lines.push(primaryDetail.split(' · ')[0])
  } else if (primaryDetail && primaryMain.block.type === 'REPETITION') {
    lines.push(primaryDetail)
  }
  if (distanceKm > 0) lines.push(distanceLabel)

  return lines.filter(Boolean).join('\n')
}

export function shouldSyncSmartTitle(
  title: string,
  structure: WorkoutStructure,
  athletePreferences?: AthletePreferences | null,
  customized?: boolean,
  sportType?: WorkoutType,
): boolean {
  if (customized) return false
  const trimmed = title.trim()
  if (!trimmed) return true
  const derived = deriveSmartWorkoutTitle(structure, athletePreferences, sportType)
  if (!derived) return false
  return trimmed === derived || trimmed.replace(/\n/g, ' · ') === derived.replace(/\n/g, ' · ')
}
