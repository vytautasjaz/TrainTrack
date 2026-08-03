'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession, resolveAthleteId } from '@/lib/session'

async function requireCoachOwnsFeedback(coachId: string, resultId: string) {
  const result = await prisma.workoutResult.findFirst({
    where: {
      id: resultId,
      workout: { athlete: { coachId } },
    },
    select: { id: true, workoutId: true },
  })
  if (!result) throw new Error('Feedback not found')
  return result
}

function revalidateFeedbackPaths(workoutId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/training')
  revalidatePath(`/workouts/${workoutId}`)
}

export async function dismissAthleteFeedback(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const resultId = formData.get('resultId') as string
  if (!resultId) throw new Error('Feedback required')

  const result = await requireCoachOwnsFeedback(session.userId, resultId)

  await prisma.workoutResult.update({
    where: { id: resultId },
    data: { feedbackDismissedAt: new Date() },
  })

  revalidateFeedbackPaths(result.workoutId)
}

async function requireCoachOwnsRaceReport(coachId: string, raceId: string) {
  const race = await prisma.race.findFirst({
    where: {
      id: raceId,
      athlete: { coachId },
      outcome: { in: ['FINISHED', 'DID_NOT_START', 'DNF'] },
    },
    select: { id: true, athleteId: true },
  })
  if (!race) throw new Error('Race report not found')
  return race
}

export async function dismissRaceReport(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const raceId = formData.get('raceId') as string
  if (!raceId) throw new Error('Race required')

  const race = await requireCoachOwnsRaceReport(session.userId, raceId)

  await prisma.race.update({
    where: { id: raceId },
    data: { resultDismissedAt: new Date() },
  })

  revalidatePath('/dashboard')
  revalidatePath('/races')
  revalidatePath(`/athletes/${race.athleteId}`)
}

export async function replyToAthleteFeedback(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'COACH') throw new Error('Coach only')

  const resultId = formData.get('resultId') as string
  const coachReply = ((formData.get('coachReply') as string) ?? '').trim()
  if (!resultId) throw new Error('Feedback required')
  if (!coachReply) throw new Error('Reply is required.')

  const result = await requireCoachOwnsFeedback(session.userId, resultId)

  await prisma.workoutResult.update({
    where: { id: resultId },
    data: {
      coachReply,
      coachRepliedAt: new Date(),
      coachReplyReadAt: null,
      feedbackDismissedAt: new Date(),
    },
  })

  revalidateFeedbackPaths(result.workoutId)
}

async function requireAthleteOwnsReply(athleteId: string, resultId?: string, workoutId?: string) {
  const result = await prisma.workoutResult.findFirst({
    where: {
      ...(resultId ? { id: resultId } : { workoutId }),
      coachReply: { not: null },
      workout: { athleteId },
    },
    select: { id: true, workoutId: true, coachReplyReadAt: true },
  })
  if (!result) throw new Error('Reply not found')
  return result
}

export async function markCoachReplyRead(formData: FormData) {
  const session = await requireSession()
  if (session.role !== 'ATHLETE') throw new Error('Athlete only')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) throw new Error('No athlete profile')

  const resultId = (formData.get('resultId') as string) || undefined
  const workoutId = (formData.get('workoutId') as string) || undefined
  if (!resultId && !workoutId) throw new Error('Reply required')

  const result = await requireAthleteOwnsReply(athleteId, resultId, workoutId)
  if (result.coachReplyReadAt) return

  await prisma.workoutResult.update({
    where: { id: result.id },
    data: { coachReplyReadAt: new Date() },
  })

  revalidateFeedbackPaths(result.workoutId)
}
