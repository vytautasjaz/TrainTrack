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
import type { SessionType, WorkoutType } from '@prisma/client'
import { setLibraryDockOpen } from '@/lib/library-dock'

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
  folderId?: string | null
}

export type TrainingLibraryFolderItem = {
  id: string
  sport: WorkoutType
  name: string
}

type TrainingLibraryContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  templates: TrainingLibraryTemplateItem[]
  folders: TrainingLibraryFolderItem[]
}

const TrainingLibraryContext = createContext<TrainingLibraryContextValue | null>(null)

export function useTrainingLibrary() {
  return useContext(TrainingLibraryContext)
}

type TrainingLibraryProviderProps = {
  templates: TrainingLibraryTemplateItem[]
  folders?: TrainingLibraryFolderItem[]
  children: ReactNode
}

export function TrainingLibraryProvider({
  templates,
  folders = [],
  children,
}: TrainingLibraryProviderProps) {
  const [open, setOpenState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let next = false
    try {
      next = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      /* ignore */
    }
    setOpenState(next)
    setHydrated(true)
    return () => setLibraryDockOpen(false)
  }, [])

  // Side effects stay out of setState updaters (those can run during render).
  useEffect(() => {
    if (!hydrated) return
    setLibraryDockOpen(open)
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [hydrated, open])

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
  }, [])

  const toggle = useCallback(() => {
    setOpenState((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({
      open: hydrated ? open : false,
      setOpen,
      toggle,
      templates,
      folders,
    }),
    [hydrated, open, setOpen, toggle, templates, folders],
  )

  return (
    <TrainingLibraryContext.Provider value={value}>
      {children}
    </TrainingLibraryContext.Provider>
  )
}
