import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as SecureStore from 'expo-secure-store'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import {
  ApiError,
  fetchMe,
  googleOAuthBaseUrl,
  hasApiUrlConfigured,
  loginWithEmail,
} from '@/lib/api'
import type { MobileUser } from '@/types/api'

WebBrowser.maybeCompleteAuthSession()

const TOKEN_KEY = 'tt_mobile_token'

type AuthContextValue = {
  user: MobileUser | null
  token: string | null
  loading: boolean
  googleEnabled: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  handleUnauthorized: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function readToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

async function writeToken(token: string | null) {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token)
    else await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    // SecureStore unavailable (web) — session won't persist.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Server-hosted Google OAuth — works in Expo Go (no auth.expo.io).
  const googleEnabled = hasApiUrlConfigured()

  const handleUnauthorized = useCallback(() => {
    setToken(null)
    setUser(null)
    void writeToken(null)
  }, [])

  const applySession = useCallback(async (nextToken: string, nextUser: MobileUser) => {
    setToken(nextToken)
    setUser(nextUser)
    await writeToken(nextToken)
  }, [])

  const applyToken = useCallback(
    async (nextToken: string) => {
      const { user: me } = await fetchMe(nextToken, handleUnauthorized)
      await applySession(nextToken, me)
    },
    [applySession, handleUnauthorized],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await readToken()
      if (!stored) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const { user: me } = await fetchMe(stored, () => {
          if (!cancelled) handleUnauthorized()
        })
        if (!cancelled) {
          setToken(stored)
          setUser(me)
        }
      } catch {
        if (!cancelled) handleUnauthorized()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [handleUnauthorized])

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const res = await loginWithEmail(email.trim(), password)
      await applySession(res.token, res.user)
    },
    [applySession],
  )

  const signInWithGoogle = useCallback(async () => {
    if (!hasApiUrlConfigured()) {
      throw new ApiError(
        0,
        'Set EXPO_PUBLIC_API_URL to your Next.js server (LAN IP on phone).',
      )
    }

    const returnTo = Linking.createURL('auth')
    // OAuth must hit a Google-allowed host (tunnel / Netlify / localhost) — not 192.168.x.x
    const startUrl = `${googleOAuthBaseUrl()}/api/mobile/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`

    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnTo)

    if (result.type !== 'success' || !('url' in result) || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new ApiError(0, 'Google sign-in was cancelled.')
      }
      throw new ApiError(0, 'Google sign-in failed.')
    }

    const returned = Linking.parse(result.url)
    const err =
      typeof returned.queryParams?.error === 'string'
        ? returned.queryParams.error
        : null
    if (err) throw new ApiError(0, err)

    const nextToken =
      typeof returned.queryParams?.token === 'string'
        ? returned.queryParams.token
        : null
    if (!nextToken) {
      throw new ApiError(0, 'Google sign-in did not return a session token.')
    }

    await applyToken(nextToken)
  }, [applyToken])

  const signOut = useCallback(async () => {
    handleUnauthorized()
  }, [handleUnauthorized])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      googleEnabled,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      handleUnauthorized,
    }),
    [
      user,
      token,
      loading,
      googleEnabled,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      handleUnauthorized,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
