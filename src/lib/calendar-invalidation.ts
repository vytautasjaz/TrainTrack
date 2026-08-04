import { revalidatePath } from 'next/cache'
import { queueGoogleCalendarSync } from '@/lib/google-calendar-sync'

export async function onTrainingCalendarDataChanged(athleteId: string) {
  revalidatePath('/settings/preferences')
  await queueGoogleCalendarSync(athleteId)
}

export async function onRacesCalendarDataChanged(athleteId: string) {
  revalidatePath('/settings/preferences')
  await queueGoogleCalendarSync(athleteId)
}
