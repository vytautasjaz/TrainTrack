'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  splitWorkoutCardEssenceLine,
  type WorkoutCardEssenceKind,
  type WorkoutCardEssenceRow,
} from '@/lib/workout-builder/card-summary'
import { PreserveNewlines } from '@/components/ui/preserve-newlines'
import { cn } from '@/lib/utils'

/** Default collapsed preview — section + first block teaser, then Show more. */
export const WORKOUT_CARD_ESSENCE_COLLAPSE_AT = 5

/**
 * Name + meta row for cards. Narrow containers stack; wider keep meta on the right.
 * Prevents overflow paint when shrink-0 meta would otherwise crush the name to 0 width.
 */
function EssenceNameDetailRow({
  name,
  detail,
  nameClassName,
  detailClassName,
  className,
  nameWeight = 'font-medium',
}: {
  name: string
  detail?: string | null
  nameClassName?: string
  detailClassName?: string
  className?: string
  nameWeight?: string
}) {
  const meta = detail?.trim() || null
  return (
    <div
      className={cn(
        // Stack by default (week cells get very narrow). Side-by-side only when
        // the essence container is wide enough for both columns.
        'flex min-w-0 flex-col gap-0 leading-snug',
        meta &&
          '@[11rem]/essence:flex-row @[11rem]/essence:items-baseline @[11rem]/essence:justify-between @[11rem]/essence:gap-x-2',
        className,
      )}
    >
      <span
        className={cn(
          'min-w-0 max-w-full break-words',
          nameWeight,
          meta && '@[11rem]/essence:min-w-0 @[11rem]/essence:flex-1 @[11rem]/essence:overflow-hidden',
          nameClassName,
        )}
      >
        {name}
      </span>
      {meta ? (
        <span
          className={cn(
            'min-w-0 max-w-full break-words font-normal tabular-nums',
            '@[11rem]/essence:max-w-[48%] @[11rem]/essence:shrink-0 @[11rem]/essence:text-right',
            detailClassName,
          )}
        >
          {meta}
        </span>
      ) : null}
    </div>
  )
}

export function WorkoutCardEssenceLine({
  line,
  kind = 'line',
  detail,
  className,
  coreClassName,
  detailClassName,
}: {
  line: string
  kind?: WorkoutCardEssenceKind
  detail?: string
  className?: string
  coreClassName?: string
  detailClassName?: string
}) {
  if (kind === 'rule') {
    return (
      <div
        className={cn(
          'my-2 border-t border-[var(--tt-v2-light-panel-line,#E3E6E9)]',
          className,
        )}
        aria-hidden
      />
    )
  }

  // Blank author lines become vertical spacing between prescription rows.
  if (!line.trim()) {
    return <p className={cn('h-1.5', className)} aria-hidden />
  }

  if (kind === 'more' || /^\+\d+\s+more$/i.test(line.trim())) {
    return (
      <p
        className={cn(
          'min-w-0 pt-0.5 text-[var(--tt-ink-faint,#9a9a9a)]',
          detailClassName,
          className,
        )}
      >
        {line.trim()}
      </p>
    )
  }

  if (kind === 'section') {
    return (
      <p
        className={cn(
          'min-w-0 pt-2 first:pt-0',
          className,
        )}
      >
        <span
          className={cn(
            'inline-block max-w-full whitespace-normal break-words rounded-[4px] bg-[color-mix(in_srgb,var(--tt-sport-color,var(--color-sport-strength))_24%,white)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em]',
            coreClassName,
          )}
        >
          {line}
        </span>
      </p>
    )
  }

  if (kind === 'block') {
    // Hairline under the header — border only, no extra vertical gap.
    return (
      <EssenceNameDetailRow
        name={line}
        detail={detail}
        nameWeight="font-bold uppercase"
        nameClassName={coreClassName}
        detailClassName={detailClassName}
        className={cn(
          'border-b border-[var(--tt-v2-light-panel-line,#E3E6E9)] pt-1.5 first:pt-0',
          className,
        )}
      />
    )
  }

  if (kind === 'blockMeta') {
    return (
      <p
        className={cn(
          'min-w-0 break-words pt-0.5 font-normal leading-snug',
          detailClassName,
          className,
        )}
      >
        {line}
      </p>
    )
  }

  if (kind === 'exercise') {
    return (
      <EssenceNameDetailRow
        name={line}
        detail={detail}
        nameClassName={coreClassName}
        detailClassName={detailClassName}
        className={className}
      />
    )
  }

  const { core, detail: splitDetail } = splitWorkoutCardEssenceLine(line)
  return (
    <p className={cn('min-w-0 break-words leading-snug', className)}>
      <span
        className={cn(
          splitDetail ? 'font-medium' : 'font-normal',
          coreClassName,
        )}
      >
        {core.includes('\n') ? <PreserveNewlines text={core} /> : core}
      </span>
      {splitDetail ? (
        <>
          {' '}
          <span className={cn('font-normal', detailClassName)}>
            {splitDetail.includes('\n') ? (
              <PreserveNewlines text={splitDetail} />
            ) : (
              splitDetail
            )}
          </span>
        </>
      ) : null}
    </p>
  )
}

/** Renders structured card essence — section / block hierarchy + name|detail rows. */
export function WorkoutCardEssenceList({
  rows,
  className,
  coreClassName,
  detailClassName,
  sectionClassName,
  blockClassName,
  /** Collapse long sessions; 0 = always show all. */
  collapseAt = WORKOUT_CARD_ESSENCE_COLLAPSE_AT,
}: {
  rows: WorkoutCardEssenceRow[]
  className?: string
  coreClassName?: string
  detailClassName?: string
  sectionClassName?: string
  blockClassName?: string
  collapseAt?: number
}) {
  const [expanded, setExpanded] = useState(false)
  if (rows.length === 0) return null

  const canCollapse = collapseAt > 0 && rows.length > collapseAt
  const visible =
    expanded || !canCollapse ? rows : rows.slice(0, collapseAt)

  return (
    <div
      className={cn(
        '@container/essence flex min-w-0 flex-col gap-0.5',
        className,
      )}
    >
      {visible.map((row, index) => (
        <WorkoutCardEssenceLine
          key={`${index}-${row.kind}-${row.text}-${row.detail ?? ''}`}
          kind={row.kind}
          line={row.text}
          detail={row.detail}
          coreClassName={
            row.kind === 'section'
              ? sectionClassName ?? coreClassName
              : row.kind === 'block'
                ? blockClassName ?? sectionClassName ?? coreClassName
                : coreClassName
          }
          detailClassName={detailClassName}
        />
      ))}
      {canCollapse ? (
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-0.5 self-start text-[12px] font-semibold text-[var(--tt-ink-soft,#6b7280)] transition hover:text-[var(--tt-ink,#111315)]"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setExpanded((open) => !open)
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  )
}
