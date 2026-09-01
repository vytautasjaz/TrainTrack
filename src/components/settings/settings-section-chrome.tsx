import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** @deprecated Prefer SettingsPanel title/description props. */
export function SettingsSectionHeader({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('space-y-1 border-b border-[var(--tt-line,#ebebeb)] pb-3', className)}>
      <h2 className="text-[17px] font-semibold text-[var(--tt-ink,#111)]">{title}</h2>
      {description ? (
        <p className="text-[13px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export function SettingsField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint,#9a9a9a)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">{hint}</span>
      ) : null}
    </label>
  )
}

export function SettingsPanel({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('tt-settings-panel scroll-mt-24', className)}>
      <div className="tt-settings-panel-header">
        <h2 className="text-[17px] font-semibold tracking-tight text-[var(--tt-ink,#111)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="tt-settings-panel-body">{children}</div>
    </section>
  )
}

/** Light subsection label + content; separated from siblings by a divider line. */
export function SettingsGroup({
  label,
  description,
  children,
  className,
}: {
  label?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('tt-settings-group', className)}>
      {label ? (
        <div className="tt-settings-group-heading">
          <p className="tt-settings-group-label">{label}</p>
          {description ? (
            <p className="tt-settings-group-description">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

/** @deprecated Use SettingsGroup — kept as alias during migration. */
export const SettingsBlock = SettingsGroup

export function SettingsDivider({ className }: { className?: string }) {
  return <div className={cn('tt-settings-divider', className)} aria-hidden />
}
