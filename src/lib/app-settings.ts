import { cache } from 'react'
import { prisma } from '@/lib/prisma'

export type AppSettingsFlags = {
  coachActivityFeedEnabled: boolean
  athleteActivityFeedEnabled: boolean
}

const DEFAULTS: AppSettingsFlags = {
  coachActivityFeedEnabled: true,
  athleteActivityFeedEnabled: true,
}

/** Request-scoped; ensures the singleton row exists. */
export const getAppSettings = cache(async (): Promise<AppSettingsFlags> => {
  const row = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      coachActivityFeedEnabled: true,
      athleteActivityFeedEnabled: true,
    },
    update: {},
    select: {
      coachActivityFeedEnabled: true,
      athleteActivityFeedEnabled: true,
    },
  })
  return {
    coachActivityFeedEnabled: row.coachActivityFeedEnabled,
    athleteActivityFeedEnabled: row.athleteActivityFeedEnabled,
  }
})

export function defaultAppSettings(): AppSettingsFlags {
  return { ...DEFAULTS }
}
