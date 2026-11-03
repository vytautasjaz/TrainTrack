'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  ChevronRight,
  Footprints,
  HeartPulse,
  Info,
  Lightbulb,
  Minus,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type {
  PhysiologyDashboardVm,
  PhysiologyMetricCardVm,
  PhysiologyTrendSeriesVm,
  TrainingTone,
} from '@/lib/coach-engine/physiology/dashboard'
import type { ProfileRating } from '@/lib/coach-engine/physiology/interpret'
import {
  rateTrainingResponse,
  trainingResponseInsight,
} from '@/lib/coach-engine/physiology/interpret'
import {
  FITNESS_METRIC_DETAIL,
  FITNESS_SCORE_GUIDE,
} from '@/components/physiology/metric-detail-copy'
import { FitnessProfileRadar } from '@/components/physiology/fitness-profile-radar'

/* ─── shared tone / format (unchanged visual language) ─── */

function toneStroke(tone: TrainingTone): string {
  switch (tone) {
    case 'great':
    case 'good':
      return 'var(--tt-good)'
    case 'ok':
      return 'var(--tt-ink-soft)'
    case 'warn':
      return 'var(--color-sport-hyrox)'
    case 'bad':
      return 'var(--color-destructive)'
  }
}

function toneClasses(tone: TrainingTone): {
  chip: string
  bar: string
  text: string
} {
  switch (tone) {
    case 'great':
      return {
        chip: 'bg-[var(--tt-good)] text-white',
        bar: 'bg-[var(--tt-good)]',
        text: 'text-[var(--tt-good)]',
      }
    case 'good':
      return {
        chip: 'bg-[var(--tt-good-soft)] text-[var(--tt-good)]',
        bar: 'bg-[var(--tt-good)]',
        text: 'text-[var(--tt-good)]',
      }
    case 'ok':
      return {
        chip: 'bg-[var(--color-surface-subtle)] text-[var(--tt-ink-soft)] border border-[var(--tt-line)]',
        bar: 'bg-[var(--tt-ink-soft)]',
        text: 'text-[var(--tt-ink-soft)]',
      }
    case 'warn':
      return {
        chip: 'bg-[var(--color-tt-adjusted-bg)] text-[var(--color-sport-hyrox)]',
        bar: 'bg-[var(--color-sport-hyrox)]',
        text: 'text-[var(--color-sport-hyrox)]',
      }
    case 'bad':
      return {
        chip: 'bg-[var(--color-tt-skipped-bg)] text-[var(--color-destructive)]',
        bar: 'bg-[var(--color-destructive)]',
        text: 'text-[var(--color-destructive)]',
      }
  }
}

function formatValue(value: number, unit?: string): string {
  const rounded =
    unit === 'km' || unit === 'km/wk' || unit === 'days'
      ? value % 1 === 0
        ? String(value)
        : value.toFixed(1)
      : String(Math.round(value))
  if (!unit) return rounded
  if (unit === 'days') return `${rounded}/wk`
  if (unit === 'km/wk') return `${rounded} km`
  return `${rounded} ${unit}`
}

function deltaText(value: number, previous: number | null): string | null {
  if (previous == null) return null
  const d = Math.round((value - previous) * 10) / 10
  if (Math.abs(d) < 0.05) return null
  return `${d > 0 ? '+' : ''}${d}`
}

function interventionLabel(id: string): string {
  return id.replaceAll('_', ' ')
}

function StatusChip({ label, tone }: { label: string; tone: TrainingTone }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold',
        toneClasses(tone).chip,
      )}
    >
      {label}
    </span>
  )
}

/* ─── detail row model ─── */

type FitnessRow = {
  id: string
  label: string
  scoreDisplay: string
  /** Detail header — e.g. `78 / 100` for index scores. */
  scoreDetailDisplay: string
  scoreNumeric: number
  /** True when the primary value is a 0–100 model index (not km / days). */
  isIndexScore: boolean
  rating: ProfileRating
  delta: string | null
  deltaImproving: boolean | null
  lowerBetter: boolean
  summary: string
  /** 0–100 position on the shared scale line (null = no scale). */
  scalePct: number | null
  rangeHint: string | null
}

