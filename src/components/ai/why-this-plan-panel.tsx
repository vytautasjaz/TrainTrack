'use client'

import { cn } from '@/lib/utils'
import {
  COACH_ENGINE_STEP_IDS,
  COACH_ENGINE_STEP_META,
  type CoachEngineDecisionStep,
  type CoachEngineDecisionStepId,
  type CoachEngineDecisionTrace,
} from '@/lib/coach-engine/decision-trace'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export type WhyThisPlanProps = {
  guidelines?: string | null
  description?: string | null
  className?: string
}

/** Parse coach-engine guidelines block into a compact athlete-facing panel. */
export function parseWhyThisPlan(guidelines: string | null | undefined): {
  focus: string | null
  methodology: string | null
  confidence: string | null
  limiting: string | null
  reasons: string | null
  planScore: string | null
  decisionLog: { title: string; facts: string[] }[]
  hasEngine: boolean
} {
  const text = guidelines ?? ''
  const pick = (label: string) => {
    const re = new RegExp(`${label}:\\s*(.+)`, 'i')
    const m = text.match(re)
    return m?.[1]?.trim() ?? null
  }
  const focus = pick('Focus')
  const methodology = pick('Methodology')
  const limiting = pick('Limiting factor')
  const reasons = pick('Reasons') ?? pick('Adapt action')
  const confidence = (() => {
    const m = text.match(/confidence\s+([0-9.]+)/i)
    return m?.[1] ?? null
  })()
  const planScore = (() => {
    const m = text.match(/Plan score:\s*([0-9]+)\/100/i)
    return m?.[1] ?? null
  })()

  const decisionLog: { title: string; facts: string[] }[] = []
  const logIdx = text.search(/##\s*Decision log/i)
  if (logIdx >= 0) {
    const logBody = text.slice(logIdx)
    const sections = logBody.split(/###\s+/).slice(1)
    for (const section of sections) {
      const lines = section
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const title = lines[0] ?? 'Step'
      const facts = lines
        .slice(1)
        .filter((l) => l.startsWith('- '))
        .map((l) => l.slice(2).trim())
      decisionLog.push({ title, facts })
    }
  }

  return {
    focus,
    methodology,
    confidence,
    limiting,
    reasons,
    planScore,
    decisionLog,
    hasEngine:
      text.includes('Why this plan') ||
      text.includes('Decision log') ||
      Boolean(focus || methodology || limiting || reasons),
  }
}

export function WhyThisPlanPanel({
  guidelines,
  description,
  className,
}: WhyThisPlanProps) {
  const source = guidelines?.includes('Why this plan')
    ? guidelines
    : guidelines?.includes('Decision log')
      ? guidelines
      : description?.includes('Why this plan')
        ? description
        : description?.includes('Decision log')
          ? description
          : (guidelines ?? description)
  const parsed = parseWhyThisPlan(source)
  if (!parsed.hasEngine && !description) return null
  if (!parsed.hasEngine) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-[var(--tt-line,#e8e8e8)] bg-[var(--tt-surface,#fafafa)] px-4 py-3',
        className,
      )}
    >
      <h2 className="text-sm font-semibold tracking-tight text-[var(--tt-ink,#111)]">
        Why this plan
      </h2>
      <p className="mt-0.5 text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
        Coach-engine decisions for this draft — expand the log for full detail.
      </p>
      <dl className="mt-2 grid gap-1.5 text-[13px] text-[var(--tt-ink-soft,#555)]">
        {parsed.focus ? (
          <div>
            <dt className="inline font-medium text-[var(--tt-ink,#111)]">Focus: </dt>
            <dd className="inline">{parsed.focus}</dd>
          </div>
        ) : null}
        {parsed.methodology ? (
          <div>
            <dt className="inline font-medium text-[var(--tt-ink,#111)]">Methodology: </dt>
            <dd className="inline">{parsed.methodology}</dd>
          </div>
        ) : null}
        {parsed.limiting ? (
          <div>
            <dt className="inline font-medium text-[var(--tt-ink,#111)]">Limiting factor: </dt>
            <dd className="inline">{parsed.limiting}</dd>
          </div>
        ) : null}
        {parsed.reasons ? (
          <div>
            <dt className="inline font-medium text-[var(--tt-ink,#111)]">Reasons: </dt>
            <dd className="inline">{parsed.reasons}</dd>
          </div>
        ) : null}
        {parsed.planScore ? (
          <div>
            <dt className="inline font-medium text-[var(--tt-ink,#111)]">Plan score: </dt>
            <dd className="inline">{parsed.planScore}/100</dd>
          </div>
        ) : null}
      </dl>

      {parsed.decisionLog.length > 0 ? (
        <details className="mt-3 border-t border-[var(--tt-line,#e8e8e8)] pt-3">
          <summary className="cursor-pointer text-[13px] font-medium text-[var(--tt-ink,#111)]">
            Decision log ({parsed.decisionLog.length} steps)
          </summary>
          <div className="mt-2 space-y-3">
            {parsed.decisionLog.map((step) => (
              <div key={step.title}>
                <p className="text-[12px] font-semibold text-[var(--tt-ink,#111)]">
                  {step.title}
                </p>
                <ul className="mt-1 space-y-0.5 text-[12px] leading-snug text-[var(--tt-ink-soft,#555)]">
                  {step.facts.map((fact) => (
                    <li key={fact}>· {fact}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}

/** Live + completed coach-engine progress with decision facts. */
export function CoachEngineProgress({
  active,
  stepIndex,
  trace,
  className,
}: {
  active: boolean
  stepIndex: number
  trace?: CoachEngineDecisionTrace | null
  className?: string
}) {
  const ids = COACH_ENGINE_STEP_IDS
  const [openId, setOpenId] = useState<CoachEngineDecisionStepId | null>(null)

  useEffect(() => {
    if (trace?.steps[0]?.id) {
      setOpenId(trace.steps[0].id)
    }
  }, [trace])

  if (!active && !trace) return null

  return (
    <div
      className={cn(
        'rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-[var(--tt-sidebar,#f5f5f5)] px-4 py-3',
        className,
      )}
      aria-live="polite"
      aria-busy={active}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9a9a9a)]">
        Coach engine {trace && !active ? '· decisions' : ''}
      </p>
      <ol className="mt-2.5 space-y-2">
        {ids.map((id, index) => {
          const meta = COACH_ENGINE_STEP_META[id]
          const fromTrace = trace?.steps.find((s) => s.id === id) ?? null
          const done = trace
            ? Boolean(fromTrace)
            : index < stepIndex
          const current = !trace && index === stepIndex
          const expanded = openId === id || (current && !trace)
          const facts = fromTrace?.facts ?? []
          const summary = fromTrace?.summary ?? meta.hint

          return (
            <li key={id} className="text-[13px] leading-snug">
              <button
                type="button"
                className={cn(
                  'flex w-full items-start gap-2 text-left',
                  done || current
                    ? 'text-[var(--tt-ink,#111)]'
                    : 'text-[var(--tt-ink-faint,#9a9a9a)]',
                )}
                onClick={() =>
                  setOpenId((cur) => (cur === id ? null : id))
                }
                disabled={!done && !current}
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : current ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--tt-line-strong,#d4d4d4)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block', current && 'font-medium')}>
                    {fromTrace?.title ?? meta.title}
                  </span>
                  {(expanded || current) && (
                    <span className="mt-0.5 block text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
                      {summary}
                    </span>
                  )}
                </span>
                {(done || current) && (
                  <ChevronDown
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint,#9a9a9a)] transition-transform',
                      expanded && 'rotate-180',
                    )}
                    aria-hidden
                  />
                )}
              </button>
              {expanded && facts.length > 0 ? (
                <ul className="ml-6 mt-1.5 space-y-1 border-l border-[var(--tt-line,#e0e0e0)] pl-3 text-[12px] text-[var(--tt-ink-soft,#555)]">
                  {facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export type { CoachEngineDecisionStep, CoachEngineDecisionTrace }
