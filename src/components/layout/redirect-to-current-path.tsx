'use client'

import { useCurrentPath } from '@/hooks/use-current-path'

type RedirectToCurrentPathProps = {
  name?: string
  fallback?: string
}

/** Hidden form field that posts the current path (pathname + query). */
export function RedirectToCurrentPath({
  name = 'redirectTo',
  fallback = '/training',
}: RedirectToCurrentPathProps) {
  const path = useCurrentPath()
  return <input type="hidden" name={name} value={path || fallback} />
}
