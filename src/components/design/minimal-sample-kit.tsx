import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Class names for the revertible minimal design sample (scoped under `.theme-minimal-sample`). */
export const minimal = {
  pageTitle: 'minimal-page-title',
  sectionTitle: 'minimal-section-title',
  body: 'minimal-body',
  caption: 'minimal-caption',
  label: 'minimal-label',
  card: 'minimal-card',
  cardPad: 'minimal-card minimal-card-pad',
  panel: 'minimal-panel',
  input: 'minimal-input',
  btn: 'minimal-btn',
  btnPrimary: 'minimal-btn minimal-btn-primary',
  btnSecondary: 'minimal-btn minimal-btn-secondary',
  btnGhost: 'minimal-btn minimal-btn-ghost',
  table: 'minimal-table',
  listRow: 'minimal-list-row',
  statusPlanned: 'minimal-status-planned',
  statusCompleted: 'minimal-status-completed',
  statusSkipped: 'minimal-status-skipped',
  chip: 'minimal-chip',
  chipCompleted: 'minimal-chip minimal-chip-completed',
  chipSkipped: 'minimal-chip minimal-chip-skipped',
} as const

export function MinimalSampleRoot({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('theme-minimal-sample space-y-10', className)}>
      {children}
    </div>
  )
}

export function MinimalSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className={minimal.sectionTitle}>{title}</h2>
        {description ? <p className={cn(minimal.caption, 'mt-1')}>{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function MinimalCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div className={cn(padded ? minimal.cardPad : minimal.card, className)}>
      {children}
    </div>
  )
}

export function CompareColumns({
  current,
  minimalSample,
}: {
  current: ReactNode
  minimalSample: ReactNode
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Current
        </p>
        {current}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Minimal sample
        </p>
        {minimalSample}
      </div>
    </div>
  )
}
