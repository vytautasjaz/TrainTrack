import type { AiSkillAudience, AiSkillDefinition } from '@/lib/ai/skills/types'
import {
  run5kBuildSkill,
  runHalfMarathonSkill,
  runMarathonSkill,
} from '@/lib/ai/skills/skills/run-skills'
import {
  hyroxGeneralSkill,
  multiSportBaseSkill,
} from '@/lib/ai/skills/skills/hyrox-and-multi'
import { adaptPlanSkill } from '@/lib/ai/skills/skills/adapt-plan'

const SKILLS: AiSkillDefinition[] = [
  run5kBuildSkill,
  runHalfMarathonSkill,
  runMarathonSkill,
  hyroxGeneralSkill,
  multiSportBaseSkill,
  adaptPlanSkill,
]

const bySlug = new Map(SKILLS.map((s) => [s.slug, s]))

export function listSkills(opts?: {
  audience?: AiSkillAudience | 'any'
  kind?: 'draft' | 'adapt'
}): AiSkillDefinition[] {
  return SKILLS.filter((s) => {
    if (opts?.kind && s.kind !== opts.kind) return false
    if (!opts?.audience || opts.audience === 'any') return true
    if (s.audience === 'both') return true
    return s.audience === opts.audience
  })
}

export function listSkillSlugs(): string[] {
  return SKILLS.map((s) => s.slug)
}

export function getSkill(slug: string): AiSkillDefinition | null {
  return bySlug.get(slug) ?? null
}

export function requireSkill(slug: string): AiSkillDefinition {
  const skill = getSkill(slug)
  if (!skill) throw new Error(`Unknown AI skill: ${slug}`)
  return skill
}
