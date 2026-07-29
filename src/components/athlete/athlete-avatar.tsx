import { cn } from '@/lib/utils'

type AthleteAvatarProps = {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'bar'
  className?: string
}

const SIZE_CLASS = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  /** Coach shell bar — compact on phone, larger on desktop */
  bar: 'h-9 w-9 text-xs ring-2 ring-background lg:h-12 lg:w-12 lg:text-sm',
} as const

export function AthleteAvatar({
  name,
  avatarUrl,
  size = 'sm',
  className,
}: AthleteAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Strava + local upload URLs
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          'shrink-0 rounded-full bg-brand-soft object-cover',
          SIZE_CLASS[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand',
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  )
}
