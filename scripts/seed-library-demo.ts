/**
 * Seed sample library folders + templates for a coach (Vytautas Test by default).
 * Run after folders migration:
 *   npx tsx scripts/seed-library-demo.ts
 */
import { PrismaClient, SessionType, WorkoutType } from '@prisma/client'

const prisma = new PrismaClient()

const COACH_EMAIL = process.env.SEED_COACH_EMAIL ?? 'vytautasjaz@gmail.com'

type SeedFolder = { key: string; sport: WorkoutType; name: string }
type SeedTemplate = {
  title: string
  type: WorkoutType
  sessionType: SessionType
  folderKey: string | null
  description: string
  distanceKm?: number
  durationMin?: number
  plannedDistanceMeters?: number
  structure?: object
}

function blockId(n: number) {
  return `seed-block-${n}`
}

function continuous(opts: {
  id: string
  order: number
  name: string
  km?: number
  min?: number
  target: string
}) {
  return {
    id: opts.id,
    order: opts.order,
    type: 'CONTINUOUS',
    name: opts.name,
    durationType: opts.km != null ? 'distance' : 'time',
    distance: opts.km,
    distanceUnit: 'km',
    time: opts.min,
    targets: [{ type: 'pace', value: opts.target }],
  }
}

function interval(opts: {
  id: string
  order: number
  name: string
  reps: number
  workM: number
  restM: number
  pace: string
  restPace?: string
}) {
  return {
    id: opts.id,
    order: opts.order,
    type: 'INTERVAL',
    name: opts.name,
    repetitions: opts.reps,
    work: { mode: 'distance', value: opts.workM, unit: 'm' },
    recovery: { mode: 'distance', value: opts.restM, unit: 'm' },
    targets: [
      { type: 'pace', value: opts.pace },
      { type: 'pace', value: opts.restPace ?? '5:30/km' },
    ],
  }
}

const FOLDERS: SeedFolder[] = [
  { key: 'run-threshold', sport: WorkoutType.RUN, name: 'Threshold' },
  { key: 'run-long', sport: WorkoutType.RUN, name: 'Long Runs' },
  { key: 'run-yee', sport: WorkoutType.RUN, name: 'Alex Yee training' },
  { key: 'run-easy', sport: WorkoutType.RUN, name: 'Easy / recovery' },
  { key: 'bike-ss', sport: WorkoutType.BIKE, name: 'Sweet spot' },
  { key: 'bike-endurance', sport: WorkoutType.BIKE, name: 'Endurance' },
  { key: 'swim-css', sport: WorkoutType.SWIM, name: 'CSS / threshold' },
  { key: 'str-gym', sport: WorkoutType.STRENGTH, name: 'Gym' },
]

