import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TodoBacklog } from '@/lib/todo-backlog'
import { cn } from '@/lib/utils'

function StatusBadge({ status, highPriority }: { status: string; highPriority: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.04em]',
        highPriority
          ? 'border-[var(--tt-orange,#f4511e)]/30 bg-[color-mix(in_srgb,var(--tt-orange,#f4511e)_10%,white)] text-[var(--tt-orange,#f4511e)]'
          : status.toLowerCase().includes('deferred')
            ? 'border-black/10 bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink-soft)]'
            : 'border-black/10 bg-white text-[var(--tt-ink-soft)]',
      )}
    >
      {status}
    </span>
  )
}

function TodoBody({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n\n+/).filter(Boolean)

  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
      {blocks.map((block, index) => {
        const trimmed = block.trim()

        if (trimmed.startsWith('> ')) {
          const quote = trimmed
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join(' ')
          return (
            <blockquote
              key={index}
              className="border-l-2 border-[var(--tt-line)] pl-3 text-[var(--tt-ink)]"
            >
              {renderInline(quote)}
            </blockquote>
          )
        }

        if (/^#{2,4}\s/.test(trimmed)) {
          const text = trimmed.replace(/^#{2,4}\s+/, '')
          return (
            <p
              key={index}
              className="pt-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink)]"
            >
              {text}
            </p>
          )
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter((line) => /^[-*]\s/.test(line.trim()))
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        if (trimmed.startsWith('```')) {
          const code = trimmed.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-[6px] border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] px-3 py-2 font-mono text-[12px] text-[var(--tt-ink)]"
            >
              {code}
            </pre>
          )
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[var(--tt-ink)]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-[var(--tt-sidebar,#f5f5f5)] px-1 py-0.5 font-mono text-[12px] text-[var(--tt-ink)]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={index}>{part}</span>
  })
}

function previewFromBody(body: string): string | null {
  const plain = body
    .replace(/^#{2,4}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
  if (!plain) return null
  if (plain.length <= 140) return plain
  return `${plain.slice(0, 137).trimEnd()}…`
}

type ProductBacklogViewProps = {
  backlog: TodoBacklog
  /** Extra nav links under the intro (e.g. Tools, Style guide). */
  navLinks?: Array<{ href: string; label: string }>
}

export function ProductBacklogView({ backlog, navLinks = [] }: ProductBacklogViewProps) {
  const totalItems = backlog.sections.reduce((sum, section) => sum + section.items.length, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3 border-b border-[var(--tt-line)] pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint)]">
          Internal · docs/TODO.md
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--tt-ink)]">
          Product backlog
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--tt-ink-soft)]">
          {backlog.intro.split('\n\n')[0] ?? 'Product ideas and deferred work.'}
        </p>
        <p className="text-[12px] text-[var(--tt-ink-faint)]">
          {totalItems} items · click a row to expand details
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-[12px]">
          {backlog.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="font-semibold text-[var(--tt-ink-soft)] underline-offset-2 hover:text-[var(--tt-ink)] hover:underline"
            >
              {section.title} ({section.items.length})
            </a>
          ))}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-semibold text-[var(--tt-ink-soft)] underline-offset-2 hover:text-[var(--tt-ink)] hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      {backlog.sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint)]">
            {section.title}
          </h2>
          <ul className="space-y-2">
            {section.items.map((item) => {
              const preview = previewFromBody(item.body)
              return (
                <li key={item.id} id={item.id} className="scroll-mt-6">
                  <details className="group rounded-[10px] border border-[var(--tt-line)] bg-white open:shadow-[var(--tt-shadow)]">
                    <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                      <ChevronDown
                        className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-ink-faint)] transition-transform duration-200 group-open:rotate-180"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-[15px] font-semibold leading-snug text-[var(--tt-ink)]">
                            {item.title}
                          </h3>
                          <StatusBadge status={item.status} highPriority={item.highPriority} />
                        </div>
                        {preview ? (
                          <p className="line-clamp-2 text-[13px] leading-snug text-[var(--tt-ink-soft)] group-open:hidden">
                            {preview}
                          </p>
                        ) : null}
                        {item.related ? (
                          <p className="hidden text-[11px] text-[var(--tt-ink-faint)] group-open:block">
                            <span className="font-semibold uppercase tracking-[0.04em]">Related</span>
                            {' · '}
                            {item.related}
                          </p>
                        ) : null}
                      </div>
                    </summary>
                    {item.body ? (
                      <div className="border-t border-[var(--tt-line)] px-4 pb-4 pt-3 pl-[2.75rem]">
                        <TodoBody markdown={item.body} />
                      </div>
                    ) : null}
                  </details>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
