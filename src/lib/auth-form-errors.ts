import { AuthError } from 'next-auth'
import { mapPrismaError } from '@/lib/action-error'
import type { AuthFormField } from '@/lib/auth-form-validation'

export type { AuthFormField } from '@/lib/auth-form-validation'

export type AuthFormState = {
  error?: string | null
  fieldErrors?: Partial<Record<AuthFormField, string>>
}

export const INITIAL_AUTH_FORM_STATE: AuthFormState = {}

const NEXT_AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    'Sign-in is temporarily unavailable. Try again later or contact support.',
  AccessDenied: 'Sign-in was cancelled.',
  Verification: 'The sign-in link expired or is invalid. Request a new one.',
  OAuthSignin: 'Could not start sign-in. Try again.',
  OAuthCallback: 'Sign-in failed during the provider callback. Try again.',
  OAuthCreateAccount: 'Could not create an account with that provider.',
  EmailCreateAccount: 'Could not create an account with that email.',
  Callback: 'Sign-in failed. Try again.',
  OAuthAccountNotLinked:
    'That email is already linked to another sign-in method. Use email/password or the original provider.',
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'Please sign in to continue.',
  InviteNotFound:
    'This coaching invite link is invalid or no longer available.',
  Default: 'Sign-in failed. Try again or use another method.',
}

export function nextAuthErrorMessage(code: string | undefined | null): string {
  if (!code) return NEXT_AUTH_ERROR_MESSAGES.Default
  return NEXT_AUTH_ERROR_MESSAGES[code] ?? NEXT_AUTH_ERROR_MESSAGES.Default
}

/** Re-throw Next.js `redirect()` / navigation errors from server actions. */
export function isRedirectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const digest = (error as { digest?: unknown }).digest
  return typeof digest === 'string' && digest.includes('NEXT_REDIRECT')
}

export function mapAuthActionError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isStaleServerActionError(error)) {
    return 'This page is out of date after an update. Refreshing…'
  }

  if (error instanceof AuthError) {
    return nextAuthErrorMessage(error.type)
  }

  const prisma = mapPrismaError(error)
  if (prisma) return prisma.message

  if (error instanceof Error) {
    const message = error.message.trim()
    if (message) return message
  }

  return fallback
}

/** Client/server bundle mismatch after deploy — common with stale service worker caches. */
export function isStaleServerActionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message
  return (
    /Server Action .* was not found/i.test(message) ||
    /Failed to find Server Action/i.test(message) ||
    error.name === 'UnrecognizedActionError'
  )
}
