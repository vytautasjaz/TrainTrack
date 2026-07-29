import type { AthleteLogType } from '@prisma/client'

/** Runtime-safe log type values (use in server actions; Prisma enum object may not bundle). */
export const AthleteLogTypeValues = {
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  ADJUSTED: 'ADJUSTED',
  RESCHEDULED: 'RESCHEDULED',
} as const satisfies Record<AthleteLogType, AthleteLogType>

export function parseAthleteLogType(raw: FormDataEntryValue | null): AthleteLogType {
  const value = String(raw ?? '')
  if (
    value === AthleteLogTypeValues.SKIPPED ||
    value === AthleteLogTypeValues.ADJUSTED ||
    value === AthleteLogTypeValues.COMPLETED ||
    value === AthleteLogTypeValues.RESCHEDULED
  ) {
    return value
  }
  return AthleteLogTypeValues.COMPLETED
}

export function isAthleteLogSkipped(logType: AthleteLogType): boolean {
  return logType === AthleteLogTypeValues.SKIPPED
}

export function isAthleteLogRescheduled(logType: AthleteLogType): boolean {
  return logType === AthleteLogTypeValues.RESCHEDULED
}
