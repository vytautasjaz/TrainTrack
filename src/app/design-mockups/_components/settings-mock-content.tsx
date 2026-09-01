'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockRole } from './mock-ui'

type SectionId =
  | 'profile'
  | 'sign-in'
  | 'zones'
  | 'weather'
  | 'plan'
  | 'integrations'
  | 'planning'
  | 'builder'

const ATHLETE_NAV: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'sign-in', label: 'Sign-in' },
  { id: 'zones', label: 'Training zones' },
  { id: 'weather', label: 'Weather' },
  { id: 'plan', label: 'Plan display' },
  { id: 'integrations', label: 'Integrations' },
]

/** Coach Settings = coach account only. Athlete zones live under Athletes. */
const COACH_NAV: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'sign-in', label: 'Sign-in' },
  { id: 'planning', label: 'Planning' },
  { id: 'builder', label: 'Builder prefs' },
  { id: 'integrations', label: 'Integrations' },
]

const ZONE_ROWS = [
  { zone: 'Z1', label: 'Recovery', pace: '5:40–6:20', hr: '< 142' },
  { zone: 'Z2', label: 'Easy', pace: '5:05–5:35', hr: '142–155' },
  { zone: 'Z3', label: 'Tempo', pace: '4:35–5:00', hr: '156–165' },
  { zone: 'Z4', label: 'Threshold', pace: '4:10–4:30', hr: '166–174' },
  { zone: 'Z5', label: 'VO2', pace: '< 4:05', hr: '> 174' },
]

/** Mirrors production bike zone rows — speed + power per intensity. */
const BIKE_ZONE_ROWS = [
  { label: 'Recovery', speed: '22.0', watts: '135', hint: '55% FTP' },
  { label: 'Easy / Endurance', speed: '26.5', watts: '159', hint: '65% FTP' },
  { label: 'Tempo / Sweet Spot', speed: '32.0', watts: '216', hint: '88% FTP' },
  { label: 'Threshold', speed: '35.5', watts: '245', hint: '100% FTP' },
  { label: 'VO₂ max / Sprint', speed: '38.0', watts: '282', hint: '115% FTP' },
]

/**
 * Profile & Preferences — sticky left subnav (brief §7.16 A).
 */
