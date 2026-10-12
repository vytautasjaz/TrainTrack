import { cn } from '@/lib/utils'
import { v2 } from '@/lib/design-tokens'

/** Light rounded board for the Mon–Sun week hero (sits on dark→light page fade). */
export function V2WeekBoard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn(v2.surfaces.weekBoard, className)}>{children}</div>
}
