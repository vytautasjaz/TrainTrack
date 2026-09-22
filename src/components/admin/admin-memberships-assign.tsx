'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminAssignUserMembership,
  adminCancelUserMembership,
} from '@/app/actions/admin-memberships'
import { Button } from '@/components/ui/button'
import type { AdminMembershipRow, AdminPlanRow } from '@/lib/admin-memberships'
import { MembershipStatus } from '@prisma/client'

type AdminMembershipsAssignProps = {
  plans: AdminPlanRow[]
  memberships: AdminMembershipRow[]
  users: { id: string; name: string; email: string }[]
}

function formatDate(d: Date | string) {
  const iso = typeof d === 'string' ? d : d.toISOString()
  return iso.slice(0, 10)
}

export function AdminMembershipsAssign({
  plans,
  memberships,
  users,
}: AdminMembershipsAssignProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState(users[0]?.id ?? '')
  const [planId, setPlanId] = useState(
    plans.find((p) => p.slug !== 'free')?.id ?? plans[0]?.id ?? '',
  )
  const [periodMonths, setPeriodMonths] = useState(1)
  const [status, setStatus] = useState<MembershipStatus>(MembershipStatus.ACTIVE)

  function assign() {
    if (!userId || !planId) return
    setError(null)
    startTransition(async () => {
      try {
        await adminAssignUserMembership({
          userId,
          planId,
          status,
          periodMonths,
        })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not assign')
      }
    })
  }

  function cancel(id: string) {
    if (!window.confirm('Cancel this membership?')) return
    setError(null)
    startTransition(async () => {
      try {
        await adminCancelUserMembership(id)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not cancel')
      }
    })
  }

  const activePlans = plans.filter((p) => p.isActive)

  return (
    <div className="space-y-4 rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--tt-ink,#111)]">
          User memberships
        </h2>
        <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft,#6b6b6b)]">
          Grant a plan for beta access. Assigning cancels any overlapping active
          membership for that user.
        </p>
      </div>

      {error ? (
        <p className="rounded-[8px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
            User
          </span>
          <select
            className={selectClass}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
            Plan
          </span>
          <select
            className={selectClass}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
            Status
          </span>
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as MembershipStatus)}
          >
            {Object.values(MembershipStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
            Period (months)
          </span>
          <input
            type="number"
            min={1}
            className={selectClass}
            value={periodMonths}
            onChange={(e) => setPeriodMonths(Number(e.target.value) || 1)}
          />
        </label>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={assign}
        disabled={isPending || !userId || !planId}
      >
        {isPending ? 'Saving…' : 'Assign membership'}
      </Button>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--tt-line,#ebebeb)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
            <tr>
              <th className="px-2 py-2">User</th>
              <th className="px-2 py-2">Plan</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Period</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberships.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-2 py-6 text-center text-[var(--tt-ink-soft,#6b6b6b)]"
                >
                  No memberships yet
                </td>
              </tr>
            ) : (
              memberships.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--tt-line,#ebebeb)] last:border-0"
                >
                  <td className="px-2 py-2.5">
                    <p className="font-medium">{m.user.name}</p>
                    <p className="text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                      {m.user.email}
                    </p>
                  </td>
                  <td className="px-2 py-2.5 text-xs">{m.plan.name}</td>
                  <td className="px-2 py-2.5 text-xs">{m.status}</td>
                  <td className="px-2 py-2.5 text-xs tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
                    {formatDate(m.currentPeriodStart)} →{' '}
                    {formatDate(m.currentPeriodEnd)}
                  </td>
                  <td className="px-2 py-2.5">
                    {m.status === MembershipStatus.ACTIVE ||
                    m.status === MembershipStatus.TRIALING ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => cancel(m.id)}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <span className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const selectClass =
  'h-9 w-full rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-white px-2.5 text-sm text-[var(--tt-ink,#111)] outline-none focus:border-[var(--tt-ink,#111)]'
