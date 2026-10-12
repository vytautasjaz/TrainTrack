import { cn } from '@/lib/utils'
import { v2 } from '@/lib/design-tokens'

export type V2TagTone = 'run' | 'bike' | 'swim' | 'strength' | 'recovery'

export function V2Tag({
  children,
  tone = 'run',
  className,
}: {
  children: React.ReactNode
  tone?: V2TagTone
  className?: string
}) {
  return (
    <span className={cn(v2.surfaces.tag, className)} data-tone={tone}>
      {children}
    </span>
  )
}
