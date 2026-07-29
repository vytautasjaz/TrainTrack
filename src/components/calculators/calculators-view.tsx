'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { CalculatorDefaults } from '@/lib/calculators/prefill'
import {
  buildInitialCalculatorState,
  loadCalculatorState,
  saveCalculatorState,
  type CalculatorPersistedState,
  type CalculatorTab,
} from '@/lib/calculators/storage'
import { CALCULATOR_NAV_TABS } from '@/lib/nav-items'
import { RunningTimeCalculator } from '@/components/calculators/running-time-calculator'
import { TriathlonTimeCalculator } from '@/components/calculators/triathlon-time-calculator'
import { IntervalTimeCalculator } from '@/components/calculators/interval-time-calculator'
import { HyroxTimeCalculator } from '@/components/calculators/hyrox-time-calculator'
import { SplitsCalculator } from '@/components/calculators/splits-calculator'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Caption } from '@/components/ui/typography'

type CalculatorsViewProps = {
  defaults: CalculatorDefaults
  zone3PaceLabel: string | null
}

function parseCalculatorTab(value: string | null): CalculatorTab | null {
  if (
    value === 'running' ||
    value === 'interval' ||
    value === 'triathlon' ||
    value === 'hyrox' ||
    value === 'splits'
  ) {
    return value
  }
  return null
}

export function CalculatorsView({ defaults, zone3PaceLabel }: CalculatorsViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromUrl = parseCalculatorTab(searchParams.get('tab'))

  const [state, setState] = useState<CalculatorPersistedState>(() =>
    buildInitialCalculatorState(defaults),
  )
  const [hydrated, setHydrated] = useState(false)
  const defaultsRef = useRef(defaults)

  useEffect(() => {
    const stored = loadCalculatorState(defaultsRef.current)
    const nextState = stored
      ? {
          ...stored,
          activeTab: tabFromUrl ?? stored.activeTab,
        }
      : {
          ...buildInitialCalculatorState(defaultsRef.current),
          activeTab: tabFromUrl ?? 'running',
        }
    setState(nextState)
    setHydrated(true)

    if (!tabFromUrl) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', nextState.activeTab)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
    // Only hydrate once on mount; URL sync is handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveCalculatorState(state)
  }, [state, hydrated])

  useEffect(() => {
    if (!hydrated || !tabFromUrl) return
    setState((prev) => (prev.activeTab === tabFromUrl ? prev : { ...prev, activeTab: tabFromUrl }))
  }, [hydrated, tabFromUrl])

  const setActiveTab = useCallback(
    (activeTab: CalculatorTab) => {
      setState((prev) => ({ ...prev, activeTab }))
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', activeTab)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const setRunning = useCallback((running: CalculatorPersistedState['running']) => {
    setState((prev) => ({ ...prev, running }))
  }, [])

  const setTriathlon = useCallback((triathlon: CalculatorPersistedState['triathlon']) => {
    setState((prev) => ({ ...prev, triathlon }))
  }, [])

  const setInterval = useCallback((interval: CalculatorPersistedState['interval']) => {
    setState((prev) => ({ ...prev, interval }))
  }, [])

  const setHyrox = useCallback((hyrox: CalculatorPersistedState['hyrox']) => {
    setState((prev) => ({ ...prev, hyrox }))
  }, [])

  const setSplits = useCallback((splits: CalculatorPersistedState['splits']) => {
    setState((prev) => ({ ...prev, splits }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setState((prev) => ({
      ...buildInitialCalculatorState(defaults),
      activeTab: prev.activeTab,
    }))
  }, [defaults])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl aria-label="Calculator type">
          {CALCULATOR_NAV_TABS.map(({ id, label }) => (
            <SegmentedControlItem
              key={id}
              active={state.activeTab === id}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>

        <button
          type="button"
          onClick={resetToDefaults}
          className="text-caption font-medium transition hover:text-brand"
        >
          Reset
        </button>
      </div>

      {zone3PaceLabel && (
        <Caption>
          Pre-filled from your Zone 3 pace:{' '}
          <span className="font-medium text-foreground">{zone3PaceLabel}/km</span>
        </Caption>
      )}

      {state.activeTab === 'running' ? (
        <RunningTimeCalculator state={state.running} onChange={setRunning} />
      ) : state.activeTab === 'interval' ? (
        <IntervalTimeCalculator state={state.interval} onChange={setInterval} />
      ) : state.activeTab === 'hyrox' ? (
        <HyroxTimeCalculator state={state.hyrox} onChange={setHyrox} />
      ) : state.activeTab === 'splits' ? (
        <SplitsCalculator state={state.splits} onChange={setSplits} />
      ) : (
        <TriathlonTimeCalculator state={state.triathlon} onChange={setTriathlon} />
      )}
    </div>
  )
}
