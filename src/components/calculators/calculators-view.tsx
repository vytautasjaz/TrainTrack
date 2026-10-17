/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { RacePredictorCalculator } from '@/components/calculators/race-predictor-calculator'
import { V2PageShell } from '@/components/ui/v2'
import { topicTitleWithOrangeDot } from '@/components/ui/title-with-dot'

type CalculatorsViewProps = {
  defaults: CalculatorDefaults
}

function parseCalculatorTab(value: string | null): CalculatorTab | null {
  if (
    value === 'running' ||
    value === 'interval' ||
    value === 'triathlon' ||
    value === 'hyrox' ||
    value === 'splits' ||
    value === 'predictor'
  ) {
    return value
  }
  return null
}

export function CalculatorsView({ defaults }: CalculatorsViewProps) {
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

  const setPredictor = useCallback((predictor: CalculatorPersistedState['predictor']) => {
    setState((prev) => ({ ...prev, predictor }))
  }, [])

  const pageTitle = useMemo(
    () =>
      CALCULATOR_NAV_TABS.find((tab) => tab.id === state.activeTab)?.label ??
      'Run Calculator',
    [state.activeTab],
  )

  return (
    <V2PageShell>
      <div className="tt-v2-hero-band">
        <div className="mx-auto w-full max-w-3xl">
          <p className="tt-v2-eyebrow relative mb-2 flex items-center gap-2 text-white/45">
            <span
              className="inline-block h-2 w-2 shrink-0 bg-[var(--tt-v2-accent)]"
              aria-hidden
            />
            Tools
          </p>
          <h1 className="relative text-[2.125rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-[3.25rem] lg:text-[3.5rem]">
            {topicTitleWithOrangeDot(pageTitle)}
          </h1>
        </div>
      </div>

      <div className="tt-tools-calc-panel mx-auto w-full max-w-3xl space-y-4 pb-8">
        {state.activeTab === 'running' ? (
          <RunningTimeCalculator state={state.running} onChange={setRunning} />
        ) : state.activeTab === 'interval' ? (
          <IntervalTimeCalculator state={state.interval} onChange={setInterval} />
        ) : state.activeTab === 'hyrox' ? (
          <HyroxTimeCalculator state={state.hyrox} onChange={setHyrox} />
        ) : state.activeTab === 'splits' ? (
          <SplitsCalculator state={state.splits} onChange={setSplits} />
        ) : state.activeTab === 'predictor' ? (
          <RacePredictorCalculator state={state.predictor} onChange={setPredictor} />
        ) : (
          <TriathlonTimeCalculator state={state.triathlon} onChange={setTriathlon} />
        )}
      </div>
    </V2PageShell>
  )
}
