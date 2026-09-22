import { redirect } from 'next/navigation'
import {
  getSession,
  isCoachView,
  getCoachAthletes,
  resolveAthleteId,
} from '@/lib/session'
import { getAiSkillsForUser } from '@/app/actions/ai-plans'
import { AiPlanWizard } from '@/components/ai/ai-plan-wizard'
import { prisma } from '@/lib/prisma'

export default async function CoachAiDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; planId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!isCoachView(session)) redirect('/training/ai-plan')

  const sp = await searchParams
  const mode = sp.mode === 'adapt' ? 'adapt' : 'draft'
  const [{ skills, quota }, athletes, athleteId, plans] = await Promise.all([
    getAiSkillsForUser({ audience: 'coach' }),
    getCoachAthletes(session.userId),
    resolveAthleteId(session),
    mode === 'adapt' && !sp.planId
      ? prisma.trainingPlan.findMany({
          where: { coachId: session.userId },
          orderBy: { updatedAt: 'desc' },
          take: 40,
          select: { id: true, title: true },
        })
      : Promise.resolve([] as { id: string; title: string }[]),
  ])

  return (
    <AiPlanWizard
      mode={mode}
      audience="coach"
      skills={skills}
      quota={quota}
      athletes={athletes.map((a) => ({ id: a.id, name: a.name }))}
      defaultAthleteId={athleteId ?? undefined}
      planId={sp.planId}
      plans={plans}
    />
  )
}
