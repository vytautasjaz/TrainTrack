import type { AiSkillConfig } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  AI_SKILL_AUDIENCES,
  type AiSkillAudience,
  type AiSkillDefinition,
} from '@/lib/ai/skills/types'
import { listCodeSkills } from '@/lib/ai/skills/registry-base'

export type AiSkillOverride = {
  slug: string
  title: string | null
  description: string | null
  systemPrompt: string | null
  audience: AiSkillAudience | null
  isActive: boolean
  sortOrder: number
  updatedAt: Date
  /** True when a DB row exists (vs code-only default). */
  hasDbRow: boolean
}

export type AiSkillAdminRow = {
  slug: string
  kind: 'draft' | 'adapt'
  codeTitle: string
  codeDescription: string
  codeSystemPrompt: string
  codeAudience: AiSkillAudience
  title: string
  description: string
  systemPrompt: string
  audience: AiSkillAudience
  isActive: boolean
  sortOrder: number
  hasDbRow: boolean
  updatedAt: string | null
}

let overrideCache: Map<string, AiSkillOverride> | null = null

function parseAudience(value: string | null | undefined): AiSkillAudience | null {
  if (!value) return null
  return (AI_SKILL_AUDIENCES as readonly string[]).includes(value)
    ? (value as AiSkillAudience)
    : null
}

function rowToOverride(row: AiSkillConfig): AiSkillOverride {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    systemPrompt: row.systemPrompt,
    audience: parseAudience(row.audience),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    hasDbRow: true,
  }
}

export function getSkillOverrideCache(): Map<string, AiSkillOverride> | null {
  return overrideCache
}

export function setSkillOverrideCache(rows: AiSkillOverride[] | null) {
  if (!rows) {
    overrideCache = null
    return
  }
  overrideCache = new Map(rows.map((r) => [r.slug, r]))
}

export async function refreshSkillOverridesFromDb(): Promise<
  Map<string, AiSkillOverride>
> {
  try {
    const rows = await prisma.aiSkillConfig.findMany()
    const overrides = rows.map(rowToOverride)
    setSkillOverrideCache(overrides)
    return overrideCache!
  } catch {
    setSkillOverrideCache([])
    return overrideCache!
  }
}

export function applySkillOverride<T extends AiSkillDefinition>(skill: T): T {
  const o = overrideCache?.get(skill.slug)
  if (!o) return skill
  return {
    ...skill,
    title: o.title?.trim() || skill.title,
    description: o.description?.trim() || skill.description,
    systemPrompt: o.systemPrompt?.trim() || skill.systemPrompt,
    audience: o.audience ?? skill.audience,
  }
}

export function isSkillActive(slug: string): boolean {
  const o = overrideCache?.get(slug)
  if (!o) return true
  return o.isActive
}

export function skillSortOrder(slug: string, fallbackIndex: number): number {
  const o = overrideCache?.get(slug)
  if (o && Number.isFinite(o.sortOrder)) return o.sortOrder
  return fallbackIndex
}

export function listSkillsForAdmin(): AiSkillAdminRow[] {
  const code = listCodeSkills()
  return code
    .map((skill, index) => {
      const o = overrideCache?.get(skill.slug)
      const merged = applySkillOverride(skill)
      return {
        slug: skill.slug,
        kind: skill.kind,
        codeTitle: skill.title,
        codeDescription: skill.description,
        codeSystemPrompt: skill.systemPrompt,
        codeAudience: skill.audience,
        title: merged.title,
        description: merged.description,
        systemPrompt: merged.systemPrompt,
        audience: merged.audience,
        isActive: o?.isActive ?? true,
        sortOrder: o?.sortOrder ?? index,
        hasDbRow: Boolean(o?.hasDbRow),
        updatedAt: o?.updatedAt?.toISOString() ?? null,
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug))
}

export async function upsertSkillConfig(input: {
  slug: string
  title: string
  description: string
  systemPrompt: string
  audience: AiSkillAudience
  isActive: boolean
  sortOrder: number
}): Promise<AiSkillAdminRow> {
  const code = listCodeSkills().find((s) => s.slug === input.slug)
  if (!code) throw new Error(`Unknown skill slug: ${input.slug}`)

  const title = input.title.trim() || null
  const description = input.description.trim() || null
  const systemPrompt = input.systemPrompt.trim() || null
  // Store null when equal to code default so “reset” stays meaningful.
  const data = {
    title: title === code.title ? null : title,
    description: description === code.description ? null : description,
    systemPrompt:
      systemPrompt === code.systemPrompt.trim() ? null : systemPrompt,
    audience: input.audience === code.audience ? null : input.audience,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  }

  await prisma.aiSkillConfig.upsert({
    where: { slug: input.slug },
    create: { slug: input.slug, ...data },
    update: data,
  })
  await refreshSkillOverridesFromDb()
  const row = listSkillsForAdmin().find((s) => s.slug === input.slug)
  if (!row) throw new Error('Failed to reload skill after save')
  return row
}

export async function resetSkillConfig(slug: string): Promise<void> {
  await prisma.aiSkillConfig.deleteMany({ where: { slug } })
  await refreshSkillOverridesFromDb()
}

/** Seed DB rows from code defaults (idempotent — only inserts missing slugs). */
export async function seedSkillConfigsFromCode(): Promise<number> {
  const code = listCodeSkills()
  let inserted = 0
  for (let i = 0; i < code.length; i += 1) {
    const skill = code[i]!
    const existing = await prisma.aiSkillConfig.findUnique({
      where: { slug: skill.slug },
      select: { slug: true },
    })
    if (existing) continue
    await prisma.aiSkillConfig.create({
      data: {
        slug: skill.slug,
        title: null,
        description: null,
        systemPrompt: null,
        audience: null,
        isActive: true,
        sortOrder: i,
      },
    })
    inserted += 1
  }
  await refreshSkillOverridesFromDb()
  return inserted
}
