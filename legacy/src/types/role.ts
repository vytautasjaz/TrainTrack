export type UserRole = 'coach' | 'trainee'

export const USER_ROLES = [
  { value: 'coach' as const, label: 'Coach', description: 'Assign workouts and review trainee feedback' },
  { value: 'trainee' as const, label: 'Trainee', description: 'Log how workouts went and share future plans' },
]

export function canManageWorkouts(role: UserRole): boolean {
  return role === 'coach'
}

export function canLogExecution(role: UserRole): boolean {
  return role === 'trainee'
}

export function canManageDayIntent(role: UserRole): boolean {
  return role === 'trainee'
}
