import type { DefaultSession } from 'next-auth'
import type { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      roles: UserRole[]
      hasAthlete: boolean
      hasCoach: boolean
      onboardingSkipped: boolean
    }
  }

  interface User {
    roles?: UserRole[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roles?: UserRole[]
    hasAthlete?: boolean
    hasCoach?: boolean
    onboardingSkipped?: boolean
  }
}
