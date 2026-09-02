'use client'

import type { ProgressStats } from '@/lib/progress-stats'
import { cn } from '@/lib/utils'
import { StatsTrendsSection } from '@/components/progress/stats-trends-section'

type ProgressStatsViewProps = {
  stats: ProgressStats
  className?: string
}

/** @deprecated Prefer StatsTrendsSection on the unified Stats page. */
export function ProgressStatsView({ stats, className }: ProgressStatsViewProps) {
  return <StatsTrendsSection stats={stats} className={className} />
}
