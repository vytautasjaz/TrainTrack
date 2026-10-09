import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { colors, fonts } from '@/theme/tokens'

const WEB_URL = 'https://traintrack.app'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>
          {user ? `${user.name} · ${user.email}` : 'Not signed in'}
        </Text>
      </View>

      <View style={styles.card}>
        <Row
          icon="person-outline"
          label="Account"
          hint={user?.email ?? 'Signed out'}
          onPress={() =>
            Alert.alert('Account', user?.email ?? 'No session')
          }
        />
        <View style={styles.sep} />
        <Row
          icon="globe-outline"
          label="Open TrainTrack web"
          onPress={() => Linking.openURL(WEB_URL).catch(() => undefined)}
        />
        <View style={styles.sep} />
        <Row
          icon="log-out-outline"
          label="Sign out"
          onPress={() => {
            Alert.alert('Sign out?', 'You’ll need to sign in again.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => void signOut(),
              },
            ])
          }}
        />
      </View>

      <Text style={styles.version}>TrainTrack athlete · live API</Text>
    </View>
  )
}

function Row({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  hint?: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sidebar }]}
    >
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  sub: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkSoft,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  rowHint: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkFaint,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginLeft: 46,
  },
  version: {
    marginTop: 24,
    textAlign: 'center',
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkFaint,
  },
})