/** Map a metric value onto a 0–100 scale for the row track. */
function scalePctForCard(card: PhysiologyMetricCardVm): number {
  if (card.range && card.range.upperLimit > 0) {
    return Math.min(
      100,
      Math.max(0, Math.round((card.range.current / card.range.upperLimit) * 100)),
    )
  }
  if (card.id === 'longRunTolerance') {
    // ~42 km ≈ full marathon long-run ceiling for the scale.
    return Math.min(100, Math.max(0, Math.round((card.value / 42) * 100)))
  }
  // Standard 0–100 profile scores (incl. overreach — higher still farther on the line).
  return Math.min(100, Math.max(0, Math.round(card.value)))
}

type DomainDef = {
  id: string
  title: string
  blurb: string
  icon: LucideIcon
  rows: FitnessRow[]
}

const RESPONDERS: {
  key: keyof NonNullable<PhysiologyDashboardVm['fingerprint']>
  insightKey: 'volume' | 'frequency' | 'threshold' | 'vo2' | 'longRun'
  label: string
}[] = [
  { key: 'thresholdResponder', insightKey: 'threshold', label: 'Threshold' },
  { key: 'frequencyResponder', insightKey: 'frequency', label: 'Frequency' },
  { key: 'longRunResponder', insightKey: 'longRun', label: 'Long-run' },
  { key: 'volumeResponder', insightKey: 'volume', label: 'Volume' },
  { key: 'vo2Responder', insightKey: 'vo2', label: 'VO₂' },
]

const FITNESS_CARD_IDS = [
  'aerobicStrength',
  'aerobicEfficiency',
  'thresholdStrength',
  'thresholdDurability',
  'vo2Response',
] as const

const RECOVERY_CARD_IDS = [
  'fatigueResistance',
  'overreachRisk',
  'recoverySpeed',
] as const

const ENDURANCE_CARD_IDS = ['longRunTolerance', 'marathonReadiness'] as const

function isIndexUnit(unit?: string): boolean {
  return !unit || unit === '%'
}

function cardToRow(card: PhysiologyMetricCardVm): FitnessRow {
  const primary = card.range ? card.range.current : card.value
  const delta = deltaText(primary, card.previousValue)
  const lowerBetter = card.id === 'overreachRisk'
  const indexScore = !card.range && isIndexUnit(card.unit) && card.id !== 'longRunTolerance'
  const rounded = Math.round(primary)
  const scoreDisplay = formatValue(primary, card.unit)
  return {
    id: card.id,
    label: card.label,
    scoreDisplay,
    scoreDetailDisplay: indexScore ? `${rounded} / 100` : scoreDisplay,
    scoreNumeric: primary,
    isIndexScore: indexScore,
    rating: card.rating,
    delta,
    deltaImproving:
      delta == null
        ? null
        : lowerBetter
          ? !delta.startsWith('+')
          : delta.startsWith('+'),
    lowerBetter,
    summary: card.rating.insight,
    scalePct: scalePctForCard(card),
    rangeHint: card.range
      ? `Productive ~${formatValue(card.range.optimal, card.unit)} · Max ${formatValue(card.range.upperLimit, card.unit)}`
      : null,
  }
}

