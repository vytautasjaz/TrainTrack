'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { THEME_TOGGLE_ENABLED } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

type ThemeToggleButtonProps = {
  className?: string
  /** When false, only the icon is shown (sidebar collapsed). */
  showLabel?: boolean
  label?: string
  title?: string
}

/** Light / Dark control — no-op / hidden while `THEME_TOGGLE_ENABLED` is false. */
export function ThemeToggleButton({
  className,
  showLabel = true,
  label = 'Theme',
  title,
}: ThemeToggleButtonProps) {
  const { theme, setTheme } = useTheme()

  if (!THEME_TOGGLE_ENABLED) return null

  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title ?? (isDark ? 'Light mode' : 'Dark mode')}
      className={cn(className)}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.75} />
      )}
      {showLabel ? label : null}
    </Button>
  )
}
