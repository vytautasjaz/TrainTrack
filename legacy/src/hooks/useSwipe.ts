import { useRef, type TouchEvent } from 'react'

const SWIPE_THRESHOLD_PX = 50

type SwipeHandlers = {
  onTouchStart: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
}

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void): SwipeHandlers {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  return {
    onTouchStart: (e) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    },
    onTouchEnd: (e) => {
      if (startX.current === null || startY.current === null) return

      const deltaX = e.changedTouches[0].clientX - startX.current
      const deltaY = e.changedTouches[0].clientY - startY.current

      startX.current = null
      startY.current = null

      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
      if (Math.abs(deltaX) < Math.abs(deltaY)) return

      if (deltaX < 0) onSwipeLeft()
      else onSwipeRight()
    },
  }
}
