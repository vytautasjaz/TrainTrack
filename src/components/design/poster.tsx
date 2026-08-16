import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PosterTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  size?: 'sm' | 'md' | 'lg'
  /** Wrap accent words in spans with this class, or pass children with `.poster-title-accent`. */
}

/** Editorial display heading — Barlow Condensed, italic, uppercase. Use sparingly. */
export function PosterTitle({
  className,
  size = 'md',
  ...props
}: PosterTitleProps) {
  return (
    <h2
      className={cn(
        'poster-title',
        size === 'sm' && 'poster-title-sm',
        size === 'md' && 'poster-title-md',
        size === 'lg' && 'poster-title-lg',
        className,
      )}
      {...props}
    />
  )
}

type PosterMetricProps = HTMLAttributes<HTMLDivElement> & {
  value: ReactNode
  unit?: ReactNode
  label?: ReactNode
}

/** Large poster metric, e.g. 52.4 KM / THIS WEEK */
export function PosterMetric({
  className,
  value,
  unit,
  label,
  ...props
}: PosterMetricProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {label ? <p className="poster-kicker">{label}</p> : null}
      <p className="poster-metric">
        {value}
        {unit ? <span className="poster-metric-unit ml-2">{unit}</span> : null}
      </p>
    </div>
  )
}

type PosterStatProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode
  support?: ReactNode
  accentWord?: string
}

/**
 * Sparse poster statement with optional orange accent word match.
 * Example: title="BUILD THE NEXT WEEK." accentWord="NEXT"
 */
export function PosterStat({
  className,
  title,
  support,
  accentWord,
  ...props
}: PosterStatProps) {
  let content: ReactNode = title
  if (typeof title === 'string' && accentWord) {
    const idx = title.toUpperCase().indexOf(accentWord.toUpperCase())
    if (idx >= 0) {
      const before = title.slice(0, idx)
      const match = title.slice(idx, idx + accentWord.length)
      const after = title.slice(idx + accentWord.length)
      content = (
        <>
          {before}
          <span className="poster-title-accent">{match}</span>
          {after}
        </>
      )
    }
  }

  return (
    <div className={cn('space-y-3', className)} {...props}>
      <PosterTitle size="md">{content}</PosterTitle>
      {support ? <p className="poster-support">{support}</p> : null}
    </div>
  )
}

type PosterQuoteProps = HTMLAttributes<HTMLQuoteElement> & {
  support?: ReactNode
}

export function PosterQuote({
  className,
  support,
  children,
  ...props
}: PosterQuoteProps) {
  return (
    <blockquote className={cn('space-y-3', className)} {...props}>
      <PosterTitle size="sm" className="poster-title-accent">
        {children}
      </PosterTitle>
      {support ? <p className="poster-support">{support}</p> : null}
    </blockquote>
  )
}

type PosterHeroProps = HTMLAttributes<HTMLDivElement> & {
  atmosphere?: 'default' | 'soft' | 'none'
}

/** Card-like poster moment with optional abstract motion wash behind content. */
export function PosterHero({
  className,
  atmosphere = 'default',
  children,
  ...props
}: PosterHeroProps) {
  return (
    <div className={cn('poster-surface', className)} {...props}>
      {atmosphere !== 'none' ? (
        <div
          className={cn(
            'poster-surface__atmosphere',
            atmosphere === 'soft' ? 'abstract-motion-soft' : 'abstract-motion',
          )}
          aria-hidden
        />
      ) : null}
      <div className="poster-surface__content p-6 sm:p-8">{children}</div>
    </div>
  )
}

type AbstractMotionProps = HTMLAttributes<HTMLDivElement> & {
  soft?: boolean
}

/** Decorative blurred energy layer — place absolutely behind sparse UI only. */
export function AbstractMotion({
  className,
  soft = false,
  ...props
}: AbstractMotionProps) {
  return (
    <div
      aria-hidden
      className={cn(soft ? 'abstract-motion-soft' : 'abstract-motion', className)}
      {...props}
    />
  )
}
