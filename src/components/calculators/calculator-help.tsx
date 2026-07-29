import { cn } from '@/lib/utils'
import { FieldHint as TypographyFieldHint } from '@/components/ui/typography'

type HintProps = {
  children: React.ReactNode
  className?: string
}

/** @deprecated Import FieldHint from @/components/ui/typography */
export function FieldHint(props: HintProps) {
  return <TypographyFieldHint {...props} />
}

/** Intro or section-level explanation. */
export function SectionHelp({ children, className }: HintProps) {
  return (
    <p className={cn('text-caption leading-relaxed', className)}>{children}</p>
  )
}

/** Highlighted how-to panel at the top of a calculator. */
export function CalculatorHowTo({ children, className }: HintProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-caption leading-relaxed',
        className,
      )}
    >
      {children}
    </div>
  )
}
