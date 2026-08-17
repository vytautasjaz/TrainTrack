import type { CSSProperties } from 'react'
import Link from 'next/link'
import { TrainTrackLogo, TrainTrackMark } from '@/components/brand/traintrack-logo'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { PriorityBadge } from '@/components/races/priority-badge'
import { SportDot } from '@/components/ui/sport-dot'
import { TablePosterHeading } from '@/components/ui/table-poster-heading'
import { WorkoutBlock } from '@/components/workout-block'
import { WorkoutSportIcon } from '@/components/plan/workout-sport-icon'
import {
  DATA_CELL_PRIMARY,
  DATA_CELL_SECONDARY,
  DATA_NUM,
  DATA_TABLE,
  DATA_TABLE_SHELL,
} from '@/lib/table-styles'
import { SessionType, WorkoutStatus, WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { getWorkoutCompletionPercent } from '@/lib/workout-card'
import { cn } from '@/lib/utils'

const TOC = [
  { id: 'principles', label: 'Principles' },
  { id: 'brand', label: 'Brand' },
  { id: 'color', label: 'Color' },
  { id: 'typography', label: 'Typography' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'sport', label: 'Sport accents' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'tables', label: 'Tables' },
  { id: 'rules', label: 'Rules' },
] as const

function GuideSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-5">
      <div>
        <h2 className="title-section">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#737986]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function SpecCard({
  label,
  className,
  children,
  note,
}: {
  label: string
  className?: string
  children: React.ReactNode
  note?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[10px] border border-[#e2e3e1] bg-white p-5',
        className,
      )}
    >
      <p className="title-eyebrow">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
      {note ? <p className="text-[12px] leading-snug text-[#737986]">{note}</p> : null}
    </div>
  )
}

function Swatch({
  name,
  value,
  className,
  textClassName,
}: {
  name: string
  value: string
  className: string
  textClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex h-[4.5rem] flex-col justify-end rounded-[8px] border border-[#e2e3e1] p-2.5',
        className,
      )}
    >
      <p className={cn('text-[11px] font-semibold', textClassName)}>{name}</p>
      <p className={cn('text-[10px] tabular-nums opacity-80', textClassName)}>{value}</p>
    </div>
  )
}

function sampleWorkout(
  overrides: Partial<PlanWorkoutDetail> & Pick<PlanWorkoutDetail, 'id' | 'title' | 'status' | 'type'>,
): PlanWorkoutDetail {
  return {
    dateKey: '2026-08-11',
    sessionType: SessionType.CUSTOM,
    description: null,
    plannedDistance: 50.1,
    plannedDistanceMeters: null,
    plannedDuration: 90,
    swimEnvironment: null,
    coachNotes: null,
    structure: null,
    swimStructure: null,
    selfLogged: false,
    result: null,
    tags: [],
    isRace: false,
    ...overrides,
  }
}

const plannedBike = sampleWorkout({
  id: 'sg-bike',
  title: 'Easy Ride',
  type: WorkoutType.BIKE,
  status: WorkoutStatus.PLANNED,
  sessionType: SessionType.CUSTOM,
})

const completedRun = sampleWorkout({
  id: 'sg-run',
  title: 'Recovery Run',
  type: WorkoutType.RUN,
  status: WorkoutStatus.COMPLETED,
  sessionType: SessionType.RECOVERY_RUN,
  plannedDistance: 5,
  plannedDuration: 28,
  result: {
    actualDistance: 3.8,
    actualDuration: 28,
    rpe: null,
    athleteNotes: null,
    coachReply: null,
    coachReplyReadAt: null,
    stravaActivityUrl: null,
    logType: null,
  },
})

const skippedSwim = sampleWorkout({
  id: 'sg-swim',
  title: 'Lazdynai – speed',
  type: WorkoutType.SWIM,
  status: WorkoutStatus.SKIPPED,
  sessionType: SessionType.INTERVALS,
  plannedDistance: null,
  plannedDistanceMeters: 2850,
  plannedDuration: 45,
})

