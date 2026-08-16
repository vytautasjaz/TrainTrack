import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type TypographyProps = HTMLAttributes<HTMLElement>

type SectionTitleProps = TypographyProps & {
  /** @deprecated Both variants use Level 2 Manrope `title-section`. */
  variant?: 'editorial' | 'ui'
}

/** Functional page H1 — Training, Results, Stats, Tools (Manrope). */
export function PageTitle({ className, ...props }: TypographyProps) {
  return <h1 className={cn('title-page', className)} {...props} />
}

/** Editorial page H1 — Season Plan, Home greeting (Barlow Condensed). */
export function DisplayTitle({ className, ...props }: TypographyProps) {
  return <h1 className={cn('title-display', className)} {...props} />
}

/** Level 2 section title — Manrope, not italic (Upcoming, This week, Settings). */
export function SectionTitle({
  className,
  variant: _variant,
  ...props
}: SectionTitleProps) {
  return <h2 className={cn('title-section', className)} {...props} />
}

/** @deprecated Use SectionTitle. */
export function SectionTitleLarge({ className, ...props }: TypographyProps) {
  return <h2 className={cn('title-section', className)} {...props} />
}

/** @deprecated Use SectionTitle — alias of Level 2. */
export function SubTitle({ className, ...props }: TypographyProps) {
  return <h3 className={cn('title-section', className)} {...props} />
}

/** Metadata / category label — NEXT RACE, MONTHLY VOLUME (Manrope). */
export function EyebrowTitle({ className, ...props }: TypographyProps) {
  return <p className={cn('title-eyebrow', className)} {...props} />
}

/** Content card title — Easy Ride, race names (Manrope, sentence case). */
export function CardTitle({ className, ...props }: TypographyProps) {
  return <h3 className={cn('title-card', className)} {...props} />
}

/** Day group label — WEDNESDAY 12 AUG (Manrope). */
export function DayLabel({ className, ...props }: TypographyProps) {
  return <p className={cn('title-day', className)} {...props} />
}

export function FieldLabel({ className, ...props }: TypographyProps) {
  return <p className={cn('title-eyebrow', className)} {...props} />
}

/** Non-uppercase label for standard form fields */
export function FormLabel({ className, ...props }: TypographyProps) {
  return <span className={cn('text-caption font-medium', className)} {...props} />
}

export function Caption({ className, ...props }: TypographyProps) {
  return <p className={cn('text-caption', className)} {...props} />
}

export function FieldHint({ className, ...props }: TypographyProps) {
  return <p className={cn('text-hint', className)} {...props} />
}

export function MetricValue({ className, ...props }: TypographyProps) {
  return <span className={cn('text-metric-xl', className)} {...props} />
}
