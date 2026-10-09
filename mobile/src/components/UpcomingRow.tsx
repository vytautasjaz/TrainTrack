import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { WorkoutDetail } from '@/types/api'
import { colors, fonts } from '@/theme/tokens'
import { SportIcon } from '@/components/SportIcon'

/** Matches web athlete home `WeekDayRows` mobile list row. */
export function UpcomingRow({
  workout,
  onPress,
}: {
  workout: WorkoutDetail
  onPress?: () => void
}) {
  const completed = workout.status === 'completed'
  const skipped = workout.status === 'skipped'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: 'rgba(245,245,245,0.6)' },
      ]}
    >
      <View style={styles.date}>
        <Text style={styles.weekday}>{workout.weekday}</Text>
        <Text style={styles.dateNum}>{workout.dateNum}</Text>
        <Text style={styles.month}>{workout.month}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.session}>
        <View style={styles.titleRow}>
          <SportIcon sport={workout.sport} size={32} />
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, skipped && styles.titleSkipped]}
              numberOfLines={1}
            >
              {workout.title}
              <Text style={styles.metricSep}> - </Text>
              <Text style={styles.metric}>{workout.metric}</Text>
            </Text>
          </View>
          {completed ? (
            <Ionicons name="checkmark" size={16} color={colors.good} />
          ) : null}
        </View>
        <Text
          style={[styles.prescription, skipped && styles.titleSkipped]}
          numberOfLines={2}
        >
          {workout.prescription}
          {skipped ? ' · Skipped' : completed ? ' · Done' : ''}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 8,
    paddingRight: 12,
    backgroundColor: colors.surface,
  },
  date: {
    width: 36,
    paddingTop: 10,
    alignItems: 'center',
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
    fontSize: 17,
    lineHeight: 17,
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
  session: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  titleSkipped: {
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
  },
  metricSep: {
    fontFamily: fonts.uiSemiBold,
    color: colors.inkSoft,
  },
  metric: {
    fontFamily: fonts.uiSemiBold,
    fontVariant: ['tabular-nums'],
  },
  prescription: {
    marginTop: 2,
    paddingLeft: 42,
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkSoft,
  },
})
