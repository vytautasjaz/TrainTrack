import { cn } from '@/lib/utils'

/** Light-panel widget header — eyebrow title, soft subtitle, optional trailing nav. */
export function V2WidgetHeader({
  title,
  subtitle,
  trailing,
  className,
}: {
  title: string
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="tt-v2-eyebrow flex items-center gap-2 text-[var(--tt-v2-light-ink-faint)]">
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 bg-[var(--tt-v2-accent)]"
            aria-hidden
          />
          {title}
        </p>
        {subtitle ? (
          <div className="mt-1 text-[12px] leading-snug text-[var(--tt-v2-light-ink-soft)]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {trailing ? (
        <div className="ml-auto flex shrink-0 items-center gap-0.5 text-[var(--tt-v2-light-ink-faint)]">
          {trailing}
        </div>
      ) : null}
    </div>
  )
}
