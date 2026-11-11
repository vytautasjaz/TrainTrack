import type { DefaultSession } from 'next-auth'
import type { SwimDistanceUnit, UnitSystem, UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      roles: UserRole[]
      hasAthlete: boolean
      hasCoach: boolean
      onboardingSkipped: boolean
      /** Own athlete profile id when hasAthlete; avoids shell DB lookup. */
      athleteProfileId?: string | null
      unitSystem?: UnitSystem
      swimDistanceUnit?: SwimDistanceUnit
      /** Epoch ms of last JWT profile DB refresh. */
      profileRefreshedAt?: number
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
    athleteProfileId?: string | null
    unitSystem?: UnitSystem
    swimDistanceUnit?: SwimDistanceUnit
    profileRefreshedAt?: number
  }
}
