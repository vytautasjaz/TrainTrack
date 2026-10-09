import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import type { TrainingLoadWeek } from '@/types/api'
import { useWeekCarouselSwipe } from '@/lib/useWeekCarouselSwipe'
import { colors, fonts } from '@/theme/tokens'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const CHART_W = 320
const CHART_H = 72
const PAD_X = 12
const PAD_Y = 12
const MORPH_MS = 480

type LoadMetric = 'tss' | 'time'
type MorphPair = { planned: number[]; actual: number[] }

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useMorphArray(target: number[], from: number[] | null) {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startVals = from ?? displayRef.current
    const to = target
    if (startVals.length !== to.length) {
      displayRef.current = to
      setDisplay(to)
      return
    }
    const same = startVals.every((v, i) => v === to[i])
    if (same) {
      displayRef.current = to
      setDisplay(to)
      return
    }

    const start = Date.now()
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / MORPH_MS)
      const e = easeOutCubic(t)
      const next = startVals.map((v, i) => v + (to[i]! - v) * e)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = null
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, from])

  return display
}

function toPoints(daily: number[], yMax: number) {
  const innerW = CHART_W - PAD_X * 2
  const innerH = CHART_H - PAD_Y * 2
  const max = Math.max(yMax, 1)
  return daily.map((v, i) => ({
    x: PAD_X + (i / Math.max(1, daily.length - 1)) * innerW,
    y: PAD_Y + innerH - (v / max) * innerH,
  }))
}