function buildDomains(data: PhysiologyDashboardVm): DomainDef[] {
  const byId = new Map(data.cards.map((c) => [c.id, c]))

  const responseRows: FitnessRow[] =
    data.fingerprint == null
      ? []
      : RESPONDERS.map((r) => {
          const value = data.fingerprint![r.key]
          const score = Math.round(value * 100)
          const rating = rateTrainingResponse(value)
          return {
            id: r.key,
            label: r.label,
            scoreDisplay: String(score),
            scoreDetailDisplay: `${score} / 100`,
            scoreNumeric: score,
            isIndexScore: true,
            rating,
            delta: null,
            deltaImproving: null,
            lowerBetter: false,
            summary: trainingResponseInsight(r.insightKey, value),
            scalePct: Math.min(100, Math.max(0, score)),
            rangeHint: null,
          }
        }).sort((a, b) => b.scoreNumeric - a.scoreNumeric)

  const pick = (ids: readonly string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((c): c is PhysiologyMetricCardVm => Boolean(c))
      .map(cardToRow)

  return [
    {
      id: 'response',
      title: 'Training response',
      blurb: 'What your history responds to',
      icon: Zap,
      rows: responseRows,
    },
    {
      id: 'fitness',
      title: 'Current fitness',
      blurb: 'Where capacity sits today',
      icon: Activity,
      rows: pick(FITNESS_CARD_IDS),
    },
    {
      id: 'recovery',
      title: 'Durability & recovery',
      blurb: 'How you absorb training',
      icon: HeartPulse,
      rows: pick(RECOVERY_CARD_IDS),
    },
    {
      id: 'endurance',
      title: 'Endurance',
      blurb: 'Longer-distance readiness',
      icon: Footprints,
      rows: pick(ENDURANCE_CARD_IDS),
    },
  ]
}

type InsightCard = {
  id: string
  icon: 'up' | 'focus' | 'info'
  title: string
  body: string
}

function buildInsights(
  data: PhysiologyDashboardVm,
  domains: DomainDef[],
): InsightCard[] {
  const insights: InsightCard[] = []
  const response = domains.find((d) => d.id === 'response')
  const top = response?.rows.slice(0, 2) ?? []
  if (top.length >= 2) {
    insights.push({
      id: 'levers',
      icon: 'up',
      title: `Focus on ${top[0]!.label.toLowerCase()} & ${top[1]!.label.toLowerCase()}`,
      body: 'These currently produce your strongest training response.',
    })
  } else if (top[0]) {
    insights.push({
      id: 'levers',
      icon: 'up',
      title: `Focus on ${top[0].label.toLowerCase()}`,
      body: 'This currently produces your strongest training response.',
    })
  }

  const longRun = data.cards.find((c) => c.id === 'longRunTolerance')
  if (longRun && (longRun.rating.tone === 'ok' || longRun.rating.tone === 'bad')) {
    insights.push({
      id: 'long',
      icon: 'focus',
      title: 'Build long-run tolerance',
      body: 'Your long-run tolerance is still developing. Gradually increase long runs.',
    })
  }

  const overreach = data.cards.find((c) => c.id === 'overreachRisk')
  if (overreach) {
    insights.push({
      id: 'load',
      icon: 'info',
      title: 'Manage training load',
      body:
        overreach.rating.tone === 'great' || overreach.rating.tone === 'good'
          ? 'Load looks sustainable — keep easy days easy as you progress quality.'
          : 'Current load needs care. Keep easy days easy and monitor intensity.',
    })
  }

  return insights.slice(0, 3)
}

function InsightIcon({ kind }: { kind: InsightCard['icon'] }) {
  if (kind === 'up') {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tt-good-soft)] text-[var(--tt-good)]">
        <TrendingUp className="size-3.5" aria-hidden />
      </span>
    )
  }
  if (kind === 'focus') {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tt-red-soft)] text-[var(--tt-v2-accent)]">
        <Minus className="size-3.5" aria-hidden />
      </span>
    )
  }
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--tt-v2-wash-bike)] text-[var(--color-sport-bike)]">
      <Info className="size-3.5" aria-hidden />
    </span>
  )
}

/* ─── sparkline (detail only) ─── */

const SPARK_W = 240
const SPARK_H = 48
const SPARK_PAD_X = 8
const SPARK_PAD_Y = 8

