/**
 * Enrich TrainTrack Exercise rows with RepDB media / copy only.
 * Clears leftover Free Exercise DB media so we no longer depend on that source.
 *
 * Prefer in-place match by normalized name — does not create duplicate rows.
 * RepDB: commercial in-app use with attribution (see LICENSE-DATA.md).
 *
 *   npm run exercises:enrich-media
 */
import { Prisma } from '@prisma/client'
import {
  buildRepdbNameIndex,
  fetchRepdbIndex,
  matchRepdbExternal,
  repdbRawToExternal,
  REPDB_ATTRIBUTION,
} from '@/lib/exercises/providers/repdb/adapter'
import { exerciseMediaToPrisma, parseExerciseMedia } from '@/lib/exercises/media'
import { prisma } from '@/lib/prisma'

function isFedbMedia(raw: unknown): boolean {
  const media = parseExerciseMedia(raw)
  if (!media?.items.length) return false
  return media.items.some(
    (item) =>
      item.source === 'FREE_EXERCISE_DB' ||
      /free exercise db|yuhonas|raw\.githubusercontent\.com\/yuhonas/i.test(
        `${item.attribution ?? ''} ${item.url}`,
      ),
  )
}

async function main() {
  console.log('Exercise media enrich (RepDB only)\n')

  const repdbRaw = await fetchRepdbIndex()
  console.log(`RepDB: ${repdbRaw.length} exercises\n`)

  const repdbByName = buildRepdbNameIndex(repdbRaw.map(repdbRawToExternal))

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
    },
  })

  let matched = 0
  let updated = 0
  let clearedFedb = 0
  let skippedNoMedia = 0
  let unmatched = 0

  for (const row of local) {
    const hit = matchRepdbExternal(
      repdbByName,
      row.canonicalName,
      row.aliases,
    )

    const prevMeta =
      row.sourceMetadata &&
      typeof row.sourceMetadata === 'object' &&
      !Array.isArray(row.sourceMetadata)
        ? { ...(row.sourceMetadata as Record<string, unknown>) }
        : {}

    // Drop FEDB provenance keys when rewriting metadata.
    delete prevMeta.freeExerciseDbId
    delete prevMeta.freeExerciseDbEnrichedAt

    if (!hit) {
      unmatched += 1
      if (isFedbMedia(row.media) || prevMeta.mediaProvider === 'FEDB') {
        await prisma.exercise.update({
          where: { id: row.id },
          data: {
            media: Prisma.DbNull,
            sourceMetadata: {
              ...prevMeta,
              mediaProvider: null,
              mediaSourceId: null,
              mediaAttribution: null,
              mediaClearedFedbAt: new Date().toISOString(),
            } satisfies Prisma.InputJsonValue,
          },
        })
        clearedFedb += 1
      }
      continue
    }

    matched += 1
    if (!hit.media?.items.length) {
      skippedNoMedia += 1
      continue
    }

    const mediaJson = exerciseMediaToPrisma(hit.media)

    await prisma.exercise.update({
      where: { id: row.id },
      data: {
        media: mediaJson as Prisma.InputJsonValue,
        instructions: row.instructions?.trim()
          ? row.instructions
          : (hit.instructions ?? null),
        shortDescription: row.shortDescription?.trim()
          ? row.shortDescription
          : (hit.shortDescription ?? null),
        coachingCues:
          row.coachingCues.length > 0
            ? row.coachingCues
            : (hit.coachingCues ?? []),
        sourceMetadata: {
          ...prevMeta,
          mediaProvider: 'REPDB',
          mediaSourceId: hit.sourceId,
          mediaAttribution: REPDB_ATTRIBUTION,
          mediaEnrichedAt: new Date().toISOString(),
          repdbId: hit.sourceId,
        } satisfies Prisma.InputJsonValue,
      },
    })
    updated += 1
  }

  console.log(`Local platform exercises: ${local.length}`)
  console.log(`Matched RepDB: ${matched}`)
  console.log(`Updated with RepDB media: ${updated}`)
  console.log(`Cleared Free Exercise DB leftovers: ${clearedFedb}`)
  console.log(`Matched but no images: ${skippedNoMedia}`)
  console.log(`Unmatched (no RepDB): ${unmatched}`)
  console.log(
    `\nAttribution: show "${REPDB_ATTRIBUTION}" in exercise details.`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
