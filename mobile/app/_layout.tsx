import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '@/lib/auth'
import { colors } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const onLogin = segments[0] === 'login'
    if (!user && !onLogin) {
      router.replace('/login')
    } else if (user && onLogin) {
      router.replace('/(tabs)')
    }
  }, [user, loading, segments, router])

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.red} />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BebasNeue_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => undefined)
    }
  }, [loaded])

  if (!loaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.red} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.heroBg,
  },
})
