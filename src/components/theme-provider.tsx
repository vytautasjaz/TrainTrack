'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * When false, the app is locked to light theme and theme toggles are hidden.
 * Set to `true` to re-enable Light / Dark switching (UI + system preference).
 */
export const THEME_TOGGLE_ENABLED = false

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      {...(!THEME_TOGGLE_ENABLED
        ? { forcedTheme: 'light', enableSystem: false }
        : null)}
    >
      {children}
    </NextThemesProvider>
  )
}
