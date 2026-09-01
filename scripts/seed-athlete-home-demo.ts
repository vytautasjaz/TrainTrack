/**
 * Seed richer Home demo data for Vytautas Test (athlete profile):
 * last / this / next week workouts + upcoming races.
 *
 *   npx tsx scripts/seed-athlete-home-demo.ts
 *
 * Idempotent: replaces rows tagged `home-demo-seed` (workouts) / goal marker (races).
 */
import {
  PrismaClient,
  RaceIntent,
  RacePriority,
  RaceType,
  SessionType,
  WorkoutStatus,
  WorkoutType,
} from '@prisma/client'
import { format, startOfWeek } from 'date-fns'
import { addDateOnlyDays, parseDateOnly, todayDateKey, toDateKey } from '../src/lib/dates'

const prisma = new PrismaClient()

const SEED_TAG = 'home-demo-seed'
const RACE_GOAL_MARKER = '[home-demo-seed]'
const ATHLETE_EMAIL = process.env.SEED_ATHLETE_EMAIL ?? 'vytautasjaz@gmail.com'

type SeedWorkout = {
  /** Days from Monday of current week (negative = last week) */
  weekOffset: number
  title: string
  type: WorkoutType
  sessionType?: SessionType
  description?: string
  plannedDistance?: number
  plannedDuration?: number
  status: WorkoutStatus
  sortOrder?: number
  actualDistance?: number
  actualDuration?: number
  feeling?: number
}