const TEMPLATES: SeedTemplate[] = [
  {
    title: 'Tempo 8k',
    type: WorkoutType.RUN,
    sessionType: SessionType.TEMPO,
    folderKey: 'run-threshold',
    description: '2 km easy · 8 km @ threshold · 1 km cool-down',
    distanceKm: 11,
    durationMin: 55,
    structure: {
      version: 1,
      warmup: [
        continuous({
          id: blockId(1),
          order: 0,
          name: 'Warm up',
          km: 2,
          target: '5:30/km',
        }),
      ],
      mainSet: [
        continuous({
          id: blockId(2),
          order: 0,
          name: 'Tempo',
          km: 8,
          target: '4:00/km',
        }),
      ],
      cooldown: [
        continuous({
          id: blockId(3),
          order: 0,
          name: 'Cool down',
          km: 1,
          target: '5:30/km',
        }),
      ],
    },
  },
  {
    title: 'Yee threshold 4×2k',
    type: WorkoutType.RUN,
    sessionType: SessionType.THRESHOLD,
    folderKey: 'run-yee',
    description: 'WU · 4 × 2 km @ LT · 90″ jog · CD',
    distanceKm: 12,
    durationMin: 52,
    structure: {
      version: 1,
      warmup: [
        continuous({
          id: blockId(10),
          order: 0,
          name: 'Warm up',
          km: 2,
          target: '5:20/km',
        }),
      ],
      mainSet: [
        interval({
          id: blockId(11),
          order: 0,
          name: 'Threshold intervals',
          reps: 4,
          workM: 2000,
          restM: 400,
          pace: '3:50/km',
          restPace: '5:30/km',
        }),
      ],
      cooldown: [
        continuous({
          id: blockId(12),
          order: 0,
          name: 'Cool down',
          km: 1.5,
          target: '5:30/km',
        }),
      ],
    },
  },
  {
    title: 'VO2 5×3′',
    type: WorkoutType.RUN,
    sessionType: SessionType.VO2_MAX,
    folderKey: 'run-yee',
    description: 'WU · 5 × 3′ @ VO2 · 2′ jog · CD',
    durationMin: 48,
    distanceKm: 10,
    structure: {
      version: 1,
      warmup: [
        continuous({
          id: blockId(20),
          order: 0,
          name: 'Warm up',
          min: 15,
          target: '5:20/km',
        }),
      ],
      mainSet: [
        {
          id: blockId(21),
          order: 0,
          type: 'INTERVAL',
          name: 'VO2 intervals',
          repetitions: 5,
          work: { mode: 'time', value: 3, unit: 'min' },
          recovery: { mode: 'time', value: 2, unit: 'min' },
          targets: [
            { type: 'rpe', value: 'VO2' },
            { type: 'rpe', value: 'Easy' },
          ],
        },
      ],
      cooldown: [
        continuous({
          id: blockId(22),
          order: 0,
          name: 'Cool down',
          min: 10,
          target: '5:30/km',
        }),
      ],
    },
  },
  {
    title: 'Long 18k',
    type: WorkoutType.RUN,
    sessionType: SessionType.LONG_RUN,
    folderKey: 'run-long',
    description: 'Steady Z2 · last 3 km slightly up',
    distanceKm: 18,
    durationMin: 105,
    structure: {
      version: 1,
      warmup: [],
      mainSet: [
        continuous({
          id: blockId(30),
          order: 0,
          name: 'Long run',
          km: 18,
          target: '5:15/km',
        }),
      ],
      cooldown: [],
    },
  },
  {
    title: 'Easy shakeout',
    type: WorkoutType.RUN,
    sessionType: SessionType.EASY_RUN,
    folderKey: 'run-easy',
    description: 'Conversational pace. Strides optional.',
    distanceKm: 8,
    durationMin: 45,
  },
  {
    title: 'Cruise intervals 6×1k',
    type: WorkoutType.RUN,
    sessionType: SessionType.INTERVALS,
    folderKey: 'run-threshold',
    description: 'WU · 6 × 1 km cruise · 60″ · CD',
    distanceKm: 14,
    durationMin: 58,
    structure: {
      version: 1,
      warmup: [
        continuous({
          id: blockId(40),
          order: 0,
          name: 'Warm up',
          km: 3,
          target: '5:20/km',
        }),
      ],
      mainSet: [
        interval({
          id: blockId(41),
          order: 0,
          name: 'Cruise intervals',
          reps: 6,
          workM: 1000,
          restM: 200,
          pace: '3:55/km',
        }),
      ],
      cooldown: [
        continuous({
          id: blockId(42),
          order: 0,
          name: 'Cool down',
          km: 2,
          target: '5:30/km',
        }),
      ],
    },
  },
  {
    title: 'Sweet spot 3×12′',
    type: WorkoutType.BIKE,
    sessionType: SessionType.TEMPO,
    folderKey: 'bike-ss',
    description: 'WU · 3 × 12′ sweet spot · 5′ easy · CD',
    durationMin: 75,
    structure: {
      version: 1,
      warmup: [
        {
          id: blockId(50),
          order: 0,
          type: 'CONTINUOUS',
          name: 'Warm up',
          durationType: 'time',
          time: 15,
          targets: [{ type: 'power', value: '150' }],
        },
      ],
      mainSet: [
        {
          id: blockId(51),
          order: 0,
          type: 'INTERVAL',
          name: 'Sweet spot',
          repetitions: 3,
          work: { mode: 'time', value: 12, unit: 'min' },
          recovery: { mode: 'time', value: 5, unit: 'min' },
          targets: [
            { type: 'power', value: '250' },
            { type: 'power', value: '140' },
          ],
        },
      ],
      cooldown: [
        {
          id: blockId(52),
          order: 0,
          type: 'CONTINUOUS',
          name: 'Cool down',
          durationType: 'time',
          time: 10,
          targets: [{ type: 'power', value: '120' }],
        },
      ],
    },
  },
  {
    title: 'Endurance 2h',
    type: WorkoutType.BIKE,
    sessionType: SessionType.EASY_RUN,
    folderKey: 'bike-endurance',
    description: 'Steady Z2 endurance ride',
    durationMin: 120,
    distanceKm: 55,
  },
  {
    title: 'CSS 8×100',
    type: WorkoutType.SWIM,
    sessionType: SessionType.THRESHOLD,
    folderKey: 'swim-css',
    description: '200 easy · 8 × 100 @ CSS · 20″ rest · 200 easy',
    durationMin: 45,
    plannedDistanceMeters: 1400,
  },
  {
    title: 'Full body strength',
    type: WorkoutType.STRENGTH,
    sessionType: SessionType.STRENGTH,
    folderKey: 'str-gym',
    description: 'Squat · hinge · push · pull · core. 3×8–10.',
    durationMin: 50,
  },
  {
    title: 'Race-pace 3×1k',
    type: WorkoutType.RUN,
    sessionType: SessionType.RACE_PACE,
    folderKey: 'run-yee',
    description: 'WU · 3 × 1 km race pace · 3′ · CD',
    distanceKm: 9,
    durationMin: 40,
    structure: {
      version: 1,
      warmup: [
        continuous({
          id: blockId(60),
          order: 0,
          name: 'Warm up',
          km: 2,
          target: '5:20/km',
        }),
      ],
      mainSet: [
        interval({
          id: blockId(61),
          order: 0,
          name: 'Race pace',
          reps: 3,
          workM: 1000,
          restM: 400,
          pace: '3:30/km',
        }),
      ],
      cooldown: [
        continuous({
          id: blockId(62),
          order: 0,
          name: 'Cool down',
          km: 1.5,
          target: '5:30/km',
        }),
      ],
    },
  },
]

