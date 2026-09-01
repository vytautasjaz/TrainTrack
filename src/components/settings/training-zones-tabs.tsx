'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { WorkoutType } from '@prisma/client'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { PaceZonesForm } from '@/components/settings/pace-zones-form'
import { BikeSpeedZonesForm } from '@/components/settings/bike-speed-zones-form'
import { SwimCssForm } from '@/components/settings/swim-css-form'
import { HrZonesForm } from '@/components/settings/hr-zones-form'
import type { AthletePreferences } from '@/lib/athlete-preferences'
import type { PreferenceFormSaveApi } from '@/hooks/use-preference-form'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

type ZoneTab = 'run' | 'bike' | 'swim' | 'hr'

const TABS: {
  id: ZoneTab
  label: string
  sport?: WorkoutType
}[] = [
  { id: 'run', label: 'Run', sport: WorkoutType.RUN },
  { id: 'bike', label: 'Bike', sport: WorkoutType.BIKE },
  { id: 'swim', label: 'Swim', sport: WorkoutType.SWIM },
  { id: 'hr', label: 'HR' },
]

type TrainingZonesTabsProps = {
  preferences: AthletePreferences
  className?: string
  embedded?: boolean
}

const EMBEDDED_TABS: { id: ZoneTab; label: string }[] = [
  { id: 'run', label: 'Pace' },
  { id: 'hr', label: 'Heart rate' },
  { id: 'bike', label: 'Bike' },
  { id: 'swim', label: 'Swim CSS' },
]

export function TrainingZonesTabs({
  preferences,
  className,
  embedded = false,
}: TrainingZonesTabsProps) {
  const [tab, setTab] = useState<ZoneTab>('run')
  const [dirty, setDirty] = useState(false)
  const [pendingTab, setPendingTab] = useState<ZoneTab | null>(null)
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const [leavingPending, startLeavingTransition] = useTransition()
  const saveApiRef = useRef<PreferenceFormSaveApi | null>(null)

  const registerSave = useCallback((api: PreferenceFormSaveApi | null) => {
    saveApiRef.current = api
  }, [])

  function requestTab(next: ZoneTab) {
    if (next === tab) return
    if (dirty) {
      setPendingTab(next)
      setUnsavedOpen(true)
      return
    }
    setTab(next)
    setDirty(false)
  }

  function handleDiscardAndLeave() {
    setUnsavedOpen(false)
    if (pendingTab) {
      setTab(pendingTab)
      setPendingTab(null)
    }
    setDirty(false)
  }

  function handleSaveAndLeave() {
    startLeavingTransition(async () => {
      const ok = (await saveApiRef.current?.save()) ?? true
      if (!ok) return
      setUnsavedOpen(false)
      if (pendingTab) {
        setTab(pendingTab)
        setPendingTab(null)
      }
      setDirty(false)
    })
  }

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const tabControl = embedded ? (
    <div className="flex flex-wrap gap-1 rounded-[8px] border border-[var(--tt-line,#ebebeb)] p-0.5">
      {EMBEDDED_TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => requestTab(item.id)}
          className={cn(
            'rounded-[6px] px-3 py-1.5 text-[12px] font-semibold transition',
            tab === item.id
              ? 'bg-[var(--tt-ink,#111)] text-white'
              : 'text-[var(--tt-ink-faint,#9a9a9a)] hover:text-[var(--tt-ink,#111)]',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : (
    <SegmentedControl aria-label="Training zone type" className="flex w-full flex-wrap">
      {TABS.map((item) => (
        <SegmentedControlItem
          key={item.id}
          active={tab === item.id}
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2"
          onClick={() => requestTab(item.id)}
        >
          {item.sport ? (
            <WorkoutSportIcon type={item.sport} size="xs" className="!h-5 !w-5 !rounded" />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-rose-500/15 text-rose-600">
              <Heart className="h-3 w-3" strokeWidth={2} aria-hidden />
            </span>
          )}
          <span className="truncate text-xs font-semibold sm:text-sm">{item.label}</span>
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  const zoneForms = (
    <>
      {tabControl}

      <div className="min-h-[12rem]">
        {tab === 'run' ? (
          <div className={cn('space-y-4', embedded && 'pt-1')}>
            {!embedded ? (
              <div className="flex items-center gap-2.5">
                <WorkoutSportIcon type={WorkoutType.RUN} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Run paces</p>
                  <Caption>Per-km targets for each intensity</Caption>
                </div>
              </div>
            ) : null}
            <PaceZonesForm
              preferences={preferences}
              onDirtyChange={setDirty}
              registerSave={registerSave}
            />
          </div>
        ) : null}

        {tab === 'bike' ? (
          <div className={cn('space-y-4', embedded && 'pt-1')}>
            {!embedded ? (
              <div className="flex items-center gap-2.5">
                <WorkoutSportIcon type={WorkoutType.BIKE} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Bike speed & power</p>
                  <Caption>km/h for distance estimates · watts for power-based sessions</Caption>
                </div>
              </div>
            ) : null}
            <BikeSpeedZonesForm
              preferences={preferences}
              onDirtyChange={setDirty}
              registerSave={registerSave}
            />
          </div>
        ) : null}

        {tab === 'swim' ? (
          <div className={cn('space-y-4', embedded && 'pt-1')}>
            {!embedded ? (
              <div className="flex items-center gap-2.5">
                <WorkoutSportIcon type={WorkoutType.SWIM} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Swim CSS</p>
                  <Caption>Critical swim speed per 100 m</Caption>
                </div>
              </div>
            ) : null}
            <SwimCssForm
              preferences={preferences}
              onDirtyChange={setDirty}
              registerSave={registerSave}
            />
          </div>
        ) : null}

        {tab === 'hr' ? (
          <div className={cn('space-y-4', embedded && 'pt-1')}>
            {!embedded ? (
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600">
                  <Heart className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Heart rate zones</p>
                  <Caption>Bpm limits for recovery through VO₂ max</Caption>
                </div>
              </div>
            ) : null}
            <HrZonesForm
              preferences={preferences}
              onDirtyChange={setDirty}
              registerSave={registerSave}
            />
          </div>
        ) : null}
      </div>

      <UnsavedChangesDialog
        open={unsavedOpen}
        onOpenChange={(open) => {
          setUnsavedOpen(open)
          if (!open) setPendingTab(null)
        }}
        pending={leavingPending}
        onSave={handleSaveAndLeave}
        onDiscard={handleDiscardAndLeave}
      />
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="zones"
        title="Training zones"
        description="Your zones for prescriptions, structure intensity, and tools. Only you can change these — a coach may propose adjustments from Athletes."
        className={className}
      >
        {zoneForms}
      </SettingsPanel>
    )
  }

  return (
    <section className={cn('card-elevated space-y-4 p-5', className)}>
      <div>
        <SectionTitle variant="ui">Training paces & zones</SectionTitle>
        <Caption>
          Switch sport to edit run paces, bike speeds, swim CSS, or heart-rate limits.
        </Caption>
      </div>
      {zoneForms}
    </section>
  )
}
