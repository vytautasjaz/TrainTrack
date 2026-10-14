/**
 * Idempotent TrainTrack Exercise Library seed.
 *
 *   npm run exercises:seed
 */
import { traintrackProvider } from '@/lib/exercises/providers/traintrack/adapter'
import {
  emptyUpsertReport,
  upsertExercises,
} from '@/lib/exercises/ingest/upsert'
import { prisma } from '@/lib/prisma'

async function main() {
  console.log('TrainTrack Exercise Import\n')

  if (!traintrackProvider.import || !traintrackProvider.capabilities?.allowRedistribution) {
    throw new Error('TrainTrack provider cannot import')
  }

  const external = await traintrackProvider.import()
  console.log(`TrainTrack source:\n${external.length} records\n`)

  const records = external.map((row) => {
    const normalized = traintrackProvider.toNormalized(row)
    return {
      ...normalized,
      usageCount: 0,
      popularity: 0,
      isActive: normalized.isActive ?? true,
      coachId: normalized.coachId ?? null,
    }
  })
  const report = await upsertExercises(records)

  // External sources not imported in this command (licensing).
  const externalSkipped = emptyUpsertReport()

  console.log(`External source:\n0 records (licensing gate)\n`)
  console.log(`Normalized:\n${records.length}\n`)
  console.log(`New canonical:\n${report.newCanonical}\n`)
  console.log(`Updated:\n${report.updated}\n`)
  console.log(`Merged (variation links):\n${report.merged}\n`)
  console.log(`Duplicates:\n${report.duplicates}\n`)
  console.log(`Skipped:\n${report.skipped + externalSkipped.skipped}\n`)
  console.log(`Invalid:\n${report.invalid}\n`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