async function main() {
  const coach = await prisma.user.findFirst({
    where: {
      OR: [
        { email: COACH_EMAIL },
        { name: { contains: 'Vytautas', mode: 'insensitive' } },
      ],
    },
  })
  if (!coach) {
    throw new Error(`Coach not found for ${COACH_EMAIL}`)
  }

  console.log(`Seeding library for ${coach.name} (${coach.email})…`)

  const folderIds = new Map<string, string>()
  for (const [i, f] of FOLDERS.entries()) {
    const row = await prisma.workoutTemplateFolder.upsert({
      where: {
        coachId_sport_name: {
          coachId: coach.id,
          sport: f.sport,
          name: f.name,
        },
      },
      create: {
        coachId: coach.id,
        sport: f.sport,
        name: f.name,
        sortOrder: i + 1,
      },
      update: { sortOrder: i + 1 },
    })
    folderIds.set(f.key, row.id)
  }

  let created = 0
  let skipped = 0
  for (const t of TEMPLATES) {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { coachId: coach.id, title: t.title, type: t.type },
    })
    if (existing) {
      skipped += 1
      continue
    }
    await prisma.workoutTemplate.create({
      data: {
        coachId: coach.id,
        folderId: t.folderKey ? folderIds.get(t.folderKey) ?? null : null,
        title: t.title,
        type: t.type,
        sessionType: t.sessionType,
        description: t.description,
        distanceKm: t.distanceKm ?? null,
        durationMin: t.durationMin ?? null,
        plannedDistanceMeters: t.plannedDistanceMeters ?? null,
        structure: t.structure ?? undefined,
        tags: ['demo-seed'],
      },
    })
    created += 1
  }

  console.log(`Folders: ${FOLDERS.length} · templates created: ${created} · skipped: ${skipped}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
