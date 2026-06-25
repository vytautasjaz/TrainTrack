import Link from 'next/link'
import type { AthleteStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { athleteStatusBadgeClass, athleteStatusLabel } from '@/lib/athlete-status'
import { cn } from '@/lib/utils'

type CoachTrainingAthleteHeadingProps = {
  athleteId: string
  name: string
  status: AthleteStatus
}

export function CoachTrainingAthleteHeading({
  athleteId,
  name,
  status,
}: CoachTrainingAthleteHeadingProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3 landscape:max-lg:pb-2">
      <Link
        href={`/athletes/${athleteId}`}
        className="text-lg font-semibold tracking-tight hover:text-brand landscape:max-lg:text-base"
      >
        {name}
      </Link>
      {status !== 'ACTIVE' && (
        <Badge className={cn('text-xs', athleteStatusBadgeClass(status))}>
          {athleteStatusLabel(status)}
        </Badge>
      )}
    </div>
  )
}