export default function StyleGuidePage() {
  return (
    <div className="-mx-4 min-h-full bg-[#fafaf8] px-4 pb-16 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1100px] pt-6 lg:pt-8">
        <header className="mb-10 space-y-3">
          <p className="title-eyebrow">TrainTrack · Design system</p>
          <h1 className="title-display">STYLE GUIDE.</h1>
          <p className="max-w-xl text-sm leading-relaxed text-[#737986]">
            Premium endurance product UI with restrained editorial accents. Choose styles by
            semantic role — not by page. ~10% Barlow Condensed · ~90% Manrope.
          </p>
          <p className="text-[12px] text-[#737986]">
            Also see{' '}
            <Link href="/design-preview" className="font-semibold text-[#111111] underline-offset-2 hover:underline">
              /design-preview
            </Link>{' '}
            for component lab samples,{' '}
            <Link
              href="/style-guide/athlete-cards"
              className="font-semibold text-[#111111] underline-offset-2 hover:underline"
            >
              /style-guide/athlete-cards
            </Link>{' '}
            for Today cards, and{' '}
            <Link
              href="/style-guide/workout-modal"
              className="font-semibold text-[#111111] underline-offset-2 hover:underline"
            >
              /style-guide/workout-modal
            </Link>{' '}
            for workout detail modal explorations.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-12">
          <nav className="hidden lg:block">
            <div className="sticky top-6 space-y-1">
              <p className="title-eyebrow mb-3">On this page</p>
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-[6px] px-2 py-1.5 text-[13px] font-medium text-[#737986] transition hover:bg-black/[0.03] hover:text-[#111111]"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="min-w-0 space-y-14">
            <GuideSection
              id="principles"
              title="Principles"
              description="The TrainTrack look is TrainingPeaks usefulness × editorial sports restraint × Linear precision — not a clone of any of them."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Semantic typography', 'Role decides the style. Same role → same type everywhere.'],
                  ['White on warm off-white', 'Page #FAFAF8 · cards #FFFFFF · borders ~#E2E3E1.'],
                  ['Sport as accent', 'Left borders, icons, thin bars — never large fills.'],
                  ['Almost no shadow', 'Hierarchy from type, space, and thin borders.'],
                  ['10% editorial', 'Barlow only for page/section titles. Manrope for UI.'],
                  ['One orange word', 'Max one accent word on a major editorial title.'],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="rounded-[10px] border border-[#e2e3e1] bg-white px-4 py-3.5"
                  >
                    <p className="title-card">{t}</p>
                    <p className="mt-1 text-[13px] leading-snug text-[#737986]">{d}</p>
                  </div>
                ))}
              </div>
            </GuideSection>

            <GuideSection
              id="brand"
              title="Brand"
              description="Classic Apex mark + Manrope wordmark. Sidebar logo links Home."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <SpecCard label="Mark + wordmark" note="Light surfaces">
                  <TrainTrackLogo markClassName="h-10 w-10" />
                </SpecCard>
                <SpecCard label="Mark only" note="Collapsed sidebar / app icon">
                  <TrainTrackMark className="h-12 w-12" />
                </SpecCard>
              </div>
            </GuideSection>

            <GuideSection
              id="color"
              title="Color"
              description="Black / warm-white base. Brand orange #F4511E used sparingly."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Swatch name="Page" value="#FAFAF8" className="bg-[#fafaf8]" />
                <Swatch name="Card" value="#FFFFFF" className="bg-white" />
                <Swatch name="Text" value="#111111" className="bg-[#111111]" textClassName="text-white" />
                <Swatch
                  name="Secondary"
                  value="#737986"
                  className="bg-[#737986]"
                  textClassName="text-white"
                />
                <Swatch
                  name="Border"
                  value="#E2E3E1"
                  className="bg-[#e2e3e1]"
                />
                <Swatch
                  name="Brand"
                  value="#F4511E"
                  className="bg-[#f4511e]"
                  textClassName="text-white"
                />
                <Swatch
                  name="Completed"
                  value="#F0FAF4"
                  className="bg-[#f0faf4] border-[#86d39a]"
                />
                <Swatch
                  name="Skipped"
                  value="#FDF2F2"
                  className="bg-[#fdf2f2] border-[#f5a3a3]"
                />
              </div>
            </GuideSection>

            <GuideSection
              id="typography"
              title="Typography"
              description="Classes: title-display · title-page · title-section · title-eyebrow · title-card · title-day. Helpers in typography.tsx. Barlow only on Level 1 display."
            >
              <div className="grid gap-4">
                <SpecCard
                  label="Level 1 · Display"
                  note="Barlow Condensed · single color · ~20–26px · Home + Season Plan"
                >
                  <h1 className="title-display">PLAN THE SEASON.</h1>
                  <h1 className="title-display mt-4">GOOD EVENING, VYTAUTAS.</h1>
                </SpecCard>

                <SpecCard
                  label="Level 1 · Page"
                  note="Manrope · functional page H1 · ~20–26px · Training, Results, Stats, Tools"
                >
                  <h1 className="title-page">Training</h1>
                </SpecCard>

                <SpecCard
                  label="Level 2 · Section"
                  note="Manrope · 16px · not italic · uppercase"
                >
                  <h2 className="title-section">Upcoming</h2>
                  <h2 className="title-section mt-3">Today's workout</h2>
                  <h2 className="title-section mt-3">This week</h2>
                </SpecCard>

                <div className="grid gap-4 sm:grid-cols-3">
                  <SpecCard label="Level 3 · Eyebrow" note="Metadata / KPI labels">
                    <p className="title-eyebrow">Next race</p>
                    <p className="mt-3 title-card">Molėtų triatlonas</p>
                    <p className="mt-1 text-[2rem] font-extrabold tracking-tight text-[#111111]">
                      11{' '}
                      <span className="text-base font-bold text-[#737986]">days to go</span>
                    </p>
                  </SpecCard>
                  <SpecCard label="Level 4 · Card" note="Sentence case always">
                    <p className="title-card">Easy Ride</p>
                    <p className="mt-1 text-[13px] text-[#8a8f98]">Bike · Easy</p>
                  </SpecCard>
                  <SpecCard label="Day label" note="Home upcoming groups">
                    <p className="title-day">Wednesday 12 Aug</p>
                  </SpecCard>
                </div>
              </div>
            </GuideSection>

            <GuideSection
              id="surfaces"
              title="Surfaces"
              description="Radii: cards 10–12px · buttons/inputs 8px · icon wells 10px · pills 999px. Shadows almost never."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[10px] border border-[#e2e3e1] bg-white p-5">
                  <p className="title-card">Dashboard card</p>
                  <p className="mt-2 text-[13px] text-[#737986]">
                    white · 1px #E2E3E1 · radius 10px · no shadow
                  </p>
                </div>
                <div
                  className="rounded-[10px] border border-[#e2e3e1] bg-white p-5"
                  style={{ borderLeft: '3px solid #12b8a6' }}
                >
                  <p className="title-card">Today workout</p>
                  <p className="mt-2 text-[13px] text-[#737986]">
                    sport left edge · white fill · no gradient wash
                  </p>
                </div>
                <div className="overflow-hidden rounded-[10px] border border-[#e3e4e2] bg-white">
                  <div
                    className="border-b border-[#eeeeec] px-4 py-3"
                    style={{ borderLeft: '3px solid #f4511e' }}
                  >
                    <p className="title-card">Upcoming row</p>
                  </div>
                  <div
                    className="px-4 py-3"
                    style={{ borderLeft: '3px solid #8b5cf6' }}
                  >
                    <p className="title-card">Stacked same day</p>
                  </div>
                </div>
              </div>
            </GuideSection>

            <GuideSection id="buttons" title="Buttons">
              <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#e2e3e1] bg-white p-5">
                <button type="button" className="tt-dashboard-log-btn">
                  Log workout
                </button>
                <Button variant="brand">Brand</Button>
                <Button>Accent</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </GuideSection>

            <GuideSection
              id="sport"
              title="Sport accents"
              description="Use for icons, thin borders, and progress fills — never as large card backgrounds."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(
                  [
                    ['Run', WorkoutType.RUN, '#F4511E'],
                    ['Bike', WorkoutType.BIKE, '#12B8A6'],
                    ['Swim', WorkoutType.SWIM, '#2196E8'],
                    ['Strength', WorkoutType.STRENGTH, '#8B5CF6'],
                    ['Triathlon', WorkoutType.TRIATHLON, '#7C5CE6'],
                    ['Hyrox', WorkoutType.HYROX, '#F4511E'],
                  ] as const
                ).map(([label, type, hex]) => (
                  <div
                    key={label}
                    className="flex flex-col items-start gap-2.5 rounded-[10px] border border-[#e2e3e1] bg-white p-4"
                  >
                    <WorkoutSportIcon type={type} size="sm" className="h-[38px] w-[38px] rounded-[10px]" />
                    <div>
                      <p className="title-card">{label}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-[#737986]">
                        <SportDot sport={type} dotOnly />
                        {hex}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="planned">Planned</StatusPill>
                <StatusPill tone="watching">Watching</StatusPill>
                <StatusPill tone="completed">Completed</StatusPill>
                <PriorityBadge priority="A" />
                <PriorityBadge priority="B" />
                <PriorityBadge priority="C" />
              </div>
            </GuideSection>

            <GuideSection
              id="workouts"
              title="Workouts"
              description="Shared WorkoutBlock across sizes. Color: sport rail + sport fill. Plain: sport rail + white. Completion: green/% rail + green fill · red rail + red fill · sport rail + white unmarked."
            >
              <p className="text-[13px] text-[#737986]">
                Exploring athlete home cards? See{' '}
                <Link
                  href="/style-guide/athlete-cards"
                  className="font-semibold text-[#F4511E] underline-offset-2 hover:underline"
                >
                  Athlete workout card explorations →
                </Link>
                {' · '}
                Detail modal?{' '}
                <Link
                  href="/style-guide/workout-modal"
                  className="font-semibold text-[#F4511E] underline-offset-2 hover:underline"
                >
                  Workout modal explorations →
                </Link>
              </p>
              <div className="grid gap-4 lg:grid-cols-3">
                {(
                  [
                    ['Planned', plannedBike],
                    ['Completed', completedRun],
                    ['Skipped', skippedSwim],
                  ] as const
                ).map(([label, workout]) => {
                  const completionPercent = getWorkoutCompletionPercent(workout)
                  return (
                  <div key={label} className="space-y-2">
                    <p className="title-eyebrow">{label}</p>
                    <div
                      className="tt-dashboard-today"
                      data-sport={workout.type}
                      data-completion={
                        completionPercent != null
                          ? Math.min(100, completionPercent)
                          : undefined
                      }
                      style={
                        completionPercent != null
                          ? ({
                              '--tt-completion': `${Math.min(100, Math.max(0, completionPercent))}%`,
                            } as CSSProperties)
                          : undefined
                      }
                    >
                      <WorkoutBlock
                        workout={workout}
                        density="lg"
                        hideFingerprint
                        hideSubtitle
                        className="!p-0"
                      />
                    </div>
                  </div>
                  )
                })}
              </div>
            </GuideSection>

            <GuideSection
              id="tables"
              title="Tables"
              description="Editorial data tables: white continuous sheet, Manrope headers, poster heading above — never inside cells."
            >
              <TablePosterHeading
                lines={['Upcoming races']}
                meta="3 EVENTS"
                description="Example table heading — Level 2 section"
              />
              <div className={DATA_TABLE_SHELL}>
                <table className={DATA_TABLE} data-density="comfortable">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Race</th>
                      <th>Status</th>
                      <th className="text-right">Weeks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={DATA_CELL_SECONDARY}>Aug 22</td>
                      <td className={DATA_CELL_PRIMARY}>Molėtų triatlonas</td>
                      <td>
                        <StatusPill tone="planned">Planned</StatusPill>
                      </td>
                      <td className={cn(DATA_NUM, 'text-right')}>2</td>
                    </tr>
                    <tr>
                      <td className={DATA_CELL_SECONDARY}>Sep 14</td>
                      <td className={DATA_CELL_PRIMARY}>Vilnius Marathon</td>
                      <td>
                        <StatusPill tone="watching">Watching</StatusPill>
                      </td>
                      <td className={cn(DATA_NUM, 'text-right')}>5</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </GuideSection>

            <GuideSection id="rules" title="Rules">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[10px] border border-[#86d39a]/60 bg-[#f0faf4] p-5">
                  <p className="title-eyebrow text-[#1b7a3d]">Do</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-snug text-[#111111]">
                    <li>Pick type by semantic role</li>
                    <li>Reuse title-* classes / typography helpers</li>
                    <li>Keep sport color on edges and icons</li>
                    <li>Reserve two-line titles for major Season blocks</li>
                    <li>Use title-section for all content section headings</li>
                  </ul>
                </div>
                <div className="rounded-[10px] border border-[#f5a3a3]/70 bg-[#fdf2f2] p-5">
                  <p className="title-eyebrow text-[#b42318]">Don&apos;t</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-snug text-[#111111]">
                    <li>Barlow in nav, tables, or calendar headers</li>
                    <li>Giant italic TRAINING page titles</li>
                    <li>Uppercase workout names (EASY RIDE)</li>
                    <li>Gradients, glass, heavy shadows</li>
                    <li>One-off heading styles per page</li>
                  </ul>
                </div>
              </div>
              <p className="text-[12px] text-[#737986]">
                Agent rule:{' '}
                <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px]">
                  .cursor/rules/typography-hierarchy.mdc
                </code>
                {' · '}
                Live guide:{' '}
                <Link
                  href="/style-guide"
                  className="font-semibold text-[#111111] underline-offset-2 hover:underline"
                >
                  /style-guide
                </Link>
              </p>
            </GuideSection>
          </div>
        </div>
      </div>
    </div>
  )
}
