'use client'

import { useActionState } from 'react'
import { registerWithEmail, signInWithEmail } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { INITIAL_AUTH_FORM_STATE } from '@/lib/auth-form-errors'

type HomeAuthFormsProps = {
  inviteOpen?: boolean
  registerButtonLabel: string
}

function AuthFormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
      {message}
    </p>
  )
}

export function HomeAuthForms({ inviteOpen, registerButtonLabel }: HomeAuthFormsProps) {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    INITIAL_AUTH_FORM_STATE,
  )
  const [registerState, registerAction, registerPending] = useActionState(
    registerWithEmail,
    INITIAL_AUTH_FORM_STATE,
  )

  return (
    <>
      <form action={signInAction} className="space-y-2.5">
        <AuthFormError message={signInState.error} />
        <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
        />
        <Button type="submit" variant="secondary" className="w-full" disabled={signInPending}>
          {signInPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <details
        className="rounded-[6px] border border-border/70 bg-muted/20 px-3 py-2"
        open={inviteOpen}
      >
        <summary className="cursor-pointer text-sm font-medium">Create an account</summary>
        <form action={registerAction} className="mt-3 space-y-2.5">
          <AuthFormError message={registerState.error} />
          <Input name="name" placeholder="Name" required autoComplete="name" />
          <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
          <Input
            name="password"
            type="password"
            placeholder="Password (min 8)"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={registerPending}>
            {registerPending ? 'Creating account…' : registerButtonLabel}
          </Button>
        </form>
      </details>
    </>
  )
}
