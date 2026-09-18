'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TrainingPlansLibraryList } from '@/components/training/training-plans-library-list'
import { CreateTrainingPlanModal } from '@/components/training/create-training-plan-modal'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import type { PlanAthleteOption } from '@/components/training/training-plan-audience-fields'

type TrainingPlansHubClientProps = {
  athleteId?: string
  defaultStartWeekKey: string
  athletes?: PlanAthleteOption[]
}

export function TrainingPlansHubClient({
  athleteId,
  defaultStartWeekKey,
  athletes = [],
}: TrainingPlansHubClientProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader className="mb-1 items-end">
        <div className="min-w-0">
          <PageHeaderEyebrow>Coach · Library</PageHeaderEyebrow>
          <PageHeaderTitle className="mt-1">Training plans</PageHeaderTitle>
          <PageHeaderDescription>
            Multi-week templates — browse by athlete or keep plans general.
            Build on a Week 1…N canvas, or save a range from a calendar. Apply as
            independent copies.
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New plan
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white">
        <TrainingPlansLibraryList
          athleteId={athleteId}
          defaultStartWeekKey={defaultStartWeekKey}
          athletes={athletes}
          className="min-h-[28rem]"
        />
      </div>

      <CreateTrainingPlanModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        athletes={athletes}
      />
    </div>
  )
}
