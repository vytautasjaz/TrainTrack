'use client'

import type { ReactNode } from 'react'
import { PlanWeekDndProvider } from '@/components/plan/plan-week-dnd'
import {
  TrainingLibraryProvider,
  useTrainingLibrary,
  type TrainingLibraryTemplateItem,
} from '@/components/training/training-library-context'
import { PlanSportFilterProvider } from '@/components/training/plan-sport-filter-context'
import { TrainingLibraryPanel } from '@/components/training/training-library-panel'
import { cn } from '@/lib/utils'

export type { TrainingLibraryTemplateItem }

type TrainingPlanShellProps = {
  isCoach: boolean
  templates: TrainingLibraryTemplateItem[]
  children: ReactNode
}

function TrainingPlanShellLayout({ children }: { children: ReactNode }) {
  const library = useTrainingLibrary()
  const open = library?.open ?? false

  return (
    <div
      className={cn(
        'flex items-stretch',
        // Bleed to the right edge of the content column (viewport − sidebar).
        // Keep lg:pl-8 so plan aligns with normal main padding on the left.
        open && 'lg:-ml-8 lg:w-[calc(100vw-var(--sidebar-width))] lg:max-w-none lg:pl-8',
      )}
    >
      <div
        className={cn(
          'min-w-0 flex-1 space-y-6 landscape:max-lg:space-y-3',
          // Match calendar ↔ sidebar spacing (main lg:px-8).
          open && 'lg:pr-8',
        )}
      >
        {children}
      </div>
      {open ? (
        <div className="hidden min-h-[calc(100dvh-1rem)] w-72 shrink-0 self-stretch border-l border-border/50 bg-card lg:block xl:w-80">
          <div className="sticky top-0 h-[calc(100dvh-1rem)] px-4 pt-1 xl:px-5">
            <TrainingLibraryPanel />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function TrainingPlanShell({
  isCoach,
  templates,
  children,
}: TrainingPlanShellProps) {
  const body = (
    <PlanWeekDndProvider mode={isCoach ? 'coach' : 'athlete'}>
      {isCoach ? (
        <TrainingLibraryProvider templates={templates}>
          <TrainingPlanShellLayout>{children}</TrainingPlanShellLayout>
        </TrainingLibraryProvider>
      ) : (
        <div className="space-y-6 landscape:max-lg:space-y-3">{children}</div>
      )}
    </PlanWeekDndProvider>
  )

  return <PlanSportFilterProvider>{body}</PlanSportFilterProvider>
}
