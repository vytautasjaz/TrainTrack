/**
 * One-off: fill Workout.structureDiagram from structure for existing rows.
 * Run: npx tsx scripts/backfill-structure-diagrams.ts
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { computeStructureDiagramSnapshot } from '../src/lib/workout-builder/structure-diagram'

const prisma = new PrismaClient()

async function main() {
  const batchSize = 100
  let cursor: string | undefined
  let updated = 0
  let scanned = 0

  for (;;) {
    const rows = await prisma.workout.findMany({
      where: {
        structureDiagram: { equals: Prisma.DbNull },
        NOT: { structure: { equals: Prisma.DbNull } },
      },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        structure: true,
        plannedDuration: true,
      },
    })
    if (rows.length === 0) break

    for (const row of rows) {
      scanned += 1
      const snapshot = computeStructureDiagramSnapshot(row.structure, {
        durationMinutes: row.plannedDuration,
      })
      if (!snapshot) continue
      await prisma.workout.update({
        where: { id: row.id },
        data: { structureDiagram: snapshot },
      })
      updated += 1
    }

    cursor = rows[rows.length - 1]!.id
    if (rows.length < batchSize) break
  }

  console.log(`Scanned ${scanned}, updated ${updated}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
