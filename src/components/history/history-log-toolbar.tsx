'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogManualWorkoutModal } from '@/components/history/log-manual-workout-modal'

type HistoryLogToolbarProps = {
  canLogWorkout: boolean
  /** Shorter label on small screens so controls fit one row. */
  compactOnMobile?: boolean
}

export function HistoryLogToolbar({
  canLogWorkout,
  compactOnMobile = false,
}: HistoryLogToolbarProps) {
  const [logOpen, setLogOpen] = useState(false)

  if (!canLogWorkout) return null

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0 gap-1 px-2.5 sm:gap-1.5 sm:px-3"
        onClick={() => setLogOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {compactOnMobile ? (
          <>
            <span className="lg:hidden">Log</span>
            <span className="hidden lg:inline">Log workout</span>
          </>
        ) : (
          'Log workout'
        )}
      </Button>
      <LogManualWorkoutModal open={logOpen} onOpenChange={setLogOpen} />
    </>
  )
}