function smoothPath(daily: number[], yMax: number): string {
  const pts = toPoints(daily, yMax)
  if (pts.length < 2) return ''
  let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

function seriesFor(week: TrainingLoadWeek, metric: LoadMetric) {
  if (metric === 'tss') {
    return {
      planned: week.dailyPlannedTss,
      actual: week.dailyActualTss,
      plannedTotal: week.plannedTotalTss,
      actualTotal: week.actualTotalTss,
    }
  }
  return {
    planned: week.dailyPlannedTime,
    actual: week.dailyActualTime,
    plannedTotal: week.plannedTotalTime,
    actualTotal: week.actualTotalTime,
  }
}

function LoadChart({
  plannedDaily,
  actualDaily,
  yMax,
  showActual,
  morphFrom,
}: {
  plannedDaily: number[]
  actualDaily: number[]
  yMax: number
  showActual: boolean
  morphFrom: MorphPair | null
}) {
  const displayPlanned = useMorphArray(plannedDaily, morphFrom?.planned ?? null)
  const displayActual = useMorphArray(actualDaily, morphFrom?.actual ?? null)
  const plannedPath = smoothPath(displayPlanned, yMax)
  const actualPath = smoothPath(displayActual, yMax)
  const plannedPoints = toPoints(displayPlanned, yMax)
  const actualPoints = toPoints(displayActual, yMax)
  /** Next/future week — planned is the only series, so draw it as the primary line. */
  const plannedPrimary = !showActual

  return (
    <View style={styles.chartWrap}>
      <Svg
        width="100%"
        height={CHART_H}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Line
          x1={PAD_X}
          x2={CHART_W - PAD_X}
          y1={CHART_H - PAD_Y}
          y2={CHART_H - PAD_Y}
          stroke={colors.line}
          strokeWidth={1}
        />
        <Path
          d={plannedPath}
          fill="none"
          stroke={plannedPrimary ? colors.inkSoft : colors.inkFaint}
          strokeWidth={plannedPrimary ? 1.75 : 1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={plannedPrimary ? '6 4' : '5 4'}
          opacity={plannedPrimary ? 1 : 0.55}
        />
        {plannedPoints.map((p, i) => (
          <Circle
            key={`p-${i}`}
            cx={p.x}
            cy={p.y}
            r={plannedPrimary ? 2.25 : 1.75}
            fill={plannedPrimary ? colors.inkSoft : colors.inkFaint}
            opacity={plannedPrimary ? 1 : 0.45}
          />
        ))}
        {showActual ? (
          <>
            <Path
              d={actualPath}
              fill="none"
              stroke={colors.good}
              strokeWidth={2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {actualPoints.map((p, i) => (
              <Circle
                key={`a-${i}`}
                cx={p.x}
                cy={p.y}
                r={2.4}
                fill={colors.good}
              />
            ))}
          </>
        ) : null}
      </Svg>
      <View style={styles.dayLabels}>
        {DAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDash,
              plannedPrimary && styles.legendDashPrimary,
            ]}
          />
          <Text
            style={[
              styles.legendText,
              plannedPrimary && { color: colors.inkSoft },
            ]}
          >
            Planned
          </Text>
        </View>
        {showActual ? (
          <View style={styles.legendItem}>
            <View style={styles.legendSolid} />
            <Text style={[styles.legendText, { color: colors.good }]}>Real</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function LoadSlide({
  week,
  metric,
  yMax,
  morphFrom,
  showMetricToggle,
  onMetricChange,
}: {
  week: TrainingLoadWeek
  metric: LoadMetric
  yMax: number
  morphFrom: MorphPair | null
  showMetricToggle: boolean
  onMetricChange: (m: LoadMetric) => void
}) {
  const series = seriesFor(week, metric)
  const showActual = !week.plannedWeek
  const headline = showActual ? series.actualTotal : series.plannedTotal
  const unit = metric === 'tss' ? 'TSS' : 'min'

  return (
    <View style={styles.slide}>
      <View style={styles.headlineRow}>
        <View style={styles.headlineText}>
          <Text style={styles.headline}>
            {headline}{' '}
            <Text style={styles.headlineUnit}>
              {unit}
              {week.plannedWeek ? ' plan' : ''}
            </Text>
          </Text>
          {showActual && series.plannedTotal > 0 ? (
            <Text style={styles.plannedSub}>
              Planned {series.plannedTotal} {unit}
            </Text>
          ) : null}
        </View>
        {showMetricToggle ? (
          <View style={styles.metricToggle}>
            <Pressable onPress={() => onMetricChange('tss')} hitSlop={6}>
              <Text
                style={[
                  styles.metricOpt,
                  metric === 'tss' && styles.metricOptActive,
                ]}
              >
                TSS
              </Text>
            </Pressable>
            <Text style={styles.metricDot}>·</Text>
            <Pressable onPress={() => onMetricChange('time')} hitSlop={6}>
              <Text
                style={[
                  styles.metricOpt,
                  metric === 'time' && styles.metricOptActive,
                ]}
              >
                Time
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <LoadChart
        plannedDaily={series.planned}
        actualDaily={series.actual}
        yMax={yMax}
        showActual={showActual}
        morphFrom={morphFrom}
      />
    </View>
  )
}

export function TrainingLoadCard({ weeks }: { weeks: TrainingLoadWeek[] }) {
  const sorted = useMemo(
    () => [...weeks].sort((a, b) => a.weekOffset - b.weekOffset),
    [weeks],
  )
  const centerIndex = Math.max(
    0,
    sorted.findIndex((w) => w.weekOffset === 0),
  )
  const [activeIndex, setActiveIndex] = useState(
    centerIndex >= 0 ? centerIndex : 0,
  )
  const [metric, setMetric] = useState<LoadMetric>('tss')
  const [morphFrom, setMorphFrom] = useState<MorphPair | null>(null)
  const morphClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (morphClearTimer.current) clearTimeout(morphClearTimer.current)
    }
  }, [])

  const week = sorted[activeIndex] ?? sorted[0]
  const yMax = useMemo(() => {
    if (!week) return 1
    const s = seriesFor(week, metric)
    return Math.max(1, ...s.planned, ...s.actual)
  }, [week, metric])

  const captureMorph = useCallback(
    (index: number) => {
      const w = sorted[index]
      if (!w) return
      const s = seriesFor(w, metric)
      setMorphFrom({ planned: [...s.planned], actual: [...s.actual] })
      if (morphClearTimer.current) clearTimeout(morphClearTimer.current)
      morphClearTimer.current = setTimeout(() => {
        morphClearTimer.current = null
        setMorphFrom(null)
      }, MORPH_MS + 40)
    },
    [sorted, metric],
  )

  const switchMetric = useCallback(
    (next: LoadMetric) => {
      if (next === metric || !week) return
      captureMorph(activeIndex)
      setMetric(next)
    },
    [metric, week, activeIndex, captureMorph],
  )

  const {
    paneWidth,
    dragX,
    panGesture,
    goToIndex,
    onLayout,
    canPrev,
    canNext,
  } = useWeekCarouselSwipe({
    count: sorted.length,
    activeIndex,
    onActiveIndexChange: (i: number) => {
      setMorphFrom(null)
      setActiveIndex(i)
    },
    onArrowChange: (from: number) => captureMorph(from),
  })

  if (!week) return null

  const neighborPrev = canPrev ? sorted[activeIndex - 1]! : null
  const neighborNext = canNext ? sorted[activeIndex + 1]! : null
  const isTodayWeek = week.weekOffset === 0
  const todayIndex = sorted.findIndex((w) => w.weekOffset === 0)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Training load</Text>
          <Text style={styles.range}>
            {week.title} · {week.rangeLabel}
          </Text>
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
                {neighborPrev ? (
                  <LoadSlide
                    week={neighborPrev}
                    metric={metric}
                    yMax={yMax}
                    morphFrom={null}
                    showMetricToggle={false}
                    onMetricChange={switchMetric}
                  />
                ) : (
                  <View style={styles.slide} />
                )}
              </View>
              <View style={{ width: paneWidth }}>
                <LoadSlide
                  week={week}
                  metric={metric}
                  yMax={yMax}
                  morphFrom={morphFrom}
                  showMetricToggle
                  onMetricChange={switchMetric}
                />
              </View>
              <View style={{ width: paneWidth }}>
                {neighborNext ? (
                  <LoadSlide
                    week={neighborNext}
                    metric={metric}
                    yMax={yMax}
                    morphFrom={null}
                    showMetricToggle={false}
                    onMetricChange={switchMetric}
                  />
                ) : (
                  <View style={styles.slide} />
                )}
              </View>
            </Animated.View>
          ) : (
            <LoadSlide
              week={week}
              metric={metric}
              yMax={yMax}
              morphFrom={null}
              showMetricToggle
              onMetricChange={switchMetric}
            />
          )}
        </View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
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
    marginTop: 10,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
  slide: {
    minHeight: 140,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  headlineText: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  headlineUnit: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 18,
    textTransform: 'none',
    letterSpacing: 0,
    color: colors.inkSoft,
  },
  plannedSub: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    color: colors.inkFaint,
  },
  metricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricOpt: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.inkFaint,
  },
  metricOptActive: {
    color: colors.ink,
  },
  metricDot: {
    fontFamily: fonts.ui,
    fontSize: 10,
    color: colors.inkFaint,
  },
  chartWrap: {
    marginTop: 12,
  },
  dayLabels: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD_X,
  },
  dayLabel: {
    width: 12,
    textAlign: 'center',
    fontFamily: fonts.ui,
    fontSize: 10,
    color: colors.inkFaint,
  },
  legend: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDash: {
    width: 12,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inkFaint,
    opacity: 0.7,
  },
  legendDashPrimary: {
    borderColor: colors.inkSoft,
    borderTopWidth: 1.5,
    opacity: 1,
  },
  legendSolid: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.good,
  },
  legendText: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.inkFaint,
  },
})
