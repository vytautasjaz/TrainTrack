import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import type { Provider } from 'next-auth/providers'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getStravaConfig } from '@/lib/strava/config'
import { exchangeStravaCode } from '@/lib/strava/client'

function stravaScopes(): string {
  try {
    return getStravaConfig().scopes
  } catch {
    return process.env.STRAVA_SCOPES || 'read,activity:read_all,profile:read_all'
  }
}

const stravaProvider: Provider = {
  id: 'strava',
  name: 'Strava',
  type: 'oauth',
  authorization: {
    url: 'https://www.strava.com/oauth/authorize',
    params: {
      scope: stravaScopes(),
      approval_prompt: 'auto',
      response_type: 'code',
    },
  },
  token: {
    url: 'https://www.strava.com/oauth/token',
    async request({
      params,
      provider,
    }: {
      params: { code?: string }
      provider: { clientId?: string; clientSecret?: string }
    }) {
      const clientId = provider.clientId
      const clientSecret = provider.clientSecret
      if (!params.code || !clientId || !clientSecret) {
        throw new Error('Missing Strava OAuth code or client credentials')
      }
      const tokens = await exchangeStravaCode(params.code)
      return {
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          token_type: tokens.token_type,
          scope: stravaScopes(),
        },
      }
    },
  },
  userinfo: {
    url: 'https://www.strava.com/api/v3/athlete',
    async request({ tokens }: { tokens: { access_token?: string } }) {
      const res = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch Strava athlete profile')
      return res.json()
    },
  },
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  profile(profile) {
    const id = String(profile.id)
    const name =
      [profile.firstname, profile.lastname].filter(Boolean).join(' ').trim() ||
      profile.username ||
      `Strava ${id}`
    return {
      id,
      name,
      email: `strava-${id}@users.traintrack.local`,
      image: profile.profile || profile.profile_medium || null,
    }
  },
  allowDangerousEmailAccountLinking: true,
}

const providers: Provider[] = [
  Credentials({
    id: 'credentials',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? '')
        .trim()
        .toLowerCase()
      const password = String(credentials?.password ?? '')
      if (!email || !password) return null

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (!ok) return null
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }
    },
  }),
  stravaProvider,
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    error: '/',
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'strava' && account.access_token && user.id) {
        const stravaAthleteId = String(account.providerAccountId)
        const expiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : new Date(Date.now() + 6 * 60 * 60 * 1000)
        await prisma.stravaConnection.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            stravaAthleteId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? '',
            expiresAt,
            scope: account.scope ?? getStravaConfig().scopes,
          },
          update: {
            stravaAthleteId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? undefined,
            expiresAt,
            scope: account.scope ?? undefined,
          },
        })
        if (profile && typeof profile === 'object') {
          const p = profile as { profile?: string; profile_medium?: string }
          const image = p.profile || p.profile_medium
          if (image) {
            await prisma.user.update({
              where: { id: user.id },
              data: { image },
            })
          }
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
      }
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
            image: true,
            onboardingSkippedAt: true,
            athleteProfile: { select: { id: true } },
            coachProfile: { select: { id: true } },
          },
        })
        if (dbUser) {
          token.roles = dbUser.roles
          token.name = dbUser.name
          token.email = dbUser.email
          token.picture = dbUser.image
          token.hasAthlete = Boolean(dbUser.athleteProfile)
          token.hasCoach = Boolean(dbUser.coachProfile)
          token.onboardingSkipped = Boolean(dbUser.onboardingSkippedAt)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.roles = (token.roles as UserRole[]) ?? []
        session.user.hasAthlete = Boolean(token.hasAthlete)
        session.user.hasCoach = Boolean(token.hasCoach)
        session.user.onboardingSkipped = Boolean(token.onboardingSkipped)
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return
      // New OAuth users start with no roles until onboarding.
      await prisma.user.update({
        where: { id: user.id },
        data: { roles: [] },
      })
    },
  },
  trustHost: true,
})
