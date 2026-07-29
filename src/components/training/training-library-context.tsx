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
import type { SessionType, WorkoutType } from '@prisma/client'

const STORAGE_KEY = 'tt-training-library-open'

export type TrainingLibraryTemplateItem = {
  id: string
  title: string
  type: WorkoutType
  sessionType: SessionType
  distanceKm: number | null
  durationMin: number | null
  plannedDistanceMeters: number | null
  distanceApprox?: boolean
  durationApprox?: boolean
}

type TrainingLibraryContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  templates: TrainingLibraryTemplateItem[]
}

const TrainingLibraryContext = createContext<TrainingLibraryContextValue | null>(null)

export function useTrainingLibrary() {
  return useContext(TrainingLibraryContext)
}

type TrainingLibraryProviderProps = {
  templates: TrainingLibraryTemplateItem[]
  children: ReactNode
}

export function TrainingLibraryProvider({
  templates,
  children,
}: TrainingLibraryProviderProps) {
  const [open, setOpenState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setOpenState(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setOpenState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ open: hydrated ? open : false, setOpen, toggle, templates }),
    [hydrated, open, setOpen, toggle, templates],
  )

  return (
    <TrainingLibraryContext.Provider value={value}>
      {children}
    </TrainingLibraryContext.Provider>
  )
}
