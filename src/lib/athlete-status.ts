import { AthleteStatus } from '@prisma/client'

export const ATHLETE_STATUS_OPTIONS: { value: AthleteStatus; label: string }[] = [
  { value: AthleteStatus.ACTIVE, label: 'Active' },
  { value: AthleteStatus.INACTIVE, label: 'Inactive' },
  { value: AthleteStatus.ARCHIVED, label: 'Archived' },
]

export function athleteStatusLabel(status: AthleteStatus): string {
  return ATHLETE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function athleteStatusBadgeClass(status: AthleteStatus): string {
  switch (status) {
    case AthleteStatus.ACTIVE:
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    case AthleteStatus.INACTIVE:
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
    case AthleteStatus.ARCHIVED:
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function athleteStatusCardClass(status: AthleteStatus): string {
  switch (status) {
    case AthleteStatus.INACTIVE:
      return 'opacity-80'
    case AthleteStatus.ARCHIVED:
      return 'opacity-60'
    default:
      return ''
  }
}
