import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  LayoutChangeEvent,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import type { WeekStats } from '@/types/api'
import { colors, fonts, sportColor, type SportId } from '@/theme/tokens'

const SPORT_ICON: Record<SportId, keyof typeof Ionicons.glyphMap> = {
  run: 'walk-outline',
  bike: 'bicycle-outline',
  swim: 'water-outline',
  strength: 'barbell-outline',
  recovery: 'leaf-outline',
  hyrox: 'flash-outline',
}

const MORPH_MS = 480
/** Distance (px) to commit a slow drag. */
const SWIPE_DISTANCE = 36
/** Horizontal velocity (px/s) to commit a flick. */
const SWIPE_VELOCITY = 280

function MorphBar({
  pct,
  color,
  morphFrom,
}: {
  pct: number
  color: string
  morphFrom: number | null
}) {
  const width = useRef(new Animated.Value(pct)).current

  useEffect(() => {
    if (morphFrom != null) {
      width.setValue(morphFrom)
    }
    Animated.timing(width, {
      toValue: pct,
      duration: MORPH_MS,
      useNativeDriver: false,
    }).start()
  }, [pct, morphFrom, width])

  return (
    <Animated.View
      style={[
        styles.barFill,
        {
          backgroundColor: color,
          width: width.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          }),
        },
      ]}
    />
  )
}

function WeekSlide({
  week,
  morphFrom,
}: {
  week: WeekStats | null
  morphFrom: Record<string, number> | null
}) {
  if (!week) return <View style={styles.slide} />

  return (
    <View style={styles.slide}>
      {week.sports.length === 0 ? (
        <Text style={styles.empty}>No sports planned</Text>
      ) : (
        <View style={styles.grid}>
          {week.sports.map((sport) => {
            const color = sportColor(sport.sport)
            return (
              <View key={sport.id} style={styles.sportCell}>
                <View style={styles.sportLabelRow}>
                  <Ionicons
                    name={SPORT_ICON[sport.sport]}
                    size={12}
                    color={color}
                  />
                  <Text style={styles.sportLabel} numberOfLines={1}>
                    {sport.label}
                  </Text>
                </View>
                <Text style={styles.metric}>
                  <Text style={styles.metricActual}>{sport.actualLabel}</Text>
                  <Text style={styles.metricPlanned}>
                    /{sport.plannedLabel}
                    {sport.unit ? ` ${sport.unit}` : ''}
                  </Text>
                </Text>
                <View style={styles.barTrack}>
                  <MorphBar
                    pct={sport.pct}
                    color={color}
                    morphFrom={morphFrom?.[sport.id] ?? null}
                  />
                </View>
              </View>
            )
          })}
        </View>
      )}

      <View style={styles.overall}>
        <View style={styles.overallRow}>
          <Text style={styles.overallLabel}>Overall</Text>
          <Text style={styles.overallMetric}>
            <Text style={styles.metricActual}>
              {week.overall.completedLabel}
            </Text>
            <Text style={styles.metricPlanned}>
              /{week.overall.plannedLabel} · {week.overall.pct}%
            </Text>
          </Text>
        </View>
        <View style={styles.barTrackOverall}>
          <MorphBar
            pct={week.overall.pct}
            color={colors.inkSoft}
            morphFrom={morphFrom?.__overall ?? null}
          />
        </View>
      </View>
    </View>
  )
}

function capturePcts(week: WeekStats): Record<string, number> {
  const pcts: Record<string, number> = { __overall: week.overall.pct }
  for (const sport of week.sports) {
    pcts[sport.id] = sport.pct
  }
  return pcts
}

