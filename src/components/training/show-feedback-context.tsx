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
import {
  readStoredFlag,
  SHOW_FEEDBACK_STORAGE_KEY,
  writeStoredFlag,
} from '@/lib/plan-calendar-layers'

type ShowFeedbackContextValue = {
  showFeedback: boolean
  setShowFeedback: (value: boolean) => void
  toggleShowFeedback: () => void
}

const ShowFeedbackContext = createContext<ShowFeedbackContextValue | null>(null)

export function ShowFeedbackProvider({ children }: { children: ReactNode }) {
  const [showFeedback, setShowFeedbackState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setShowFeedbackState(readStoredFlag(SHOW_FEEDBACK_STORAGE_KEY, false))
    setHydrated(true)
  }, [])

  const setShowFeedback = useCallback((value: boolean) => {
    setShowFeedbackState(value)
    writeStoredFlag(SHOW_FEEDBACK_STORAGE_KEY, value)
  }, [])

  const toggleShowFeedback = useCallback(() => {
    setShowFeedbackState((prev) => {
      const next = !prev
      writeStoredFlag(SHOW_FEEDBACK_STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      showFeedback: hydrated ? showFeedback : false,
      setShowFeedback,
      toggleShowFeedback,
    }),
    [showFeedback, hydrated, setShowFeedback, toggleShowFeedback],
  )

  return (
    <ShowFeedbackContext.Provider value={value}>
      {children}
    </ShowFeedbackContext.Provider>
  )
}

export function useShowFeedback(): ShowFeedbackContextValue {
  const ctx = useContext(ShowFeedbackContext)
  if (!ctx) {
    throw new Error('useShowFeedback must be used within ShowFeedbackProvider')
  }
  return ctx
}

export function useOptionalShowFeedback(): ShowFeedbackContextValue | null {
  return useContext(ShowFeedbackContext)
}
