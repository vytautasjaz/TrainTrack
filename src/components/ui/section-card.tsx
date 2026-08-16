import { SectionTitle } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

type SectionCardProps = HTMLAttributes<HTMLElement>

export function SectionCard({ className, children, ...props }: SectionCardProps) {
  return (
    <section className={cn('card-elevated overflow-hidden', className)} {...props}>
      {children}
    </section>
  )
}

type SectionCardHeaderProps = {
  title: string
  action?: ReactNode
  className?: string
}

export function SectionCardHeader({ title, action, className }: SectionCardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 p-5', className)}>
      <SectionTitle variant="ui">{title}</SectionTitle>
      {action}
    </div>
  )
}

type SectionCardPanelProps = HTMLAttributes<HTMLDivElement> & {
  bordered?: boolean
}

export function SectionCardPanel({
  className,
  bordered = true,
  children,
  ...props
}: SectionCardPanelProps) {
  return (
    <div
      className={cn(
        'space-y-4 p-5',
        bordered && 'border-t border-border/40',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type SectionCardDividerProps = {
  title: string
  className?: string
}

export function SectionCardDivider({ title, className }: SectionCardDividerProps) {
  return (
    <div className={cn('border-b border-border/40 px-5 py-3', className)}>
      <SectionTitle variant="ui">{title}</SectionTitle>
    </div>
  )
}

type SectionCardBodyProps = HTMLAttributes<HTMLDivElement>

export function SectionCardBody({ className, children, ...props }: SectionCardBodyProps) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  )
}