export function SettingsMockContent({ role }: { role: MockRole }) {
  const nav = role === 'coach' ? COACH_NAV : ATHLETE_NAV
  const [section, setSection] = useState<SectionId>('profile')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!nav.some((n) => n.id === section)) {
      setSection(nav[0]!.id)
    }
  }, [role, nav, section])

  function save() {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div className="space-y-2">
          <h1 className="tt-mock-h1 !text-5xl">Settings.</h1>
          <p className="max-w-lg text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
            {role === 'coach'
              ? 'Your coach account — planning defaults and builder prefs. Athlete zones stay under Athletes.'
              : 'Profile, zones, and integrations — sectioned so long forms stay scannable.'}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          className={cn(
            'tt-mock-btn inline-flex items-center gap-1.5 !normal-case !tracking-normal',
            savedFlash ? 'tt-mock-btn-ghost text-[var(--tt-good)]' : 'tt-mock-btn-primary',
          )}
        >
          {savedFlash ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Saved
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </header>

      {role === 'coach' ? (
        <div className="rounded-[8px] border border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)]/60 px-3.5 py-3 text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">
          Athlete training zones and personal prefs are not edited here. Open an athlete under{' '}
          <a
            href="/design-mockups/coach-home"
            className="font-semibold text-[var(--tt-ink)] underline-offset-2 hover:underline"
          >
            Athletes
          </a>{' '}
          to propose pace/zone adjustments (requires their permission — they get a notification).
        </div>
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto lg:sticky lg:top-4 lg:w-[11.5rem] lg:flex-col lg:overflow-visible"
        >
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                'shrink-0 rounded-[6px] px-3 py-2 text-left text-[13px] font-medium transition',
                section === item.id
                  ? 'bg-[var(--tt-ink)] text-white'
                  : 'text-[var(--tt-ink-soft)] hover:bg-[var(--tt-sidebar,#f5f5f5)] hover:text-[var(--tt-ink)]',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 max-w-[42rem] flex-1 space-y-8">
          {section === 'profile' ? <ProfileSection role={role} /> : null}
          {section === 'sign-in' ? <SignInSection /> : null}
          {section === 'zones' && role === 'athlete' ? <ZonesSection /> : null}
          {section === 'weather' && role === 'athlete' ? <WeatherSection /> : null}
          {section === 'plan' && role === 'athlete' ? <PlanDisplaySection /> : null}
          {section === 'integrations' ? <IntegrationsSection role={role} /> : null}
          {section === 'planning' && role === 'coach' ? <PlanningSection /> : null}
          {section === 'builder' && role === 'coach' ? <BuilderPrefsSection /> : null}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-1 border-b border-[var(--tt-line)] pb-3">
      <h2 className="text-[17px] font-semibold text-[var(--tt-ink)]">{title}</h2>
      {description ? (
        <p className="text-[13px] leading-relaxed text-[var(--tt-ink-soft)]">{description}</p>
      ) : null}
    </div>
  )
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-[var(--tt-ink-faint)]">{hint}</span> : null}
    </label>
  )
}

function TextInput({
  defaultValue,
  placeholder,
  type = 'text',
}: {
  defaultValue?: string
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="h-9 w-full rounded-[8px] border border-[var(--tt-line)] bg-white px-3 text-[13px] text-[var(--tt-ink)] outline-none placeholder:text-[var(--tt-ink-faint)] focus:border-[var(--tt-ink)]"
    />
  )
}

function ProfileSection({ role }: { role: MockRole }) {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Profile"
        description="Identity and how you show up across TrainTrack."
      />
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tt-sidebar,#f5f5f5)] text-[13px] font-bold text-[var(--tt-ink)]">
          {role === 'coach' ? 'VK' : 'IK'}
        </div>
        <button
          type="button"
          className="text-[12px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
        >
          Change photo
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name">
          <TextInput defaultValue={role === 'coach' ? 'Vytautas' : 'Ieva Kazlauskaitė'} />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            defaultValue={role === 'coach' ? 'coach@traintrack.app' : 'ieva@example.com'}
          />
        </Field>
      </div>
      <Field label="Roles">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--tt-line)] px-2.5 py-1 text-[12px] font-medium text-[var(--tt-ink)]">
            Athlete
          </span>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[12px] font-medium',
              role === 'coach'
                ? 'border-[var(--tt-ink)] bg-[var(--tt-ink)] text-white'
                : 'border-[var(--tt-line)] text-[var(--tt-ink-faint)]',
            )}
          >
            Coach
          </span>
          <button
            type="button"
            className="rounded-full border border-dashed border-[var(--tt-line)] px-2.5 py-1 text-[12px] text-[var(--tt-ink-faint)] hover:border-[var(--tt-line-strong)] hover:text-[var(--tt-ink-soft)]"
          >
            + Add role
          </button>
        </div>
      </Field>
      {role === 'coach' ? (
        <Field label="Coaching code" hint="Athletes use this to request coaching.">
          <div className="flex gap-2">
            <TextInput defaultValue="TT-VYT-4821" />
            <button
              type="button"
              className="shrink-0 rounded-[8px] border border-[var(--tt-line)] px-3 text-[12px] font-medium text-[var(--tt-ink-soft)] hover:border-[var(--tt-line-strong)] hover:text-[var(--tt-ink)]"
            >
              Copy
            </button>
          </div>
        </Field>
      ) : (
        <Field label="Connected coach" hint="Leave empty to disconnect later from Integrations-style confirm.">
          <TextInput defaultValue="Vytautas · TT-VYT-4821" />
        </Field>
      )}
    </section>
  )
}

function SignInSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Sign-in methods"
        description="How you authenticate. Keep at least one method linked."
      />
      <ul className="divide-y divide-[var(--tt-line)] border-y border-[var(--tt-line)]">
        {(
          [
            ['Email & password', 'Set', true],
            ['Google', 'Connected', true],
            ['Strava (sign-in)', 'Not linked', false],
          ] as const
        ).map(([name, status, linked]) => (
          <li key={name} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--tt-ink)]">{name}</p>
              <p
                className={cn(
                  'text-[12px]',
                  linked ? 'text-[var(--tt-ink-soft)]' : 'text-[var(--tt-ink-faint)]',
                )}
              >
                {status}
              </p>
            </div>
            <button
              type="button"
              className="text-[12px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
            >
              {linked ? 'Manage' : 'Connect'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ZonesSection() {
  const [tab, setTab] = useState<'pace' | 'hr' | 'bike' | 'swim'>('pace')
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Training zones"
        description="Your zones for prescriptions, structure intensity, and tools. Only you can change these — a coach may propose adjustments from Athletes."
      />
      <div className="flex flex-wrap gap-1 rounded-[8px] border border-[var(--tt-line)] p-0.5">
        {(
          [
            ['pace', 'Pace'],
            ['hr', 'Heart rate'],
            ['bike', 'Bike'],
            ['swim', 'Swim CSS'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-[6px] px-3 py-1.5 text-[12px] font-semibold transition',
              tab === id
                ? 'bg-[var(--tt-ink)] text-white'
                : 'text-[var(--tt-ink-faint)] hover:text-[var(--tt-ink)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pace' || tab === 'hr' ? (
        <div className="overflow-hidden rounded-[8px] border border-[var(--tt-line)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                <th className="px-3 py-2.5">Zone</th>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">{tab === 'pace' ? 'Pace /km' : 'HR bpm'}</th>
              </tr>
            </thead>
            <tbody>
              {ZONE_ROWS.map((row) => (
                <tr key={row.zone} className="border-b border-[var(--tt-line)] last:border-0">
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-[var(--tt-ink)]">
                    {row.zone}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--tt-ink-soft)]">{row.label}</td>
                  <td className="px-3 py-2.5">
                    <input
                      defaultValue={tab === 'pace' ? row.pace : row.hr}
                      className="h-8 w-full max-w-[9rem] rounded-[6px] border border-[var(--tt-line)] bg-white px-2 text-[12px] tabular-nums text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'bike' ? (
        <div className="space-y-4">
          <Field label="FTP (watts)" hint="Functional threshold power — used for zone estimates.">
            <TextInput defaultValue="245" />
          </Field>

          <div className="overflow-hidden rounded-[8px] border border-[var(--tt-line)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--tt-line)] bg-[var(--tt-sidebar,#f5f5f5)] text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
                  <th className="px-3 py-2.5">Intensity</th>
                  <th className="px-3 py-2.5 text-right">km/h</th>
                  <th className="px-3 py-2.5 text-right">W</th>
                </tr>
              </thead>
              <tbody>
                {BIKE_ZONE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-[var(--tt-line)] last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="text-[12px] font-medium text-[var(--tt-ink)]">{row.label}</p>
                      <p className="text-[10px] text-[var(--tt-ink-faint)]">{row.hint}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        defaultValue={row.speed}
                        className="ml-auto h-8 w-full max-w-[5.5rem] rounded-[6px] border border-[var(--tt-line)] bg-white px-2 text-right text-[12px] tabular-nums text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)]"
                        aria-label={`${row.label} speed km/h`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        defaultValue={row.watts}
                        className="ml-auto h-8 w-full max-w-[5.5rem] rounded-[6px] border border-[var(--tt-line)] bg-white px-2 text-right text-[12px] tabular-nums text-[var(--tt-ink)] outline-none focus:border-[var(--tt-ink)]"
                        aria-label={`${row.label} watts`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--tt-ink-faint)]">
            <span className="font-medium text-[var(--tt-ink-soft)]">Speed (km/h)</span> — distance
            and duration estimates.{' '}
            <span className="font-medium text-[var(--tt-ink-soft)]">Watts (W)</span> — power-based
            sessions; empty fields can show FTP estimates.
          </p>
        </div>
      ) : null}

      {tab === 'swim' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CSS pace /100m" hint="Critical swim speed">
            <TextInput defaultValue="1:28" />
          </Field>
          <Field label="Pool length">
            <TextInput defaultValue="25 m" />
          </Field>
        </div>
      ) : null}
    </section>
  )
}

function WeatherSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Weather"
        description="Location for plan forecasts. Hide weather if you prefer a clean calendar."
      />
      <Field label="Location">
        <TextInput defaultValue="Vilnius, Lithuania" />
      </Field>
      <label className="flex items-center gap-2.5 text-[13px] text-[var(--tt-ink)]">
        <input type="checkbox" defaultChecked className="rounded border-[var(--tt-line)]" />
        Show weather on Training plan
      </label>
    </section>
  )
}

function PlanDisplaySection() {
  const [mode, setMode] = useState<'sport' | 'completion'>('sport')
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Plan display"
        description="How workout cards color themselves on week and list views."
      />
      <div className="space-y-2">
        {(
          [
            ['sport', 'Sport colors', 'Rail and accents follow run / bike / swim.'],
            ['completion', 'Completion', 'Done sessions shift to green; planned stay neutral.'],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'flex w-full flex-col items-start rounded-[8px] border px-3.5 py-3 text-left transition',
              mode === id
                ? 'border-[var(--tt-ink)] shadow-[0_0_0_1px_var(--tt-ink)]'
                : 'border-[var(--tt-line)] hover:border-[var(--tt-line-strong)]',
            )}
          >
            <span className="text-[13px] font-semibold text-[var(--tt-ink)]">{label}</span>
            <span className="mt-0.5 text-[12px] text-[var(--tt-ink-soft)]">{hint}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function IntegrationsSection({ role }: { role: MockRole }) {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Integrations"
        description="Strava sync and calendar feeds. Unlink actions stay secondary."
      />
      <div className="space-y-3">
        <div className="rounded-[8px] border border-[var(--tt-line)] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--tt-ink)]">Strava</p>
              <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft)]">
                Connected · last sync 2h ago
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-[12px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
              >
                Sync now
              </button>
              <button
                type="button"
                className="text-[12px] font-medium text-[var(--tt-ink-faint)] hover:text-[var(--tt-red)]"
              >
                Unlink
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-[8px] border border-[var(--tt-line)] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--tt-ink)]">Calendar feed</p>
              <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft)]">
                ICS · subscribe from Apple / Google Calendar
              </p>
            </div>
            <button
              type="button"
              className="text-[12px] font-medium text-[var(--tt-ink-soft)] hover:text-[var(--tt-ink)]"
            >
              Copy URL
            </button>
          </div>
        </div>
        {role === 'athlete' ? (
          <div className="rounded-[8px] border border-[var(--tt-line)] px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[var(--tt-ink)]">Coach link</p>
                <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft)]">
                  Coached by Vytautas
                </p>
              </div>
              <button
                type="button"
                className="text-[12px] font-medium text-[var(--tt-ink-faint)] hover:text-[var(--tt-red)]"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function PlanningSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Planning lead"
        description="How many days ahead you typically plan — drives underplanned warnings."
      />
      <Field label="Lead days" hint="Warn when the next N days lack enough planned load.">
        <TextInput defaultValue="7" />
      </Field>
    </section>
  )
}