export function WeekStatsCard({
  weeks,
  activeOffset,
  onActiveOffsetChange,
}: {
  weeks: WeekStats[]
  activeOffset: number
  onActiveOffsetChange: (offset: number) => void
}) {
  const sorted = useMemo(
    () => [...weeks].sort((a, b) => a.weekOffset - b.weekOffset),
    [weeks],
  )
  const activeIndex = Math.max(
    0,
    sorted.findIndex((w) => w.weekOffset === activeOffset),
  )
  const week = sorted[activeIndex] ?? null
  const canPrev = activeIndex > 0
  const canNext = activeIndex < sorted.length - 1

  const [paneWidth, setPaneWidth] = useState(0)
  const [morphFrom, setMorphFrom] = useState<Record<string, number> | null>(
    null,
  )
  const dragX = useRef(new Animated.Value(0)).current
  const dragPos = useRef(0)
  const weekRef = useRef(week)
  const indexRef = useRef(activeIndex)
  const widthRef = useRef(0)
  const morphClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settling = useRef(false)

  weekRef.current = week
  indexRef.current = activeIndex
  widthRef.current = paneWidth

  useEffect(() => {
    // Swipe settle remaps dragX itself — don't snap to 0 or it cuts.
    if (settling.current) return
    dragX.setValue(0)
    dragPos.current = 0
  }, [activeOffset, dragX])

  useEffect(() => {
    return () => {
      if (morphClearTimer.current) clearTimeout(morphClearTimer.current)
    }
  }, [])

  const setDrag = useCallback(
    (x: number) => {
      dragPos.current = x
      dragX.setValue(x)
    },
    [dragX],
  )

  const springToRest = useCallback(
    (velocityX = 0) => {
      Animated.spring(dragX, {
        toValue: 0,
        velocity: velocityX,
        useNativeDriver: true,
        overshootClamping: true,
        bounciness: 0,
        speed: 18,
      }).start(() => {
        dragPos.current = 0
        settling.current = false
      })
    },
    [dragX],
  )

  const goToIndex = useCallback(
    (nextIndex: number, mode: 'arrow' | 'swipe', velocityX = 0) => {
      const clamped = Math.max(0, Math.min(sorted.length - 1, nextIndex))
      if (clamped === indexRef.current) {
        springToRest(velocityX)
        return
      }
      const target = sorted[clamped]
      if (!target) return

      if (mode === 'arrow' && weekRef.current) {
        setMorphFrom(capturePcts(weekRef.current))
        if (morphClearTimer.current) clearTimeout(morphClearTimer.current)
        morphClearTimer.current = setTimeout(() => {
          morphClearTimer.current = null
          setMorphFrom(null)
        }, MORPH_MS + 40)
        settling.current = false
        onActiveOffsetChange(target.weekOffset)
        setDrag(0)
        return
      }

      // Swipe: remap so the outgoing frame matches the new center, then spring home.
      const w = widthRef.current || 1
      const direction = clamped > indexRef.current ? 1 : -1
      const remapped = dragPos.current + direction * w
      settling.current = true
      setMorphFrom(null)
      onActiveOffsetChange(target.weekOffset)
      setDrag(remapped)
      springToRest(velocityX)
    },
    [sorted, onActiveOffsetChange, setDrag, springToRest],
  )

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-14, 14])
        .onBegin(() => {
          dragX.stopAnimation()
        })
        .onUpdate((e) => {
          if (settling.current) return
          const atStart = indexRef.current <= 0
          const atEnd = indexRef.current >= sorted.length - 1
          let dx = e.translationX
          if ((atStart && dx > 0) || (atEnd && dx < 0)) {
            dx *= 0.35
          }
          setDrag(dx)
        })
        .onEnd((e) => {
          if (settling.current) return
          const dx = e.translationX
          const vx = e.velocityX
          const goPrev =
            indexRef.current > 0 &&
            (dx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY)
          const goNext =
            indexRef.current < sorted.length - 1 &&
            (dx < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY)

          if (goPrev) goToIndex(indexRef.current - 1, 'swipe', vx)
          else if (goNext) goToIndex(indexRef.current + 1, 'swipe', vx)
          else springToRest(vx)
        })
        .onFinalize((_, success) => {
          if (!success && !settling.current) {
            springToRest(0)
          }
        }),
    [dragX, goToIndex, setDrag, sorted.length, springToRest],
  )

  if (!week) return null

  const onLayout = (e: LayoutChangeEvent) => {
    setPaneWidth(e.nativeEvent.layout.width)
  }

  const neighborPrev = canPrev ? sorted[activeIndex - 1]! : null
  const neighborNext = canNext ? sorted[activeIndex + 1]! : null
  const isTodayWeek = week.weekOffset === 0
  const todayIndex = sorted.findIndex((w) => w.weekOffset === 0)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{week.title}</Text>
          <Text style={styles.range}>{week.rangeLabel}</Text>
        </View>
        <View style={styles.nav}>
          <Pressable
            hitSlop={8}
            disabled={!canPrev}
            onPress={() => goToIndex(activeIndex - 1, 'arrow')}
            style={[styles.navBtn, !canPrev && styles.navDisabled]}
            accessibilityLabel="Previous week"
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={canPrev ? colors.inkSoft : colors.inkFaint}
            />
          </Pressable>
          <Pressable
            hitSlop={6}
            disabled={isTodayWeek || todayIndex < 0}
            onPress={() => {
              if (todayIndex >= 0) goToIndex(todayIndex, 'arrow')
            }}
            accessibilityLabel="This week"
            accessibilityState={{ selected: isTodayWeek }}
          >
            <Text
              style={[
                styles.todayLabel,
                isTodayWeek ? styles.todayLabelActive : styles.todayLabelInactive,
              ]}
            >
              Today
            </Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            disabled={!canNext}
            onPress={() => goToIndex(activeIndex + 1, 'arrow')}
            style={[styles.navBtn, !canNext && styles.navDisabled]}
            accessibilityLabel="Next week"
          >
            <Ionicons
              name="chevron-forward"
              size={14}
              color={canNext ? colors.inkSoft : colors.inkFaint}
            />
          </Pressable>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.viewport} onLayout={onLayout}>
          {paneWidth > 0 ? (
            <Animated.View
              style={[
                styles.track,
                {
                  width: paneWidth * 3,
                  marginLeft: -paneWidth,
                  transform: [{ translateX: dragX }],
                },
              ]}
            >
              <View style={{ width: paneWidth }}>
                <WeekSlide week={neighborPrev} morphFrom={null} />
              </View>
              <View style={{ width: paneWidth }}>
                <WeekSlide week={week} morphFrom={morphFrom} />
              </View>
              <View style={{ width: paneWidth }}>
                <WeekSlide week={neighborNext} morphFrom={null} />
              </View>
            </Animated.View>
          ) : (
            <WeekSlide week={week} morphFrom={null} />
          )}
        </View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  range: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 10,
    color: colors.inkFaint,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  navDisabled: {
    opacity: 0.35,
  },
  todayLabel: {
    fontFamily: fonts.uiSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    minWidth: 44,
    textAlign: 'center',
  },
  todayLabelActive: {
    color: colors.ink,
  },
  todayLabelInactive: {
    color: colors.inkFaint,
  },
  viewport: {
    marginTop: 12,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
  slide: {
    minHeight: 72,
  },
  empty: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 12,
  },
  sportCell: {
    width: '47%',
    flexGrow: 1,
    minWidth: '40%',
  },
  sportLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sportLabel: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  metric: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    color: colors.ink,
  },
  metricActual: {
    fontFamily: fonts.uiSemiBold,
    color: colors.ink,
  },
  metricPlanned: {
    color: colors.inkFaint,
  },
  barTrack: {
    marginTop: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barTrackOverall: {
    marginTop: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  overall: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  overallLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  overallMetric: {
    fontFamily: fonts.ui,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    color: colors.inkFaint,
  },
})
