'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogManualWorkoutModal } from '@/components/history/log-manual-workout-modal'

type HistoryLogToolbarProps = {
  canLogWorkout: boolean
}

export function HistoryLogToolbar({ canLogWorkout }: HistoryLogToolbarProps) {
  const [logOpen, setLogOpen] = useState(false)

  if (!canLogWorkout) return null

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() => setLogOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Log workout
      </Button>
      <LogManualWorkoutModal open={logOpen} onOpenChange={setLogOpen} />
    </>
  )
}
