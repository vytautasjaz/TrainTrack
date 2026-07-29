import { Caption, FieldHint, FormLabel, SectionTitle } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type FormFieldProps = {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}

export function FormField({ label, hint, children, className }: FormFieldProps) {
  return (
    <label className={cn('block space-y-1 text-body', className)}>
      <FormLabel>{label}</FormLabel>
      {children}
      {hint ? <FieldHint className="mt-0">{hint}</FieldHint> : null}
    </label>
  )
}

type FormSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <SectionTitle className="text-body font-medium">{title}</SectionTitle>
      {description ? <Caption>{description}</Caption> : null}
      {children}
    </div>
  )
}

type FormMessageProps = {
  variant: 'error' | 'success'
  children: ReactNode
}

export function FormMessage({ variant, children }: FormMessageProps) {
  return (
    <p className={cn('text-body', variant === 'error' ? 'text-destructive' : 'text-success')}>
      {children}
    </p>
  )
}
