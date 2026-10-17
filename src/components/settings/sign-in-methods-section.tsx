'use client'

import { useState, useTransition } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormError } from '@/components/ui/form-error'
import { linkGoogleAccount, setPassword, unlinkProvider } from '@/app/actions/auth'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

type SignInMethodsSectionProps = {
  hasGoogle: boolean
  hasPassword: boolean
  /** Server-only: AUTH_GOOGLE_* are not available in the client bundle. */
  googleConfigured: boolean
  embedded?: boolean
}

export function SignInMethodsSection({
  hasGoogle,
  hasPassword,
  googleConfigured,
  embedded = false,
}: SignInMethodsSectionProps) {
  const [passwordPending, startPasswordTransition] = useTransition()
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordEditing, setPasswordEditing] = useState(false)

  function openPasswordForm() {
    setPasswordError(null)
    setPasswordEditing(true)
  }

  function closePasswordForm() {
    setPasswordError(null)
    setPasswordEditing(false)
  }

  const passwordForm = (
    <form
      action={(formData) => {
        setPasswordError(null)
        const password = String(formData.get('password') ?? '')
        const confirmPassword = String(formData.get('confirmPassword') ?? '')
        if (password !== confirmPassword) {
          setPasswordError('Passwords do not match')
          return
        }
        startPasswordTransition(async () => {
          try {
            await setPassword(formData)
            setPasswordEditing(false)
          } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Could not update password')
          }
        })
      }}
      className="mt-3 flex flex-col gap-2"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          type="password"
          name="password"
          placeholder="New password (min. 8)"
          minLength={8}
          required
          autoFocus
          autoComplete="new-password"
          className="sm:flex-1"
        />
        <Input
          type="password"
          name="confirmPassword"
          placeholder="Confirm password"
          minLength={8}
          required
          autoComplete="new-password"
          className="sm:flex-1"
        />
      </div>
      <FormError message={passwordError} />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={passwordPending}>
          {passwordPending ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={passwordPending}
          onClick={closePasswordForm}
        >
          Cancel
        </Button>
      </div>
    </form>
  )

  const methodsBody = (
    <>
      <ul
        className={cn(
          embedded
            ? 'divide-y divide-[var(--tt-line,#ebebeb)] border-y border-[var(--tt-line,#ebebeb)]'
            : 'space-y-3',
        )}
      >
        <li
          className={cn(
            embedded
              ? 'flex items-center justify-between gap-3 py-3'
              : 'flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 px-3 py-2.5',
          )}
        >
          <div>
            <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">Google</p>
            <p
              className={cn(
                'text-[12px]',
                hasGoogle ? 'text-[var(--tt-ink-soft,#6b6b6b)]' : 'text-[var(--tt-ink-faint,#9a9a9a)]',
              )}
            >
              {hasGoogle ? 'Connected' : 'Not linked'}
            </p>
          </div>
          {googleConfigured ? (
            hasGoogle ? (
              <form action={unlinkProvider}>
                <input type="hidden" name="provider" value="google" />
                <Button type="submit" variant="ghost" size="sm" className="text-[12px] font-medium">
                  Unlink
                </Button>
              </form>
            ) : (
              <form action={linkGoogleAccount}>
                <Button type="submit" variant="ghost" size="sm" className="text-[12px] font-medium">
                  Connect
                </Button>
              </form>
            )
          ) : (
            <Caption>Not configured</Caption>
          )}
        </li>

        <li
          className={cn(
            embedded ? 'py-3' : 'rounded-[6px] border border-border/60 px-3 py-2.5',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
                Email &amp; password
              </p>
              <p
                className={cn(
                  'text-[12px]',
                  hasPassword ? 'text-[var(--tt-ink-soft,#6b6b6b)]' : 'text-[var(--tt-ink-faint,#9a9a9a)]',
                )}
              >
                {hasPassword ? 'Set' : 'Not set'}
              </p>
            </div>
            {!passwordEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[12px] font-medium"
                onClick={openPasswordForm}
              >
                {hasPassword ? 'Update password' : 'Set password'}
              </Button>
            ) : null}
          </div>
          {passwordEditing ? passwordForm : null}
        </li>
      </ul>
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel id="sign-in" title="Sign-in methods">
        {methodsBody}
      </SettingsPanel>
    )
  }

  return (
    <section id="sign-in" className="card-elevated scroll-mt-24 space-y-4 p-5">
      <div>
        <SectionTitle variant="ui">Sign-in methods</SectionTitle>
        <Caption>Link providers or set a password so you can always get back in.</Caption>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Google</p>
            <Caption>{hasGoogle ? 'Linked' : 'Not linked'}</Caption>
          </div>
          {googleConfigured ? (
            hasGoogle ? (
              <form action={unlinkProvider}>
                <input type="hidden" name="provider" value="google" />
                <Button type="submit" variant="outline" size="sm">
                  Unlink
                </Button>
              </form>
            ) : (
              <form action={linkGoogleAccount}>
                <Button type="submit" variant="outline" size="sm">
                  Link Google
                </Button>
              </form>
            )
          ) : (
            <Caption>Not configured</Caption>
          )}
        </div>
        <div className="rounded-[6px] border border-border/60 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                Email password {hasPassword ? '(set)' : '(not set)'}
              </p>
              {!passwordEditing ? (
                <Caption className="mt-0.5">
                  {hasPassword ? 'Change your password' : 'Add a password for email sign-in'}
                </Caption>
              ) : null}
            </div>
            {!passwordEditing ? (
              <Button type="button" variant="outline" size="sm" onClick={openPasswordForm}>
                {hasPassword ? 'Update password' : 'Set password'}
              </Button>
            ) : null}
          </div>
          {passwordEditing ? passwordForm : null}
        </div>
      </div>
    </section>
  )
}
