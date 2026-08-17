import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check, Clock, X } from 'lucide-react'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import { WorkoutType } from '@prisma/client'
import { cn } from '@/lib/utils'

type SampleState = 'planned' | 'completed' | 'partial'

type SampleCard = {
  title: string
  sport: WorkoutType
  sportColor: string
  metric: string
  metricUnit: string
  secondary?: string
  state: SampleState
  /** e.g. "/ 60 min" for partial completion */
  metricDetail?: string
  /** e.g. STRAVA source chip */
  source?: string
}

const SAMPLES: SampleCard[] = [
  {
    title: 'Recovery Run',
    sport: WorkoutType.RUN,
    sportColor: '#F4511E',
    metric: '5',
    metricUnit: 'km',
    state: 'planned',
  },
  {
    title: 'Strength',
    sport: WorkoutType.STRENGTH,
    sportColor: '#8B5CF6',
    metric: '31',
    metricUnit: 'min',
    metricDetail: '/ 60 min',
    state: 'partial',
    source: 'STRAVA',
  },
  {
    title: 'OW Swim',
    sport: WorkoutType.SWIM,
    sportColor: '#2196E8',
    metric: '3000',
    metricUnit: 'm',
    secondary: '48 min',
    state: 'planned',
  },
]

function GuideSection({
  id,
  title,
  pitch,
  children,
}: {
  id: string
  title: string
  pitch: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="title-section">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#737986]">{pitch}</p>
      </div>
      {children}
    </section>
  )
}

function ActionPair({ tone = 'outline' }: { tone?: 'outline' | 'filled' | 'ghost' }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        aria-label="Mark done"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition',
          tone === 'outline' && 'border border-[#d5d7d4] text-[#737986] hover:border-[#1b7a3d] hover:text-[#1b7a3d]',
          tone === 'ghost' && 'border border-[#e2e3e1] text-[#1b7a3d] hover:bg-[#f0faf4]',
          tone === 'filled' && 'bg-[#f0faf4] text-[#1b7a3d] hover:bg-[#e3f6ea]',
        )}
      >
        <Check className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        aria-label="Skip"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition',
          tone === 'outline' && 'border border-[#d5d7d4] text-[#737986] hover:border-[#b42318] hover:text-[#b42318]',
          tone === 'ghost' && 'border border-[#e2e3e1] text-[#b42318] hover:bg-[#fdf2f2]',
          tone === 'filled' && 'bg-[#fdf2f2] text-[#b42318] hover:bg-[#fce8e8]',
        )}
      >
        <X className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  )
}

