import type { SVGAttributes } from 'react'
import { cn } from '@/lib/utils'

export type TrainTrackBrandTone = 'light' | 'dark'

const APEX_D = 'M20 68L50 32L80 68'
const DIAMOND_D = 'M50 64L59 73L50 82L41 73L50 64Z'
/** Preferred UI stroke — holds up next to bold wordmark. */
const APEX_STROKE = 11

type MarkProps = SVGAttributes<SVGSVGElement> & {
  tone?: TrainTrackBrandTone
}

/**
 * Classic Apex — TrainTrack brand mark only.
 * Apex = training path / T suggestion; orange diamond = goal / athlete.
 */
export function TrainTrackMark({
  tone = 'light',
  className,
  ...props
}: MarkProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby'])
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      className={cn(
        'shrink-0',
        tone === 'dark' ? 'text-white' : 'text-[#111111]',
        className,
      )}
      {...props}
    >
      <path
        d={APEX_D}
        stroke="currentColor"
        strokeWidth={APEX_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={DIAMOND_D} fill="#F4511E" />
    </svg>
  )
}

type LogoProps = {
  tone?: TrainTrackBrandTone
  /** Hide wordmark (collapsed sidebar). */
  markOnly?: boolean
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

/**
 * Brand mark + TRAINTRACK wordmark (Bebas Neue text, not SVG paths).
 */
export function TrainTrackLogo({
  tone = 'light',
  markOnly = false,
  className,
  markClassName,
  wordmarkClassName,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <TrainTrackMark tone={tone} className={cn('h-8 w-8', markClassName)} />
      {!markOnly ? (
        <span
          className={cn(
            'traintrack-wordmark select-none',
            tone === 'dark' ? 'text-white' : 'text-[#111111]',
            wordmarkClassName,
          )}
        >
          TRAINTRACK
        </span>
      ) : null}
    </div>
  )
}

type AppIconProps = SVGAttributes<SVGSVGElement> & {
  tone?: TrainTrackBrandTone
}

/**
 * Rounded-square app icon — white or charcoal tile + Classic Apex.
 */
export function TrainTrackAppIcon({
  tone = 'light',
  className,
  ...props
}: AppIconProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby'])
  const bg = tone === 'dark' ? '#111111' : '#FFFFFF'
  const apex = tone === 'dark' ? '#FFFFFF' : '#111111'
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      className={cn('shrink-0', className)}
      {...props}
    >
      <rect width="128" height="128" rx="28" fill={bg} />
      <path
        d="M30 82L64 42L98 82"
        stroke={apex}
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M64 75L75 86L64 97L53 86L64 75Z" fill="#F4511E" />
    </svg>
  )
}
