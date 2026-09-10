import { splitWorkoutCardEssenceLine } from '@/lib/workout-builder/card-summary'
import { cn } from '@/lib/utils'

export function WorkoutCardEssenceLine({
  line,
  className,
  coreClassName,
  detailClassName,
}: {
  line: string
  className?: string
  coreClassName?: string
  detailClassName?: string
}) {
  const { core, detail } = splitWorkoutCardEssenceLine(line)
  return (
    <p className={cn('min-w-0 break-words leading-snug', className)}>
      <span className={cn('font-medium', coreClassName)}>{core}</span>
      {detail ? (
        <>
          {' '}
          <span className={detailClassName}>{detail}</span>
        </>
      ) : null}
    </p>
  )
}
