import { config } from 'dotenv'
config({ path: '.env' })

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  const deleted = await prisma.coachEngineWorkout.deleteMany({})
  console.log(`Deleted ${deleted.count} existing AI library workouts`)

  const { seedCoachEngineWorkoutsFromCode } = await import(
    '../src/lib/coach-engine/library-store'
  )
  const count = await seedCoachEngineWorkoutsFromCode()
  console.log(`Seeded ${count} detailed workouts into CoachEngineWorkout`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