const WORKOUTS: SeedWorkout[] = [
  // —— Last week (Mon–Sun) ——
  {
    weekOffset: -7,
    title: 'Easy Run',
    type: WorkoutType.RUN,
    sessionType: SessionType.EASY_RUN,
    description: '10 km · Z2',
    plannedDistance: 10,
    plannedDuration: 55,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 10.2,
    actualDuration: 52,
    feeling: 8,
  },
  {
    weekOffset: -6,
    title: 'Endurance Ride',
    type: WorkoutType.BIKE,
    description: '90 min · Z2',
    plannedDistance: 45,
    plannedDuration: 90,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 46,
    actualDuration: 92,
    feeling: 7,
  },
  {
    weekOffset: -5,
    title: 'Pull focus',
    type: WorkoutType.SWIM,
    description: '2.4 km · paddles',
    plannedDistance: 2.4,
    plannedDuration: 55,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 2.4,
    actualDuration: 54,
    feeling: 8,
  },
  {
    weekOffset: -4,
    title: 'Hills',
    type: WorkoutType.RUN,
    sessionType: SessionType.HILL_REPEATS,
    description: '8 × 90″ @ 5k effort',
    plannedDistance: 8,
    plannedDuration: 50,
    status: WorkoutStatus.SKIPPED,
  },
  {
    weekOffset: -3,
    title: 'Lower body',
    type: WorkoutType.STRENGTH,
    sessionType: SessionType.STRENGTH,
    description: '40 min · gym',
    plannedDuration: 40,
    status: WorkoutStatus.COMPLETED,
    actualDuration: 42,
    feeling: 7,
  },
  {
    weekOffset: -2,
    title: 'Group ride',
    type: WorkoutType.BIKE,
    description: '70 km · mixed',
    plannedDistance: 70,
    plannedDuration: 150,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 72,
    actualDuration: 155,
    feeling: 9,
  },
  {
    weekOffset: -1,
    title: 'Long Run',
    type: WorkoutType.RUN,
    sessionType: SessionType.LONG_RUN,
    description: '18 km · Z2',
    plannedDistance: 18,
    plannedDuration: 105,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 18.1,
    actualDuration: 102,
    feeling: 8,
  },

  // —— This week ——
  {
    weekOffset: 0,
    title: 'Threshold Intervals',
    type: WorkoutType.RUN,
    sessionType: SessionType.THRESHOLD,
    description: '3 × 2 km @ Threshold',
    plannedDistance: 12,
    plannedDuration: 65,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 12.1,
    actualDuration: 64,
    feeling: 7,
  },
  {
    weekOffset: 1,
    title: 'Full body',
    type: WorkoutType.STRENGTH,
    sessionType: SessionType.STRENGTH,
    description: '45 min · gym',
    plannedDuration: 45,
    status: WorkoutStatus.COMPLETED,
    actualDuration: 45,
    feeling: 8,
  },
  {
    weekOffset: 2,
    title: 'CSS set',
    type: WorkoutType.SWIM,
    description: '8 × 100 @ CSS + 20″',
    plannedDistance: 2.5,
    plannedDuration: 50,
    status: WorkoutStatus.COMPLETED,
    actualDistance: 2.5,
    actualDuration: 48,
    feeling: 8,
  },
  // Today (Thu = offset 3) — rich Home cards
  {
    weekOffset: 3,
    title: 'Easy Run',
    type: WorkoutType.RUN,
    sessionType: SessionType.EASY_RUN,
    description: '10 km · Z2',
    plannedDistance: 10,
    plannedDuration: 55,
    status: WorkoutStatus.COMPLETED,
    sortOrder: 0,
    actualDistance: 10.2,
    actualDuration: 52,
    feeling: 8,
  },
  {
    weekOffset: 3,
    title: 'Upper Body',
    type: WorkoutType.STRENGTH,
    sessionType: SessionType.STRENGTH,
    description: 'Pull · push · core · 3 rounds',
    plannedDuration: 45,
    status: WorkoutStatus.PLANNED,
    sortOrder: 1,
  },
  {
    weekOffset: 3,
    title: 'Recovery Flow',
    type: WorkoutType.RECOVERY,
    description: 'Hips · T-spine · breath-led',
    plannedDuration: 20,
    status: WorkoutStatus.PLANNED,
    sortOrder: 2,
  },
  {
    weekOffset: 4,
    title: 'Strides + drills',
    type: WorkoutType.RUN,
    sessionType: SessionType.INTERVALS,
    description: '8 km · 6 × 20″ strides',
    plannedDistance: 8,
    plannedDuration: 50,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 5,
    title: 'Long Ride',
    type: WorkoutType.BIKE,
    description: '80 km · Z2',
    plannedDistance: 80,
    plannedDuration: 170,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 6,
    title: 'Swim Easy',
    type: WorkoutType.SWIM,
    description: '2.0 km · technique',
    plannedDistance: 2,
    plannedDuration: 45,
    status: WorkoutStatus.PLANNED,
  },

  // —— Next week ——
  {
    weekOffset: 7,
    title: 'Threshold Intervals',
    type: WorkoutType.RUN,
    sessionType: SessionType.THRESHOLD,
    description: '3 × 2 km @ Threshold',
    plannedDistance: 12,
    plannedDuration: 65,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 8,
    title: 'Full body',
    type: WorkoutType.STRENGTH,
    sessionType: SessionType.STRENGTH,
    description: '45 min · gym',
    plannedDuration: 45,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 9,
    title: 'Sweet Spot',
    type: WorkoutType.BIKE,
    description: '2 × 20 min @ 88% FTP',
    plannedDistance: 40,
    plannedDuration: 75,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 10,
    title: 'Easy Aerobic',
    type: WorkoutType.RUN,
    sessionType: SessionType.EASY_RUN,
    description: '12 km · Z2',
    plannedDistance: 12,
    plannedDuration: 65,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 11,
    title: 'CSS set',
    type: WorkoutType.SWIM,
    description: '8 × 100 @ CSS + 20″',
    plannedDistance: 2.8,
    plannedDuration: 55,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 12,
    title: 'Long Run',
    type: WorkoutType.RUN,
    sessionType: SessionType.LONG_RUN,
    description: '22 km · progressive',
    plannedDistance: 22,
    plannedDuration: 125,
    status: WorkoutStatus.PLANNED,
  },
  {
    weekOffset: 13,
    title: 'Mobility + walk',
    type: WorkoutType.RECOVERY,
    description: '40 min · easy',
    plannedDuration: 40,
    status: WorkoutStatus.PLANNED,
  },
]

type SeedRace = {
  name: string
  /** Days from today */
  daysFromToday: number
  location: string
  type: RaceType
  sport: WorkoutType
  priority: RacePriority
}

