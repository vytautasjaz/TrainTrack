'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrentPhaseBadge } from '@/components/training/current-phase-badge'
import {
  SeasonPhaseBlockModal,
  type SeasonPhaseModalState,
} from '@/components/training/season-phase-block-modal'
import type { CurrentPhaseIndicator } from '@/lib/training-phase-context'
import { cn } from '@/lib/utils'

type TrainingPhaseHeaderControlsProps = {
  indicator: CurrentPhaseIndicator | null
  /** Prefill create modal with visible range (YYYY-MM-DD). */
  defaultStartKey?: string
  defaultEndKey?: string
  /** When set, parent owns the modal (e.g. month paint gestures). */
  onAddPhase?: () => void
  compact?: boolean
  className?: string
}

export function TrainingPhaseHeaderControls({
  indicator,
  defaultStartKey,
  defaultEndKey,
  onAddPhase,
  compact = false,
  className,
}: TrainingPhaseHeaderControlsProps) {
  const [modal, setModal] = useState<SeasonPhaseModalState>(null)

  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-2',
        compact ? 'justify-start' : 'justify-end',
        className,
      )}
    >
      {indicator ? <CurrentPhaseBadge indicator={indicator} compact={compact} /> : null}
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="h-7 gap-1 px-2 text-[11px] font-semibold"
        title="Add a phase · drag/resize on Season board"
        onClick={() => {
          if (onAddPhase) {
            onAddPhase()
            return
          }
          setModal({
            mode: 'create',
            sport: 'RUN',
            startKey: defaultStartKey,
            endKey: defaultEndKey,
          })
        }}
      >
        <Plus className="h-3 w-3" strokeWidth={2.25} aria-hidden />
        Add phase
      </Button>
      {!onAddPhase ? (
        <SeasonPhaseBlockModal
          state={modal}
          onOpenChange={(open) => {
            if (!open) setModal(null)
          }}
        />
      ) : null}
    </div>
  )
}