function BuilderPrefsSection() {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Builder preferences"
        description="Defaults for new workouts and session-type presets."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default sport">
          <TextInput defaultValue="Run" />
        </Field>
        <Field label="Default primary metric">
          <TextInput defaultValue="Distance" />
        </Field>
      </div>
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--tt-ink-faint)]">
          Session type presets by sport
        </p>
        <div className="space-y-2 rounded-[8px] border border-[var(--tt-line)] p-3">
          <Field label="Run">
            <TextInput defaultValue="Easy, Threshold, Intervals, Long" />
          </Field>
          <Field label="Bike">
            <TextInput defaultValue="Endurance, Sweet spot, VO2, Recovery spin" />
          </Field>
          <Field label="Swim">
            <TextInput defaultValue="Technique, CSS, Aerobic, Open water" />
          </Field>
          <Field label="Strength">
            <TextInput defaultValue="Gym full-body, Core stability, Mobility + strength" />
          </Field>
          <Field label="Recovery">
            <TextInput defaultValue="Mobility flow, Easy spin, Recovery jog" />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-2.5 text-[13px] text-[var(--tt-ink)]">
        <input type="checkbox" defaultChecked className="rounded border-[var(--tt-line)]" />
        Open Build panel by default for interval types
      </label>
    </section>
  )
}
