import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import type { Provider } from 'next-auth/providers'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
      if (user.disabledAt) return null
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
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: '/',
    error: '/',
  },
  providers,
  /**
   * Stale/malformed session cookies (e.g. after AUTH_SECRET rotation or an old
   * Auth.js cookie) fail JWT decode. Auth.js already clears them; don't treat
   * that as an app crash in the Next.js console.
   */
  logger: {
    error(error) {
      const type =
        error && typeof error === 'object' && 'type' in error
          ? String((error as { type?: string }).type)
          : error instanceof Error
            ? error.name
            : ''
      if (type === 'JWTSessionError' || type === 'SessionTokenError') {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[auth] ${type}: clearing invalid session cookie`)
        }
        return
      }
      console.error(error)
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.id && !user?.email) return true
      try {
        const email = user.email?.trim().toLowerCase()
        const dbUser = user.id
          ? await prisma.user.findUnique({
              where: { id: user.id },
              select: { disabledAt: true, email: true },
            })
          : null
        // OAuth may pass a non-DB id on first hop — fall back to email.
        const resolved =
          dbUser ??
          (email
            ? await prisma.user.findUnique({
                where: { email },
                select: { disabledAt: true, email: true },
              })
            : null)
        if (resolved?.disabledAt) return false
        return true
      } catch (err) {
        // Schema/DB blips must not lock everyone out as AccessDenied.
        console.error('[auth] signIn disabled check failed', err)
        return true
      }
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
      }
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              name: true,
              email: true,
              roles: true,
              image: true,
              disabledAt: true,
              onboardingSkippedAt: true,
              athleteProfile: { select: { id: true } },
              coachProfile: { select: { id: true } },
            },
          })
          // Only kill the session for a confirmed disabled account.
          // Missing row / transient DB errors must not clear a valid login
          // (that previously bounced people to /?error=AccessDenied).
          if (dbUser?.disabledAt) {
            return { ...token, sub: undefined }
          }
          if (dbUser) {
            token.roles = dbUser.roles
            token.name = dbUser.name
            token.email = dbUser.email
            token.picture = dbUser.image
            token.hasAthlete = Boolean(dbUser.athleteProfile)
            token.hasCoach = Boolean(dbUser.coachProfile)
            token.onboardingSkipped = Boolean(dbUser.onboardingSkippedAt)
          }
        } catch (err) {
          console.error('[auth] jwt user refresh failed', err)
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
      const email = user.email?.trim().toLowerCase()
      const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
      const roles =
        email && adminEmails.includes(email) ? [UserRole.ADMIN] : []
      await prisma.user.update({
        where: { id: user.id },
        data: { roles },
      })
    },
  },
})
