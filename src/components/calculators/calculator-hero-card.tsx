'use client'

import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CalculatorHeroCardProps = {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function CalculatorHeroCard({
  title,
  action,
  children,
  className,
}: CalculatorHeroCardProps) {
  return (
    <section className={cn('card-elevated overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  )
}

type CalculatorHeroFieldProps = {
  label: string
  /** Unit shown beside the label (e.g. "/km", "km") — keeps large values uncluttered. */
  unit?: string
  /** @deprecated Prefer `unit` on the label. Kept for callers that still pass suffix. */
  suffix?: string
  /** Optional control beside the label (e.g. preset dropdown chevron). */
  labelAddon?: ReactNode
  align?: 'left' | 'center'
  hint?: ReactNode
  children: ReactNode
  secondary?: ReactNode
  className?: string
}

export function CalculatorHeroField({
  label,
  unit,
  suffix,
  labelAddon,
  align = 'left',
  hint,
  children,
  secondary,
  className,
}: CalculatorHeroFieldProps) {
  const unitLabel = unit ?? suffix
  const centered = align === 'center'

  return (
    <div className={cn('min-w-0 space-y-2', centered && 'text-center', className)}>
      <p
        className={cn(
          'flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
          centered ? 'justify-center' : 'justify-start',
        )}
      >
        <span>{label}</span>
        {unitLabel ? (
          <span className="font-medium normal-case tracking-normal text-muted-foreground/80">
            {unitLabel}
          </span>
        ) : null}
        {labelAddon}
      </p>
      <div className="min-w-0">{children}</div>
      {secondary}
      {hint}
    </div>
  )
}

/** Hero columns: values on row 1, controls (sliders) aligned on row 2, slim vertical dividers. */
export function CalculatorHeroColumns({
  columns,
  className,
}: {
  columns: Array<{ content: ReactNode; control?: ReactNode }>
  className?: string
}) {
  const count = columns.length

  // Full class strings so Tailwind can detect them at build time.
  const layoutClass =
    count === 5
      ? 'sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]'
      : count === 4
        ? 'sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]'
        : count === 2
          ? 'sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]'
          : 'sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]'

  const contentColClass = [
    'sm:col-start-1',
    'sm:col-start-3',
    'sm:col-start-5',
    'sm:col-start-7',
    'sm:col-start-9',
  ] as const

  const dividerColClass = [
    'sm:col-start-2',
    'sm:col-start-4',
    'sm:col-start-6',
    'sm:col-start-8',
  ] as const

  function padClass(index: number) {
    if (count <= 1) return ''
    if (index === 0) return 'sm:pr-4'
    if (index === count - 1) return 'sm:pl-4'
    return 'sm:px-4'
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-y-3 sm:grid-rows-[auto_auto] sm:gap-y-4',
        layoutClass,
        className,
      )}
    >
      {columns.map((column, index) => (
        <Fragment key={index}>
          <div
            className={cn(
              'min-w-0 sm:row-start-1',
              contentColClass[index],
              padClass(index),
            )}
          >
            {column.content}
          </div>

          {column.control != null ? (
            <div
              className={cn(
                'min-w-0 sm:row-start-2',
                contentColClass[index],
                padClass(index),
              )}
            >
              {column.control}
            </div>
          ) : null}

          {index < count - 1 ? (
            <div
              className={cn(
                'hidden bg-border sm:row-span-2 sm:row-start-1 sm:block sm:w-px sm:justify-self-center',
                dividerColClass[index],
              )}
              aria-hidden
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}

export function CalculatorDirectionLink({
  value,
  onToggle,
}: {
  value: 'pace-to-time' | 'time-to-pace'
  onToggle: () => void
}) {
  const label = value === 'pace-to-time' ? 'Pace → Time' : 'Time → Pace'
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-xs font-semibold text-brand transition hover:text-brand/80"
    >
      {label}
      <span className="ml-1 text-muted-foreground">· switch</span>
    </button>
  )
}
