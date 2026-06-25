import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { settingsRepository } from '../db/settingsRepository'
import type { UserRole } from '../types/role'
import {
  canLogExecution,
  canManageDayIntent,
  canManageWorkouts,
} from '../types/role'

type RoleContextValue = {
  role: UserRole
  setRole: (role: UserRole) => void
  canManageWorkouts: boolean
  canLogExecution: boolean
  canManageDayIntent: boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => settingsRepository.getRole())

  const setRole = (nextRole: UserRole) => {
    settingsRepository.setRole(nextRole)
    setRoleState(nextRole)
  }

  const value = useMemo(
    () => ({
      role,
      setRole,
      canManageWorkouts: canManageWorkouts(role),
      canLogExecution: canLogExecution(role),
      canManageDayIntent: canManageDayIntent(role),
    }),
    [role],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within RoleProvider')
  }
  return context
}
