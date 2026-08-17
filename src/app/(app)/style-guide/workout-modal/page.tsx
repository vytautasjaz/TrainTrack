import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Activity,
  BarChart3,
  Bike,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  MapPin,
  MessageSquare,
  Waves,
  Wind,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkoutStructureChart } from '@/components/workout-builder/workout-structure-chart'
import { createSmartBlock } from '@/lib/workout-builder/smart-blocks'
import type { WorkoutStructure } from '@/lib/workout-builder/types'

type PhaseTone = 'warmup' | 'main' | 'cooldown'

const TONE: Record<
  PhaseTone,
  { accent: string; soft: string; border: string; label: string }
> = {
  warmup: {
    accent: '#16A34A',
    soft: '#F0FDF4',
    border: '#BBF7D0',
    label: 'Warm-up',
  },
  main: {
    accent: '#DC2626',
    soft: '#FEF2F2',
    border: '#FECACA',
    label: 'Main Set',
  },
  cooldown: {
    accent: '#2563EB',
    soft: '#EFF6FF',
    border: '#BFDBFE',
    label: 'Cool Down',
  },
}

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

function ModalShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-md overflow-hidden rounded-[14px] border border-[#e2e3e1] bg-white shadow-[0_12px_40px_rgba(17,17,17,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function ZonePill({
  children,
  color,
}: {
  children: ReactNode
  color: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, white)`,
      }}
    >
      {children}
    </span>
  )
}

function HardBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
      <Flame className="h-3 w-3" strokeWidth={2.25} />
      Hard
    </span>
  )
}

function IntervalStrip({ color }: { color: string }) {
  return (
    <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div
            className="rounded-md px-2 py-1 text-[10px] font-bold text-white"
            style={{ background: color }}
          >
            400 m
          </div>
          {i < 3 ? (
            <div className="flex flex-col items-center">
              <div
                className="h-px w-5 border-t border-dashed"
                style={{ borderColor: color }}
              />
              <span className="text-[9px] font-medium" style={{ color }}>
                90s
              </span>
            </div>
          ) : null}
        </div>
      ))}
      <span className="ml-1 text-[11px] font-semibold text-[#9aa0a8]">… ×15</span>
    </div>
  )
}

/** A — Approximate current production modal */
function VariantCurrent() {
  return (
    <ModalShell>
      <div className="border-b border-black/10 bg-gradient-to-b from-[#DBEAFE]/80 to-white px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] text-[#6B7280]">Saturday, 11 July 2026</p>
          <button type="button" className="rounded-md p-1 text-[#9aa0a8]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2196E8]/15 text-[#2196E8]">
            <Bike className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-[#111827]">VO2 Max Intervals</h3>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">Bike · Hard</p>
          </div>
        </div>
        <div className="mt-4 flex items-stretch">
          {(
            [
              ['Workout type', 'Hard'],
              ['Distance', '14.9', 'km'],
              ['Time', '1h 14m', ''],
            ] as const
          ).map(([label, value, unit], i) => (
            <div key={label} className="flex flex-1 items-stretch">
              {i > 0 ? <div className="w-px self-stretch bg-foreground/15" /> : null}
              <div className="flex flex-1 flex-col items-center px-2 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
                  {label}
                </span>
                <p className="mt-1.5 text-[20px] font-bold leading-none text-[#111827]">
                  {value}
                  {unit ? (
                    <span className="ml-0.5 text-[12px] font-semibold">{unit}</span>
                  ) : null}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
          Workout Details
        </p>
        {[
          { title: 'Warm Up', sub: '3.0 km @ Easy Pace', dur: '15 min', bar: 'bg-emerald-500' },
          {
            title: 'Intervals',
            sub: '15 x 400 m @ VO2 Pace',
            sub2: '90 sec jog recovery',
            dur: '44 min',
            bar: 'bg-red-500',
          },
          { title: 'Cool Down', sub: '2.0 km @ Easy Pace', dur: '10 min', bar: 'bg-blue-500' },
        ].map((row) => (
          <div
            key={row.title}
            className="flex gap-0 border-b border-[#e2e3e1]/80 py-3.5 last:border-0"
          >
            <div className={cn('w-1 shrink-0 self-stretch rounded-full', row.bar)} />
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pl-3.5">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[#111827]">{row.title}</p>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">{row.sub}</p>
                {'sub2' in row && row.sub2 ? (
                  <p className="mt-0.5 text-[13px] text-[#6B7280]">{row.sub2}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-[14px] font-semibold tabular-nums">{row.dur}</p>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

/** B — Inspiration mock: phase cards + interval strip */
function VariantInspiration() {
  return (
    <ModalShell className="bg-[#FAFAFA]">
      <div className="bg-white px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
              <Bike className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[20px] font-bold leading-tight text-[#111111]">
                  VO2 Max Intervals
                </h3>
                <HardBadge />
              </div>
              <p className="mt-1 text-[13px] text-[#737986]">Saturday, July 11</p>
            </div>
          </div>
          <button type="button" className="rounded-md p-1 text-[#9aa0a8]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-stretch rounded-[10px] border border-[#e2e3e1] bg-[#FAFAFA] py-3">
          {(
            [
              [MapPin, '14.9 km', 'Total Distance'],
              [Clock, '1h 14m', 'Total Time'],
              [BarChart3, '6.0 km', 'Quality Distance'],
            ] as const
          ).map(([Icon, value, label], i) => (
            <div key={label} className="flex flex-1 items-stretch">
              {i > 0 ? <div className="w-px self-stretch bg-[#e2e3e1]" /> : null}
              <div className="flex flex-1 flex-col items-center gap-1 px-2 text-center">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#737986]" strokeWidth={2} />
                  <span className="text-[15px] font-bold text-[#111111]">{value}</span>
                </div>
                <span className="text-[10px] font-medium text-[#9aa0a8]">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-5 pt-1">
        <PhaseCardInspiration
          tone="warmup"
          icon={<Activity className="h-4 w-4 text-white" strokeWidth={2.25} />}
          primary="3.0 km"
          detail="Easy Pace"
          zone="Zone 2"
          duration="~15 min"
        />
        <PhaseCardInspiration
          tone="main"
          icon={<Activity className="h-4 w-4 text-white" strokeWidth={2.25} />}
          primary="15 × 400 m"
          tags={['VO2 Pace', 'Zone 5']}
          note="90 sec jog recovery @ Easy Pace (Zone 2)"
          duration="~44 min"
          showIntervals
        />
        <PhaseCardInspiration
          tone="cooldown"
          icon={<Wind className="h-4 w-4 text-white" strokeWidth={2.25} />}
          primary="2.0 km"
          detail="Easy Pace"
          zone="Zone 2"
          duration="~10 min"
        />
      </div>
    </ModalShell>
  )
}

function PhaseCardInspiration({
  tone,
  icon,
  primary,
  detail,
  zone,
  tags,
  note,
  duration,
  showIntervals,
}: {
  tone: PhaseTone
  icon: ReactNode
  primary: string
  detail?: string
  zone?: string
  tags?: string[]
  note?: string
  duration: string
  showIntervals?: boolean
}) {
  const t = TONE[tone]
  return (
    <div
      className="rounded-[12px] border bg-white p-3.5"
      style={{
        borderColor: t.border,
        background: `color-mix(in srgb, ${t.soft} 70%, white)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: t.accent }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: t.accent }}
          >
            {t.label}
          </p>
          <p className="mt-0.5 text-[18px] font-bold leading-none text-[#111111]">{primary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {detail ? <span className="text-[12px] text-[#737986]">{detail}</span> : null}
            {zone ? <ZonePill color={t.accent}>{zone}</ZonePill> : null}
            {tags?.map((tag) => (
              <ZonePill key={tag} color={t.accent}>
                {tag}
              </ZonePill>
            ))}
          </div>
          {note ? <p className="mt-1.5 text-[12px] leading-snug text-[#737986]">{note}</p> : null}
          {showIntervals ? <IntervalStrip color={t.accent} /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-1" style={{ color: t.accent }}>
          <Clock className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="text-[12px] font-semibold">{duration}</span>
          <ChevronRight className="h-4 w-4 text-[#c9cbc7]" />
        </div>
      </div>
    </div>
  )
}

