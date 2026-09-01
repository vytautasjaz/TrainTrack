import { cn } from '@/lib/utils'
import {
  PageHeaderDescription,
  PageHeaderTitle,
} from '@/components/ui/page-header'

type SeasonPlanHeaderProps = {
  description?: string
  className?: string
}

/**
 * Season Plan page identity — shared PageHeaderTitle (Bebas page H1).
 */
export function SeasonPlanHeader({
  description = 'Plan your season. Set your goals. Stay focused.',
  className,
}: SeasonPlanHeaderProps) {
  return (
    <header
      data-page-header
      className={cn('tt-season-header relative overflow-hidden pt-1 lg:pt-2', className)}
    >
      <div className="tt-season-header__abstract" aria-hidden="true" />
      <div className="relative z-[1] max-w-xl space-y-2">
        <PageHeaderTitle className="whitespace-nowrap">
          Plan the season.
        </PageHeaderTitle>
        <PageHeaderDescription className="max-w-md leading-relaxed">
          {description}
        </PageHeaderDescription>
      </div>
    </header>
  )
}
