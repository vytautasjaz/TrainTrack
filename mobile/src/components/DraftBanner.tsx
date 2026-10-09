import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/theme/tokens'

/** Visible reminder that this build is UI-only. */
export function DraftBanner() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>UI draft</Text>
      <Text style={styles.copy}>Mock data · not connected to TrainTrack yet</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.sidebar,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  copy: {
    fontSize: 12,
    color: colors.inkFaint,
  },
})
