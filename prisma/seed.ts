import { PrismaClient, UserRole, WorkoutStatus, WorkoutType, RaceType } from '@prisma/client'
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  await prisma.workoutResult.deleteMany()
  await prisma.workout.deleteMany()
  await prisma.workoutTemplate.deleteMany()
  await prisma.race.deleteMany()
  await prisma.athlete.deleteMany()
  await prisma.user.deleteMany()

  const coach = await prisma.user.create({
    data: {
      name: 'Coach Alex',
      email: 'coach@traintrack.app',
      role: UserRole.COACH,
    },
  })

  const athleteUser = await prisma.user.create({
    data: {
      name: 'Jordan Lee',
      email: 'jordan@traintrack.app',
      role: UserRole.ATHLETE,
    },
  })

  const athlete = await prisma.athlete.create({
    data: {
      coachId: coach.id,
      userId: athleteUser.id,
      name: 'Jordan Lee',
    },
  })

  const templates = await Promise.all([
    prisma.workoutTemplate.create({
      data: {
        coachId: coach.id,
        title: 'Easy Run',
        type: WorkoutType.RUN,
        description: 'Conversational pace, HR Zone 2',
        distanceKm: 12,
        durationMin: 65,
        notes: 'Keep it relaxed. Focus on form.',
      },
    }),
    prisma.workoutTemplate.create({
      data: {
        coachId: coach.id,
        title: 'Long Run',
        type: WorkoutType.RUN,
        description: 'Aerobic endurance build',
        distanceKm: 22,
        durationMin: 120,
      },
    }),
    prisma.workoutTemplate.create({
      data: {
        coachId: coach.id,
        title: 'HYROX Simulation',
        type: WorkoutType.HYROX,
        description: 'Race-pace stations with short runs',
        durationMin: 75,
        notes: 'Full simulation — record splits.',
      },
    }),
    prisma.workoutTemplate.create({
      data: {
        coachId: coach.id,
        title: 'Recovery Run',
        type: WorkoutType.RECOVERY,
        distanceKm: 8,
        durationMin: 45,
      },
    }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })

  const weekPlan = [
    { offset: 0, template: templates[0], status: WorkoutStatus.COMPLETED },
    { offset: 1, template: templates[3], status: WorkoutStatus.COMPLETED },
    { offset: 2, template: templates[0], status: WorkoutStatus.PLANNED },
    { offset: 4, template: templates[1], status: WorkoutStatus.PLANNED },
    { offset: 5, template: templates[2], status: WorkoutStatus.PLANNED },
    { offset: 6, type: WorkoutType.REST, title: 'Rest Day', status: WorkoutStatus.PLANNED },
  ]

  for (const item of weekPlan) {
    const date = addDays(weekStart, item.offset)
    const workout = await prisma.workout.create({
      data: {
        athleteId: athlete.id,
        templateId: item.template?.id,
        date,
        type: item.template?.type ?? item.type!,
        title: item.template?.title ?? item.title!,
        description: item.template?.description,
        plannedDistance: item.template?.distanceKm,
        plannedDuration: item.template?.durationMin,
        coachNotes: item.template?.notes,
        status: item.status,
      },
    })

    if (item.status === WorkoutStatus.COMPLETED && item.template) {
      await prisma.workoutResult.create({
        data: {
          workoutId: workout.id,
          actualDistance: (item.template.distanceKm ?? 10) + 0.5,
          actualDuration: item.template.durationMin,
          rpe: 6,
          athleteNotes: 'Felt good. Legs a bit heavy in the last 2 km.',
        },
      })
    }
  }

  await prisma.race.create({
    data: {
      athleteId: athlete.id,
      name: 'Berlin Marathon',
      date: addDays(today, 134),
      location: 'Berlin, Germany',
      type: RaceType.MARATHON,
      goal: 'Sub 3:30',
    },
  })

  await prisma.race.create({
    data: {
      athleteId: athlete.id,
      name: 'HYROX World Championship',
      date: addDays(today, 210),
      location: 'Manchester, UK',
      type: RaceType.HYROX,
      goal: 'Top 20 age group',
    },
  })

  console.log('Seed complete')
  console.log(`Coach ID: ${coach.id}`)
  console.log(`Athlete user ID: ${athleteUser.id}`)
  console.log(`Athlete ID: ${athlete.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