function sparkLayout(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const innerW = SPARK_W - SPARK_PAD_X * 2
  const innerH = SPARK_H - SPARK_PAD_Y * 2
  const step = values.length <= 1 ? 0 : innerW / (values.length - 1)
  const coords = values.map((v, i) => ({
    x: SPARK_PAD_X + i * step,
    y: SPARK_PAD_Y + innerH - ((v - min) / span) * innerH,
  }))
  const path = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  return { coords, path }
}

function MiniTrend({ series }: { series: PhysiologyTrendSeriesVm }) {
  const values = series.points.map((p) => p.value)
  const { path, coords } = sparkLayout(values)
  const stroke = toneStroke(series.rating.tone)
  const first = series.points[0]
  const last = series.points[series.points.length - 1]
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
        Snapshot trend
      </p>
      <svg
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        className="mt-2 w-full"
        style={{ aspectRatio: `${SPARK_W} / ${SPARK_H}` }}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={2.5}
            fill={series.points[i]?.kind === 'snapshot' ? stroke : '#fff'}
            stroke={stroke}
            strokeWidth={1.25}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--tt-ink-faint)]">
        <span>{first ? fmt(first.asOf) : ''}</span>
        <span>{last ? fmt(last.asOf) : ''}</span>
      </div>
    </div>
  )
}

/* ─── UI pieces ─── */

function ReturnGauge({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)))
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)
  const tone: TrainingTone =
    clamped >= 75
      ? 'great'
      : clamped >= 55
        ? 'good'
        : clamped >= 40
          ? 'ok'
          : 'bad'

  return (
    <div className="relative flex size-[5.5rem] shrink-0 items-center justify-center sm:size-24">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--tt-wash)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={toneStroke(tone)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <p className="absolute text-[1.35rem] font-bold tabular-nums leading-none text-[var(--tt-ink)] sm:text-[1.5rem]">
        {clamped}%
      </p>
    </div>
  )
}

/** Subtle 0–100 scale with a marker at the current score. */
function ScaleLine({
  pct,
  tone,
  lowerBetter,
}: {
  pct: number
  tone: TrainingTone
  lowerBetter?: boolean
}) {
  const clamped = Math.min(100, Math.max(0, pct))
  const fill = toneClasses(tone).bar
  return (
    <div
      className="relative h-1.5 w-full"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={
        lowerBetter
          ? `Scale ${clamped} of 100 — lower is better`
          : `Scale ${clamped} of 100`
      }
    >
      {/* Remaining to 100 — very light grey */}
      <div className="absolute inset-0 rounded-[2px] bg-[#E8EAED]" />
      {/* Filled portion to the current point */}
      <div
        className={cn('absolute inset-y-0 left-0 rounded-[2px]', fill)}
        style={{ width: `${clamped}%` }}
      />
      {/* Quarter ticks */}
      {[25, 50, 75].map((tick) => (
        <span
          key={tick}
          className="absolute top-0 bottom-0 w-px bg-[color-mix(in_srgb,var(--tt-ink)_12%,transparent)]"
          style={{ left: `${tick}%` }}
          aria-hidden
        />
      ))}
      {/* Marker */}
      <span
        className={cn(
          'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm',
          fill,
        )}
        style={{ left: `${clamped}%` }}
        aria-hidden
      />
    </div>
  )
}

