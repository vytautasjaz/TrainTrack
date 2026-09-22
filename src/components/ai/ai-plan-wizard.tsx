'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import {
  adaptAiTrainingPlan,
  draftAiTrainingPlan,
  type AiSkillListItem,
} from '@/app/actions/ai-plans'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { AiQuotaSnapshot } from '@/lib/ai/entitlements'
import { AiPaywallBanner } from '@/components/ai/ai-paywall-banner'

type AthleteOption = { id: string; name: string }

type AiPlanWizardProps = {
  mode: 'draft' | 'adapt'
  audience: 'coach' | 'athlete'
  skills: AiSkillListItem[]
  quota: Pick<
    AiQuotaSnapshot,
    | 'draftsRemaining'
    | 'adaptsRemaining'
    | 'draftsLimit'
    | 'adaptsLimit'
    | 'enabledSkillSlugs'
    | 'membership'
  >
  athletes: AthleteOption[]
  defaultAthleteId?: string
  /** Required for adapt mode */
  planId?: string
  plans?: { id: string; title: string }[]
}

export function AiPlanWizard({
  mode,
  audience,
  skills,
  quota,
  athletes,
  defaultAthleteId,
  planId: initialPlanId,
  plans = [],
}: AiPlanWizardProps) {
  const router = useRouter()
  const filtered = useMemo(
    () => skills.filter((s) => s.kind === mode),
    [skills, mode],
  )
  const [step, setStep] = useState<'skill' | 'brief'>('skill')
  const [skillSlug, setSkillSlug] = useState<string | null>(null)
  const [athleteId, setAthleteId] = useState(
    defaultAthleteId ?? athletes[0]?.id ?? '',
  )
  const [planId, setPlanId] = useState(initialPlanId ?? plans[0]?.id ?? '')
  const [brief, setBrief] = useState<Record<string, string | number>>({})
  const [error, setError] = useState<string | null>(null)
  const [paywall, setPaywall] = useState(false)
  const [isPending, startTransition] = useTransition()

  const skill = filtered.find((s) => s.slug === skillSlug) ?? null
  const remaining =
    mode === 'draft' ? quota.draftsRemaining : quota.adaptsRemaining
  const limit = mode === 'draft' ? quota.draftsLimit : quota.adaptsLimit
  const hasMembership = Boolean(quota.membership)
  const softBlocked = !hasMembership || remaining <= 0

  function selectSkill(slug: string) {
    const s = filtered.find((x) => x.slug === slug)
    if (!s) return
    setSkillSlug(slug)
    const defaults: Record<string, string | number> = {}
    for (const f of s.briefFields) {
      if (f.defaultValue != null) defaults[f.key] = f.defaultValue
    }
    setBrief(defaults)
    setStep('brief')
    setError(null)
    setPaywall(false)
  }

  function generate() {
    if (!skill || !athleteId) return
    if (mode === 'adapt' && !planId) {
      setError('Select a plan to adapt')
      return
    }
    setError(null)
    setPaywall(false)
    startTransition(async () => {
      if (mode === 'draft') {
        const result = await draftAiTrainingPlan({
          skillSlug: skill.slug,
          athleteId,
          brief,
        })
        if (!result.ok) {
          setError(result.error)
          setPaywall(Boolean(result.paywall))
          return
        }
        router.push(`/workouts/plans/${result.planId}`)
        return
      }

      const result = await adaptAiTrainingPlan({
        skillSlug: skill.slug,
        planId,
        athleteId,
        brief,
      })
      if (!result.ok) {
        setError(result.error)
        setPaywall(Boolean(result.paywall))
        return
      }
      router.push(`/workouts/plans/${result.planId}`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
            {audience === 'coach' ? 'Coach' : 'Athlete'} · AI
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--tt-ink,#111)]">
            {mode === 'draft' ? 'Draft with AI' : 'Adapt plan with AI'}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--tt-ink-soft,#6b6b6b)]">
            {mode === 'draft'
              ? 'Pick a skill, add a short brief, and open the result on the plan canvas.'
              : 'Use recent completed sessions and feedback to propose plan edits.'}
          </p>
        </div>
        <p className="text-xs tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
          {hasMembership
            ? `${remaining}/${limit} ${mode === 'draft' ? 'drafts' : 'adapts'} left`
            : 'No AI membership'}
        </p>
      </div>

      {(softBlocked || paywall) && (
        <AiPaywallBanner
          reason={
            !hasMembership
              ? 'no_membership'
              : remaining <= 0
                ? 'quota_exhausted'
                : 'skill_locked'
          }
          planName={quota.membership?.plan.name}
        />
      )}

      {step === 'skill' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => {
            const locked = !s.unlocked
            return (
              <button
                key={s.slug}
                type="button"
                disabled={locked && softBlocked}
                onClick={() => selectSkill(s.slug)}
                className={cn(
                  'rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white p-4 text-left transition-colors',
                  locked
                    ? 'opacity-60'
                    : 'hover:border-[var(--tt-ink,#111)] hover:bg-[var(--tt-sidebar,#f5f5f5)]',
                )}
              >
                <div className="flex items-start gap-2">
                  <Sparkles
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-ink-soft,#6b6b6b)]"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--tt-ink,#111)]">
                      {s.title}
                      {locked ? (
                        <span className="ml-1.5 text-[11px] font-normal text-[var(--tt-ink-faint,#9a9a9a)]">
                          Locked
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
                      {s.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--tt-ink-soft,#6b6b6b)] sm:col-span-2">
              No skills available.
            </p>
          ) : null}
        </div>
      ) : skill ? (
        <div className="space-y-4 rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{skill.title}</p>
              <p className="text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                {skill.description}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setStep('skill')}
              disabled={isPending}
            >
              Change skill
            </Button>
          </div>

          {athletes.length > 1 || audience === 'coach' ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Athlete
              </span>
              <Select
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                disabled={isPending}
              >
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          {mode === 'adapt' && !initialPlanId ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Plan
              </span>
              <Select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={isPending}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          {skill.briefFields.map((field) => (
            <label key={field.key} className="block space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
                {field.label}
                {field.required ? ' *' : ''}
              </span>
              {field.kind === 'textarea' ? (
                <textarea
                  className="min-h-[88px] w-full rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-white px-2.5 py-2 text-sm outline-none focus:border-[var(--tt-ink,#111)]"
                  placeholder={field.placeholder}
                  value={String(brief[field.key] ?? '')}
                  disabled={isPending}
                  onChange={(e) =>
                    setBrief((b) => ({ ...b, [field.key]: e.target.value }))
                  }
                />
              ) : field.kind === 'select' ? (
                <Select
                  value={String(brief[field.key] ?? '')}
                  disabled={isPending}
                  onChange={(e) =>
                    setBrief((b) => ({ ...b, [field.key]: e.target.value }))
                  }
                >
                  {(field.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={field.kind === 'number' ? 'number' : 'text'}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  value={brief[field.key] ?? ''}
                  disabled={isPending}
                  onChange={(e) =>
                    setBrief((b) => ({
                      ...b,
                      [field.key]:
                        field.kind === 'number'
                          ? Number(e.target.value)
                          : e.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}

          <FormError message={error} />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={generate}
              disabled={isPending || softBlocked || !athleteId}
            >
              {isPending
                ? 'Generating…'
                : mode === 'draft'
                  ? 'Generate plan'
                  : 'Adapt plan'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setStep('skill')}
            >
              Back
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
