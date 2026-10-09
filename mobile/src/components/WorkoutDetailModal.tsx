import { useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import type { WorkoutDetail } from '@/types/api'
import { SportIcon } from '@/components/SportIcon'
import { colors, fonts, sportColor, type SportId } from '@/theme/tokens'

const SPORT_LABEL: Record<SportId, string> = {
  run: 'Run',
  bike: 'Bike',
  swim: 'Swim',
  strength: 'Strength',
  recovery: 'Recovery',
  hyrox: 'Hyrox',
}

function splitMetric(value: string): { value: string; unit: string } {
  const m = value.trim().match(/^(.+?)\s+(km|m|min|h)$/i)
  if (m) return { value: m[1]!, unit: m[2]!.toLowerCase() }
  return { value: value.trim(), unit: '' }
}

function HeroMetric({
  label,
  value,
  unit,
  planned,
  icon,
}: {
  label: string
  value: string | null
  unit?: string
  planned?: string | null
  icon?: keyof typeof Ionicons.glyphMap
}) {
  if (!value) return null
  return (
    <View style={styles.metricCol}>
      <View style={styles.metricLabelRow}>
        {icon ? (
          <Ionicons name={icon} size={11} color="rgba(255,255,255,0.45)" />
        ) : null}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      {planned ? <Text style={styles.metricPlanned}>plan {planned}</Text> : null}
    </View>
  )
}

/**
 * Draft athlete workout modal — mirrors web `WorkoutDetailModal` /
 * `AthleteWorkoutDetailCard` (dark hero + metrics + body + footer actions).
 */
export function WorkoutDetailModal({
  workout,
  visible,
  loading = false,
  onClose,
}: {
  workout: WorkoutDetail | null
  visible: boolean
  loading?: boolean
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()

  const draftAction = useCallback((title: string, body: string) => {
    Alert.alert(title, body)
  }, [])

  if (!workout) return null

  const done = workout.status === 'completed'
  const skipped = workout.status === 'skipped'
  const planned = workout.status === 'planned'
  const accent = done ? colors.good : skipped ? '#b91c1c' : sportColor(workout.sport)
  const sportLabel = workout.sportLabel || SPORT_LABEL[workout.sport]
  const zone = workout.zone ?? null
  const sessionType = workout.sessionType ?? null
  const structure = workout.structure ?? []
  const coachNotes = workout.coachNotes ?? null
  const pace = workout.pace ?? null

  const distance = done
    ? workout.actualMetric
      ? splitMetric(workout.actualMetric)
      : null
    : workout.metric.match(/km|m$/i)
      ? splitMetric(workout.metric)
      : null
  const time = done
    ? workout.actualSecondary ?? null
    : workout.metric.match(/min|h$/i)
      ? workout.metric
      : null
  const plannedDistance = done ? workout.plannedMetric ?? null : null
  const plannedTime = done ? workout.plannedSecondary ?? null : null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroTop}>
            <SportIcon sport={workout.sport} size={40} />
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {workout.title}
              </Text>
              <Text style={styles.heroMeta}>
                <Text style={[styles.heroSport, { color: accent }]}>
                  {sportLabel}
                </Text>
                {' · '}
                {workout.dateLabel}
              </Text>
              {done ? (
                <View style={styles.completedRow}>
                  <Ionicons name="checkmark" size={13} color="#86d39a" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              ) : null}
              {skipped ? (
                <Text style={styles.skippedText}>Skipped</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            {sessionType ? (
              <>
                <HeroMetric label="Type" value={sessionType} />
                {distance || time ? <View style={styles.metricDivider} /> : null}
              </>
            ) : null}
            {distance ? (
              <>
                <HeroMetric
                  label="Distance"
                  value={distance.value}
                  unit={distance.unit}
                  planned={plannedDistance}
                  icon="git-commit-outline"
                />
                {time || pace || zone ? (
                  <View style={styles.metricDivider} />
                ) : null}
              </>
            ) : null}
            {time ? (
              <>
                <HeroMetric
                  label="Time"
                  value={time}
                  planned={plannedTime}
                  icon="time-outline"
                />
                {done && pace ? <View style={styles.metricDivider} /> : null}
              </>
            ) : null}
            {done && pace ? (
              <>
                <HeroMetric label="Avg pace" value={pace} unit="/km" />
                {workout.tss ? <View style={styles.metricDivider} /> : null}
              </>
            ) : !done && zone && !distance ? (
              <>
                <HeroMetric label="Zone" value={zone} />
                {workout.tss ? <View style={styles.metricDivider} /> : null}
              </>
            ) : time && workout.tss ? (
              <View style={styles.metricDivider} />
            ) : null}
            {workout.tss ? (
              <HeroMetric
                label="TSS"
                value={workout.tss}
                planned={workout.plannedTss ?? undefined}
              />
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBody}>
            <ActivityIndicator color={colors.red} />
          </View>
        ) : (
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {workout.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Prescription</Text>
                <Text style={styles.bodyText}>{workout.description}</Text>
              </View>
            ) : null}

            {structure.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Session</Text>
                <View style={styles.structureList}>
                  {structure.map((block, i) => (
                    <View key={`${block.label}-${i}`} style={styles.structureRow}>
                      <View
                        style={[styles.structureDot, { backgroundColor: accent }]}
                      />
                      <View style={styles.structureText}>
                        <Text style={styles.structureLabel}>{block.label}</Text>
                        <Text style={styles.structureDetail}>{block.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {coachNotes ? (
              <View style={styles.coachCard}>
                <Text style={styles.coachLabel}>Coach notes</Text>
                <Text style={styles.coachText}>{coachNotes}</Text>
              </View>
            ) : null}

            <Text style={styles.draftHint}>
              Logging, Strava, and Ask coach will connect in a later slice.
            </Text>
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              draftAction(
                'Ask coach',
                'Coaching thread will connect to TrainTrack later.',
              )
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={15}
              color={colors.ink}
            />
            <Text style={styles.secondaryBtnText}>Ask coach</Text>
          </Pressable>

          {planned ? (
            <View style={styles.primaryPair}>
              <Pressable
                style={styles.skipBtn}
                onPress={() =>
                  draftAction('Skip', 'Skip will update workout status via API.')
                }
              >
                <Text style={styles.skipBtnText}>Skip</Text>
              </Pressable>
              <Pressable
                style={styles.doneBtn}
                onPress={() =>
                  draftAction('Done', 'Quick log / Done will connect later.')
                }
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.doneBtn}
              onPress={() =>
                draftAction(
                  'Share card',
                  'Share / export card will connect later.',
                )
              }
            >
              <Ionicons name="share-outline" size={15} color="#fff" />
              <Text style={styles.doneBtnText}>Share</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: colors.heroBg,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 28,
  },
  heroTitle: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 20,
    lineHeight: 24,
    color: '#fff',
  },
  heroMeta: {
    marginTop: 3,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  heroSport: {
    fontFamily: fonts.uiSemiBold,
    color: 'rgba(255,255,255,0.75)',
  },
  completedRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#86d39a',
  },
  skippedText: {
    marginTop: 6,
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#fca5a5',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 6,
    borderRadius: 6,
  },
  metricsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 16,
  },
  metricLabel: {
    fontFamily: fonts.ui,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    marginTop: 4,
    fontFamily: fonts.uiSemiBold,
    fontSize: 18,
    lineHeight: 20,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  metricPlanned: {
    marginTop: 3,
    fontFamily: fonts.ui,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'stretch',
  },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 18,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  bodyText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  structureList: {
    gap: 10,
  },
  structureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  structureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  structureText: {
    flex: 1,
    gap: 2,
  },
  structureLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  structureDetail: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkSoft,
  },
  coachCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    padding: 12,
    gap: 4,
  },
  coachLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 12,
    color: '#5b21b6',
  },
  coachText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  draftHint: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  primaryPair: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  skipBtnText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 13,
    color: colors.inkSoft,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  doneBtnText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 13,
    color: '#fff',
  },
})
