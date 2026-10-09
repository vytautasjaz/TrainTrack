'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'
import { AI_SKILL_AUDIENCES, type AiSkillAudience } from '@/lib/ai/skills/types'
import {
  listSkillsForAdmin,
  refreshSkillOverridesFromDb,
  resetSkillConfig,
  seedSkillConfigsFromCode,
  upsertSkillConfig,
  type AiSkillAdminRow,
} from '@/lib/ai/skills/skill-store'

export type { AiSkillAdminRow }

export async function adminListAiSkills(): Promise<AiSkillAdminRow[]> {
  await requireAdmin()
  await refreshSkillOverridesFromDb()
  return listSkillsForAdmin()
}

export async function adminUpsertAiSkill(input: {
  slug: string
  title: string
  description: string
  systemPrompt: string
  audience: string
  isActive: boolean
  sortOrder: number
}) {
  await requireAdmin()
  if (
    !(AI_SKILL_AUDIENCES as readonly string[]).includes(input.audience)
  ) {
    throw new Error('Invalid audience')
  }
  const row = await upsertSkillConfig({
    ...input,
    audience: input.audience as AiSkillAudience,
  })
  revalidatePath('/admin/ai-skills')
  revalidatePath('/admin/ai-library')
  return { ok: true as const, row }
}

export async function adminResetAiSkill(slug: string) {
  await requireAdmin()
  await resetSkillConfig(slug)
  revalidatePath('/admin/ai-skills')
  return { ok: true as const }
}

export async function adminSeedAiSkills() {
  await requireAdmin()
  const count = await seedSkillConfigsFromCode()
  revalidatePath('/admin/ai-skills')
  return { ok: true as const, count }
}

export async function adminToggleAiSkill(slug: string, isActive: boolean) {
  await requireAdmin()
  const current = listSkillsForAdmin().find((s) => s.slug === slug)
  if (!current) throw new Error('Unknown skill')
  await upsertSkillConfig({
    slug,
    title: current.title,
    description: current.description,
    systemPrompt: current.systemPrompt,
    audience: current.audience,
    isActive,
    sortOrder: current.sortOrder,
  })
  revalidatePath('/admin/ai-skills')
  return { ok: true as const }
}
