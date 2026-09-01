import { MockPage } from '../_components/mock-ui'
import { MockExpandableKitDemo } from '../_components/mock-expandable-kit-demo'
import { PrescriptionWorkoutCard } from '../_components/prescription-workout-card'
import { KitDarkHeaderTable, KitLightHeaderTable } from '../_components/kit-tables'

export default function KitMockPage() {
  return (
    <MockPage title="UI Kit" status="Review" activeNav="Home" hideSidebar>
      <p className="tt-mock-overline" style={{ color: 'var(--tt-ink-faint)' }}>
        Foundation
      </p>
      <h1 className="tt-mock-h1 mt-1 !text-5xl">UI kit</h1>
      <p className="tt-mock-body mt-2 max-w-2xl">
        Inter for UI · Bebas Neue for display. Red is reserved for primary action, active nav, and
        unread — not large decorative fills.
      </p>

      <section className="mt-8">
        <h2 className="tt-mock-section-title">Color</h2>
        <div className="tt-mock-kit-grid mt-3">
          {[
            ['Background', 'var(--tt-bg)'],
            ['Surface', 'var(--tt-surface)'],
            ['Ink', 'var(--tt-ink)'],
            ['Brand red', 'var(--tt-red)'],
            ['Run', 'var(--tt-sport-run)'],
            ['Bike', 'var(--tt-sport-bike)'],
            ['Swim', 'var(--tt-sport-swim)'],
            ['Strength', 'var(--tt-sport-strength)'],
            ['Recovery', 'var(--tt-sport-recovery)'],
          ].map(([label, color]) => (
            <div key={label} className="tt-mock-card p-3">
              <div className="tt-mock-swatch" style={{ background: color }} />
              <p className="tt-mock-h3 mt-2">{label}</p>
              <p className="tt-mock-caption">{color}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="tt-mock-section-title">Type scale</h2>
        <div className="tt-mock-card mt-3 space-y-5 p-5">
          <div>
            <p className="tt-mock-caption mb-1">H1 / Display · Bebas Neue · 64</p>
            <p className="tt-mock-h1 !text-5xl">Today&apos;s workout</p>
          </div>
          <div>
            <p className="tt-mock-caption mb-1">H2 · Inter SemiBold · 24</p>
            <p className="tt-mock-h2">Easy Aerobic</p>
          </div>
          <div>
            <p className="tt-mock-caption mb-1">H3 · Inter Medium · 16</p>
            <p className="tt-mock-h3">Strength</p>
          </div>
          <div>
            <p className="tt-mock-caption mb-1">Body · Inter Regular · 14</p>
            <p className="tt-mock-body">Upper body · 45 min</p>
          </div>
          <div>
            <p className="tt-mock-caption mb-1">Caption · Inter Regular · 12</p>
            <p className="tt-mock-caption">Rest &amp; mobility</p>
          </div>
          <div>
            <p className="tt-mock-caption mb-1">Overline · Inter Medium · 11</p>
            <p className="tt-mock-overline">Upcoming</p>
          </div>
          <div>
            <p className="tt-mock-caption mb-1">
              Workout title · Bebas only on XL/L · dense uses Inter H3
            </p>
            <p className="tt-mock-workout-title" data-size="l">
              Easy Aerobic
            </p>
            <p className="tt-mock-h3 mt-3 !font-semibold">Easy Aerobic · list / S</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="tt-mock-section-title">Buttons &amp; badge</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="tt-mock-btn tt-mock-btn-primary">
            Start workout →
          </button>
          <button type="button" className="tt-mock-btn tt-mock-btn-ghost">
            Cancel
          </button>
          <span className="tt-mock-badge">3</span>
          <span className="rounded-full bg-[var(--tt-good-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--tt-good)]">
            Good
          </span>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="tt-mock-section-title">Workout cards</h2>
        <p className="tt-mock-body mt-2 max-w-2xl">
          Prescription only · sport rail · sizes L / S. Full ladder on Workout detail mock.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <PrescriptionWorkoutCard
            workout={{
              id: 'kit-easy',
              sport: 'run',
              title: 'Easy Run',
              prescription: '10 km · Z2',
              metric: '10 km',
              zone: 'Z2',
              status: 'done',
              completionPercent: 102,
              actualMetric: '10.2 km',
              actualSecondary: '52:08',
            }}
            size="l"
          />
          <PrescriptionWorkoutCard
            workout={{
              id: 'kit-threshold',
              sport: 'run',
              title: 'Threshold Intervals',
              prescription: '3 × 2 km @ 4:05/km',
              recovery: "2' easy recovery",
              metric: '12 km',
              zone: 'Z3',
              include: '6 × 100 m strides',
              status: 'planned',
            }}
            size="l"
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="tt-mock-section-title">Tables</h2>
        <p className="tt-mock-body mt-2 max-w-2xl">
          Two shared chrome families from{' '}
          <code className="text-[12px]">src/lib/table-styles.ts</code> — use the same tokens across
          the app, don&apos;t invent per-page table skins.
        </p>

        <div className="mt-6 space-y-8">
          <div>
            <p className="tt-mock-overline text-[var(--tt-ink-faint)]">Light header</p>
            <p className="tt-mock-caption mt-1 max-w-2xl">
              Editorial lists — races, results, PBs. Framed surface, soft tinted header, sortable
              columns (<code className="text-[11px]">DATA_TABLE</code> /{' '}
              <code className="text-[11px]">tt-data-table</code>).
            </p>
            <div className="mt-3">
              <KitLightHeaderTable />
            </div>
          </div>

          <div>
            <p className="tt-mock-overline text-[var(--tt-ink-faint)]">Dark header</p>
            <p className="tt-mock-caption mt-1 max-w-2xl">
              Planning grids — week, month, season timeline. Navy header{' '}
              <code className="text-[11px]">#2a3144</code>, 8px radius, light body (
              <code className="text-[11px]">TABLE_FRAME</code> +{' '}
              <code className="text-[11px]">TABLE_HEADER</code> /{' '}
              <code className="text-[11px]">tt-table-*</code>).
            </p>
            <div className="mt-3">
              <KitDarkHeaderTable />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="tt-mock-section-title">Expandable</h2>
        <p className="tt-mock-body mt-2 max-w-2xl">
          One pattern for every disclosure: white summary, continuous 3px red rail when open, grey
          panel, ~420ms height slide. Cards/lists use{' '}
          <code className="text-[12px]">MockExpandable</code>; table rows use{' '}
          <code className="text-[12px]">MockExpandShell</code>.
        </p>
        <div className="mt-3 max-w-xl">
          <MockExpandableKitDemo />
        </div>
      </section>
    </MockPage>
  )
}