function MetricRow({
  row,
  onOpen,
}: {
  row: FitnessRow
  onOpen: (row: FitnessRow) => void
}) {
  const deltaClass =
    row.deltaImproving == null
      ? 'text-[var(--tt-ink-faint)]'
      : row.deltaImproving
        ? 'text-[var(--tt-good)]'
        : 'text-[var(--color-destructive)]'

  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="group flex w-full flex-col gap-1.5 border-t border-[var(--tt-line)] px-3 py-2.5 text-left transition hover:bg-[var(--color-surface-subtle)] first:border-t-0"
    >
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--tt-ink)]">
          {row.label}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[13px] font-bold tabular-nums text-[var(--tt-ink)]">
            {row.scoreDisplay}
            {row.isIndexScore ? (
              <span className="font-medium text-[var(--tt-ink-faint)]">
                {' '}
                / 100
              </span>
            ) : null}
          </span>
          {row.delta ? (
            <span
              className={cn(
                'text-[10px] font-semibold tabular-nums',
                deltaClass,
              )}
            >
              {row.deltaImproving ? '↑' : '↓'} {row.delta}
            </span>
          ) : null}
          <StatusChip label={row.rating.label} tone={row.rating.tone} />
          <ChevronRight
            className="size-3.5 text-[var(--tt-ink-faint)] transition group-hover:text-[var(--tt-ink-soft)]"
            aria-hidden
          />
        </div>
      </div>
      {row.scalePct != null ? (
        <ScaleLine
          pct={row.scalePct}
          tone={row.rating.tone}
          lowerBetter={row.lowerBetter}
        />
      ) : null}
    </button>
  )
}

