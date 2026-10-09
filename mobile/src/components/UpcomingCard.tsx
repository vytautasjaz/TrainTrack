import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { WorkoutDetail } from '@/types/api'
import { colors, fonts } from '@/theme/tokens'
import { SportIcon } from '@/components/SportIcon'

/**
 * Next-week agenda card — matches web athlete home next-week cards:
 * date rail · sport icon · title / metric / prescription · chevron.
 */
export function UpcomingCard({
  workout,
  onPress,
}: {
  workout: WorkoutDetail
  onPress?: () => void
}) {
  const skipped = workout.status === 'skipped'
  const completed = workout.status === 'completed'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.date}>
        <Text style={styles.weekday}>{workout.weekday}</Text>
        <Text style={styles.dateNum}>{workout.dateNum}</Text>
        <Text style={styles.month}>{workout.month}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.mainRow}>
          <SportIcon sport={workout.sport} size={36} />
          <View style={styles.textCol}>
            <Text
              style={[styles.title, skipped && styles.mutedStrike]}
              numberOfLines={2}
            >
              {workout.title}
            </Text>
            <Text
              style={[styles.metric, skipped && styles.mutedStrike]}
              numberOfLines={1}
            >
              {workout.metric}
            </Text>
            {workout.prescription ? (
              <Text
                style={[styles.prescription, skipped && styles.mutedStrike]}
                numberOfLines={2}
              >
                {workout.prescription}
                {skipped ? ' · Skipped' : completed ? ' · Done' : ''}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.inkFaint}
            style={styles.chevron}
          />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    paddingLeft: 8,
    paddingRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.94,
  },
  date: {
    width: 40,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: {
    fontFamily: fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  dateNum: {
    marginTop: 2,
    fontFamily: fonts.uiSemiBold,
    fontSize: 18,
    lineHeight: 20,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  month: {
    marginTop: 2,
    fontFamily: fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginHorizontal: 8,
    backgroundColor: colors.line,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 15,
    lineHeight: 19,
    color: colors.ink,
  },
  metric: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  prescription: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkSoft,
  },
  mutedStrike: {
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
  },
  chevron: {
    marginLeft: 2,
  },
})
