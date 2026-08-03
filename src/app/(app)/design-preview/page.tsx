import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import {
  CompareColumns,
  MinimalCard,
  MinimalSampleRoot,
  MinimalSection,
  minimal,
} from '@/components/design/minimal-sample-kit'
import { PlanWorkoutDataCard } from '@/components/plan/plan-workout-data-card'
import { WorkoutBlock } from '@/components/workout-block'
import { SessionType, WorkoutStatus, WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import type { WorkoutStructure } from '@/lib/workout-builder/types'
import { cn } from '@/lib/utils'

const thresholdStructure: WorkoutStructure = {
  warmup: [
    {
      id: 'wu',
      order: 0,
      type: 'CONTINUOUS',
      durationType: 'time',
      time: 15,
      targets: [{ type: 'rpe', value: 'Easy' }],
    },
  ],
  mainSet: [
    {
      id: 'main',
      order: 0,
      type: 'INTERVAL',
      repetitions: 4,
      work: { mode: 'time', value: 8, unit: 'min' },
      recovery: { mode: 'time', value: 2, unit: 'min' },
      targets: [{ type: 'pace', value: '3:55/km' }],
    },
  ],
  cooldown: [
    {
      id: 'cd',
      order: 0,
      type: 'CONTINUOUS',
      durationType: 'time',
      time: 10,
      targets: [{ type: 'rpe', value: 'Easy' }],
    },
  ],
}

function sampleWorkout(
  overrides: Partial<PlanWorkoutDetail> & Pick<PlanWorkoutDetail, 'id' | 'title' | 'status'>,
): PlanWorkoutDetail {
  return {
    dateKey: '2026-07-21',
    type: WorkoutType.RUN,
    sessionType: SessionType.THRESHOLD,
    description: null,
    plannedDistance: 13,
    plannedDistanceMeters: null,
    plannedDuration: 68,
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

const plannedSample = sampleWorkout({
  id: 'sample-planned',
  title: 'Threshold Intervals',
  status: WorkoutStatus.PLANNED,
  sessionType: SessionType.THRESHOLD,
  description: '4 × 8 min @ Threshold',
  plannedDistance: 10.4,
  plannedDuration: 45,
  structure: thresholdStructure,
})

const completedSample = sampleWorkout({
  id: 'sample-completed',
  title: 'Threshold Intervals',
  status: WorkoutStatus.COMPLETED,
  sessionType: SessionType.THRESHOLD,
  description: '4 × 8 min @ Threshold',
  plannedDistance: 10.4,
  plannedDuration: 45,
  structure: thresholdStructure,
  result: {
    actualDistance: 10.4,
    actualDuration: 45,
    rpe: null,
    athleteNotes: null,
    coachReply: null,
    coachReplyReadAt: null,
    stravaActivityUrl: null,
    logType: null,
  },
})

const completedVsPlannedSample = sampleWorkout({
  id: 'sample-completed-diff',
  title: 'Easy Run',
  status: WorkoutStatus.COMPLETED,
  sessionType: SessionType.EASY_RUN,
  description: 'Conversation pace',
  plannedDistance: 10,
  plannedDuration: 58,
  result: {
    actualDistance: 4.3,
    actualDuration: 28,
    rpe: null,
    athleteNotes: null,
    coachReply: null,
    coachReplyReadAt: null,
    stravaActivityUrl: null,
    logType: null,
  },
})

const skippedSample = sampleWorkout({
  id: 'sample-skipped',
  title: 'VO2 Max',
  status: WorkoutStatus.SKIPPED,
  sessionType: SessionType.VO2_MAX,
  description: '8 × 400 m',
  plannedDistance: 8,
  plannedDuration: 48,
  structure: thresholdStructure,
})

export default function DesignPreviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-2 lg:px-0">
      <PageHeader
        title="Design preview"
        description="Design System v3 — dark sidebar shell, Workout Block densities, status matrix. Legacy minimal kit kept below for comparison."
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-section-title">Shell & tokens</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace background #F8F8F6, surface white, sidebar #111318. Calendar Workout Blocks use radius 0; shell cards use 12px.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            ['Background', 'bg-background border'],
            ['Surface', 'bg-card border'],
            ['Sidebar', 'bg-sidebar text-sidebar-foreground'],
            ['Run', 'bg-sport-run text-white'],
            ['Bike', 'bg-sport-bike text-white'],
            ['Swim', 'bg-sport-swim text-white'],
            ['Success', 'bg-success text-white'],
          ].map(([label, cls]) => (
            <div
              key={label}
              className={`flex h-16 w-28 flex-col justify-end rounded-md p-2 text-[11px] font-semibold ${cls}`}
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-section-title">Workout Block</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Densities xs / sm / md / lg × statuses planned / completed / skipped. Week uses md; list/dashboard uses lg; month micro uses xs.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['xs', plannedSample],
              ['sm', plannedSample],
              ['md', plannedSample],
              ['lg', plannedSample],
            ] as const
          ).map(([density, workout]) => (
            <div key={density} className="space-y-1.5">
              <p className="text-label">{density}</p>
              <WorkoutBlock workout={workout} density={density} />
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <p className="text-label">Planned</p>
            <WorkoutBlock workout={plannedSample} density="md" />
          </div>
          <div className="space-y-1.5">
            <p className="text-label">Completed (actual / planned)</p>
            <WorkoutBlock workout={completedVsPlannedSample} density="md" />
          </div>
          <div className="space-y-1.5">
            <p className="text-label">Skipped</p>
            <WorkoutBlock workout={skippedSample} density="md" />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-label">Completed + fingerprint (lg)</p>
          <div className="max-w-sm">
            <WorkoutBlock workout={completedSample} density="lg" />
          </div>
        </div>
      </section>

      <MinimalSampleRoot>
        <div>
          <h1 className={minimal.pageTitle}>Minimal sample (legacy)</h1>
          <p className={cn(minimal.caption, 'mt-2 max-w-2xl')}>
            Previous minimal kit — retained for comparison while surfaces migrate to Workout Block.
          </p>
        </div>

        <MinimalSection
          title="Surfaces"
          description="Elevated card (current) vs flat bordered card (minimal)."
        >
          <CompareColumns
            current={
              <div className="card-elevated p-4">
                <p className="text-card-title">Current card</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Token-driven radius, soft border.
                </p>
              </div>
            }
            minimalSample={
              <MinimalCard>
                <p className={minimal.sectionTitle}>Minimal card</p>
                <p className={cn(minimal.caption, 'mt-2')}>
                  Legacy 6px reference.
                </p>
              </MinimalCard>
            }
          />
        </MinimalSection>

        <MinimalSection
          title="Legacy PlanWorkoutDataCard"
          description="List / week / month / micro — still used on list & month until Phase 2."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PlanWorkoutDataCard workout={plannedSample} density="list" />
            <PlanWorkoutDataCard workout={completedSample} density="week" />
            <PlanWorkoutDataCard workout={skippedSample} density="month" />
            <PlanWorkoutDataCard workout={plannedSample} density="micro" />
          </div>
        </MinimalSection>

        <MinimalSection title="Status washes" description="Planned / completed / skipped panels.">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={cn(minimal.statusPlanned, 'p-3')}>
              <p className={minimal.sectionTitle}>Planned</p>
              <p className={cn(minimal.caption, 'mt-1')}>White + gray border</p>
            </div>
            <div className={cn(minimal.statusCompleted, 'p-3')}>
              <p className={minimal.sectionTitle}>Completed</p>
              <p className={cn(minimal.caption, 'mt-1')}>Soft green wash</p>
            </div>
            <div className={cn(minimal.statusSkipped, 'p-3')}>
              <p className={minimal.sectionTitle}>Skipped</p>
              <p className={cn(minimal.caption, 'mt-1')}>Soft red wash</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className={minimal.chip}>Planned</span>
            <span className={minimal.chipCompleted}>Completed</span>
            <span className={minimal.chipSkipped}>Skipped</span>
          </div>
        </MinimalSection>

        <MinimalSection title="Buttons">
          <CompareColumns
            current={
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            }
            minimalSample={
              <div className="flex flex-wrap gap-2">
                <button type="button" className={minimal.btnPrimary}>
                  Primary
                </button>
                <button type="button" className={minimal.btnSecondary}>
                  Secondary
                </button>
                <button type="button" className={minimal.btnGhost}>
                  Ghost
                </button>
              </div>
            }
          />
        </MinimalSection>

        <MinimalSection title="Form field">
          <CompareColumns
            current={
              <div className="space-y-1.5">
                <label className="text-label">Distance (km)</label>
                <Input defaultValue="13" />
              </div>
            }
            minimalSample={
              <div className="space-y-1.5">
                <label className={minimal.label}>Distance (km)</label>
                <input className={minimal.input} defaultValue="13" />
              </div>
            }
          />
        </MinimalSection>

        <MinimalSection title="List row">
          <CompareColumns
            current={
              <div className="card-elevated flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-semibold">Long Run</p>
                  <p className="text-xs text-muted-foreground">Sunday · Aerobic</p>
                </div>
                <span className="text-sm font-bold tabular-nums">22 km</span>
              </div>
            }
            minimalSample={
              <div className={minimal.listRow}>
                <div>
                  <p className={minimal.sectionTitle}>Long Run</p>
                  <p className={minimal.caption}>Sunday · Aerobic</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-[#111827]">22 km</span>
              </div>
            }
          />
        </MinimalSection>

        <MinimalSection title="Table">
          <CompareColumns
            current={
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-card)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-3 py-2 font-semibold">Day</th>
                      <th className="px-3 py-2 font-semibold">Workout</th>
                      <th className="px-3 py-2 font-semibold">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/40">
                      <td className="px-3 py-2.5">Mon</td>
                      <td className="px-3 py-2.5">Easy Run</td>
                      <td className="px-3 py-2.5">10 km</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5">Tue</td>
                      <td className="px-3 py-2.5">Threshold</td>
                      <td className="px-3 py-2.5">13 km</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            }
            minimalSample={
              <div className={minimal.card}>
                <table className={minimal.table}>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Workout</th>
                      <th>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Mon</td>
                      <td>Easy Run</td>
                      <td>10 km</td>
                    </tr>
                    <tr>
                      <td>Tue</td>
                      <td>Threshold</td>
                      <td>13 km</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            }
          />
        </MinimalSection>

        <MinimalSection title="Panel / dialog-ish surface">
          <CompareColumns
            current={
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-float)]">
                <p className="text-base font-semibold">Log workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Soft float shadow and large radius.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                  <Button size="sm">Save</Button>
                </div>
              </div>
            }
            minimalSample={
              <div className={minimal.panel}>
                <p className={minimal.sectionTitle}>Log workout</p>
                <p className={cn(minimal.caption, 'mt-1')}>
                  Flat panel, 6px radius, no shadow.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className={minimal.btnGhost}>
                    Cancel
                  </button>
                  <button type="button" className={minimal.btnPrimary}>
                    Save
                  </button>
                </div>
              </div>
            }
          />
        </MinimalSection>

        <MinimalSection title="Metric hierarchy" description="Same pattern as data cards.">
          <MinimalCard>
            <p className={minimal.sectionTitle}>Threshold</p>
            <p className={cn(minimal.caption, 'mt-1')}>6 × 1000 m</p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[34px] font-bold leading-none tracking-tight text-[#111827]">
                13
              </span>
              <span className="text-lg font-medium text-[#111827]">km</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm font-medium text-[#6B7280]">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              1h 08m
            </div>
          </MinimalCard>
        </MinimalSection>
      </MinimalSampleRoot>
    </div>
  )
}
