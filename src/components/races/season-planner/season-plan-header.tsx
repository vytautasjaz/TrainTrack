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
 * Season Plan page identity — white H1 on the charcoal `.app-gradient` fade.
 */
export function SeasonPlanHeader({
  description = 'Set goals, map races, and keep the year in focus.',
  className,
}: SeasonPlanHeaderProps) {
  return (
    <header
      data-page-header
      className={cn('tt-season-header pt-1 lg:pt-2', className)}
    >
      <div className="max-w-xl space-y-2">
        <PageHeaderTitle className="tt-stats-page-title whitespace-nowrap">
          Plan the season.
        </PageHeaderTitle>
        <PageHeaderDescription className="tt-stats-page-description max-w-md leading-relaxed">
          {description}
        </PageHeaderDescription>
      </div>
    </header>
  )
}
