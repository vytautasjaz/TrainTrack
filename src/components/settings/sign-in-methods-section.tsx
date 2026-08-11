import Link from 'next/link'
import { Caption, SectionTitle } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  linkGoogleAccount,
  linkStravaAccount,
  setPassword,
  unlinkProvider,
} from '@/app/actions/auth'

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
const stravaEnabled = Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET)

type SignInMethodsSectionProps = {
  hasGoogle: boolean
  hasStrava: boolean
  hasPassword: boolean
  showActivitySyncLink?: boolean
}

export function SignInMethodsSection({
  hasGoogle,
  hasStrava,
  hasPassword,
  showActivitySyncLink = false,
}: SignInMethodsSectionProps) {
  return (
    <section id="sign-in" className="card-elevated scroll-mt-24 space-y-4 p-5">
      <div>
        <SectionTitle>Sign-in methods</SectionTitle>
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

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border/60 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Strava</p>
            <Caption>
              {hasStrava ? 'Linked for sign-in' : 'Not linked'}
              {showActivitySyncLink ? (
                <>
                  {' '}
                  ·{' '}
                  <Link href="/settings/preferences#integrations" className="underline">
                    activity sync
                  </Link>
                </>
              ) : null}
            </Caption>
          </div>
          {stravaEnabled ? (
            hasStrava ? (
              <form action={unlinkProvider}>
                <input type="hidden" name="provider" value="strava" />
                <Button type="submit" variant="outline" size="sm">
                  Unlink
                </Button>
              </form>
            ) : (
              <form action={linkStravaAccount}>
                <Button type="submit" variant="outline" size="sm">
                  Link Strava
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
          <form action={setPassword} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              name="password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="sm:flex-1"
            />
            <Button type="submit" variant="secondary" size="sm">
              {hasPassword ? 'Update password' : 'Set password'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
