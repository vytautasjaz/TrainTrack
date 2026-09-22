/* eslint-disable react-hooks/set-state-in-effect */
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
  defaultPlanColorMode,
  defaultPlanCompletionLayer,
  defaultPlanStatusFilters,
  defaultVisiblePlanSports,
  FILTERABLE_PLAN_SPORTS,
  isPlanSportVisible,
  normalizePlanStatusFilters,
  normalizeVisiblePlanSports,
  parsePlanStatusFilters,
  parseVisiblePlanSports,
  PLAN_SPORT_FILTER_STORAGE_KEY,
  PLAN_STATUS_FILTER_STORAGE_KEY,
  PLAN_STATUS_FILTERS,
  readStoredPlanColorMode,
  readStoredPlanCompletionLayer,
  serializePlanStatusFilters,
  serializeVisiblePlanSports,
  writeStoredPlanColorMode,
  writeStoredPlanCompletionLayer,
  type PlanColorMode,
  type PlanStatusFilter,
} from '@/lib/plan-sport-filter'

type PlanSportFilterContextValue = {
  visibleSports: WorkoutType[]
  visibleSportSet: ReadonlySet<WorkoutType>
  isSportVisible: (sport: WorkoutType) => boolean
  colorMode: PlanColorMode
  showCompletionLayer: boolean
  visibleStatuses: PlanStatusFilter[]
  visibleStatusSet: ReadonlySet<PlanStatusFilter>
  isFiltered: boolean
  setSportVisible: (sport: WorkoutType, visible: boolean) => void
  setAllVisible: (visible: boolean) => void
  setColorMode: (mode: PlanColorMode) => void
  setShowCompletionLayer: (on: boolean) => void
  toggleCompletionLayer: () => void
  setStatusVisible: (status: PlanStatusFilter, visible: boolean) => void
  setAllStatusesVisible: (visible: boolean) => void
  resetFilters: () => void
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

/** View mode for workout chrome. Uses the training toggle when present, else the saved preference. */
export function useResolvedPlanColorMode(): PlanColorMode {
  const ctx = useOptionalPlanSportFilter()
  const [stored, setStored] = useState<PlanColorMode>(defaultPlanColorMode)

  useEffect(() => {
    if (ctx) return
    setStored(readStoredPlanColorMode())
  }, [ctx])

  return ctx?.colorMode ?? stored
}

/** Completion status chrome. Uses the training toggle when present, else the saved preference. */
export function useResolvedPlanCompletionLayer(): boolean {
  const ctx = useOptionalPlanSportFilter()
  const [stored, setStored] = useState(defaultPlanCompletionLayer)

  useEffect(() => {
    if (ctx) return
    setStored(readStoredPlanCompletionLayer())
  }, [ctx])

  return ctx?.showCompletionLayer ?? stored
}

type PlanSportFilterProviderProps = {
  children: ReactNode
}

export function PlanSportFilterProvider({ children }: PlanSportFilterProviderProps) {
  const [visibleSports, setVisibleSports] = useState(defaultVisiblePlanSports)
  const [colorMode, setColorModeState] = useState<PlanColorMode>(defaultPlanColorMode)
  const [showCompletionLayer, setShowCompletionLayerState] = useState(
    defaultPlanCompletionLayer,
  )
  const [visibleStatuses, setVisibleStatuses] = useState(defaultPlanStatusFilters)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setVisibleSports(
        parseVisiblePlanSports(localStorage.getItem(PLAN_SPORT_FILTER_STORAGE_KEY)),
      )
      setColorModeState(readStoredPlanColorMode())
      setShowCompletionLayerState(readStoredPlanCompletionLayer())
      setVisibleStatuses(
        parsePlanStatusFilters(localStorage.getItem(PLAN_STATUS_FILTER_STORAGE_KEY)),
      )
    } catch {
      /* keep defaults */
    }
    setHydrated(true)
  }, [])

  const persistSports = useCallback((next: WorkoutType[]) => {
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

  const persistColorMode = useCallback((next: PlanColorMode) => {
    setColorModeState(next)
    writeStoredPlanColorMode(next)
  }, [])

  const persistCompletionLayer = useCallback((next: boolean) => {
    setShowCompletionLayerState(next)
    writeStoredPlanCompletionLayer(next)
  }, [])

  const persistStatuses = useCallback((next: PlanStatusFilter[]) => {
    const normalized = normalizePlanStatusFilters(next)
    setVisibleStatuses(normalized)
    try {
      localStorage.setItem(
        PLAN_STATUS_FILTER_STORAGE_KEY,
        serializePlanStatusFilters(normalized),
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
      persistSports(visible ? defaultVisiblePlanSports() : [])
    },
    [persistSports],
  )

  const setColorMode = useCallback(
    (mode: PlanColorMode) => {
      persistColorMode(mode)
    },
    [persistColorMode],
  )

  const setShowCompletionLayer = useCallback(
    (on: boolean) => {
      persistCompletionLayer(on)
    },
    [persistCompletionLayer],
  )

  const toggleCompletionLayer = useCallback(() => {
    setShowCompletionLayerState((prev) => {
      const next = !prev
      writeStoredPlanCompletionLayer(next)
      return next
    })
  }, [])

  const setStatusVisible = useCallback((status: PlanStatusFilter, visible: boolean) => {
    setVisibleStatuses((prev) => {
      const set = new Set(prev)
      if (visible) set.add(status)
      else set.delete(status)
      const next = normalizePlanStatusFilters([...set])
      try {
        localStorage.setItem(
          PLAN_STATUS_FILTER_STORAGE_KEY,
          serializePlanStatusFilters(next),
        )
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const setAllStatusesVisible = useCallback(
    (visible: boolean) => {
      persistStatuses(visible ? defaultPlanStatusFilters() : [])
    },
    [persistStatuses],
  )

  const resetFilters = useCallback(() => {
    persistSports(defaultVisiblePlanSports())
    persistColorMode(defaultPlanColorMode())
    persistCompletionLayer(defaultPlanCompletionLayer())
    persistStatuses(defaultPlanStatusFilters())
  }, [persistSports, persistColorMode, persistCompletionLayer, persistStatuses])

  const effectiveSports = hydrated ? visibleSports : defaultVisiblePlanSports()
  const effectiveColorMode = hydrated ? colorMode : defaultPlanColorMode()
  const effectiveCompletionLayer = hydrated
    ? showCompletionLayer
    : defaultPlanCompletionLayer()
  const effectiveStatuses = hydrated ? visibleStatuses : defaultPlanStatusFilters()

  const visibleSportSet = useMemo(
    () => new Set(effectiveSports),
    [effectiveSports],
  )
  const visibleStatusSet = useMemo(
    () => new Set(effectiveStatuses),
    [effectiveStatuses],
  )

  const isFiltered =
    effectiveColorMode !== defaultPlanColorMode() ||
    effectiveCompletionLayer !== defaultPlanCompletionLayer() ||
    effectiveSports.length < FILTERABLE_PLAN_SPORTS.length ||
    effectiveStatuses.length < PLAN_STATUS_FILTERS.length

  const value = useMemo<PlanSportFilterContextValue>(
    () => ({
      visibleSports: effectiveSports,
      visibleSportSet,
      isSportVisible: (sport) => isPlanSportVisible(sport, visibleSportSet),
      colorMode: effectiveColorMode,
      showCompletionLayer: effectiveCompletionLayer,
      visibleStatuses: effectiveStatuses,
      visibleStatusSet,
      isFiltered,
      setSportVisible,
      setAllVisible,
      setColorMode,
      setShowCompletionLayer,
      toggleCompletionLayer,
      setStatusVisible,
      setAllStatusesVisible,
      resetFilters,
    }),
    [
      effectiveSports,
      visibleSportSet,
      effectiveColorMode,
      effectiveCompletionLayer,
      effectiveStatuses,
      visibleStatusSet,
      isFiltered,
      setSportVisible,
      setAllVisible,
      setColorMode,
      setShowCompletionLayer,
      toggleCompletionLayer,
      setStatusVisible,
      setAllStatusesVisible,
      resetFilters,
    ],
  )

  return (
    <PlanSportFilterContext.Provider value={value}>
      {children}
    </PlanSportFilterContext.Provider>
  )
}
