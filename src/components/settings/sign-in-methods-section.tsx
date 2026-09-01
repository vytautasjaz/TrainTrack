'use client'

import { useState, useTransition } from 'react'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormError } from '@/components/ui/form-error'
import { linkGoogleAccount, setPassword, unlinkProvider } from '@/app/actions/auth'

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

type SignInMethodsSectionProps = {
  hasGoogle: boolean
  hasPassword: boolean
}

export function SignInMethodsSection({
  hasGoogle,
  hasPassword,
}: SignInMethodsSectionProps) {
  const [passwordPending, startPasswordTransition] = useTransition()
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
