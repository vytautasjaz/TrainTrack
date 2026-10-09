import Link from 'next/link'
import { requireAdmin } from '@/lib/session'
import { adminListAiSkills } from '@/app/actions/admin-ai-skills'
import { AdminAiSkillsManager } from '@/components/admin/admin-ai-skills-manager'

export default async function AdminAiSkillsPage() {
  await requireAdmin()
  const skills = await adminListAiSkills()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--tt-ink,#111)]">
            AI skills
          </h1>
          <p className="mt-1 text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
            Edit titles, descriptions, and coaching prompts for plan draft /
            adapt skills. Brief schemas remain in code.
          </p>
        </div>
        <Link
          href="/admin/ai-library"
          className="text-xs font-medium text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]"
        >
          ← AI workout library
        </Link>
      </div>
      <AdminAiSkillsManager skills={skills} />
    </div>
  )
}
