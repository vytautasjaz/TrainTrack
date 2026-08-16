'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { LogManualWorkoutModal } from '@/components/history/log-manual-workout-modal'

type AthleteDashboardHeaderProps = {
  greeting: string
  name: string
  dateLabel: string
}

export function AthleteDashboardHeader({
  greeting,
  name,
  dateLabel,
}: AthleteDashboardHeaderProps) {
  const [logOpen, setLogOpen] = useState(false)

  return (
    <>
      <header className="tt-dashboard-header pt-1 lg:pt-2">
        <div className="min-w-0">
          <h1 className="tt-dashboard-title">
            {greeting}, {name}.
          </h1>
          <p className="tt-dashboard-date">{dateLabel}</p>
        </div>
        <button
          type="button"
          className="tt-dashboard-log-btn shrink-0"
          onClick={() => setLogOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Log workout
        </button>
      </header>
      <LogManualWorkoutModal open={logOpen} onOpenChange={setLogOpen} />
    </>
  )
}
