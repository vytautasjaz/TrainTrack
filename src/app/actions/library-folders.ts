'use server'

import { revalidatePath } from 'next/cache'
import { WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSession, isCoach } from '@/lib/session'

function requireCoachId() {
  return requireSession().then(async (session) => {
    if (!isCoach(session)) throw new Error('Coach only')
    return session.userId
  })
}

export async function createLibraryFolder(formData: FormData) {
  const coachId = await requireCoachId()
  const name = String(formData.get('name') ?? '').trim()
  const sportRaw = String(formData.get('sport') ?? '')
  const sport = Object.values(WorkoutType).includes(sportRaw as WorkoutType)
    ? (sportRaw as WorkoutType)
    : null
  if (!name) throw new Error('Folder name required')
  if (!sport || sport === WorkoutType.REST) throw new Error('Sport required')

  const maxSort = await prisma.workoutTemplateFolder.aggregate({
    where: { coachId, sport },
    _max: { sortOrder: true },
  })

  const folder = await prisma.workoutTemplateFolder.create({
    data: {
      coachId,
      sport,
      name,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  })

  revalidatePath('/workouts')
  return folder
}

export async function deleteLibraryFolder(formData: FormData) {
  const coachId = await requireCoachId()
  const folderId = String(formData.get('folderId') ?? '')
  if (!folderId) throw new Error('Folder required')

  const folder = await prisma.workoutTemplateFolder.findFirst({
    where: { id: folderId, coachId },
  })
  if (!folder) throw new Error('Folder not found')

  await prisma.$transaction([
    prisma.workoutTemplate.updateMany({
      where: { coachId, folderId },
      data: { folderId: null },
    }),
    prisma.workoutTemplateFolder.delete({ where: { id: folderId } }),
  ])

  revalidatePath('/workouts')
}

export async function moveTemplateToFolder(formData: FormData) {
  const coachId = await requireCoachId()
  const templateId = String(formData.get('templateId') ?? '')
  const folderIdRaw = formData.get('folderId')
  const folderId =
    folderIdRaw == null || String(folderIdRaw) === '' || String(folderIdRaw) === 'unfiled'
      ? null
      : String(folderIdRaw)

  if (!templateId) throw new Error('Template required')

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, coachId },
  })
  if (!template) throw new Error('Template not found')

  if (folderId) {
    const folder = await prisma.workoutTemplateFolder.findFirst({
      where: { id: folderId, coachId, sport: template.type },
    })
    if (!folder) throw new Error('Folder not found for this sport')
  }

  await prisma.workoutTemplate.update({
    where: { id: templateId },
    data: { folderId },
  })

  revalidatePath('/workouts')
}
