'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminDeleteUser,
  adminResetPassword,
  adminSetUserDisabled,
} from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { isRedirectError, mapAuthActionError } from '@/lib/auth-form-errors'
import { cn } from '@/lib/utils'
import type { AdminUserRow } from '@/lib/admin'

type AdminUsersTableProps = {
  users: AdminUserRow[]
  currentAdminId: string
  sortHeaders?: ReactNode
}

function formatCreated(value: Date | string) {
  const iso = typeof value === 'string' ? value : value.toISOString()
  return iso.slice(0, 10)
}

export function AdminUsersTable({
  users,
  currentAdminId,
  sortHeaders,
}: AdminUsersTableProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<{
    email: string
    password: string
  } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(
    userId: string,
    action: () => Promise<unknown>,
    opts?: { confirm?: string },
  ) {
    if (opts?.confirm && !window.confirm(opts.confirm)) return
    setError(null)
    setTempPassword(null)
    setPendingId(userId)
    startTransition(async () => {
      try {
        const result = await action()
        if (
          result &&
          typeof result === 'object' &&
          'temporaryPassword' in result
        ) {
          const row = users.find((u) => u.id === userId)
          setTempPassword({
            email: row?.email ?? userId,
            password: String(
              (result as { temporaryPassword: string }).temporaryPassword,
            ),
          })
        }
        router.refresh()
      } catch (err) {
        if (isRedirectError(err)) throw err
        setError(mapAuthActionError(err))
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-[8px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {tempPassword ? (
        <div className="rounded-[8px] border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--tt-ink,#111)]">
            Temporary password for {tempPassword.email}
          </p>
          <p className="mt-1 font-mono text-base tracking-wide text-[var(--tt-ink,#111)]">
            {tempPassword.password}
          </p>
          <p className="mt-1 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
            Shown once — copy it now and share securely with the user.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              void navigator.clipboard.writeText(tempPassword.password)
            }}
          >
            Copy password
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
            <tr>
              {sortHeaders ?? (
                <>
                  <th className="px-3 py-2.5 font-semibold">User</th>
                  <th className="px-3 py-2.5 font-semibold">Roles</th>
                  <th className="px-3 py-2.5 font-semibold">Profiles</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Created</th>
                  <th className="px-3 py-2.5 font-semibold">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-[var(--tt-ink-soft,#6b6b6b)]"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentAdminId
                const isAdminRow = user.roles.includes('ADMIN')
                const busy = isPending && pendingId === user.id
                const locked = isSelf || isAdminRow
                const lockHint = isSelf
                  ? 'Cannot modify your own account'
                  : isAdminRow
                    ? 'Cannot modify other admins'
                    : null

                return (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--tt-line,#ebebeb)] last:border-0"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[var(--tt-ink,#111)]">
                        {user.name}
                        {isSelf ? (
                          <span className="ml-1.5 text-[11px] font-normal text-[var(--tt-ink-faint,#9a9a9a)]">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                      {user.roles.length ? user.roles.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--tt-ink-soft,#6b6b6b)]">
                      {[
                        user.hasAthlete ? 'Athlete' : null,
                        user.hasCoach ? 'Coach' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                          user.disabledAt
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-[color-mix(in_srgb,var(--tt-good,#1a9f5c)_12%,white)] text-[var(--tt-good,#1a9f5c)]',
                        )}
                      >
                        {user.disabledAt ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-[var(--tt-ink-soft,#6b6b6b)]">
                      {formatCreated(user.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      {locked ? (
                        <p className="text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                          {lockHint}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(
                                user.id,
                                () => {
                                  const fd = new FormData()
                                  fd.set('userId', user.id)
                                  return adminResetPassword(fd)
                                },
                                {
                                  confirm: `Reset password for ${user.email}? Their current password will stop working and a temporary one will be shown once.`,
                                },
                              )
                            }
                          >
                            Reset pw
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(
                                user.id,
                                () => {
                                  const fd = new FormData()
                                  fd.set('userId', user.id)
                                  fd.set('disabled', user.disabledAt ? '0' : '1')
                                  return adminSetUserDisabled(fd)
                                },
                                {
                                  confirm: user.disabledAt
                                    ? `Re-enable ${user.email}? They will be able to sign in again.`
                                    : `Disable ${user.email}? They will be signed out and blocked from signing in.`,
                                },
                              )
                            }
                          >
                            {user.disabledAt ? 'Enable' : 'Disable'}
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="destructive"
                            disabled={busy}
                            onClick={() =>
                              run(
                                user.id,
                                () => {
                                  const fd = new FormData()
                                  fd.set('userId', user.id)
                                  return adminDeleteUser(fd)
                                },
                                {
                                  confirm: `Delete ${user.email}? This cannot be undone.`,
                                },
                              )
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
