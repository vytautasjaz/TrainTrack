'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PlanWeekDndProvider, PlanWeekDndErrorBanner } from '@/components/plan/plan-week-dnd'
import {
  TrainingLibraryProvider,
  useTrainingLibrary,
  type TrainingLibraryFolderItem,
  type TrainingLibraryTemplateItem,
} from '@/components/training/training-library-context'
import { PlanSportFilterProvider } from '@/components/training/plan-sport-filter-context'
import { ShowFeedbackProvider } from '@/components/training/show-feedback-context'
import { TrainingLibraryPanel } from '@/components/training/training-library-panel'
import { cn } from '@/lib/utils'

export type { TrainingLibraryTemplateItem, TrainingLibraryFolderItem }

type TrainingPlanShellProps = {
  isCoach: boolean
  templates: TrainingLibraryTemplateItem[]
  folders?: TrainingLibraryFolderItem[]
  children: ReactNode
}

/** Matches `w-80` library rail. */
const LIBRARY_DOCK_PX = 320

const dockMotionClass =
  'transition-[width] duration-[var(--tt-motion-normal,280ms)] ease-[cubic-bezier(0.22,1,0.36,1)]'

function TrainingPlanShellLayout({ children }: { children: ReactNode }) {
  const library = useTrainingLibrary()
  const open = library?.open ?? false
  const planRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  /** Calendar block’s right edge — library left edge is pinned here. */
  const [dockLeft, setDockLeft] = useState(0)
  /** Below sticky athlete bar / app chrome so the library header isn’t covered. */
  const [dockTop, setDockTop] = useState(0)
  /** How much of the library width must come from shrinking the calendar. */
  const [shrinkPx, setShrinkPx] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      if (typeof window === 'undefined') return
      const plan = planRef.current
      if (!plan) return

      const planRect = plan.getBoundingClientRect()
      const spacerW = spacerRef.current?.getBoundingClientRect().width ?? 0
      // Natural right edge if the calendar weren’t shrunk (current + spacer).
      const naturalRight = planRect.right + spacerW
      const spareRight = Math.max(0, window.innerWidth - naturalRight)
      setShrinkPx(open ? Math.max(0, LIBRARY_DOCK_PX - spareRight) : 0)
      // Live edge: tracks left as the spacer claims space from the calendar.
      setDockLeft(Math.round(planRect.right))

      const chrome = document.querySelector<HTMLElement>('[data-app-sticky-chrome]')
      setDockTop(Math.ceil(chrome?.getBoundingClientRect().bottom ?? 0))
    }

    measure()
    const ro = new ResizeObserver(measure)
    if (planRef.current) ro.observe(planRef.current)
    if (spacerRef.current) ro.observe(spacerRef.current)
    const chrome = document.querySelector('[data-app-sticky-chrome]')
    if (chrome) ro.observe(chrome)
    window.addEventListener('resize', measure)
    const t1 = window.setTimeout(measure, 200)
    const t2 = window.setTimeout(measure, 400)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open])

  if (!library) {
    return (
      <div className="w-full min-w-0 max-w-none space-y-6 landscape:max-lg:space-y-3 lg:-ml-8 lg:w-[calc(100%+2rem)] lg:pl-8 lg:pr-8">
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex w-full min-w-0 max-w-none items-stretch',
        'lg:-ml-8 lg:w-[calc(100%+2rem)] lg:pl-8',
      )}
    >
      <div
        ref={planRef}
        className="min-w-0 flex-1 space-y-6 landscape:max-lg:space-y-3 lg:pr-8"
      >
        {children}
      </div>

      {/*
        Invisible spacer — only the shortfall the empty right margin can’t cover.
        Library itself always opens from the calendar edge toward the right.
      */}
      <div
        ref={spacerRef}
        aria-hidden
        className={cn('hidden shrink-0 lg:block', dockMotionClass)}
        style={{ width: open ? shrinkPx : 0 }}
      />

      <aside
        className={cn(
          'pointer-events-none fixed bottom-0 z-30 hidden overflow-hidden bg-white lg:block',
          'border-[var(--tt-line,#ebebeb)] shadow-[-1px_0_4px_rgba(0,0,0,0.015)]',
          dockMotionClass,
          open
            ? 'pointer-events-auto border-l'
            : 'border-l-0',
          // Floating in empty margin (big screens) — close the rail on the right too.
          open && shrinkPx === 0 && 'border-r',
        )}
        style={{
          top: dockTop,
          left: dockLeft,
          width: open ? LIBRARY_DOCK_PX : 0,
        }}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="h-full" style={{ width: LIBRARY_DOCK_PX }}>
          <TrainingLibraryPanel />
        </div>
      </aside>
    </div>
  )
}

export function TrainingPlanShell({
  isCoach,
  templates,
  folders = [],
  children,
}: TrainingPlanShellProps) {
  const body = (
    <PlanWeekDndProvider mode={isCoach ? 'coach' : 'athlete'}>
      <PlanWeekDndErrorBanner className="mb-4" />
      {isCoach ? (
        <TrainingLibraryProvider templates={templates} folders={folders}>
          <TrainingPlanShellLayout>{children}</TrainingPlanShellLayout>
        </TrainingLibraryProvider>
      ) : (
        <TrainingPlanShellLayout>{children}</TrainingPlanShellLayout>
      )}
    </PlanWeekDndProvider>
  )

  return (
    <ShowFeedbackProvider>
      <PlanSportFilterProvider>{body}</PlanSportFilterProvider>
    </ShowFeedbackProvider>
  )
}
