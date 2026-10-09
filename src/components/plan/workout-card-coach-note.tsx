import { cn } from '@/lib/utils'

export function WorkoutCardCoachNote({
  note,
  compact = false,
  className,
}: {
  note: string | null | undefined
  compact?: boolean
  className?: string
}) {
  const text = note?.trim()
  if (!text) return null

  return (
    <p
      className={cn(
        'min-w-0 text-[var(--tt-ink-soft,#6b6b6b)]',
        compact
          ? 'mt-1 line-clamp-2 text-[11px] leading-snug'
          : 'mt-1.5 line-clamp-3 text-[12px] leading-snug',
        className,
      )}
    >
      <span className="font-semibold text-[var(--tt-ink,#111)]">Coach</span>
      {' · '}
      <span className="whitespace-pre-wrap">{text}</span>
    </p>
  )
}