/** A — Recreate your inspiration mock (reference) */
function VariantCurrent({ sample }: { sample: SampleCard }) {
  const completed = sample.state === 'partial' || sample.state === 'completed'
  const rail = completed ? '#86d39a' : sample.sportColor
  const iconTint = completed ? '#86d39a' : sample.sportColor
  return (
    <div
      className="rounded-[10px] border border-[#e2e3e1] px-4 py-3.5"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: rail,
        background: completed ? '#f0faf4' : '#ffffff',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
          style={{
            background: `color-mix(in srgb, ${iconTint} 12%, white)`,
            color: completed ? '#1b7a3d' : sample.sportColor,
          }}
        >
          <WorkoutSportIcon
            type={sample.sport}
            size="xs"
            appearance="outline"
            className="!h-auto !w-auto !border-0 !bg-transparent"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="title-card truncate">{sample.title}</p>
            {sample.source ? (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa0a8]">
                {sample.source}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[24px] font-extrabold leading-none tracking-tight text-[#111111]">
            {sample.metric}
            <span className="ml-1 text-[13px] font-semibold text-[#737986]">
              {sample.metricUnit}
            </span>
            {sample.metricDetail ? (
              <span className="ml-1 text-[13px] font-medium text-[#9aa0a8]">
                {sample.metricDetail}
              </span>
            ) : null}
          </p>
          {sample.secondary ? (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[#737986]">
              <Clock className="h-3 w-3" strokeWidth={2} />
              {sample.secondary}
            </p>
          ) : null}
        </div>
        {sample.state === 'planned' ? <ActionPair tone="outline" /> : null}
      </div>
    </div>
  )
}

/** B — Metric-first: number is the hero, title is support */
function VariantMetricFirst({ sample }: { sample: SampleCard }) {
  return (
    <div
      className="rounded-[10px] border border-[#e2e3e1] bg-white p-4"
      style={{ borderLeftWidth: 3, borderLeftColor: sample.sportColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: sample.sportColor }}
            />
            <p className="title-eyebrow truncate" style={{ color: sample.sportColor }}>
              {sample.sport === WorkoutType.RUN
                ? 'Run'
                : sample.sport === WorkoutType.SWIM
                  ? 'Swim'
                  : 'Strength'}
            </p>
          </div>
          <p className="mt-2 title-card">{sample.title}</p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[34px] font-extrabold leading-none tracking-tight text-[#111111]">
              {sample.metric}
            </span>
            <span className="text-[14px] font-semibold text-[#737986]">{sample.metricUnit}</span>
            {sample.metricDetail ? (
              <span className="text-[13px] text-[#9aa0a8]">{sample.metricDetail}</span>
            ) : null}
          </div>
          {sample.secondary ? (
            <p className="mt-2 text-[12px] text-[#737986]">{sample.secondary}</p>
          ) : null}
        </div>
        {sample.state === 'planned' ? <ActionPair tone="ghost" /> : null}
      </div>
    </div>
  )
}

/** C — Compact strip for multi-workout days */
function VariantStrip({ sample }: { sample: SampleCard }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[10px] border border-[#e2e3e1] bg-white py-3 pl-3 pr-3"
      style={{ borderLeftWidth: 3, borderLeftColor: sample.sportColor }}
    >
      <WorkoutSportIcon
        type={sample.sport}
        size="sm"
        className="h-9 w-9 rounded-[10px]"
      />
      <div className="min-w-0 flex-1">
        <p className="title-card truncate">{sample.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-[#737986]">
          {sample.secondary ?? sample.metricDetail ?? 'Planned'}
        </p>
      </div>
      <p className="shrink-0 text-right text-[18px] font-bold tabular-nums leading-none text-[#111111]">
        {sample.metric}
        <span className="ml-0.5 text-[11px] font-semibold text-[#737986]">
          {sample.metricUnit}
        </span>
      </p>
      {sample.state === 'planned' ? <ActionPair tone="ghost" /> : null}
    </div>
  )
}

/** D — Soft icon panel: sport tint only on the mark, card stays white */
function VariantIconPanel({ sample }: { sample: SampleCard }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e2e3e1] bg-white">
      <div className="flex">
        <div
          className="flex w-14 shrink-0 flex-col items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${sample.sportColor} 10%, white)`,
            color: sample.sportColor,
          }}
        >
          <WorkoutSportIcon
            type={sample.sport}
            size="xs"
            appearance="outline"
            className="!h-auto !w-auto !border-0 !bg-transparent"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="title-card truncate">{sample.title}</p>
            <p className="mt-1 text-[20px] font-extrabold leading-none tracking-tight text-[#111111]">
              {sample.metric}{' '}
              <span className="text-[12px] font-semibold text-[#737986]">
                {sample.metricUnit}
              </span>
            </p>
          </div>
          {sample.state === 'planned' ? <ActionPair tone="filled" /> : null}
          {sample.source && sample.state !== 'planned' ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa0a8]">
              {sample.source}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** E — Editorial: top sport rule, display-weight metric, quieter actions */
function VariantEditorial({ sample }: { sample: SampleCard }) {
  return (
    <div className="rounded-[10px] border border-[#e2e3e1] bg-white">
      <div className="h-[3px] rounded-t-[9px]" style={{ background: sample.sportColor }} />
      <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-3.5">
        <div className="min-w-0">
          <p className="title-eyebrow">{sample.title}</p>
          <p
            className="mt-1 text-[40px] font-bold leading-none tracking-tight text-[#111111]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {sample.metric}
            <span className="ml-1.5 align-baseline font-sans text-[14px] font-semibold text-[#737986]">
              {sample.metricUnit}
            </span>
          </p>
          {sample.secondary ? (
            <p className="mt-2 text-[12px] text-[#737986]">{sample.secondary} planned</p>
          ) : null}
        </div>
        {sample.state === 'planned' ? (
          <div className="flex flex-col gap-1.5 pb-0.5">
            <button
              type="button"
              className="rounded-full bg-[#111111] px-3.5 py-1.5 text-[11px] font-semibold text-white"
            >
              Done
            </button>
            <button
              type="button"
              className="rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-[#737986] hover:bg-[#f4f4f3]"
            >
              Skip
            </button>
          </div>
        ) : (
          <p className="pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1b7a3d]">
            Logged
          </p>
        )}
      </div>
    </div>
  )
}

/** F — Done-first: completed cards drop the planned slash, celebrate actual */
function VariantDoneFirst({ sample }: { sample: SampleCard }) {
  const done = sample.state !== 'planned'
  const showMetric = done ? sample.metric : sample.metric
  return (
    <div
      className={cn(
        'rounded-[10px] border px-5 py-4',
        done ? 'border-[#86d39a]/70 bg-[#f0faf4]' : 'border-[#e2e3e1] bg-white',
      )}
      style={!done ? { borderLeftWidth: 3, borderLeftColor: sample.sportColor } : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            background: done
              ? 'color-mix(in srgb, #86d39a 22%, white)'
              : `color-mix(in srgb, ${sample.sportColor} 10%, white)`,
            color: done ? '#1b7a3d' : sample.sportColor,
          }}
        >
          {done ? (
            <Check className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <WorkoutSportIcon
              type={sample.sport}
              size="xs"
              appearance="outline"
              className="!h-auto !w-auto !border-0 !bg-transparent"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="title-card truncate">{sample.title}</p>
          <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight text-[#111111]">
            {showMetric}
            <span className="ml-1 text-[13px] font-semibold text-[#737986]">
              {sample.metricUnit}
            </span>
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-[#737986]">
            {done ? 'Completed · no planned comparison' : 'Tap Done when finished'}
          </p>
        </div>
        {!done ? <ActionPair tone="filled" /> : null}
        {done && sample.source ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa0a8]">
            {sample.source}
          </span>
        ) : null}
      </div>
    </div>
  )
}

const VARIANTS = [
  {
    id: 'inspiration',
    title: 'A · Your inspiration',
    pitch:
      'Closest recreate of the mock: sport rail + soft icon tile, hero metric, grey outline Done/Skip, green wash + STRAVA for synced partials, secondary clock only when useful.',
    Component: VariantCurrent,
  },
  {
    id: 'metric-first',
    title: 'B · Metric-first',
    pitch:
      'Push the mock further: sport as a tiny eyebrow + dot, metric ~34px. Same samples, quieter ghost action rings.',
    Component: VariantMetricFirst,
  },
  {
    id: 'strip',
    title: 'C · Compact strip',
    pitch:
      'Same day with 3 sessions gets tall fast. Title left, number right — denser stack without losing Done/Skip.',
    Component: VariantStrip,
  },
  {
    id: 'icon-panel',
    title: 'D · Icon panel',
    pitch:
      'Sport tint only in a left panel (not a full wash). White body; identity stays strong without calendar-cell energy.',
    Component: VariantIconPanel,
  },
  {
    id: 'editorial',
    title: 'E · Editorial top rule',
    pitch:
      'Top sport bar instead of left rail + Barlow display metric. Text Done / Skip — clearer the first time someone uses home.',
    Component: VariantEditorial,
  },
  {
    id: 'done-first',
    title: 'F · Done-first states',
    pitch:
      'Planned keeps actions. Logged swaps icon for check + soft green. Optional: drop actual/planned slash when the athlete just needs “done.”',
    Component: VariantDoneFirst,
  },
] as const

export default function AthleteCardExplorationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#e2e3e1] pb-8">
        <div>
          <p className="title-eyebrow">Style guide</p>
          <h1 className="title-page mt-2">Athlete workout cards</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#737986]">
            Explorations from your Today mock (Recovery Run / Strength+Strava / OW Swim).
            Same TrainTrack tokens — Manrope, sport rails, white cards, 10px radius.
            Samples only; not wired into the live dashboard yet.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link
            href="/style-guide"
            className="text-[13px] font-semibold text-[#F4511E] underline-offset-2 hover:underline"
          >
            ← Style guide
          </Link>
          <Link
            href="/style-guide/workout-modal"
            className="text-[12px] font-medium text-[#737986] underline-offset-2 hover:underline"
          >
            Workout modal →
          </Link>
        </div>
      </div>

      <nav className="mb-12 flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <a
            key={v.id}
            href={`#${v.id}`}
            className="rounded-full border border-[#e2e3e1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#111111] hover:border-[#c9cbc7]"
          >
            {v.title}
          </a>
        ))}
      </nav>

      <div className="space-y-16">
        {VARIANTS.map(({ id, title, pitch, Component }) => (
          <GuideSection key={id} id={id} title={title} pitch={pitch}>
            <div className="grid gap-3 sm:grid-cols-1 lg:max-w-xl">
              {SAMPLES.map((sample) => (
                <Component key={`${id}-${sample.title}`} sample={sample} />
              ))}
            </div>
          </GuideSection>
        ))}

        <GuideSection
          id="recommendation"
          title="Suggestion"
          pitch="If we pick one direction to prototype on the live home page:"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[10px] border border-[#86d39a]/60 bg-[#f0faf4] p-5">
              <p className="title-eyebrow text-[#1b7a3d]">Lean toward</p>
              <ul className="mt-3 space-y-2 text-[13px] leading-snug text-[#111111]">
                <li>
                  Keep <strong>A</strong> as the base — the mock already works
                </li>
                <li>
                  Borrow from <strong>B</strong>: slightly larger metric, optional sport eyebrow
                </li>
                <li>
                  Use <strong>C</strong> density only when Today has 3+ sessions
                </li>
                <li>
                  Keep green wash + source label (STRAVA) for synced/partial like the mock
                </li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-[#f5a3a3]/70 bg-[#fdf2f2] p-5">
              <p className="title-eyebrow text-[#b42318]">Watch out</p>
              <ul className="mt-3 space-y-2 text-[13px] leading-snug text-[#111111]">
                <li>Nested borders inside the outer card</li>
                <li>Full sport-color washes on planned cards (green for done is enough)</li>
                <li>Uppercase workout titles</li>
                <li>Grey outline Done/Skip can be easy to miss — test or try E text actions</li>
              </ul>
            </div>
          </div>
        </GuideSection>
      </div>
    </div>
  )
}
