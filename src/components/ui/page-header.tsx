import type { HTMLAttributes, ReactNode } from 'react'
import { DisplayTitle, EyebrowTitle } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

type PageHeaderSize = 'default' | 'compact'

type PageHeaderProps = {
  /** Page H1 — Bebas Neue via `PageHeaderTitle`. */
  title?: string
  description?: string
  /** Uppercase meta above the title (e.g. Training · Coach). */
  eyebrow?: string
  /** Right-side actions (view switch, Library, primary CTA). */
  action?: ReactNode
  /**
   * `default` — mock page H1 (Bebas · 48px / text-5xl).
   * `compact` — mock compact (Bebas · 30px / text-3xl).
   */
  size?: PageHeaderSize
  /** Compose with PageHeaderEyebrow / Title / Description / Actions when needed. */
  children?: ReactNode
  className?: string
}

/** App page chrome — use for every top-level screen H1. */
export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  size = 'default',
  children,
  className,
}: PageHeaderProps) {
  const composed = Boolean(children)

  return (
    <div
      data-page-header
      className={cn(
        'flex flex-wrap items-start justify-between gap-2 pt-2 lg:gap-3 lg:pt-4 landscape:max-lg:gap-1.5',
        className,
      )}
    >
      {composed ? (
        children
      ) : (
        <>
          <div className="min-w-0">
            {eyebrow ? <PageHeaderEyebrow>{eyebrow}</PageHeaderEyebrow> : null}
            {title ? (
              <PageHeaderTitle size={size} className={eyebrow ? 'mt-1' : undefined}>
                {title}
              </PageHeaderTitle>
            ) : null}
            {description ? (
              <PageHeaderDescription>{description}</PageHeaderDescription>
            ) : null}
          </div>
          {action ? <PageHeaderActions>{action}</PageHeaderActions> : null}
        </>
      )}
    </div>
  )
}

/** Overline above the page H1 — Inter, uppercase, faint. */
export function PageHeaderEyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <EyebrowTitle
      className={cn('text-[var(--tt-ink-faint,#9a9a9a)]', className)}
      {...props}
    />
  )
}

/** Page H1 — Bebas Neue, uppercase. Prefer this over raw `h1` / one-off classes. */
export function PageHeaderTitle({
  size = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { size?: PageHeaderSize }) {
  return (
    <DisplayTitle
      className={cn(size === 'compact' && 'title-display--compact', className)}
      {...props}
    />
  )
}

/** Supporting line under the H1 (athlete · period, short blurb). */
export function PageHeaderDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'page-header-description mt-1 landscape:max-lg:mt-0',
        className,
      )}
      {...props}
    />
  )
}

/** Right-aligned action cluster for `PageHeader`. */
export function PageHeaderActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'ml-auto flex min-w-0 items-center justify-end pt-1',
        className,
      )}
      {...props}
    />
  )
}
