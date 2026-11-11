import { cn } from '@/lib/utils'
import { v2 } from '@/lib/design-tokens'

export function V2Panel({
  title,
  tone = 'dark',
  className,
  children,
}: {
  title?: string
  /** `light` = white card on the faded lower page */
  tone?: 'dark' | 'light'
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        tone === 'light' ? v2.surfaces.widgetLight : v2.surfaces.widget,
        className,
      )}
    >
      {title ? <p className="tt-v2-eyebrow">{title}</p> : null}
      {children}
    </section>
  )
}

export function V2PageShell({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(v2.surfaces.page, className)}>
      <div className={cn(v2.surfaces.pageShell, 'tt-v2-mod-stack')}>
        {children}
      </div>
    </div>
  )
}
