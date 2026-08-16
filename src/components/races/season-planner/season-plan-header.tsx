import { cn } from '@/lib/utils'

type SeasonPlanHeaderProps = {
  description?: string
  className?: string
}

/**
 * Season Plan page identity — Level 1 editorial display title.
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
        <h1 className="title-display whitespace-nowrap">PLAN THE SEASON.</h1>
        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </header>
  )
}