function DomainColumn({
  domain,
  onOpen,
}: {
  domain: DomainDef
  onOpen: (row: FitnessRow) => void
}) {
  const Icon = domain.icon
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--tt-line)] bg-white">
      <header className="flex items-start gap-2 border-b border-[var(--tt-line)] px-3 py-2.5">
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-[var(--tt-ink-soft)]"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--tt-ink)]">
            {domain.title}
          </p>
          <p className="text-[10px] text-[var(--tt-ink-faint)]">{domain.blurb}</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        {domain.rows.map((row) => (
          <MetricRow key={row.id} row={row} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function MetricDetailDialog({
  row,
  open,
  onOpenChange,
  trend,
}: {
  row: FitnessRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  trend: PhysiologyTrendSeriesVm | null
}) {
  if (!row) return null
  const copy = FITNESS_METRIC_DETAIL[row.id]
  const deltaClass =
    row.deltaImproving == null
      ? 'text-[var(--tt-ink-faint)]'
      : row.deltaImproving
        ? 'text-[var(--tt-good)]'
        : 'text-[var(--color-destructive)]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[min(40rem,88vh)] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-0 shadow-[var(--tt-v2-shadow-panel-hover)]"
        overlayClassName="bg-black/25"
      >
        <DialogHeader className="mb-0 space-y-0 border-b border-[var(--tt-line)] px-4 py-3 pr-4 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-[13px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
                {row.label}
              </DialogTitle>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                <p className="text-[1.5rem] font-bold tabular-nums leading-none text-[var(--tt-ink)]">
                  {row.scoreDetailDisplay}
                </p>
                <StatusChip label={row.rating.label} tone={row.rating.tone} />
                {row.delta ? (
                  <span
                    className={cn(
                      'text-[11px] font-semibold tabular-nums',
                      deltaClass,
                    )}
                  >
                    {row.deltaImproving ? '↑' : '↓'} {row.delta}
                  </span>
                ) : null}
              </div>
              {row.lowerBetter ? (
                <p className="mt-1 text-[10px] text-[var(--tt-ink-faint)]">
                  Lower is better
                </p>
              ) : row.isIndexScore ? (
                <p className="mt-1 text-[10px] text-[var(--tt-ink-faint)]">
                  Personal training-history score · not a world ranking
                </p>
              ) : null}
            </div>
            <DialogClose
              className="rounded-[6px] p-1 text-[var(--tt-ink-faint)] transition hover:bg-[var(--color-surface-subtle)] hover:text-[var(--tt-ink)]"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-4 py-3">
          <DialogDescription className="text-[13px] leading-snug text-[var(--tt-ink-soft)]">
            {row.summary}
          </DialogDescription>

          {row.scalePct != null ? (
            <div>
              <div className="mb-1 flex justify-between text-[10px] tabular-nums text-[var(--tt-ink-faint)]">
                <span>0</span>
                <span>
                  {row.lowerBetter
                    ? 'Lower is better'
                    : row.isIndexScore
                      ? 'Your score on 0–100'
                      : 'Relative scale'}
                </span>
                <span>100</span>
              </div>
              <ScaleLine
                pct={row.scalePct}
                tone={row.rating.tone}
                lowerBetter={row.lowerBetter}
              />
            </div>
          ) : null}

          {row.rangeHint ? (
            <p className="text-[11px] tabular-nums text-[var(--tt-ink-faint)]">
              {row.rangeHint}
            </p>
          ) : null}

          {copy ? (
            <>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                  What this number means
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink)]">
                  {copy.scale}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                  Why it matters
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink)]">
                  {copy.why}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                  Training implication
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink)]">
                  {copy.implication}
                </p>
              </div>
            </>
          ) : null}

          {trend && trend.points.length >= 2 ? (
            <MiniTrend series={trend} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── main ─── */

export function PhysiologyDashboard({
  data,
  className,
}: {
  data: PhysiologyDashboardVm
  className?: string
}) {
  const [selected, setSelected] = useState<FitnessRow | null>(null)
  const domains = useMemo(() => buildDomains(data), [data])
  const insights = useMemo(() => buildInsights(data, domains), [data, domains])

  const prediction = data.prediction
  const returnPct = prediction
    ? Math.round(prediction.confidence * 100)
    : null

  const drivers =
    data.fingerprint != null
      ? RESPONDERS.map((r) => ({
          ...r,
          value: data.fingerprint![r.key],
          score: Math.round(data.fingerprint![r.key] * 100),
          rating: rateTrainingResponse(data.fingerprint![r.key]),
        }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
      : []

  const meansBlurb =
    drivers.length >= 2
      ? `You respond very well to ${drivers[0]!.label.toLowerCase()} and ${drivers[1]!.label.toLowerCase()}. These are your biggest training levers right now.`
      : drivers[0]
        ? `You respond strongly to ${drivers[0].label.toLowerCase()}. That is a primary training lever right now.`
        : null

  const trendFor = (row: FitnessRow | null) => {
    if (!row) return null
    // Map responder ids → no card trends; card ids match trend series ids.
    return data.trends.find((t) => t.id === row.id) ?? null
  }

  function openMetricById(metricId: string) {
    for (const domain of domains) {
      const row = domain.rows.find((r) => r.id === metricId)
      if (row) {
        setSelected(row)
        return
      }
    }
    const card = data.cards.find((c) => c.id === metricId)
    if (card) setSelected(cardToRow(card))
  }

  return (
    <section
      id="physiology"
      className={cn('scroll-mt-24 space-y-[var(--tt-space-section)]', className)}
    >
      {/* 1. Top strip: Next focus · Strongest responses · What this means */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-0">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4 lg:pr-5">
            {prediction && returnPct != null ? (
              <>
                <ReturnGauge pct={returnPct} />
                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
                    Next focus
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-[var(--tt-ink)]">
                    Training return potential
                  </p>
                  <p className="mt-1 text-[12px] capitalize leading-snug text-[var(--tt-ink-soft)]">
                    Bias toward{' '}
                    <span className="font-semibold text-[var(--tt-ink)]">
                      {interventionLabel(prediction.primaryIntervention)}
                    </span>
                    {prediction.secondaryIntervention
                      ? ` / ${interventionLabel(prediction.secondaryIntervention)}`
                      : ''}
                  </p>
                </div>
              </>
            ) : (
              <div className="min-w-0 py-1 text-center sm:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
                  Next focus
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                  Sync more training to unlock return potential.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--tt-line)] pt-4 lg:border-l lg:border-t-0 lg:px-5 lg:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
              Strongest responses
            </p>
            {drivers.length > 0 ? (
              <ol className="mt-2 space-y-2">
                {drivers.map((d, i) => (
                  <li key={d.key}>
                    <div className="flex items-baseline justify-between gap-2 text-[12px]">
                      <span className="font-medium text-[var(--tt-ink)]">
                        <span className="mr-1.5 text-[var(--tt-ink-faint)]">
                          {i + 1}.
                        </span>
                        {d.label}
                      </span>
                      <span className="tabular-nums font-semibold text-[var(--tt-ink)]">
                        {d.score}
                        <span className="font-medium text-[var(--tt-ink-faint)]">
                          {' '}
                          / 100
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-[2px] bg-[var(--tt-wash)]">
                      <div
                        className={cn(
                          'h-full rounded-[2px]',
                          toneClasses(d.rating.tone).bar,
                        )}
                        style={{
                          width: `${Math.min(100, Math.max(6, d.score))}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
                Response levers appear once enough history is available.
              </p>
            )}
          </div>

          <div className="min-w-0 border-t border-[var(--tt-line)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-semibold',
                meansBlurb ? 'text-[var(--tt-good)]' : 'text-[var(--tt-ink-soft)]',
              )}
            >
              <Lightbulb className="size-3.5 shrink-0" aria-hidden />
              What this means
            </p>
            <p className="mt-2 text-[12px] leading-snug text-[var(--tt-ink)]">
              {meansBlurb ??
                'As your strongest responses emerge, this card explains how to use them in training.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Domain statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {domains.map((domain) => (
          <DomainColumn
            key={domain.id}
            domain={domain}
            onOpen={setSelected}
          />
        ))}
      </div>

      {/* 3. Bottom strip: Insights · Profile shape · How to read 0–100 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch">
        <div className="rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
            Insights
          </p>
          {insights.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {insights.map((insight) => (
                <li key={insight.id} className="flex gap-2.5">
                  <InsightIcon kind={insight.icon} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--tt-ink)]">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--tt-ink-soft)]">
                      {insight.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12px] leading-snug text-[var(--tt-ink-soft)]">
              Keep training and syncing — insights appear as your history grows.
            </p>
          )}
        </div>

        <FitnessProfileRadar
          variant="panel"
          cards={data.cards}
          fingerprint={data.fingerprint}
          onSelectMetric={openMetricById}
        />

        <div className="rounded-[var(--radius-2xl)] border border-[var(--tt-line)] bg-white px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-soft)]">
            {FITNESS_SCORE_GUIDE.title}
          </p>
          <p className="mt-2 text-[12px] leading-snug text-[var(--tt-ink)]">
            {FITNESS_SCORE_GUIDE.summary}
          </p>
          <ul className="mt-3 space-y-2.5">
            {FITNESS_SCORE_GUIDE.bands.map((band) => (
              <li
                key={band.range}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-2 text-[11px] leading-snug"
              >
                <span className="pt-0.5 tabular-nums font-semibold text-[var(--tt-ink-soft)]">
                  {band.range}
                </span>
                <div className="min-w-0">
                  <span
                    className={cn(
                      'inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold',
                      toneClasses(band.tone).chip,
                    )}
                  >
                    {band.label}
                  </span>
                  <p className="mt-1 text-[var(--tt-ink)]">{band.meaning}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-[var(--tt-ink-soft)]">
            {FITNESS_SCORE_GUIDE.note}
          </p>
        </div>
      </div>

      {data.streamFeatures && data.streamFeatures.withHrCount > 0 ? (
        <p className="text-[11px] text-[var(--tt-ink-soft)]">
          Strava HR · {data.streamFeatures.withHrCount} sessions
          {data.streamFeatures.meanHrDriftPct != null
            ? ` · drift ${data.streamFeatures.meanHrDriftPct}%`
            : ''}
        </p>
      ) : (
        <p className="text-[11px] text-[var(--tt-ink-faint)]">
          Sync Strava with HR to refine efficiency scores.
        </p>
      )}

      <MetricDetailDialog
        row={selected}
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        trend={trendFor(selected)}
      />
    </section>
  )
}
