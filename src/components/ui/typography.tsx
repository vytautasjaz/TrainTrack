import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type TypographyProps = HTMLAttributes<HTMLElement>

export function PageTitle({ className, ...props }: TypographyProps) {
  return <h1 className={cn('text-page-title', className)} {...props} />
}

export function SectionTitle({ className, ...props }: TypographyProps) {
  return <h2 className={cn('text-section-title', className)} {...props} />
}

export function CardTitle({ className, ...props }: TypographyProps) {
  return <h3 className={cn('text-card-title', className)} {...props} />
}

export function FieldLabel({ className, ...props }: TypographyProps) {
  return <p className={cn('text-label', className)} {...props} />
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
