/** Inline calendar mark — part of the row, not a nested card. */
export function MockCalendarDate({
  weekday,
  dateNum,
  month = 'Aug',
  compact = false,
}: {
  weekday: string
  dateNum: string
  month?: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center text-center leading-none ${
        compact ? 'w-8' : 'w-9'
      }`}
      aria-label={`${weekday} ${dateNum} ${month}`}
    >
      <span
        className={`font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink)] ${
          compact ? 'text-[8px]' : 'text-[9px]'
        }`}
      >
        {weekday}
      </span>
      <span
        className={`mt-0.5 font-semibold tabular-nums text-[var(--tt-ink)] ${
          compact ? 'text-[0.95rem] leading-none' : 'text-[1.1rem] leading-none'
        }`}
      >
        {dateNum}
      </span>
      <span
        className={`mt-0.5 font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint)] ${
          compact ? 'text-[8px]' : 'text-[9px]'
        }`}
      >
        {month}
      </span>
    </div>
  )
}
