import { splitWorkoutCardEssenceLine } from '@/lib/workout-builder/card-summary'
import { PreserveNewlines } from '@/components/ui/preserve-newlines'
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
  // Blank author lines become vertical spacing between prescription rows.
  if (!line.trim()) {
    return <p className={cn('h-1.5', className)} aria-hidden />
  }

  const { core, detail } = splitWorkoutCardEssenceLine(line)
  return (
    <p className={cn('min-w-0 break-words leading-snug', className)}>
      <span
        className={cn(
          // Quantity @ intensity keeps the core medium; plain gym / free-text lines stay regular.
          detail ? 'font-medium' : 'font-normal',
          coreClassName,
        )}
      >
        {core.includes('\n') ? <PreserveNewlines text={core} /> : core}
      </span>
      {detail ? (
        <>
          {' '}
          <span className={detailClassName}>
            {detail.includes('\n') ? <PreserveNewlines text={detail} /> : detail}
          </span>
        </>
      ) : null}
    </p>
  )
}
