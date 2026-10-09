import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { TodayWorkoutCard } from '@/components/TodayWorkoutCard'
import { UpcomingRow } from '@/components/UpcomingRow'
import { UpcomingCard } from '@/components/UpcomingCard'
import { WeekStatsCard } from '@/components/WeekStatsCard'
import { TrainingLoadCard } from '@/components/TrainingLoadCard'
import { WorkoutDetailModal } from '@/components/WorkoutDetailModal'
import { useAuth } from '@/lib/auth'
import { ApiError, fetchHome, fetchWorkout } from '@/lib/api'
import type { TrainingLoadWeek, WeekStats, WorkoutDetail } from '@/types/api'
import { colors, fonts } from '@/theme/tokens'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { token, user, handleUnauthorized } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [statsWeekOffset, setStatsWeekOffset] = useState(0)
  const [greeting, setGreeting] = useState('Hello')
  const [name, setName] = useState(user?.name?.split(/\s+/)[0] ?? '')
  const [today, setToday] = useState<WorkoutDetail[]>([])
  const [upcoming, setUpcoming] = useState<WorkoutDetail[]>([])
  const [weekStatsWeeks, setWeekStatsWeeks] = useState<WeekStats[]>([])
  const [trainingLoadWeeks, setTrainingLoadWeeks] = useState<TrainingLoadWeek[]>(
    [],
  )
  const [weekLabel, setWeekLabel] = useState('')
  const [weekTitle, setWeekTitle] = useState('Upcoming')
  const [canGoPrev, setCanGoPrev] = useState(false)
  const [canGoNext, setCanGoNext] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WorkoutDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadHome = useCallback(
    async (offset: number, mode: 'initial' | 'refresh' | 'nav' = 'initial') => {
      if (!token) return
      if (mode === 'refresh') setRefreshing(true)
      else if (mode === 'initial') setLoading(true)
      setError(null)
      try {
        const data = await fetchHome(token, offset, handleUnauthorized)
        setGreeting(data.greeting)
        setName(data.name)
        setToday(data.today)
        setUpcoming(data.upcoming)
        setWeekStatsWeeks(
          data.weekStatsWeeks?.length ? data.weekStatsWeeks : [data.weekStats],
        )
        setTrainingLoadWeeks(data.trainingLoadWeeks ?? [])
        setWeekLabel(data.weekLabel)
        setWeekTitle(data.weekTitle)
        setCanGoPrev(data.canGoPrev)
        setCanGoNext(data.canGoNext)
        setWeekOffset(data.weekOffset)
        if (mode !== 'nav') {
          setStatsWeekOffset(0)
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load home.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token, handleUnauthorized],
  )

  useEffect(() => {
    void loadHome(weekOffset, 'initial')
    // Only re-run when token appears; weekOffset changes call loadHome explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const openWorkout = useCallback(
    async (workout: WorkoutDetail) => {
      setSelected(workout)
      if (!token) return
      setDetailLoading(true)
      try {
        const { workout: detail } = await fetchWorkout(
          token,
          workout.id,
          handleUnauthorized,
        )
        setSelected(detail)
      } catch {
        // Keep list payload if detail fetch fails.
      } finally {
        setDetailLoading(false)
      }
    },
    [token, handleUnauthorized],
  )

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHome(weekOffset, 'refresh')}
            tintColor="#fff"
          />
        }
      >
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroGreeting}>
            <Text style={styles.heroGreetingLine}>{greeting},{'\n'}</Text>
            <Text style={styles.heroName}>{name || 'Athlete'}</Text>
          </Text>
          <Text style={styles.heroSub}>Here&apos;s your training for today.</Text>
        </View>

        <View style={styles.sheet}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.red} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => void loadHome(weekOffset, 'initial')}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today</Text>
              </View>
              <View style={styles.todayStack}>
                {today.length === 0 ? (
                  <Text style={styles.empty}>Rest day — nothing scheduled.</Text>
                ) : (
                  today.map((w) => (
                    <TodayWorkoutCard
                      key={w.id}
                      workout={w}
                      onPress={() => void openWorkout(w)}
                    />
                  ))
                )}
              </View>

              <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
                <Text style={styles.sectionTitle}>{weekTitle}</Text>
                <View style={styles.weekNav}>
                  {weekOffset > 0 ? (
                    <Pressable
                      hitSlop={6}
                      onPress={() => {
                        setWeekOffset(0)
                        void loadHome(0, 'nav')
                      }}
                      style={styles.upcomingJump}
                      accessibilityLabel="Back to upcoming"
                    >
                      <Text style={styles.upcomingJumpText}>Upcoming</Text>
                    </Pressable>
                  ) : null}
                  <View
                    style={[
                      styles.weekPill,
                      weekOffset > 0 && styles.weekPillActive,
                    ]}
                  >
                    <Pressable
                      hitSlop={8}
                      disabled={!canGoPrev}
                      onPress={() => {
                        const next = weekOffset - 1
                        setWeekOffset(next)
                        void loadHome(next, 'nav')
                      }}
                      style={[styles.navBtn, !canGoPrev && styles.navDisabled]}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={16}
                        color={canGoPrev ? colors.inkSoft : colors.inkFaint}
                      />
                    </Pressable>
                    <Text style={styles.weekLabel}>{weekLabel}</Text>
                    <Pressable
                      hitSlop={8}
                      disabled={!canGoNext}
                      onPress={() => {
                        const next = weekOffset + 1
                        setWeekOffset(next)
                        void loadHome(next, 'nav')
                      }}
                      style={[styles.navBtn, !canGoNext && styles.navDisabled]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={canGoNext ? colors.inkSoft : colors.inkFaint}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {weekOffset > 0 ? (
                <View style={styles.upcomingCards}>
                  {upcoming.length === 0 ? (
                    <Text style={[styles.empty, styles.emptyPad]}>
                      Nothing planned this week.
                    </Text>
                  ) : (
                    upcoming.map((w) => (
                      <UpcomingCard
                        key={w.id}
                        workout={w}
                        onPress={() => void openWorkout(w)}
                      />
                    ))
                  )}
                </View>
              ) : (
                <View style={styles.upcomingList}>
                  {upcoming.length === 0 ? (
                    <Text style={[styles.empty, styles.emptyPad]}>
                      Nothing else planned this week.
                    </Text>
                  ) : (
                    upcoming.map((w, i) => (
                      <View key={w.id}>
                        {i > 0 ? <View style={styles.sep} /> : null}
                        <UpcomingRow
                          workout={w}
                          onPress={() => void openWorkout(w)}
                        />
                      </View>
                    ))
                  )}
                </View>
              )}

              <Pressable
                onPress={() =>
                  Alert.alert(
                    'View plan',
                    'Full training plan stays on the web for now.',
                  )
                }
                style={styles.viewPlan}
              >
                <Text style={styles.viewPlanText}>View plan →</Text>
              </Pressable>

              {weekStatsWeeks.length > 0 ? (
                <WeekStatsCard
                  weeks={weekStatsWeeks}
                  activeOffset={statsWeekOffset}
                  onActiveOffsetChange={setStatsWeekOffset}
                />
              ) : null}

              {trainingLoadWeeks.length > 0 ? (
                <TrainingLoadCard weeks={trainingLoadWeeks} />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <WorkoutDetailModal
        workout={selected}
        visible={selected != null}
        loading={detailLoading}
        onClose={() => setSelected(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    backgroundColor: colors.heroBg,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    bottom: -60,
    width: 220,
    height: 180,
    borderRadius: 110,
    backgroundColor: 'rgba(218, 47, 54, 0.28)',
  },
  heroGreeting: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
    color: '#fff',
    paddingTop: 4,
  },
  heroGreetingLine: {
    color: 'rgba(255,255,255,0.94)',
  },
  heroName: {
    color: colors.red,
  },
  heroSub: {
    marginTop: 10,
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.62)',
  },
  sheet: {
    marginTop: -18,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.red,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  retryText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 13,
    color: '#fff',
  },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyPad: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeaderSpaced: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  todayStack: {
    marginTop: 10,
    marginHorizontal: 16,
    gap: 8,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  weekPillActive: {
    backgroundColor: colors.sidebar,
    borderRadius: 999,
    paddingHorizontal: 2,
  },
  upcomingJump: {
    marginRight: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  upcomingJumpText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  navDisabled: {
    opacity: 0.35,
  },
  weekLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  upcomingList: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  upcomingCards: {
    marginTop: 10,
    marginHorizontal: 16,
    gap: 8,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  viewPlan: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginRight: 16,
    paddingVertical: 4,
  },
  viewPlanText: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
})