const RACES: SeedRace[] = [
  {
    name: 'Vilnius Half Marathon',
    daysFromToday: 16,
    location: 'Vilnius, LT',
    type: RaceType.HALF_MARATHON,
    sport: WorkoutType.RUN,
    priority: RacePriority.A,
  },
  {
    name: 'Kaunas Marathon',
    daysFromToday: 52,
    location: 'Kaunas, LT',
    type: RaceType.MARATHON,
    sport: WorkoutType.RUN,
    priority: RacePriority.A,
  },
  {
    name: 'Druskininkai 10K',
    daysFromToday: 67,
    location: 'Druskininkai, LT',
    type: RaceType.TEN_K,
    sport: WorkoutType.RUN,
    priority: RacePriority.B,
  },
  {
    name: 'Ironman 70.3 Tallinn',
    daysFromToday: 312,
    location: 'Tallinn, EE',
    type: RaceType.TRIATHLON,
    sport: WorkoutType.TRIATHLON,
    priority: RacePriority.A,
  },
  {
    name: 'Berlin Marathon',
    daysFromToday: 396,
    location: 'Berlin, DE',
    type: RaceType.MARATHON,
    sport: WorkoutType.RUN,
    priority: RacePriority.B,
  },
]

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: ATHLETE_EMAIL },
        { name: { equals: 'Vytautas Test', mode: 'insensitive' } },
      ],
    },
    include: { athleteProfile: true },
  })
  if (!user?.athleteProfile) {
    throw new Error(`Athlete not found for ${ATHLETE_EMAIL} / Vytautas Test`)
  }

  const athleteId = user.athleteProfile.id
  const todayKey = todayDateKey()
  const today = parseDateOnly(todayKey)
  // Local calendar Monday (avoid UTC shift from Date#toISOString)
  const weekStart = parseDateOnly(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  )

  console.log(
    `Seeding Home demo for ${user.name} (${user.email}) · athlete ${athleteId}`,
  )
  console.log(`Today ${todayKey} · week start ${toDateKey(weekStart)}`)

  // Remove previous seed workouts (+ results cascade)
  const deletedWorkouts = await prisma.workout.deleteMany({
    where: { athleteId, tags: { has: SEED_TAG } },
  })
  console.log(`Removed ${deletedWorkouts.count} prior seeded workouts`)

  let created = 0
  for (const item of WORKOUTS) {
    const date = addDateOnlyDays(weekStart, item.weekOffset)
    // Skip future-status overrides: if date is before today and still PLANNED, leave as-is
    // (seed list already sets completed/skipped for past).
    const workout = await prisma.workout.create({
      data: {
        athleteId,
        date,
        type: item.type,
        sessionType: item.sessionType ?? SessionType.CUSTOM,
        title: item.title,
        description: item.description ?? null,
        plannedDistance: item.plannedDistance ?? null,
        plannedDuration: item.plannedDuration ?? null,
        status: item.status,
        sortOrder: item.sortOrder ?? 0,
        tags: [SEED_TAG],
      },
    })
    if (
      item.status === WorkoutStatus.COMPLETED &&
      (item.actualDistance != null || item.actualDuration != null)
    ) {
      await prisma.workoutResult.create({
        data: {
          workoutId: workout.id,
          actualDistance: item.actualDistance ?? null,
          actualDuration: item.actualDuration ?? null,
          feeling: item.feeling ?? null,
          rpe: item.feeling ? Math.min(10, Math.max(1, 11 - item.feeling)) : null,
          athleteNotes: 'Demo seed — felt solid.',
        },
      })
    }
    created += 1
  }
  console.log(`Created ${created} workouts`)

  const deletedRaces = await prisma.race.deleteMany({
    where: { athleteId, goal: RACE_GOAL_MARKER },
  })
  console.log(`Removed ${deletedRaces.count} prior seeded races`)

  for (const race of RACES) {
    await prisma.race.create({
      data: {
        athleteId,
        name: race.name,
        date: addDateOnlyDays(today, race.daysFromToday),
        location: race.location,
        type: race.type,
        sport: race.sport,
        priority: race.priority,
        intent: RaceIntent.PLANNED,
        goal: RACE_GOAL_MARKER,
        resultsLogOnly: false,
      },
    })
  }
  console.log(`Created ${RACES.length} races`)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
