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
import { SessionType, WorkoutStatus, WorkoutType } from '@prisma/client'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { cn } from '@/lib/utils'

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
    ...overrides,
  }
}

const plannedSample = sampleWorkout({
  id: 'sample-planned',
  title: 'Threshold',
  status: WorkoutStatus.PLANNED,
  sessionType: SessionType.THRESHOLD,
  description: '6 × 1000 m',
})

const completedSample = sampleWorkout({
  id: 'sample-completed',
  title: 'Easy Run',
  status: WorkoutStatus.COMPLETED,
  sessionType: SessionType.EASY_RUN,
  description: 'Conversation pace',
  plannedDistance: 10,
  plannedDuration: 58,
  result: {
    actualDistance: 10,
    actualDuration: 58,
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
})

export default function DesignPreviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-2 lg:px-0">
      <PageHeader
        title="Design preview"
        description="Minimal design is now applied app-wide. This page remains as a reference gallery (current leftovers vs sample kit)."
      />

      <MinimalSampleRoot>
        <div>
          <h1 className={minimal.pageTitle}>Minimal sample</h1>
          <p className={cn(minimal.caption, 'mt-2 max-w-2xl')}>
            White surfaces, thin gray borders, 6px radius, no shadows, black/gray type,
            status via soft washes.
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
                  Rounded-2xl, soft shadow, softer border.
                </p>
              </div>
            }
            minimalSample={
              <MinimalCard>
                <p className={minimal.sectionTitle}>Minimal card</p>
                <p className={cn(minimal.caption, 'mt-2')}>
                  6px radius, 1px #E5E7EB, no shadow.
                </p>
              </MinimalCard>
            }
          />
        </MinimalSection>

        <MinimalSection
          title="Workout data cards"
          description="Reference densities: list / week / month / micro (month grid)."
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
