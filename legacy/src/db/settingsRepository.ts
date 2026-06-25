import type { UserRole } from '../types/role'

const ROLE_KEY = 'traintrack_role'

export const settingsRepository = {
  getRole(): UserRole {
    const stored = localStorage.getItem(ROLE_KEY)
    return stored === 'trainee' ? 'trainee' : 'coach'
  },

  setRole(role: UserRole): void {
    localStorage.setItem(ROLE_KEY, role)
  },
}
