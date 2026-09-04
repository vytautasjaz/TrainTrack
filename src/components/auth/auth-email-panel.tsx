'use client'

import { useEffect, useState, useTransition, useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { registerWithEmail, signInWithEmail, signInWithGoogle } from '@/app/actions/auth'
import { AuthPasswordField, AuthTextField, useAuthFieldIds } from '@/components/auth/auth-fields'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/ui/form-error'
import { INITIAL_AUTH_FORM_STATE } from '@/lib/auth-form-errors'
import {
  validateRegisterForm,
  validateSignInForm,
  type AuthFormField,
} from '@/lib/auth-form-validation'
import { cn } from '@/lib/utils'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

type AuthMode = 'sign-in' | 'register'

type AuthEmailPanelProps = {
  initialMode?: AuthMode
  registerButtonLabel: string
  googleEnabled: boolean
  /** Coaching code from /?invite= — baked into Google OAuth redirectTo. */
  inviteCode?: string | null
  inviteCoachName?: string | null
  claimCoachName?: string | null
  claimAthleteName?: string | null
}

export function AuthEmailPanel({
  initialMode = 'sign-in',
  registerButtonLabel,
  googleEnabled,
  inviteCode = null,
  inviteCoachName,
  claimCoachName,
  claimAthleteName,
}: AuthEmailPanelProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const signInIds = useAuthFieldIds('sign-in')
  const registerIds = useAuthFieldIds('register')

  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    INITIAL_AUTH_FORM_STATE,
  )
  const [registerState, registerAction, registerPending] = useActionState(
    registerWithEmail,
    INITIAL_AUTH_FORM_STATE,
  )

  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  const [clientErrors, setClientErrors] = useState<Partial<Record<AuthFormField | 'email' | 'password', string>>>({})
  const [googlePending, startGoogleTransition] = useTransition()

  useEffect(() => {
    setClientErrors({})
  }, [mode])

  useEffect(() => {
    if (signInState.fieldErrors) {
      setClientErrors((current) => ({ ...current, ...signInState.fieldErrors }))
    }
  }, [signInState.fieldErrors])

  useEffect(() => {
    if (registerState.fieldErrors) {
      setClientErrors((current) => ({ ...current, ...registerState.fieldErrors }))
    }
  }, [registerState.fieldErrors])

  function handleSignInSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateSignInForm({ email: signInEmail, password: signInPassword })
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors)
      return
    }
    setClientErrors({})
    const formData = new FormData(event.currentTarget)
    signInAction(formData)
  }

  function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateRegisterForm({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
    })
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors)
      return
    }
    setClientErrors({})
    const formData = new FormData(event.currentTarget)
    registerAction(formData)
  }

  function handleGoogleSignIn() {
    startGoogleTransition(async () => {
      await signInWithGoogle(inviteCode)
    })
  }

  const hasClaimInvite = Boolean(claimCoachName && claimAthleteName)
  const isRegister = mode === 'register'
  const activeError = isRegister ? registerState.error : signInState.error
  const emailPending = isRegister ? registerPending : signInPending
  const authBusy = googlePending || emailPending

  return (
    <div className="space-y-5" aria-busy={authBusy}>
      <div className="flex rounded-full border border-[var(--tt-line,#ebebeb)] bg-[var(--tt-sidebar,#f5f5f5)] p-0.5">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          disabled={authBusy}
          className={cn(
            'flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
            !isRegister
              ? 'bg-white text-[var(--tt-ink,#111)] shadow-sm'
              : 'text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]',
          )}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          disabled={authBusy}
          className={cn(
            'flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
            isRegister
              ? 'bg-white text-[var(--tt-ink,#111)] shadow-sm'
              : 'text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]',
          )}
        >
          Sign up
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--tt-ink,#111)]">
          {isRegister
            ? hasClaimInvite
              ? 'Take over your training profile'
              : inviteCoachName
                ? 'Create your athlete account'
                : 'Create your account'
            : 'Welcome back'}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]">
          {isRegister
            ? hasClaimInvite
              ? `${claimCoachName} set up a profile for ${claimAthleteName}. Register to link it to your account.`
              : inviteCoachName
                ? `${inviteCoachName} invited you. Register to connect with them.`
                : 'One account for athlete and coach — pick your path after sign up.'
            : hasClaimInvite
              ? `Log in to take over ${claimAthleteName}'s training profile from ${claimCoachName}.`
              : 'Log in to your TrainTrack account.'}
        </p>
      </div>

      {hasClaimInvite ? (
        <p className="rounded-[8px] border border-[color-mix(in_srgb,var(--tt-red)_24%,var(--tt-line))] bg-[color-mix(in_srgb,var(--tt-red)_6%,white)] px-3 py-2 text-[12px] leading-relaxed text-[var(--tt-ink,#111)]">
          Profile from <span className="font-semibold">{claimCoachName}</span> ·{' '}
          {claimAthleteName}
        </p>
      ) : inviteCoachName && isRegister ? (
        <p className="rounded-[8px] border border-[color-mix(in_srgb,var(--tt-red)_24%,var(--tt-line))] bg-[color-mix(in_srgb,var(--tt-red)_6%,white)] px-3 py-2 text-[12px] leading-relaxed text-[var(--tt-ink,#111)]">
          Invite from <span className="font-semibold">{inviteCoachName}</span>
        </p>
      ) : null}

      {activeError ? <FormError message={activeError} /> : null}

      {googleEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="auth-google-btn h-11 w-full"
          disabled={authBusy}
          onClick={handleGoogleSignIn}
          aria-busy={googlePending}
        >
          {googlePending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          {googlePending ? 'Redirecting to Google…' : 'Continue with Google'}
        </Button>
      ) : (
        <Button type="button" variant="outline" className="auth-google-btn h-11 w-full" disabled>
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>
      )}

      <div className="relative py-0.5 text-center">
        <span className="relative z-10 bg-[var(--tt-surface,#fff)] px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
          or email
        </span>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--tt-line,#ebebeb)]" />
      </div>

      {isRegister ? (
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
          <AuthTextField
            id={registerIds.name}
            label="Full name"
            name="name"
            value={registerName}
            onChange={setRegisterName}
            error={clientErrors.name}
            autoComplete="name"
            placeholder="Your name"
            disabled={authBusy}
          />
          <AuthTextField
            id={registerIds.email}
            label="Email"
            name="email"
            type="email"
            value={registerEmail}
            onChange={setRegisterEmail}
            error={clientErrors.email}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={authBusy}
          />
          <AuthPasswordField
            id={registerIds.password}
            label="Password"
            name="password"
            value={registerPassword}
            onChange={setRegisterPassword}
            error={clientErrors.password}
            autoComplete="new-password"
            showRequirements
            placeholder="Create a password"
            disabled={authBusy}
          />
          <AuthPasswordField
            id={registerIds.confirmPassword}
            label="Confirm password"
            name="confirmPassword"
            value={registerConfirmPassword}
            onChange={setRegisterConfirmPassword}
            error={clientErrors.confirmPassword}
            autoComplete="new-password"
            placeholder="Repeat your password"
            disabled={authBusy}
          />
          <Button
            type="submit"
            variant="brand"
            className="h-11 w-full text-[14px] font-semibold"
            disabled={authBusy}
            aria-busy={registerPending}
          >
            {registerPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Creating account…
              </>
            ) : (
              registerButtonLabel
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignInSubmit} className="space-y-3.5" noValidate>
          <AuthTextField
            id={signInIds.email}
            label="Email"
            name="email"
            type="email"
            value={signInEmail}
            onChange={setSignInEmail}
            error={clientErrors.email}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={authBusy}
          />
          <AuthPasswordField
            id={signInIds.password}
            label="Password"
            name="password"
            value={signInPassword}
            onChange={setSignInPassword}
            error={clientErrors.password}
            autoComplete="current-password"
            placeholder="Your password"
            disabled={authBusy}
          />
          <div className="flex items-center justify-end">
            <span
              className="text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]"
              title="Password reset is coming soon"
            >
              Forgot password? <span className="text-[var(--tt-ink-soft,#6b6b6b)]">Coming soon</span>
            </span>
          </div>
          <Button
            type="submit"
            variant="brand"
            className="h-11 w-full text-[14px] font-semibold"
            disabled={authBusy}
            aria-busy={signInPending}
          >
            {signInPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
