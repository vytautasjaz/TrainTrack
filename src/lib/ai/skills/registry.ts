import type { AiSkillAudience, AiSkillDefinition } from '@/lib/ai/skills/types'
import {
  CODE_SKILLS,
  getCodeSkill,
  listCodeSkills,
} from '@/lib/ai/skills/registry-base'
import {
  applySkillOverride,
  isSkillActive,
  skillSortOrder,
} from '@/lib/ai/skills/skill-store'

export { listCodeSkills, getCodeSkill, CODE_SKILLS }

function resolvedSkills(): AiSkillDefinition[] {
  return CODE_SKILLS.map((s, index) => ({ skill: applySkillOverride(s), index }))
    .filter(({ skill }) => isSkillActive(skill.slug))
    .sort(
      (a, b) =>
        skillSortOrder(a.skill.slug, a.index) -
          skillSortOrder(b.skill.slug, b.index) ||
        a.skill.slug.localeCompare(b.skill.slug),
    )
    .map(({ skill }) => skill)
}

export function listSkills(opts?: {
  audience?: AiSkillAudience | 'any'
  kind?: 'draft' | 'adapt'
  /** Include inactive admin-disabled skills (admin UIs). */
  includeInactive?: boolean
}): AiSkillDefinition[] {
  const source = opts?.includeInactive
    ? CODE_SKILLS.map((s, index) => applySkillOverride(s)).sort(
        (a, b) =>
          skillSortOrder(a.slug, CODE_SKILLS.findIndex((x) => x.slug === a.slug)) -
            skillSortOrder(b.slug, CODE_SKILLS.findIndex((x) => x.slug === b.slug)) ||
          a.slug.localeCompare(b.slug),
      )
    : resolvedSkills()

  return source.filter((s) => {
    if (opts?.kind && s.kind !== opts.kind) return false
    if (!opts?.audience || opts.audience === 'any') return true
    if (s.audience === 'both') return true
    return s.audience === opts.audience
  })
}

export function listSkillSlugs(): string[] {
  return listSkills({ includeInactive: true }).map((s) => s.slug)
}

export function getSkill(slug: string): AiSkillDefinition | null {
  const base = getCodeSkill(slug)
  if (!base) return null
  if (!isSkillActive(slug)) return null
  return applySkillOverride(base)
}

/** Like getSkill but returns inactive skills too (admin / internal). */
export function getSkillIncludingInactive(
  slug: string,
): AiSkillDefinition | null {
  const base = getCodeSkill(slug)
  if (!base) return null
  return applySkillOverride(base)
}

export function requireSkill(slug: string): AiSkillDefinition {
  const skill = getSkill(slug)
  if (!skill) throw new Error(`Unknown AI skill: ${slug}`)
  return skill
}
