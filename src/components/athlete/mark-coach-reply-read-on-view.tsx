'use client'

import { useEffect, useRef } from 'react'
import { markCoachReplyRead } from '@/app/actions/feedback'

type MarkCoachReplyReadOnViewProps = {
  workoutId: string
  shouldMark: boolean
}

export function MarkCoachReplyReadOnView({ workoutId, shouldMark }: MarkCoachReplyReadOnViewProps) {
  const marked = useRef(false)

  useEffect(() => {
    if (!shouldMark || marked.current) return
    marked.current = true
    const formData = new FormData()
    formData.set('workoutId', workoutId)
    void markCoachReplyRead(formData)
  }, [shouldMark, workoutId])

  return null
}
