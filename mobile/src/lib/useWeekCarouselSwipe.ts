import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  LayoutChangeEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { Gesture } from 'react-native-gesture-handler'

const SWIPE_DISTANCE = 36
const SWIPE_VELOCITY = 280

/**
 * Shared horizontal week carousel — continuous remap settle (no end cut).
 * Arrows call `goToIndex(i, 'arrow')`; swipes call with `'swipe'`.
 */
export function useWeekCarouselSwipe(opts: {
  count: number
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  onArrowChange?: (fromIndex: number, toIndex: number) => void
}) {
  const { count, activeIndex, onActiveIndexChange, onArrowChange } = opts
  const [paneWidth, setPaneWidth] = useState(0)
  const dragX = useRef(new Animated.Value(0)).current
  const dragPos = useRef(0)
  const indexRef = useRef(activeIndex)
  const widthRef = useRef(0)
  const settling = useRef(false)

  indexRef.current = activeIndex
  widthRef.current = paneWidth

  useEffect(() => {
    if (settling.current) return
    dragX.setValue(0)
    dragPos.current = 0
  }, [activeIndex, dragX])

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
      const clamped = Math.max(0, Math.min(count - 1, nextIndex))
      if (clamped === indexRef.current) {
        springToRest(velocityX)
        return
      }

      if (mode === 'arrow') {
        onArrowChange?.(indexRef.current, clamped)
        settling.current = false
        onActiveIndexChange(clamped)
        setDrag(0)
        return
      }

      const w = widthRef.current || 1
      const direction = clamped > indexRef.current ? 1 : -1
      const remapped = dragPos.current + direction * w
      settling.current = true
      onActiveIndexChange(clamped)
      setDrag(remapped)
      springToRest(velocityX)
    },
    [count, onActiveIndexChange, onArrowChange, setDrag, springToRest],
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
          const atEnd = indexRef.current >= count - 1
          let dx = e.translationX
          if ((atStart && dx > 0) || (atEnd && dx < 0)) dx *= 0.35
          setDrag(dx)
        })
        .onEnd((e) => {
          if (settling.current) return
          const dx = e.translationX
          const vx = e.velocityX
          const goPrev =
            indexRef.current > 0 && (dx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY)
          const goNext =
            indexRef.current < count - 1 &&
            (dx < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY)
          if (goPrev) goToIndex(indexRef.current - 1, 'swipe', vx)
          else if (goNext) goToIndex(indexRef.current + 1, 'swipe', vx)
          else springToRest(vx)
        })
        .onFinalize((_, success) => {
          if (!success && !settling.current) springToRest(0)
        }),
    [count, dragX, goToIndex, setDrag, springToRest],
  )

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setPaneWidth(e.nativeEvent.layout.width)
  }, [])

  return {
    paneWidth,
    dragX,
    panGesture,
    goToIndex,
    onLayout,
    canPrev: activeIndex > 0,
    canNext: activeIndex < count - 1,
  }
}

/** Unused helper kept for Layout typings in callers that need it. */
export type LayoutEvent = NativeSyntheticEvent<{ layout: { width: number } }>
