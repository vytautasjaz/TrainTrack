'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  readStoredFlag,
  writeStoredFlag,
  STORED_FLAG_CHANGE_EVENT,
} from '@/lib/plan-calendar-layers'

/**
 * localStorage boolean flag that hydrates safely (SSR always uses `fallback`).
 */
export function useStoredFlag(
  key: string,
  fallback: boolean,
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const value = useSyncExternalStore(
    (onStoreChange) => {
      function onFlag(event: Event) {
        const detail = (event as CustomEvent<{ key: string }>).detail
        if (detail?.key === key) onStoreChange()
      }
      function onStorage(event: StorageEvent) {
        if (event.key === key) onStoreChange()
      }
      window.addEventListener(STORED_FLAG_CHANGE_EVENT, onFlag)
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener(STORED_FLAG_CHANGE_EVENT, onFlag)
        window.removeEventListener('storage', onStorage)
      }
    },
    () => readStoredFlag(key, fallback),
    () => fallback,
  )

  const setValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved =
        typeof next === 'function' ? next(readStoredFlag(key, fallback)) : next
      writeStoredFlag(key, resolved)
    },
    [key, fallback],
  )

  return [value, setValue]
}
