'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminResetAiSkill,
  adminSeedAiSkills,
  adminToggleAiSkill,
  adminUpsertAiSkill,
  type AiSkillAdminRow,
} from '@/app/actions/admin-ai-skills'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormError } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'

const AUDIENCES = [
  { value: 'both', label: 'Both' },
  { value: 'coach', label: 'Coach' },
  { value: 'athlete', label: 'Athlete' },
] as const

type Draft = {
  title: string
  description: string
  systemPrompt: string
  audience: AiSkillAdminRow['audience']
  isActive: boolean
  sortOrder: number
}

function toDraft(row: AiSkillAdminRow): Draft {
  return {
    title: row.title,
    description: row.description,
    systemPrompt: row.systemPrompt,
    audience: row.audience,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }
}

export function AdminAiSkillsManager({
  skills: initial,
}: {
  skills: AiSkillAdminRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [skills, setSkills] = useState(initial)
  const [selectedSlug, setSelectedSlug] = useState(initial[0]?.slug ?? '')
  const [draft, setDraft] = useState<Draft | null>(
    initial[0] ? toDraft(initial[0]) : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const selected = useMemo(
    () => skills.find((s) => s.slug === selectedSlug) ?? null,
    [skills, selectedSlug],
  )

  function selectSkill(slug: string) {
    const row = skills.find((s) => s.slug === slug)
    if (!row) return
    setSelectedSlug(slug)
    setDraft(toDraft(row))
    setError(null)
    setMessage(null)
  }

  function run(action: () => Promise<void>) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await adminSeedAiSkills()
              setMessage(
                res.count
                  ? `Seeded ${res.count} skill row(s).`
                  : 'All skills already have DB rows.',
              )
              router.refresh()
            })
          }
        >
          Seed missing from code
        </Button>
        {message ? (
          <span className="text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
            {message}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-1 rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-white p-2">
          {skills.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => selectSkill(s.slug)}
              className={cn(
                'flex w-full flex-col rounded-[6px] px-2.5 py-2 text-left text-sm transition',
                selectedSlug === s.slug
                  ? 'bg-[var(--tt-sidebar,#f5f5f5)] font-medium text-[var(--tt-ink,#111)]'
                  : 'text-[var(--tt-ink-soft,#6b6b6b)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink,#111)]',
                !s.isActive && 'opacity-55',
              )}
            >
              <span>{s.title}</span>
              <span className="mt-0.5 font-mono text-[10px] opacity-70">
                {s.slug} · {s.kind}
                {s.hasDbRow ? ' · DB' : ' · code'}
              </span>
            </button>
          ))}
        </aside>

        {selected && draft ? (
          <div className="space-y-4 rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--tt-ink,#111)]">
                  {selected.title}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                  {selected.slug}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await adminToggleAiSkill(
                        selected.slug,
                        !draft.isActive,
                      )
                      const next = { ...draft, isActive: !draft.isActive }
                      setDraft(next)
                      setSkills((prev) =>
                        prev.map((s) =>
                          s.slug === selected.slug
                            ? { ...s, ...next, hasDbRow: true }
                            : s,
                        ),
                      )
                      setMessage(
                        next.isActive ? 'Skill enabled.' : 'Skill disabled.',
                      )
                    })
                  }
                >
                  {draft.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || !selected.hasDbRow}
                  onClick={() =>
                    run(async () => {
                      await adminResetAiSkill(selected.slug)
                      const reset = toDraft({
                        ...selected,
                        title: selected.codeTitle,
                        description: selected.codeDescription,
                        systemPrompt: selected.codeSystemPrompt,
                        audience: selected.codeAudience,
                        isActive: true,
                        sortOrder: selected.sortOrder,
                        hasDbRow: false,
                        updatedAt: null,
                      })
                      setDraft(reset)
                      setSkills((prev) =>
                        prev.map((s) =>
                          s.slug === selected.slug
                            ? {
                                ...s,
                                ...reset,
                                hasDbRow: false,
                                updatedAt: null,
                              }
                            : s,
                        ),
                      )
                      setMessage('Reset to code defaults.')
                    })
                  }
                >
                  Reset to code
                </Button>
              </div>
            </div>

            <p className="text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
              Brief field schemas stay in code. Title, description, and the full
              coaching system prompt (shared TrainTrack philosophy + event brief)
              are editable here. Prompt text feeds AI workout adaptation and plan
              guidelines. Use &quot;Reset to code&quot; to pull the latest code
              philosophy after deploys.
            </p>

            <label className="block space-y-1 text-xs font-medium text-[var(--tt-ink,#111)]">
              Title
              <Input
                value={draft.title}
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value })
                }
              />
            </label>

            <label className="block space-y-1 text-xs font-medium text-[var(--tt-ink,#111)]">
              Description
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-[6px] border border-[var(--tt-line,#ebebeb)] bg-white px-3 py-2 text-sm text-[var(--tt-ink,#111)] outline-none focus:border-[var(--tt-ink,#111)]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-medium text-[var(--tt-ink,#111)]">
                Audience
                <Select
                  value={draft.audience}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      audience: e.target.value as AiSkillAdminRow['audience'],
                    })
                  }
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-1 text-xs font-medium text-[var(--tt-ink,#111)]">
                Sort order
                <Input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sortOrder: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </label>
            </div>

            <label className="block space-y-1 text-xs font-medium text-[var(--tt-ink,#111)]">
              System prompt / coaching guidance
              <textarea
                value={draft.systemPrompt}
                onChange={(e) =>
                  setDraft({ ...draft, systemPrompt: e.target.value })
                }
                rows={14}
                className="w-full rounded-[6px] border border-[var(--tt-line,#ebebeb)] bg-white px-3 py-2 font-mono text-xs leading-relaxed text-[var(--tt-ink,#111)] outline-none focus:border-[var(--tt-ink,#111)]"
              />
            </label>

            {selected.hasDbRow ? null : (
              <p className="text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                Showing code defaults. Save to create a DB override.
              </p>
            )}

            {error ? <FormError message={error} /> : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const res = await adminUpsertAiSkill({
                      slug: selected.slug,
                      ...draft,
                    })
                    setSkills((prev) =>
                      prev.map((s) =>
                        s.slug === selected.slug
                          ? { ...s, ...res.row }
                          : s,
                      ),
                    )
                    setDraft(toDraft(res.row))
                    setMessage('Saved.')
                  })
                }
              >
                Save skill
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setDraft(toDraft(selected))
                  setError(null)
                  setMessage(null)
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
            No skills registered in code.
          </p>
        )}
      </div>
    </div>
  )
}
