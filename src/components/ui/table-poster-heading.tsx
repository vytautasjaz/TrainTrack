import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TablePosterHeadingProps = HTMLAttributes<HTMLDivElement> & {
  /** Section title — string, or lines joined into one Level 2 section title. */
  lines: string[]
  /** Optional orange accent on one word/line (prefer a single accent word). */
  accentLineIndex?: number
  meta?: ReactNode
  description?: ReactNode
}

/**
 * Editorial heading above a data table — Level 2 `title-section`.
 * Manrope for supporting copy. Do not use poster type inside table cells.
 */
export function TablePosterHeading({
  className,
  lines,
  accentLineIndex,
  meta,
  description,
  ...props
}: TablePosterHeadingProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="title-section">
          {lines.map((line, i) => (
            <span key={`${line}-${i}`}>
              {i > 0 ? ' ' : null}
              <span className={i === accentLineIndex ? 'title-section-accent' : undefined}>
                {line}
              </span>
            </span>
          ))}
        </h2>
        {meta ? <p className="poster-kicker">{meta}</p> : null}
      </div>
      {description ? <p className="poster-support max-w-2xl">{description}</p> : null}
    </div>
  )
}
