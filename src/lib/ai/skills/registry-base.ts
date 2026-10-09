import type { AiSkillDefinition } from '@/lib/ai/skills/types'
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

/** Code-defined skill catalog (source of truth for schemas / brief fields). */
export const CODE_SKILLS: AiSkillDefinition[] = [
  run5kBuildSkill,
  runHalfMarathonSkill,
  runMarathonSkill,
  hyroxGeneralSkill,
  multiSportBaseSkill,
  adaptPlanSkill,
]

export function listCodeSkills(): AiSkillDefinition[] {
  return CODE_SKILLS
}

export function getCodeSkill(slug: string): AiSkillDefinition | null {
  return CODE_SKILLS.find((s) => s.slug === slug) ?? null
}
