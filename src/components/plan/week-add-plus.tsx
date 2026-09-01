import { cn } from '@/lib/utils'

/**
 * Week-grid add affordance — matches mock training week:
 * typographic `+`, faint ink, reveal on hover (cells) or soft always-on (footer).
 */
export function WeekAddPlusMark({
  className,
  size = 'cell',
}: {
  className?: string
  /** `cell` = hidden until hover; `footer` = soft visible like mock volume row */
  size?: 'cell' | 'footer'
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'select-none font-normal leading-none text-[var(--tt-ink-faint,#9a9a9a)]',
        size === 'footer' ? 'text-[15px]' : 'text-[16px]',
        className,
      )}
    >
      +
    </span>
  )
}

export const weekAddPlusButtonClass = {
  /** Empty sport / notes / events cell */
  cell: cn(
    'group flex h-full min-h-[3.25rem] w-full cursor-pointer items-center justify-center',
    'bg-transparent transition',
    'text-[var(--tt-ink-faint,#9a9a9a)]',
    'opacity-0 hover:opacity-100 focus-visible:opacity-100',
    '[@media(hover:none)]:opacity-40',
  ),
  /** Bottom “add anything” row */
  footer: cn(
    'group flex h-7 w-full cursor-pointer items-center justify-center',
    'bg-transparent transition',
    'opacity-40 hover:opacity-100 focus-visible:opacity-100',
  ),
} as const

/** Compact day-header + control (month / list day chrome). */
export const weekAddPlusIconButtonClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full',
  'text-[var(--tt-ink-faint,#9a9a9a)] transition',
  'hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink-soft,#6b6b6b)]',
  'focus-visible:bg-[var(--tt-sidebar,#f5f5f5)] focus-visible:outline-none',
)
