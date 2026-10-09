import Link from 'next/link'
import { requireAdmin } from '@/lib/session'
import { adminListCoachEngineWorkouts } from '@/app/actions/admin-ai-library'
import { AdminAiLibraryManager } from '@/components/admin/admin-ai-library-manager'

export default async function AdminAiLibraryPage() {
  await requireAdmin()
  const workouts = await adminListCoachEngineWorkouts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--tt-ink,#111)]">
          AI workout library
        </h1>
        <p className="mt-1 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
          Coach-quality <strong>sample</strong> sessions for AI plan drafting.
          Plans start from these templates and adapt dose (reps, duration,
          recovery) to athlete level and week needs — this is not a closed final
          workout list. Separate from each coach&apos;s personal templates.
        </p>
        <p className="mt-2 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
          Skill prompts &amp; labels:{' '}
          <Link
            href="/admin/ai-skills"
            className="font-medium text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
          >
            AI skills
          </Link>
        </p>
      </div>
      <AdminAiLibraryManager workouts={workouts} />
    </div>
  )
}
