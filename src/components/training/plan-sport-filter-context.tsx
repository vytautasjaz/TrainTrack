'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WorkoutType } from '@prisma/client'
import {
  defaultVisiblePlanSports,
  FILTERABLE_PLAN_SPORTS,
  isPlanSportVisible,
  normalizeVisiblePlanSports,
  parseVisiblePlanSports,
  PLAN_SPORT_FILTER_STORAGE_KEY,
  serializeVisiblePlanSports,
} from '@/lib/plan-sport-filter'

type PlanSportFilterContextValue = {
  visibleSports: WorkoutType[]
  visibleSportSet: ReadonlySet<WorkoutType>
  isSportVisible: (sport: WorkoutType) => boolean
  isFiltered: boolean
  setSportVisible: (sport: WorkoutType, visible: boolean) => void
  setAllVisible: (visible: boolean) => void
}

const PlanSportFilterContext = createContext<PlanSportFilterContextValue | null>(
  null,
)

export function usePlanSportFilter() {
  const ctx = useContext(PlanSportFilterContext)
  if (!ctx) {
    throw new Error('usePlanSportFilter must be used within PlanSportFilterProvider')
  }
  return ctx
}

/** Safe for components that may render outside the training shell. */
export function useOptionalPlanSportFilter() {
  return useContext(PlanSportFilterContext)
}

type PlanSportFilterProviderProps = {
  children: ReactNode
}

export function PlanSportFilterProvider({ children }: PlanSportFilterProviderProps) {
  const [visibleSports, setVisibleSports] = useState(defaultVisiblePlanSports)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setVisibleSports(
        parseVisiblePlanSports(localStorage.getItem(PLAN_SPORT_FILTER_STORAGE_KEY)),
      )
    } catch {
      /* keep default */
    }
    setHydrated(true)
  }, [])

  const persist = useCallback((next: WorkoutType[]) => {
    const normalized = normalizeVisiblePlanSports(next)
    setVisibleSports(normalized)
    try {
      localStorage.setItem(
        PLAN_SPORT_FILTER_STORAGE_KEY,
        serializeVisiblePlanSports(normalized),
      )
    } catch {
      /* ignore */
    }
  }, [])

  const setSportVisible = useCallback(
    (sport: WorkoutType, visible: boolean) => {
      setVisibleSports((prev) => {
        const set = new Set(prev)
        if (visible) set.add(sport)
        else set.delete(sport)
        const next = normalizeVisiblePlanSports([...set])
        try {
          localStorage.setItem(
            PLAN_SPORT_FILTER_STORAGE_KEY,
            serializeVisiblePlanSports(next),
          )
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [],
  )

  const setAllVisible = useCallback(
    (visible: boolean) => {
      persist(visible ? defaultVisiblePlanSports() : [])
    },
    [persist],
  )

  const effectiveSports = hydrated ? visibleSports : defaultVisiblePlanSports()
  const visibleSportSet = useMemo(
    () => new Set(effectiveSports),
    [effectiveSports],
  )

  const value = useMemo<PlanSportFilterContextValue>(
    () => ({
      visibleSports: effectiveSports,
      visibleSportSet,
      isSportVisible: (sport) => isPlanSportVisible(sport, visibleSportSet),
      isFiltered: effectiveSports.length < FILTERABLE_PLAN_SPORTS.length,
      setSportVisible,
      setAllVisible,
    }),
    [effectiveSports, visibleSportSet, setSportVisible, setAllVisible],
  )

  return (
    <PlanSportFilterContext.Provider value={value}>
      {children}
    </PlanSportFilterContext.Provider>
  )
}
