import { redirect } from 'next/navigation'
import { getSession, resolveAthleteId, isCoachView } from '@/lib/session'
import { getAiSkillsForUser } from '@/app/actions/ai-plans'
import { AiPlanWizard } from '@/components/ai/ai-plan-wizard'
import { prisma } from '@/lib/prisma'

export default async function AthleteAiPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; planId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (isCoachView(session)) redirect('/workouts/plans/ai')

  const athleteId = await resolveAthleteId(session)
  if (!athleteId) redirect('/training')

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true, name: true },
  })
  if (!athlete) redirect('/training')

  const sp = await searchParams
  const mode = sp.mode === 'adapt' ? 'adapt' : 'draft'
  const { skills, quota } = await getAiSkillsForUser({ audience: 'athlete' })

  const plans =
    mode === 'adapt'
      ? await prisma.trainingPlan.findMany({
          where: { coachId: session.userId },
          orderBy: { updatedAt: 'desc' },
          take: 40,
          select: { id: true, title: true },
        })
      : []

  return (
    <AiPlanWizard
      mode={mode}
      audience="athlete"
      skills={skills}
      quota={quota}
      athletes={[{ id: athlete.id, name: athlete.name }]}
      defaultAthleteId={athlete.id}
      planId={sp.planId}
      plans={plans}
    />
  )
}
