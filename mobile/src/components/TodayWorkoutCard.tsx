import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { WorkoutDetail } from '@/types/api'
import { colors, fonts, sportColor } from '@/theme/tokens'

/**
 * Matches web HomePrescriptionWorkoutCard: left rail + Bebas title + body + metrics.
 * Rail is absolutely positioned so it never stretches the card height (RN % height bug).
 */
export function TodayWorkoutCard({
  workout,
  onPress,
}: {
  workout: WorkoutDetail
  onPress?: () => void
}) {
  const rail = sportColor(workout.sport)
  const done = workout.status === 'completed'
  const skipped = workout.status === 'skipped'
  const pct = Math.min(
    100,
    Math.max(0, workout.completionPercent ?? (done ? 100 : 0)),
  )
  const railColor = skipped
    ? colors.inkFaint
    : done
      ? colors.good
      : rail

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        done && styles.cardDone,
        skipped && styles.cardSkipped,
        pressed && { opacity: 0.94 },
      ]}
    >
      <View style={[styles.railTrack, done && styles.railTrackDone]} pointerEvents="none">
        <View
          style={[
            styles.railFill,
            {
              height: `${done ? pct : 100}%`,
              backgroundColor: railColor,
            },
          ]}
        />
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            done && { color: colors.good },
            skipped && { color: colors.red },
          ]}
          numberOfLines={1}
        >
          {workout.title}
        </Text>

        {workout.description ? (
          <Text
            style={[
              styles.description,
              done && { color: 'rgba(26,159,92,0.85)' },
              skipped && { color: 'rgba(218,47,54,0.8)' },
            ]}
            numberOfLines={4}
          >
            {workout.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {done && workout.actualMetric ? (
            <>
              <Text style={styles.actual}>
                {workout.actualMetric}
                {workout.plannedMetric ? (
                  <Text style={styles.plannedInline}> / {workout.plannedMetric}</Text>
                ) : null}
              </Text>
              {workout.actualSecondary ? (
                <Text style={styles.actualSecondary}>{workout.actualSecondary}</Text>
              ) : null}
              {workout.tss ? (
                <Text style={styles.actualSecondary}>
                  {workout.tss}
                  {workout.plannedTss ? (
                    <Text style={styles.plannedInline}> / {workout.plannedTss}</Text>
                  ) : null}
                  {' TSS'}
                </Text>
              ) : null}
              {workout.completionPercent != null && pct > 0 ? (
                <Text style={styles.pct}>{pct}% of plan</Text>
              ) : null}
            </>
          ) : skipped ? (
            <Text style={styles.skipped}>Skipped</Text>
          ) : (
            <>
              <View style={styles.metricRow}>
                <Ionicons name="location-outline" size={12} color={colors.inkFaint} />
                <Text style={styles.metric}>{workout.metric}</Text>
              </View>
              {workout.zone ? (
                <View style={styles.metricRow}>
                  <Ionicons name="disc-outline" size={12} color={colors.inkFaint} />
                  <Text style={styles.metric}>{workout.zone}</Text>
                </View>
              ) : null}
              {workout.tss ? (
                <View style={styles.metricRow}>
                  <Ionicons name="pulse-outline" size={12} color={colors.inkFaint} />
                  <Text style={styles.metric}>{workout.tss} TSS</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardDone: {
    backgroundColor: colors.completedBg,
    borderColor: 'rgba(134, 211, 154, 0.7)',
  },
  cardSkipped: {
    backgroundColor: '#fdf2f2',
    borderColor: 'rgba(245, 163, 163, 0.7)',
  },
  railTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  railTrackDone: {
    backgroundColor: colors.line,
  },
  railFill: {
    width: 3,
    alignSelf: 'stretch',
  },
  body: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  description: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metric: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  actual: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 12,
    color: colors.good,
    fontVariant: ['tabular-nums'],
  },
  plannedInline: {
    fontFamily: fonts.uiSemiBold,
    color: 'rgba(26, 159, 92, 0.55)',
  },
  actualSecondary: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: 'rgba(26, 159, 92, 0.8)',
    fontVariant: ['tabular-nums'],
  },
  pct: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkFaint,
  },
  skipped: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.red,
  },
})
