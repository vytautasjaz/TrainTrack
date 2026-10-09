import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '@/lib/auth'
import { ApiError, hasApiUrlConfigured } from '@/lib/api'
import { colors, fonts } from '@/theme/tokens'

function GoogleGlyph() {
  return (
    <View style={styles.googleGlyph}>
      <Text style={styles.googleG}>G</Text>
    </View>
  )
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { signInWithEmail, signInWithGoogle, googleEnabled } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)

  async function onEmailLogin() {
    setError(null)
    if (!hasApiUrlConfigured()) {
      setError('Set EXPO_PUBLIC_API_URL to your Next.js server (LAN IP).')
      return
    }
    if (!email.trim() || !password) {
      setError('Enter email and password.')
      return
    }
    setPending(true)
    try {
      await signInWithEmail(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.')
    } finally {
      setPending(false)
    }
  }

  async function onGoogleLogin() {
    setError(null)
    if (!hasApiUrlConfigured()) {
      setError('Set EXPO_PUBLIC_API_URL to your Next.js server (LAN IP).')
      return
    }
    setGooglePending(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed.')
    } finally {
      setGooglePending(false)
    }
  }

  const busy = pending || googlePending

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="light" />
      <View style={styles.heroGlow} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>TrainTrack</Text>
          <Text style={styles.sub}>Athlete sign-in</Text>

          <View style={styles.card}>
            <Pressable
              style={[styles.googleBtn, busy && styles.btnDisabled]}
              onPress={() => void onGoogleLogin()}
              disabled={busy}
            >
              {googlePending ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <>
                  <GoogleGlyph />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            {!googleEnabled ? (
              <Text style={styles.configHint}>
                Set EXPO_PUBLIC_API_URL in mobile/.env, then add this redirect on
                your existing Google Web client (AUTH_GOOGLE_ID):{'\n'}
                {'{API}/api/mobile/auth/google/callback'}
              </Text>
            ) : null}

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or email</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkFaint}
            />

            <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.inkFaint}
              onSubmitEditing={() => void onEmailLogin()}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={() => void onEmailLogin()}
              disabled={busy}
            >
              {pending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign in</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Same athlete account as the web app. Sign up with Google on the web
            first if you don’t have a password. API:{' '}
            {process.env.EXPO_PUBLIC_API_URL?.trim() || 'not configured'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.heroBg,
  },
  flex: { flex: 1 },
  heroGlow: {
    position: 'absolute',
    right: -40,
    bottom: 80,
    width: 220,
    height: 180,
    borderRadius: 110,
    backgroundColor: 'rgba(218, 47, 54, 0.28)',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
    color: '#fff',
  },
  sub: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: 'rgba(255,255,255,0.62)',
  },
  card: {
    marginTop: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    padding: 18,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingVertical: 13,
    backgroundColor: colors.surface,
  },
  googleGlyph: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },
  googleG: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 12,
    color: '#4285F4',
    lineHeight: 14,
  },
  googleBtnText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  configHint: {
    marginTop: 10,
    fontFamily: fonts.ui,
    fontSize: 11,
    lineHeight: 15,
    color: colors.inkFaint,
  },
  orRow: {
    marginTop: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  orText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  label: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  labelSpaced: {
    marginTop: 14,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  error: {
    marginTop: 12,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.red,
  },
  primaryBtn: {
    marginTop: 18,
    borderRadius: 8,
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 15,
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  hint: {
    marginTop: 18,
    fontFamily: fonts.ui,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.45)',
  },
})