/** C — TrainTrack hybrid: white header, sport rail phases, no pastel washes */
function VariantHybrid() {
  return (
    <ModalShell>
      <div className="border-b border-[#e2e3e1] px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#2196E8]/12 text-[#2196E8]">
              <Bike className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-semibold leading-snug text-[#111111]">
                  VO2 Max Intervals
                </h3>
                <HardBadge />
              </div>
              <p className="mt-1 text-[13px] text-[#737986]">Saturday, July 11</p>
            </div>
          </div>
          <button type="button" className="rounded-md p-1 text-[#9aa0a8]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ['14.9 km', 'Distance'],
              ['1h 14m', 'Time'],
              ['6.0 km', 'Quality'],
            ] as const
          ).map(([value, label]) => (
            <div
              key={label}
              className="rounded-[10px] border border-[#e2e3e1] bg-[#fafaf8] px-2.5 py-2.5 text-center"
            >
              <p className="text-[16px] font-bold tabular-nums text-[#111111]">{value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-4">
        {(
          [
            {
              tone: 'warmup' as const,
              primary: '3.0 km',
              meta: 'Easy Pace · Zone 2',
              duration: '~15 min',
            },
            {
              tone: 'main' as const,
              primary: '15 × 400 m',
              meta: 'VO2 Pace · Zone 5',
              note: '90 sec jog recovery @ Easy',
              duration: '~44 min',
              intervals: true,
            },
            {
              tone: 'cooldown' as const,
              primary: '2.0 km',
              meta: 'Easy Pace · Zone 2',
              duration: '~10 min',
            },
          ] as const
        ).map((phase) => {
          const t = TONE[phase.tone]
          return (
            <div
              key={phase.tone}
              className="rounded-[10px] border border-[#e2e3e1] bg-white py-3 pl-0 pr-3"
              style={{ borderLeftWidth: 3, borderLeftColor: t.accent }}
            >
              <div className="flex items-start justify-between gap-3 pl-3.5">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: t.accent }}
                  >
                    {t.label}
                  </p>
                  <p className="mt-1 text-[18px] font-extrabold leading-none text-[#111111]">
                    {phase.primary}
                  </p>
                  <p className="mt-1.5 text-[12px] text-[#737986]">{phase.meta}</p>
                  {'note' in phase && phase.note ? (
                    <p className="mt-1 text-[12px] text-[#9aa0a8]">{phase.note}</p>
                  ) : null}
                  {'intervals' in phase && phase.intervals ? (
                    <IntervalStrip color={t.accent} />
                  ) : null}
                </div>
                <p
                  className="shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums"
                  style={{ color: t.accent }}
                >
                  {phase.duration}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ModalShell>
  )
}

/** D — Flat list with zone pills, denser (closer to current data, clearer badges) */
function VariantFlatPills() {
  return (
    <ModalShell>
      <div className="px-5 pb-3 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="title-eyebrow">Bike · Saturday, July 11</p>
            <h3 className="mt-1 text-[22px] font-bold text-[#111111]">VO2 Max Intervals</h3>
            <div className="mt-2">
              <HardBadge />
            </div>
          </div>
          <button type="button" className="rounded-md p-1 text-[#9aa0a8]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex gap-4 border-b border-[#e2e3e1] pb-4 text-[13px]">
          <div>
            <span className="font-bold text-[#111111]">14.9 km</span>
            <span className="ml-1 text-[#9aa0a8]">total</span>
          </div>
          <div>
            <span className="font-bold text-[#111111]">1h 14m</span>
            <span className="ml-1 text-[#9aa0a8]">time</span>
          </div>
          <div>
            <span className="font-bold text-[#111111]">6.0 km</span>
            <span className="ml-1 text-[#9aa0a8]">quality</span>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4">
        {(
          [
            {
              tone: 'warmup' as const,
              primary: '3.0 km',
              pills: ['Easy Pace', 'Zone 2'],
              duration: '15 min',
            },
            {
              tone: 'main' as const,
              primary: '15 × 400 m',
              pills: ['VO2 Pace', 'Zone 5'],
              note: '90s jog recovery @ Easy / Zone 2',
              duration: '44 min',
            },
            {
              tone: 'cooldown' as const,
              primary: '2.0 km',
              pills: ['Easy Pace', 'Zone 2'],
              duration: '10 min',
            },
          ] as const
        ).map((row) => {
          const t = TONE[row.tone]
          return (
            <div
              key={row.tone}
              className="flex gap-3 border-b border-[#e2e3e1] py-3.5 last:border-0"
            >
              <div
                className="mt-1 h-8 w-1 shrink-0 rounded-full"
                style={{ background: t.accent }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: t.accent }}>
                    {t.label}
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-[#111111]">
                    {row.duration}
                  </p>
                </div>
                <p className="mt-0.5 text-[17px] font-bold text-[#111111]">{row.primary}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {row.pills.map((p) => (
                    <ZonePill key={p} color={t.accent}>
                      {p}
                    </ZonePill>
                  ))}
                </div>
                {'note' in row && row.note ? (
                  <p className="mt-1.5 text-[12px] text-[#737986]">{row.note}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </ModalShell>
  )
}

/** Shared compact-row sample data */
const COMPACT_PHASES = [
  { title: 'Warm-up', body: '3.0 km easy · Zone 2', dur: '~15 min', phaseColor: '#16A34A' },
  { title: 'Main Set', body: '15 × 400 m VO2 · Zone 5', dur: '~44 min', phaseColor: '#DC2626' },
  { title: 'Cool Down', body: '2.0 km easy · Zone 2', dur: '~10 min', phaseColor: '#2563EB' },
] as const

type SportSample = {
  id: string
  label: string
  color: string
  title: string
  meta: string
  /** Pre-split metric chips: [value, label] */
  metrics: [string, string][]
  Icon: typeof Bike
}

const SPORT_SAMPLES: SportSample[] = [
  {
    id: 'bike',
    label: 'Bike',
    color: '#16B8A6',
    title: 'VO2 Max Intervals',
    meta: 'Sat 11 Jul · Hard',
    metrics: [
      ['14.9 km', 'total'],
      ['1h 14m', 'time'],
      ['6 km', 'quality'],
    ],
    Icon: Bike,
  },
  {
    id: 'run',
    label: 'Run',
    color: '#F4511E',
    title: 'Threshold Repeats',
    meta: 'Sun 12 Jul · Hard',
    metrics: [
      ['12.0 km', 'total'],
      ['58 min', 'time'],
      ['5 km', 'quality'],
    ],
    Icon: Activity,
  },
  {
    id: 'swim',
    label: 'Swim',
    color: '#1E9BDE',
    title: 'CSS Intervals',
    meta: 'Mon 13 Jul · Moderate',
    metrics: [
      ['3200 m', 'total'],
      ['52 min', 'time'],
    ],
    Icon: Waves,
  },
]

type CompactExpandOpts = {
  sport: SportSample
  /** How row accents are colored */
  rowAccent: 'phase' | 'sport' | 'sport-rail' | 'bar'
  /** Header treatment */
  header: 'soft' | 'sport-wash' | 'sport-rail' | 'top-bar'
  /** Show one row expanded with detail */
  expanded?: boolean
  /** Intensity pill in header */
  hardPill?: boolean
}

function CompactExpandModal({
  sport,
  rowAccent,
  header,
  expanded,
  hardPill,
}: CompactExpandOpts) {
  const { color, title, meta, metrics, Icon } = sport

  return (
    <ModalShell>
      <div
        className={cn(
          'border-b border-[#e2e3e1] px-5 py-4',
          header === 'soft' && 'bg-[#fafaf8]',
          header === 'sport-wash' && 'bg-white',
          header === 'top-bar' && 'bg-white',
          header === 'sport-rail' && 'bg-white',
        )}
        style={
          header === 'sport-wash'
            ? {
                background: `color-mix(in srgb, ${color} 7%, white)`,
                borderBottomColor: `color-mix(in srgb, ${color} 22%, white)`,
              }
            : header === 'sport-rail'
              ? { borderLeftWidth: 3, borderLeftColor: color }
              : undefined
        }
      >
        {header === 'top-bar' ? (
          <div className="-mx-5 -mt-4 mb-3 h-[3px]" style={{ background: color }} />
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background: `color-mix(in srgb, ${color} 12%, white)`,
                color,
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#111111]">{title}</h3>
                {hardPill ? <HardBadge /> : null}
              </div>
              <p className="mt-0.5 text-[12px] text-[#737986]">
                <span className="font-semibold" style={{ color }}>
                  {sport.label}
                </span>
                {' · '}
                {meta}
              </p>
            </div>
          </div>
          <button type="button" className="text-[#9aa0a8]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[13px] text-[#737986]">
          {metrics.map(([value, label], i) => (
            <span key={label}>
              {i > 0 ? ' · ' : null}
              <span className="font-semibold text-[#111111]">{value}</span>
              <span className="text-[#9aa0a8]"> {label}</span>
            </span>
          ))}
        </p>
      </div>

      <div
        className={cn(
          'divide-y divide-[#e2e3e1]',
          rowAccent === 'sport-rail' && 'border-l-[3px]',
        )}
        style={rowAccent === 'sport-rail' ? { borderLeftColor: color } : undefined}
      >
        {COMPACT_PHASES.map((row, index) => {
          const isOpen = Boolean(expanded && index === 1)
          const accent =
            rowAccent === 'phase'
              ? row.phaseColor
              : rowAccent === 'sport' || rowAccent === 'sport-rail' || rowAccent === 'bar'
                ? color
                : '#c9cbc7'

          return (
            <div key={row.title}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#fafaf8]"
              >
                {rowAccent === 'bar' ? (
                  <div
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ background: accent }}
                    aria-hidden
                  />
                ) : (
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: accent }}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#111111]">{row.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-[#737986]">{row.body}</p>
                </div>
                <span className="text-[12px] font-semibold tabular-nums text-[#737986]">
                  {row.dur}
                </span>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-[#c9cbc7] transition',
                    isOpen && 'rotate-90 text-[#737986]',
                  )}
                />
              </button>
              {isOpen ? (
                <div
                  className="border-t border-[#e2e3e1]/80 px-5 pb-4 pt-0"
                  style={{
                    background: `color-mix(in srgb, ${color} 4%, white)`,
                  }}
                >
                  <div className="ml-5 border-l-2 pl-3.5 pt-3" style={{ borderColor: color }}>
                    <div className="flex flex-wrap gap-1.5">
                      <ZonePill color={color}>VO2 Pace</ZonePill>
                      <ZonePill color="#DC2626">Zone 5</ZonePill>
                    </div>
                    <p className="mt-2 text-[12px] leading-snug text-[#737986]">
                      90 sec jog recovery @ Easy Pace (Zone 2)
                    </p>
                    <IntervalStrip color={color} />
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </ModalShell>
  )
}

/** E0 — Original compact rows (phase intensity dots) */
function VariantStackedExpand() {
  return (
    <CompactExpandModal
      sport={SPORT_SAMPLES[0]!}
      rowAccent="phase"
      header="soft"
    />
  )
}

const COMPACT_VARIANTS = [
  {
    id: 'e-sport-rail',
    title: 'E1 · Sport rail + sport dots',
    pitch:
      'Whole modal reads as one sport: left rail + header icon in bike/run/swim color. Phase rows share the sport accent (not green/red/blue intensity).',
    Component: () => (
      <CompactExpandModal
        sport={SPORT_SAMPLES[0]!}
        rowAccent="sport"
        header="sport-rail"
        hardPill
      />
    ),
  },
  {
    id: 'e-sport-wash',
    title: 'E2 · Soft sport wash header',
    pitch:
      'Light sport tint behind the header only. Rows use sport-colored dots. Totals stay quiet grey.',
    Component: () => (
      <CompactExpandModal
        sport={SPORT_SAMPLES[0]!}
        rowAccent="sport"
        header="sport-wash"
        hardPill
      />
    ),
  },
  {
    id: 'e-top-bar',
    title: 'E3 · Top sport bar',
    pitch:
      '3px sport bar on top (same language as editorial cards). Phase intensity dots kept so warm-up / main / cool stay distinct.',
    Component: () => (
      <CompactExpandModal
        sport={SPORT_SAMPLES[0]!}
        rowAccent="phase"
        header="top-bar"
        hardPill
      />
    ),
  },
  {
    id: 'e-list-rail',
    title: 'E4 · Sport rail on the list',
    pitch:
      'Header stays neutral; the expandable list gets a continuous sport edge. Feels like “the session body” belongs to the sport.',
    Component: () => (
      <CompactExpandModal
        sport={SPORT_SAMPLES[0]!}
        rowAccent="sport-rail"
        header="soft"
      />
    ),
  },
  {
    id: 'e-bars',
    title: 'E5 · Sport bars (not dots)',
    pitch:
      'Same compact rows, but each phase uses a short vertical sport bar — closer to plan cards, still one sport color.',
    Component: () => (
      <CompactExpandModal
        sport={SPORT_SAMPLES[0]!}
        rowAccent="bar"
        header="sport-rail"
        hardPill
      />
    ),
  },
  {
    id: 'e-expanded',
    title: 'E6 · One row expanded',
    pitch:
      'Same compact shell — Main Set open with zone pills + interval strip. Sport accent on the expand panel.',
    Component: () => (
      <CompactExpandModal
        sport={SPORT_SAMPLES[0]!}
        rowAccent="sport"
        header="sport-rail"
        hardPill
        expanded
      />
    ),
  },
] as const

function SportAccentGallery() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {SPORT_SAMPLES.map((sport) => (
        <div key={sport.id} className="space-y-2">
          <p className="title-eyebrow" style={{ color: sport.color }}>
            {sport.label}
          </p>
          <CompactExpandModal
            sport={sport}
            rowAccent="sport"
            header="sport-rail"
            hardPill={sport.id !== 'swim'}
          />
        </div>
      ))}
    </div>
  )
}

/* ─── Content shapes: same E1 shell, different real workout payloads ─── */

type ContentRow = {
  title: string
  body: string
  dur?: string
  detail?: ReactNode
}

type ContentShape = {
  id: string
  label: string
  pitch: string
  sportLabel: string
  color: string
  Icon: typeof Bike
  title: string
  meta: string
  hardPill?: boolean
  metrics: [string, string][]
  /** Compact expand rows — omit for note-only / free-text bodies */
  rows?: ContentRow[]
  /** Body when there is no builder structure */
  bodyMode?: 'coach-notes' | 'description' | 'metrics-only'
  coachNotes?: string
  description?: string
  /** Prefill one row expanded */
  expandedIndex?: number
  source?: string
  /** Real builder intensity profile under the header metrics */
  structure?: WorkoutStructure
  /** Where to place the diagram */
  diagramPlacement?: 'under-metrics' | 'above-rows'
}

/** Sample run VO₂ structure for the live WorkoutStructureChart */
const SAMPLE_RUN_VO2_STRUCTURE: WorkoutStructure = {
  warmup: [createSmartBlock('WARM_UP', 0, 'RUN')],
  mainSet: [createSmartBlock('VO2_MAX', 0, 'RUN')],
  cooldown: [createSmartBlock('COOL_DOWN', 0, 'RUN')],
  includeItems: [],
}

const SAMPLE_BIKE_THRESHOLD_STRUCTURE: WorkoutStructure = {
  warmup: [createSmartBlock('WARM_UP', 0, 'BIKE')],
  mainSet: [createSmartBlock('THRESHOLD', 0, 'BIKE')],
  cooldown: [createSmartBlock('COOL_DOWN', 0, 'BIKE')],
  includeItems: [],
}

const CONTENT_SHAPES: ContentShape[] = [
  {
    id: 'coach-notes-only',
    label: 'F1 · Coach notes only',
    pitch:
      'No builder structure — title, metrics, and a coach comment. Common for easy days and “just go do this.”',
    sportLabel: 'Run',
    color: '#F4511E',
    Icon: Activity,
    title: 'Easy aerobic',
    meta: 'Tue 14 Jul · Easy',
    metrics: [
      ['8 km', 'planned'],
      ['~45 min', 'time'],
    ],
    bodyMode: 'coach-notes',
    coachNotes:
      'Keep it conversational. If HR drifts above Z2, slow down — don’t chase pace. Finish feeling like you could do another loop.',
  },
  {
    id: 'description-only',
    label: 'F2 · Free-text description',
    pitch:
      'Strength / notes workouts often live in a description block instead of structure rows.',
    sportLabel: 'Strength',
    color: '#8B5CF6',
    Icon: Dumbbell,
    title: 'Full body strength',
    meta: 'Wed 15 Jul · Gym',
    metrics: [['60 min', 'planned']],
    bodyMode: 'description',
    description:
      'A1 Squats 4×6\nA2 Pull-ups 4×6\nB1 Romanian DL 3×8\nB2 Single-leg RDL 3×8/side\nC Core circuit 3 rounds · 40s on / 20s off',
  },
  {
    id: 'metrics-only',
    label: 'F3 · Metrics only',
    pitch:
      'Planned distance/time, nothing else. Modal stays short — no empty “Workout details” section.',
    sportLabel: 'Bike',
    color: '#16B8A6',
    Icon: Bike,
    title: 'Endurance spin',
    meta: 'Thu 16 Jul · Easy',
    metrics: [
      ['90 min', 'time'],
      ['~45 km', 'est.'],
    ],
    bodyMode: 'metrics-only',
  },
  {
    id: 'swim-builder',
    label: 'F4 · Swim builder',
    pitch:
      'Swim structure as compact expand rows (WU / Main / CD). Expand shows set lines, not run interval strips.',
    sportLabel: 'Swim',
    color: '#1E9BDE',
    Icon: Waves,
    title: 'CSS pace sets',
    meta: 'Fri 17 Jul · Pool',
    hardPill: true,
    metrics: [
      ['3200 m', 'total'],
      ['~55 min', 'time'],
    ],
    rows: [
      {
        title: 'Warm-up',
        body: '400 free + 4×50 drill',
        dur: '~12 min',
        detail: (
          <ul className="space-y-1 text-[12px] text-[#737986]">
            <li>400 m freestyle easy</li>
            <li>4 × 50 m drill / swim · 15s rest</li>
          </ul>
        ),
      },
      {
        title: 'Main Set',
        body: '8 × 200 @ CSS · 20s rest',
        dur: '~32 min',
        detail: (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <ZonePill color="#1E9BDE">CSS</ZonePill>
              <ZonePill color="#1E9BDE">20s rest</ZonePill>
            </div>
            <p className="text-[12px] text-[#737986]">
              Hold CSS. If pace slips &gt;3s/100 on the last two, stop the set.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className="rounded-md bg-[#1E9BDE] px-2 py-1 text-[10px] font-bold text-white"
                >
                  200 m
                </span>
              ))}
              <span className="self-center text-[11px] font-semibold text-[#9aa0a8]">… ×8</span>
            </div>
          </div>
        ),
      },
      {
        title: 'Cool Down',
        body: '200 easy choice',
        dur: '~5 min',
        detail: <p className="text-[12px] text-[#737986]">200 m easy · any stroke</p>,
      },
    ],
    expandedIndex: 1,
  },
  {
    id: 'swim-coach-notes',
    label: 'F5 · Swim + coach notes',
    pitch:
      'Open-water / simple swim without builder — meters + coach guidance only.',
    sportLabel: 'Swim',
    color: '#1E9BDE',
    Icon: Waves,
    title: 'OW continuous',
    meta: 'Sat 18 Jul · Open water',
    metrics: [
      ['3000 m', 'planned'],
      ['~48 min', 'time'],
    ],
    bodyMode: 'coach-notes',
    coachNotes:
      'Sight every 8–10 strokes. Keep effort steady — this is aerobic, not a race. If choppy, shorten to 2500 m and call it done.',
  },
  {
    id: 'builder-plus-notes',
    label: 'F6 · Builder + coach notes',
    pitch:
      'Structured session with an extra coach comment under the rows — both need to coexist cleanly.',
    sportLabel: 'Run',
    color: '#F4511E',
    Icon: Activity,
    title: 'Threshold 5×1k',
    meta: 'Sun 19 Jul · Hard',
    hardPill: true,
    metrics: [
      ['11 km', 'total'],
      ['~58 min', 'time'],
      ['5 km', 'quality'],
    ],
    rows: [
      { title: 'Warm-up', body: '2 km easy · strides', dur: '~12 min' },
      {
        title: 'Main Set',
        body: '5 × 1 km @ T · 90s jog',
        dur: '~32 min',
        detail: (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <ZonePill color="#F4511E">Threshold</ZonePill>
              <ZonePill color="#DC2626">Zone 4</ZonePill>
            </div>
            <p className="text-[12px] text-[#737986]">90 sec jog recovery between reps</p>
          </div>
        ),
      },
      { title: 'Cool Down', body: '2 km easy', dur: '~12 min' },
    ],
    coachNotes:
      'If the 4th rep is already fading, cut the 5th — quality over volume this week.',
    expandedIndex: 1,
  },
  {
    id: 'completed-strava',
    label: 'F7 · Completed + Strava',
    pitch:
      'Logged session: green completion cue, source label, actual vs planned when useful.',
    sportLabel: 'Run',
    color: '#F4511E',
    Icon: Activity,
    title: 'Recovery Run',
    meta: 'Mon 20 Jul · Done',
    metrics: [
      ['5.2 km', 'actual'],
      ['28 min', 'time'],
    ],
    bodyMode: 'coach-notes',
    coachNotes: 'Nice and easy — exactly what we wanted.',
    source: 'STRAVA',
  },
  {
    id: 'self-added',
    label: 'F8 · Self-added',
    pitch:
      'Athlete logged outside the plan — no expand rows, clear self-added signal, metrics only.',
    sportLabel: 'Bike',
    color: '#16B8A6',
    Icon: Bike,
    title: 'Commute + coffee spin',
    meta: 'Tue 21 Jul · Self-added',
    metrics: [
      ['22 km', 'logged'],
      ['54 min', 'time'],
    ],
    bodyMode: 'metrics-only',
  },
  {
    id: 'builder-diagram',
    label: 'F9 · Builder + diagram',
    pitch:
      'Structured run with the real intensity profile chart under totals, then compact expand rows. Diagram answers “what does this session look like?” at a glance.',
    sportLabel: 'Run',
    color: '#F4511E',
    Icon: Activity,
    title: 'VO2 Max Intervals',
    meta: 'Wed 22 Jul · Hard',
    hardPill: true,
    metrics: [
      ['12 km', 'total'],
      ['~58 min', 'time'],
      ['6 km', 'quality'],
    ],
    structure: SAMPLE_RUN_VO2_STRUCTURE,
    diagramPlacement: 'under-metrics',
    rows: [
      {
        title: 'Warm-up',
        body: '3.0 km easy · Zone 2',
        dur: '~15 min',
      },
      {
        title: 'Main Set',
        body: '15 × 400 m @ VO2 · 90s jog',
        dur: '~44 min',
        detail: (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <ZonePill color="#F4511E">VO2 Pace</ZonePill>
              <ZonePill color="#DC2626">Zone 5</ZonePill>
            </div>
            <p className="text-[12px] text-[#737986]">
              90 sec jog recovery @ Easy Pace (Zone 2)
            </p>
            <IntervalStrip color="#F4511E" />
          </div>
        ),
      },
      {
        title: 'Cool Down',
        body: '2.0 km easy · Zone 2',
        dur: '~10 min',
      },
    ],
    expandedIndex: 1,
  },
  {
    id: 'builder-diagram-panel',
    label: 'F10 · Diagram as its own panel',
    pitch:
      'Same chart, but as a labeled “Session profile” block between header and rows — clearer when metrics and structure both compete for attention.',
    sportLabel: 'Bike',
    color: '#16B8A6',
    Icon: Bike,
    title: 'Threshold intervals',
    meta: 'Thu 23 Jul · Hard',
    hardPill: true,
    metrics: [
      ['90 min', 'time'],
      ['~48 km', 'est.'],
    ],
    structure: SAMPLE_BIKE_THRESHOLD_STRUCTURE,
    diagramPlacement: 'above-rows',
    rows: [
      { title: 'Warm-up', body: '15 min easy spin', dur: '~15 min' },
      {
        title: 'Main Set',
        body: '4 × 8 min @ threshold · 4 min easy',
        dur: '~48 min',
        detail: (
          <div className="flex flex-wrap gap-1.5">
            <ZonePill color="#16B8A6">Threshold</ZonePill>
            <ZonePill color="#16B8A6">Zone 4</ZonePill>
          </div>
        ),
      },
      { title: 'Cool Down', body: '10 min easy', dur: '~10 min' },
    ],
  },
  {
    id: 'builder-diagram-collapsed',
    label: 'F11 · Diagram, rows collapsed',
    pitch:
      'First open: chart visible, all phase rows closed. Athlete sees the shape before diving into set text.',
    sportLabel: 'Run',
    color: '#F4511E',
    Icon: Activity,
    title: 'VO2 Max Intervals',
    meta: 'Fri 24 Jul · Hard',
    hardPill: true,
    metrics: [
      ['12 km', 'total'],
      ['~58 min', 'time'],
    ],
    structure: SAMPLE_RUN_VO2_STRUCTURE,
    diagramPlacement: 'under-metrics',
    rows: [
      { title: 'Warm-up', body: '3.0 km easy · Zone 2', dur: '~15 min' },
      { title: 'Main Set', body: '15 × 400 m @ VO2 · 90s jog', dur: '~44 min' },
      { title: 'Cool Down', body: '2.0 km easy · Zone 2', dur: '~10 min' },
    ],
  },
]

function ContentShapeModal({ shape }: { shape: ContentShape }) {
  const {
    color,
    Icon,
    title,
    meta,
    hardPill,
    metrics,
    rows,
    bodyMode,
    coachNotes,
    description,
    expandedIndex,
    source,
    sportLabel,
    structure,
    diagramPlacement = 'under-metrics',
  } = shape

  const isDone = meta.toLowerCase().includes('done')
  const isSelf = meta.toLowerCase().includes('self-added')

  const diagram =
    structure != null ? (
      <div className="space-y-1.5">
        {diagramPlacement === 'above-rows' ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            Session profile
          </p>
        ) : null}
        <WorkoutStructureChart
          structure={structure}
          size="md"
          showCaption
          tone="default"
        />
      </div>
    ) : null

  return (
    <ModalShell>
      <div
        className="border-b border-[#e2e3e1] bg-white px-5 py-4"
        style={{
          borderLeftWidth: 3,
          borderLeftColor: isDone ? '#86d39a' : color,
          background: isDone
            ? '#f0faf4'
            : isSelf
              ? 'color-mix(in srgb, #F4511E 4%, white)'
              : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background: `color-mix(in srgb, ${isDone ? '#86d39a' : color} 12%, white)`,
                color: isDone ? '#1b7a3d' : color,
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#111111]">{title}</h3>
                {hardPill ? <HardBadge /> : null}
                {isSelf ? (
                  <span className="rounded-full bg-[#FFF1EB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F4511E]">
                    Self-added
                  </span>
                ) : null}
                {source ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa0a8]">
                    {source}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-[#737986]">
                <span className="font-semibold" style={{ color: isDone ? '#1b7a3d' : color }}>
                  {sportLabel}
                </span>
                {' · '}
                {meta}
              </p>
            </div>
          </div>
          <button type="button" className="text-[#9aa0a8]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[13px] text-[#737986]">
          {metrics.map(([value, label], i) => (
            <span key={label}>
              {i > 0 ? ' · ' : null}
              <span className="font-semibold text-[#111111]">{value}</span>
              <span className="text-[#9aa0a8]"> {label}</span>
            </span>
          ))}
        </p>
        {diagram && diagramPlacement === 'under-metrics' ? (
          <div className="mt-4">{diagram}</div>
        ) : null}
      </div>

      {diagram && diagramPlacement === 'above-rows' ? (
        <div className="border-b border-[#e2e3e1] px-5 py-3.5">{diagram}</div>
      ) : null}

      {rows && rows.length > 0 ? (
        <div className="divide-y divide-[#e2e3e1]">
          {rows.map((row, index) => {
            const isOpen = expandedIndex === index
            return (
              <div key={row.title}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#fafaf8]"
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[#111111]">{row.title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[#737986]">{row.body}</p>
                  </div>
                  {row.dur ? (
                    <span className="text-[12px] font-semibold tabular-nums text-[#737986]">
                      {row.dur}
                    </span>
                  ) : null}
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-[#c9cbc7] transition',
                      isOpen && 'rotate-90 text-[#737986]',
                    )}
                  />
                </button>
                {isOpen && row.detail ? (
                  <div
                    className="border-t border-[#e2e3e1]/80 px-5 pb-4"
                    style={{
                      background: `color-mix(in srgb, ${color} 4%, white)`,
                    }}
                  >
                    <div
                      className="ml-5 border-l-2 pl-3.5 pt-3"
                      style={{ borderColor: color }}
                    >
                      {row.detail}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {bodyMode === 'coach-notes' && coachNotes ? (
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            <MessageSquare className="h-3 w-3" strokeWidth={2.25} />
            Coach notes
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#111111]">
            {coachNotes}
          </p>
        </div>
      ) : null}

      {bodyMode === 'description' && description ? (
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            Session plan
          </p>
          <p className="mt-2 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#111111]">
            {description}
          </p>
        </div>
      ) : null}

      {bodyMode === 'metrics-only' ? (
        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-[#9aa0a8]">
            No structured sets — just the planned metrics above.
          </p>
        </div>
      ) : null}

      {/* Coach notes under builder rows */}
      {!bodyMode && coachNotes ? (
        <div className="border-t border-[#e2e3e1] px-5 py-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
            <MessageSquare className="h-3 w-3" strokeWidth={2.25} />
            Coach notes
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#111111]">
            {coachNotes}
          </p>
        </div>
      ) : null}
    </ModalShell>
  )
}

function ContentShapesGallery() {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {CONTENT_SHAPES.map((shape) => (
        <div key={shape.id} id={shape.id} className="scroll-mt-8 space-y-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#111111]">{shape.label}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#737986]">{shape.pitch}</p>
          </div>
          <ContentShapeModal shape={shape} />
        </div>
      ))}
    </div>
  )
}

const VARIANTS = [
  {
    id: 'current',
    title: 'A · Current modal',
    pitch:
      'What athletes roughly see today: sport gradient hero, intensity/distance/time columns, then a flat timeline of blocks with a thin accent bar.',
    Component: VariantCurrent,
  },
  {
    id: 'inspiration',
    title: 'B · Your inspiration',
    pitch:
      'Closest recreate of the mock: circular sport mark, Hard pill, three summary metrics, and warm-up / main / cool-down cards with zone pills + interval strip.',
    Component: VariantInspiration,
  },
  {
    id: 'hybrid',
    title: 'C · TrainTrack hybrid',
    pitch:
      'Same structure as the mock, adapted to our system: white header, metric tiles, left sport/phase rails, no full pastel card washes. Interval strip kept for main set.',
    Component: VariantHybrid,
  },
  {
    id: 'flat-pills',
    title: 'D · Flat + zone pills',
    pitch:
      'Keeps a list (fast to scan, easy to build from structure data) but borrows zone/pace pills and clearer phase labels from the mock.',
    Component: VariantFlatPills,
  },
  {
    id: 'stacked',
    title: 'E · Compact expand rows',
    pitch:
      'Starting point you liked — minimal rows, tap to expand. Below: sport-accent variations on the same idea.',
    Component: VariantStackedExpand,
  },
] as const

export default function WorkoutModalExplorationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#e2e3e1] pb-8">
        <div>
          <p className="title-eyebrow">Style guide</p>
          <h1 className="title-page mt-2">Workout detail modal</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#737986]">
            Focus: compact expand-row layouts (family E) with sport accents. Earlier A–D kept
            for comparison. Samples only — not wired to live data.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <Link
            href="/style-guide"
            className="text-[13px] font-semibold text-[#F4511E] underline-offset-2 hover:underline"
          >
            ← Style guide
          </Link>
          <Link
            href="/style-guide/athlete-cards"
            className="text-[12px] font-medium text-[#737986] underline-offset-2 hover:underline"
          >
            Athlete cards (kept)
          </Link>
        </div>
      </div>

      <nav className="mb-12 flex flex-wrap gap-2">
        {[
          ...VARIANTS.map((v) => ({ id: v.id, title: v.title })),
          ...COMPACT_VARIANTS.map((v) => ({ id: v.id, title: v.title })),
          { id: 'e-sports', title: 'E7 · By sport' },
          { id: 'content-shapes', title: 'F · Content shapes' },
          ...CONTENT_SHAPES.map((s) => ({ id: s.id, title: s.label })),
          { id: 'recommendation', title: 'Suggestion' },
        ].map((v) => (
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
            <Component />
          </GuideSection>
        ))}

        {COMPACT_VARIANTS.map(({ id, title, pitch, Component }) => (
          <GuideSection key={id} id={id} title={title} pitch={pitch}>
            <div className="max-w-md">
              <Component />
            </div>
          </GuideSection>
        ))}

        <GuideSection
          id="e-sports"
          title="E7 · Same layout, sport color"
          pitch="Bike teal · Run orange · Swim blue — same compact expand pattern; only the accent changes with sport."
        >
          <SportAccentGallery />
        </GuideSection>

        <GuideSection
          id="content-shapes"
          title="F · Content shapes"
          pitch="Same E1 shell (sport rail + compact rows), but different real payloads — coach notes only, free-text strength, swim builder, completed/Strava, self-added, and builder sessions with the intensity diagram."
        >
          <ContentShapesGallery />
        </GuideSection>

        <GuideSection
          id="recommendation"
          title="Suggestion"
          pitch="Building on compact expand rows with sport accent:"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[10px] border border-[#86d39a]/60 bg-[#f0faf4] p-5">
              <p className="title-eyebrow text-[#1b7a3d]">Lean toward</p>
              <ul className="mt-3 space-y-2 text-[13px] leading-snug text-[#111111]">
                <li>
                  <strong>E1 or E2</strong> — sport identity on the shell, not competing
                  phase pastels
                </li>
                <li>
                  Keep phase labels (Warm-up / Main / Cool) in text; use{' '}
                  <strong>sport color</strong> for rail/icon/dots
                </li>
                <li>
                  <strong>E6</strong> expand pattern for interval detail (pills + strip)
                </li>
                <li>
                  For builder workouts: show <strong>F9/F11</strong> intensity diagram under
                  metrics — skip it when there’s no structure
                </li>
                <li>
                  Optional: keep tiny phase-tint only on the open panel, not every row
                </li>
              </ul>
            </div>
            <div className="rounded-[10px] border border-[#f5a3a3]/70 bg-[#fdf2f2] p-5">
              <p className="title-eyebrow text-[#b42318]">Watch out</p>
              <ul className="mt-3 space-y-2 text-[13px] leading-snug text-[#111111]">
                <li>
                  Mixing sport accent + green/red/blue phase dots can feel busy (E3 is the
                  compromise)
                </li>
                <li>Don’t open every row by default — one expanded max on first open</li>
                <li>Swim meters / strength duration still need the same row template</li>
                <li>
                  Empty states: metrics-only and coach-notes-only should not invent fake
                  Warm-up/Main/Cool rows
                </li>
              </ul>
            </div>
          </div>
        </GuideSection>
      </div>
    </div>
  )
}
