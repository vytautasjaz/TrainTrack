'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { Loader2 } from 'lucide-react'
import { switchViewMode } from '@/app/actions/session'
import type { AppViewMode } from '@/lib/session'

type ViewModeSwitchContextValue = {
  isPending: boolean
  targetMode: AppViewMode | null
  switchTo: (mode: AppViewMode, currentMode: AppViewMode) => void
}

const ViewModeSwitchContext = createContext<ViewModeSwitchContextValue | null>(null)

function modeLabel(mode: AppViewMode) {
  return mode === 'coach' ? 'Coach' : 'Athlete'
}

export function ViewModeSwitchProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition()
  const [targetMode, setTargetMode] = useState<AppViewMode | null>(null)

  const switchTo = useCallback(
    (mode: AppViewMode, currentMode: AppViewMode) => {
      if (mode === currentMode || isPending) return
      setTargetMode(mode)
      const formData = new FormData()
      formData.set('mode', mode)
      startTransition(async () => {
        await switchViewMode(formData)
      })
    },
    [isPending, startTransition],
  )

  return (
    <ViewModeSwitchContext.Provider value={{ isPending, targetMode, switchTo }}>
      {children}
      {isPending && targetMode ? (
        <>
          <div
            className="tt-view-mode-switch-progress"
            role="progressbar"
            aria-label={`Switching to ${modeLabel(targetMode)}`}
            aria-busy="true"
          />
          <div
            className="tt-view-mode-switch-status"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="tt-view-mode-switch-status-spinner" aria-hidden />
            <span>
              Switching to <strong>{modeLabel(targetMode)}</strong>…
            </span>
          </div>
        </>
      ) : null}
    </ViewModeSwitchContext.Provider>
  )
}

export function useViewModeSwitch() {
  return useContext(ViewModeSwitchContext)
}
