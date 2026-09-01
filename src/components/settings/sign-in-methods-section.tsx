'use client'

import { useState, useTransition } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormError } from '@/components/ui/form-error'
import { linkGoogleAccount, setPassword, unlinkProvider } from '@/app/actions/auth'
import { SettingsPanel } from '@/components/settings/settings-section-chrome'
import { cn } from '@/lib/utils'

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

type SignInMethodsSectionProps = {
  hasGoogle: boolean
  hasPassword: boolean
  embedded?: boolean
}

export function SignInMethodsSection({
  hasGoogle,
  hasPassword,
  embedded = false,
}: SignInMethodsSectionProps) {
  const [passwordPending, startPasswordTransition] = useTransition()
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
          {googleEnabled ? (
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
          <div className={cn(embedded && 'flex flex-wrap items-start justify-between gap-3')}>
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
            {!embedded ? (
              <Caption className="mb-2 mt-1 block w-full">
                {hasPassword ? 'Change your password' : 'Add a password for email sign-in'}
              </Caption>
            ) : null}
          </div>
          <form
            action={(formData) => {
              setPasswordError(null)
              startPasswordTransition(async () => {
                try {
                  await setPassword(formData)
                } catch (err) {
                  setPasswordError(err instanceof Error ? err.message : 'Could not update password')
                }
              })
            }}
            className={cn(
              'flex flex-col gap-2',
              embedded ? 'mt-3 sm:flex-row sm:items-start' : 'sm:flex-row',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Input
                type="password"
                name="password"
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="sm:flex-1"
              />
              <FormError message={passwordError} />
            </div>
            <Button type="submit" variant="secondary" size="sm" disabled={passwordPending}>
              {passwordPending ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
            </Button>
          </form>
        </li>
      </ul>
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        id="sign-in"
        title="Sign-in methods"
        description="How you authenticate. Keep at least one method linked."
      >
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
          {googleEnabled ? (
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
          <p className="text-sm font-medium">
            Email password {hasPassword ? '(set)' : '(not set)'}
          </p>
          <Caption className="mb-2">
            {hasPassword ? 'Change your password' : 'Add a password for email sign-in'}
          </Caption>
          <form
            action={(formData) => {
              setPasswordError(null)
              startPasswordTransition(async () => {
                try {
                  await setPassword(formData)
                } catch (err) {
                  setPasswordError(err instanceof Error ? err.message : 'Could not update password')
                }
              })
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Input
                type="password"
                name="password"
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="sm:flex-1"
              />
              <FormError message={passwordError} />
            </div>
            <Button type="submit" variant="secondary" size="sm" disabled={passwordPending}>
              {passwordPending ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
