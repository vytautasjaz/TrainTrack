/**
 * Import the full RepDB free dataset (exercise-dataset.com) into the
 * TrainTrack Exercise library for Workout Builder search.
 *
 * License: in-app use with attribution — see RepDB LICENSE-DATA.md.
 * We hotlink hosted images; we do not re-publish the corpus as a dataset.
 *
 * - Matched names → enrich existing TrainTrack rows (media / copy)
 * - Unmatched → create `repdb_*` platform rows
 *
 *   npm run exercises:import-repdb
 */
import { Prisma } from '@prisma/client'
import {
  buildRepdbNameIndex,
  fetchRepdbIndex,
  matchRepdbExternal,
  repdbProvider,
  repdbRawToExternal,
  REPDB_ATTRIBUTION,
} from '@/lib/exercises/providers/repdb/adapter'
import { upsertExercises } from '@/lib/exercises/ingest/upsert'
import { exerciseMediaToPrisma } from '@/lib/exercises/media'
import { revalidateExerciseLibrary } from '@/lib/cache-tags'
import { prisma } from '@/lib/prisma'

async function main() {
  if (!repdbProvider.capabilities?.allowInAppImport) {
    throw new Error('RepDB provider does not allow in-app import')
  }
  if (!repdbProvider.import) {
    throw new Error('RepDB provider missing import()')
  }

  console.log('RepDB → TrainTrack Exercise import\n')
  console.log(`Attribution: ${REPDB_ATTRIBUTION}\n`)

  const raw = await fetchRepdbIndex()
  const external = raw.map(repdbRawToExternal)
  console.log(`Fetched: ${external.length} exercises\n`)

  const byName = buildRepdbNameIndex(external)

  const local = await prisma.exercise.findMany({
    where: { coachId: null, isActive: true },
    select: {
      id: true,
      canonicalName: true,
      aliases: true,
      instructions: true,
      coachingCues: true,
      shortDescription: true,
      media: true,
      sourceMetadata: true,
      source: true,
    },
  })

  const matchedSourceIds = new Set<string>()
  let enriched = 0

  for (const row of local) {
    // Skip rows that already are RepDB imports — they'll be upserted below.
    if (row.id.startsWith('repdb_')) continue

    const hit = matchRepdbExternal(byName, row.canonicalName, row.aliases)
    if (!hit) continue
    matchedSourceIds.add(hit.sourceId)

    const mediaJson = exerciseMediaToPrisma(hit.media ?? null)
    const prevMeta =
      row.sourceMetadata &&
      typeof row.sourceMetadata === 'object' &&
      !Array.isArray(row.sourceMetadata)
        ? { ...(row.sourceMetadata as Record<string, unknown>) }
        : {}

    await prisma.exercise.update({
      where: { id: row.id },
      data: {
        ...(hit.media?.items.length
          ? { media: mediaJson as Prisma.InputJsonValue }
          : {}),
        ...(!row.instructions?.trim() && hit.instructions
          ? { instructions: hit.instructions }
          : {}),
        ...(!row.shortDescription?.trim() && hit.shortDescription
          ? { shortDescription: hit.shortDescription }
          : {}),
        ...((!row.coachingCues || row.coachingCues.length === 0) &&
        hit.coachingCues?.length
          ? { coachingCues: hit.coachingCues }
          : {}),
        sourceMetadata: {
          ...prevMeta,
          repdbId: hit.sourceId,
          repdbEnrichedAt: new Date().toISOString(),
          attribution: REPDB_ATTRIBUTION,
        } satisfies Prisma.InputJsonValue,
      },
    })
    enriched += 1
  }

  const toCreate = external.filter((ex) => !matchedSourceIds.has(ex.sourceId))
  const records = toCreate.map((ex) => {
    const normalized = repdbProvider.toNormalized(ex)
    return {
      ...normalized,
      usageCount: 0,
      popularity: 0,
      isActive: true,
      coachId: null,
    }
  })

  const report = await upsertExercises(records)

  // revalidateTag needs a Next request context — skip in CLI scripts.
  try {
    revalidateExerciseLibrary()
  } catch {
    console.log('(cache tag revalidate skipped outside Next.js)\n')
  }

  const total = await prisma.exercise.count({
    where: { coachId: null, isActive: true },
  })
  const repdbCount = await prisma.exercise.count({
    where: { coachId: null, isActive: true, id: { startsWith: 'repdb_' } },
  })

  console.log(`Enriched existing (matched name): ${enriched}`)
  console.log(`New from RepDB: ${report.newCanonical}`)
  console.log(`Updated existing repdb_* rows: ${report.updated}`)
  console.log(`Skipped / invalid: ${report.skipped + report.invalid}`)
  console.log(`\nrepdb_* rows: ${repdbCount}`)
  console.log(`Platform library total: ${total}`)
  console.log('\nDone. Open Workout Builder — search should include RepDB moves.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
