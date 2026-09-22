'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminUpsertSubscriptionPlan,
  adminDeleteSubscriptionPlan,
} from '@/app/actions/admin-memberships'
import { Button } from '@/components/ui/button'
import type { AdminPlanRow } from '@/lib/admin-memberships'
import { cn } from '@/lib/utils'

type AdminPlansManagerProps = {
  plans: AdminPlanRow[]
  knownSkillSlugs: string[]
}

const emptyForm = {
  id: '' as string | undefined,
  slug: '',
  name: '',
  description: '',
  priceCents: 0,
  aiDraftsPerMonth: 0,
  aiAdaptsPerMonth: 0,
  maxPlanWeeks: 16,
  enabledSkillSlugs: '',
  isActive: true,
  sortOrder: 0,
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2)}`
}

export function AdminPlansManager({
  plans,
  knownSkillSlugs,
}: AdminPlansManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [editing, setEditing] = useState(false)

  function startCreate() {
    setEditing(true)
    setForm({ ...emptyForm })
    setError(null)
  }

  function startEdit(plan: AdminPlanRow) {
    setEditing(true)
    setForm({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description ?? '',
      priceCents: plan.priceCents,
      aiDraftsPerMonth: plan.aiDraftsPerMonth,
      aiAdaptsPerMonth: plan.aiAdaptsPerMonth,
      maxPlanWeeks: plan.maxPlanWeeks,
      enabledSkillSlugs: plan.enabledSkillSlugs.join(', '),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    })
    setError(null)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await adminUpsertSubscriptionPlan({
          id: form.id || undefined,
          slug: form.slug,
          name: form.name,
          description: form.description,
          priceCents: form.priceCents,
          aiDraftsPerMonth: form.aiDraftsPerMonth,
          aiAdaptsPerMonth: form.aiAdaptsPerMonth,
          maxPlanWeeks: form.maxPlanWeeks,
          enabledSkillSlugs: form.enabledSkillSlugs,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        })
        setEditing(false)
        setForm({ ...emptyForm })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save plan')
      }
    })
  }

  function remove(plan: AdminPlanRow) {
    if (!window.confirm(`Delete plan “${plan.name}”?`)) return
    setError(null)
    startTransition(async () => {
      try {
        await adminDeleteSubscriptionPlan(plan.id)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete plan')
      }
    })
  }

  return (
    <div className="space-y-4 rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--tt-ink,#111)]">
            Subscription plans
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
            Quotas, max weeks, and which AI skills each tier unlocks. Stripe
            wiring comes later on the same rows.
          </p>
        </div>
        <Button type="button" size="sm" onClick={startCreate} disabled={isPending}>
          New plan
        </Button>
      </div>

      {error ? (
        <p className="rounded-[8px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="grid gap-3 rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] p-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Slug">
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              className={cn(inputClass, 'min-h-[64px]')}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Field>
          <Field label="Price (cents)">
            <input
              type="number"
              className={inputClass}
              value={form.priceCents}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceCents: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              className={inputClass}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="AI drafts / month">
            <input
              type="number"
              className={inputClass}
              value={form.aiDraftsPerMonth}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  aiDraftsPerMonth: Number(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="AI adapts / month">
            <input
              type="number"
              className={inputClass}
              value={form.aiAdaptsPerMonth}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  aiAdaptsPerMonth: Number(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Max plan weeks">
            <input
              type="number"
              className={inputClass}
              value={form.maxPlanWeeks}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxPlanWeeks: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Active">
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Plan is active
            </label>
          </Field>
          <Field label="Enabled skill slugs" className="sm:col-span-2">
            <textarea
              className={cn(inputClass, 'min-h-[72px] font-mono text-xs')}
              value={form.enabledSkillSlugs}
              onChange={(e) =>
                setForm((f) => ({ ...f, enabledSkillSlugs: e.target.value }))
              }
              placeholder={knownSkillSlugs.join(', ')}
            />
            <p className="mt-1 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
              Known skills: {knownSkillSlugs.join(', ') || '—'}
            </p>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" size="sm" onClick={save} disabled={isPending}>
              {isPending ? 'Saving…' : form.id ? 'Update plan' : 'Create plan'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--tt-line,#ebebeb)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
            <tr>
              <th className="px-2 py-2">Plan</th>
              <th className="px-2 py-2">Price</th>
              <th className="px-2 py-2">Drafts</th>
              <th className="px-2 py-2">Adapts</th>
              <th className="px-2 py-2">Weeks</th>
              <th className="px-2 py-2">Skills</th>
              <th className="px-2 py-2">Members</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr
                key={plan.id}
                className="border-b border-[var(--tt-line,#ebebeb)] last:border-0"
              >
                <td className="px-2 py-2.5">
                  <p className="font-medium text-[var(--tt-ink,#111)]">
                    {plan.name}
                    {!plan.isActive ? (
                      <span className="ml-1.5 text-[11px] font-normal text-[var(--tt-ink-faint,#9a9a9a)]">
                        (inactive)
                      </span>
                    ) : null}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                    {plan.slug}
                  </p>
                </td>
                <td className="px-2 py-2.5 tabular-nums text-xs">
                  {formatPrice(plan.priceCents)}/{plan.interval}
                </td>
                <td className="px-2 py-2.5 tabular-nums text-xs">
                  {plan.aiDraftsPerMonth}
                </td>
                <td className="px-2 py-2.5 tabular-nums text-xs">
                  {plan.aiAdaptsPerMonth}
                </td>
                <td className="px-2 py-2.5 tabular-nums text-xs">
                  {plan.maxPlanWeeks}
                </td>
                <td className="max-w-[180px] px-2 py-2.5 text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {plan.enabledSkillSlugs.length
                    ? plan.enabledSkillSlugs.join(', ')
                    : '—'}
                </td>
                <td className="px-2 py-2.5 tabular-nums text-xs">
                  {plan.memberCount}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => startEdit(plan)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={isPending || plan.memberCount > 0}
                      onClick={() => remove(plan)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inputClass =
  'h-9 w-full rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-white px-2.5 text-sm text-[var(--tt-ink,#111)] outline-none focus:border-[var(--tt-ink,#111)]'

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
        {label}
      </span>
      {children}
    </label>
  )
}
