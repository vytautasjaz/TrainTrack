import type { ExerciseSource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exerciseMediaToPrisma } from '@/lib/exercises/media'
import type { ExerciseRecord } from '@/lib/exercises/types'

export type UpsertExerciseReport = {
  newCanonical: number
  updated: number
  skipped: number
  invalid: number
  merged: number
  duplicates: number
}

export function emptyUpsertReport(): UpsertExerciseReport {
  return {
    newCanonical: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
    merged: 0,
    duplicates: 0,
  }
}

function toPrismaData(
  record: ExerciseRecord,
): Prisma.ExerciseUncheckedCreateInput {
  return {
    id: record.id,
    canonicalName: record.canonicalName,
    aliases: record.aliases,
    searchTerms: record.searchTerms,
    category: record.category,
    movementPattern: record.movementPattern ?? null,
    equipment: record.equipment,
    primaryMuscles: record.primaryMuscles,
    secondaryMuscles: record.secondaryMuscles,
    prescriptionTypes: record.prescriptionTypes,
    modalities: record.modalities,
    difficulty: record.difficulty ?? null,
    instructions: record.instructions ?? null,
    shortDescription: record.shortDescription ?? null,
    coachingCues: record.coachingCues ?? [],
    commonMistakes: record.commonMistakes ?? [],
    media: exerciseMediaToPrisma(record.media ?? null),
    variationType: record.variationType ?? null,
    // Apply canonical links in a second pass so parents exist first.
    canonicalExerciseId: null,
    source: record.source as ExerciseSource,
    sourceId: record.sourceId ?? null,
    sourceMetadata: record.sourceId
      ? ({
          importedFrom: record.source,
          sourceId: record.sourceId,
        } satisfies Prisma.InputJsonValue)
      : undefined,
    coachId: record.coachId ?? null,
    isActive: record.isActive ?? true,
  }
}

/**
 * Idempotent upsert by stable id. Canonical FKs applied afterward.
 */
export async function upsertExercises(
  records: ExerciseRecord[],
): Promise<UpsertExerciseReport> {
  const report = emptyUpsertReport()
  const seen = new Set<string>()

  for (const record of records) {
    if (!record.id || !record.canonicalName) {
      report.invalid += 1
      continue
    }
    if (seen.has(record.id)) {
      report.duplicates += 1
      continue
    }
    seen.add(record.id)

    const existing = await prisma.exercise.findUnique({
      where: { id: record.id },
      select: { id: true },
    })
    const data = toPrismaData(record)
    if (existing) {
      await prisma.exercise.update({
        where: { id: record.id },
        data: {
          canonicalName: data.canonicalName,
          aliases: data.aliases,
          searchTerms: data.searchTerms,
          category: data.category,
          movementPattern: data.movementPattern,
          equipment: data.equipment,
          primaryMuscles: data.primaryMuscles,
          secondaryMuscles: data.secondaryMuscles,
          prescriptionTypes: data.prescriptionTypes,
          modalities: data.modalities,
          difficulty: data.difficulty,
          instructions: data.instructions,
          shortDescription: data.shortDescription,
          coachingCues: data.coachingCues,
          commonMistakes: data.commonMistakes,
          ...(data.media != null ? { media: data.media } : {}),
          variationType: data.variationType,
          source: data.source,
          sourceId: data.sourceId,
          sourceMetadata: data.sourceMetadata,
          isActive: data.isActive,
        },
      })
      report.updated += 1
    } else {
      await prisma.exercise.create({ data })
      report.newCanonical += 1
    }
  }

  // Second pass: variation → canonical links
  for (const record of records) {
    if (!record.canonicalExerciseId) continue
    if (record.canonicalExerciseId === record.id) continue
    const parent = await prisma.exercise.findUnique({
      where: { id: record.canonicalExerciseId },
      select: { id: true },
    })
    if (!parent) continue
    await prisma.exercise.update({
      where: { id: record.id },
      data: {
        canonicalExerciseId: record.canonicalExerciseId,
        variationType: record.variationType,
      },
    })
    report.merged += 1
  }

  return report
}
