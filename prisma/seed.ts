import { PrismaClient, UserRole, WorkoutStatus, WorkoutType, CoachAthleteLinkStatus } from '@prisma/client'
import { addDays, startOfWeek } from 'date-fns'
import { generateCoachingCode } from '../src/lib/coaching-code'

const prisma = new PrismaClient()

const DEFAULT_SKILL_SLUGS = [
  'run-5k-build',
  'run-half-marathon',
  'run-marathon',
  'hyrox-general',
  'multi-sport-base',
  'adapt-plan',
] as const

async function seedSubscriptionPlans() {
  const plans = [
    {
      slug: 'free',
      name: 'Free',
      description: 'Core training tools without AI drafts.',
      priceCents: 0,
      aiDraftsPerMonth: 0,
      aiAdaptsPerMonth: 0,
      maxPlanWeeks: 12,
      enabledSkillSlugs: [] as string[],
      sortOrder: 0,
    },
    {
      slug: 'coach-ai',
      name: 'Coach AI',
      description: 'AI draft and adapt skills for coaches.',
      priceCents: 2900,
      aiDraftsPerMonth: 20,
      aiAdaptsPerMonth: 10,
      maxPlanWeeks: 24,
      enabledSkillSlugs: [...DEFAULT_SKILL_SLUGS],
      sortOrder: 1,
    },
    {
      slug: 'athlete-ai',
      name: 'Athlete AI',
      description: 'Self-coaching AI drafts from your training history.',
      priceCents: 1500,
      aiDraftsPerMonth: 8,
      aiAdaptsPerMonth: 4,
      maxPlanWeeks: 16,
      enabledSkillSlugs: [...DEFAULT_SKILL_SLUGS],
      sortOrder: 2,
    },
  ]

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      create: {
        ...plan,
        interval: 'month',
        isActive: true,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        aiDraftsPerMonth: plan.aiDraftsPerMonth,
        aiAdaptsPerMonth: plan.aiAdaptsPerMonth,
        maxPlanWeeks: plan.maxPlanWeeks,
        enabledSkillSlugs: plan.enabledSkillSlugs,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
    })
  }
}

async function main() {
  await prisma.aiUsageEvent.deleteMany().catch(() => undefined)
  await prisma.userMembership.deleteMany().catch(() => undefined)
  await prisma.workoutResult.deleteMany()
  await prisma.workout.deleteMany()
  await prisma.workoutTemplate.deleteMany()
  await prisma.raceLeg.deleteMany().catch(() => undefined)
  await prisma.race.deleteMany()
  await prisma.coachAthleteLink.deleteMany()
  await prisma.coachProfile.deleteMany()
  await prisma.athleteWeekPlanSportRow.deleteMany().catch(() => undefined)
  await prisma.athleteWeekHiddenPlanSportRow.deleteMany().catch(() => undefined)
  await prisma.dayNote.deleteMany().catch(() => undefined)
  await prisma.seasonPhaseBlock.deleteMany().catch(() => undefined)
  await prisma.stravaConnection.deleteMany().catch(() => undefined)
  await prisma.account.deleteMany().catch(() => undefined)
  await prisma.session.deleteMany().catch(() => undefined)
  await prisma.athlete.deleteMany()
  await prisma.user.deleteMany()

  await seedSubscriptionPlans()

  const coach = await prisma.user.create({
    data: {
      name: 'Coach Alex',
      email: 'coach@traintrack.app',
      roles: [UserRole.COACH],
    },
  })

  const coachProfile = await prisma.coachProfile.create({
    data: {
      userId: coach.id,
      coachingCode: generateCoachingCode(),
    },
  })

  const athleteUser = await prisma.user.create({
    data: {
      name: 'Jordan Lee',
      email: 'jordan@traintrack.app',
      roles: [UserRole.ATHLETE],
    },
  })

  const athlete = await prisma.athlete.create({
    data: {
      coachId: coach.id,
      userId: athleteUser.id,
      name: 'Jordan Lee',
    },
  })

  await prisma.coachAthleteLink.create({
    data: {
      coachProfileId: coachProfile.id,
      athleteId: athlete.id,
      status: CoachAthleteLinkStatus.ACCEPTED,
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

  console.log('Seeded Coach Alex (%s) + Jordan Lee', coachProfile.coachingCode)
  console.log('Seeded subscription plans: free, coach-ai, athlete-ai')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
