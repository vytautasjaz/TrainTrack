'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CalculatorHeroCard } from '@/components/calculators/calculator-hero-card'
import { CalculatorValueSlider } from '@/components/calculators/calculator-value-slider'
import { FieldHint } from '@/components/calculators/calculator-help'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Caption } from '@/components/ui/typography'
import { FORMAT } from '@/lib/calculators/calculator-copy'
import {
  computeHyroxResult,
  formatHyroxTime,
  HYROX_SCENARIO_DEFAULTS,
  HYROX_STATIONS,
  type HyroxCalculatorState,
  type HyroxResult,
  type HyroxScenario,
  type HyroxStationId,
} from '@/lib/calculators/hyrox'
import { formatPaceMinPerKmPrecise, parsePaceMinPerKm } from '@/lib/athlete-preferences'
import { formatRaceTime, parseDurationToMinutes, parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import { cn } from '@/lib/utils'

const VALUE_INPUT =
  'h-7 w-[3.75rem] min-w-0 text-right text-sm font-semibold tabular-nums tracking-tight sm:w-[4.5rem]'
const APPROACH_INPUT =
  'h-7 w-10 min-w-0 text-right text-xs font-semibold tabular-nums tracking-tight sm:w-11'

const HEADER_CELL =
  'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

type HyroxTimeCalculatorProps = {
  state: HyroxCalculatorState
  onChange: (state: HyroxCalculatorState) => void
}

const SCENARIOS: { id: HyroxScenario; label: string }[] = [
  { id: 'recreational', label: 'Recreational' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'competitive', label: 'Competitive' },
]

const PACE_SLIDER_MIN = 3 * 60
const PACE_SLIDER_MAX = 8 * 60
const ERG_SLIDER_MIN = 90
const ERG_SLIDER_MAX = 3 * 60
const STATION_SLIDER_MIN = 30
const STATION_SLIDER_MAX = 10 * 60
const ROXZONE_SLIDER_MAX = 15 * 60

const STATION_RESULT_KEY: Record<HyroxStationId, keyof HyroxResult> = {
  ski: 'skiMin',
  sledPush: 'sledPushMin',
  sledPull: 'sledPullMin',
  burpees: 'burpeesMin',
  row: 'rowMin',
  farmers: 'farmersMin',
  lunges: 'lungesMin',
  wallBalls: 'wallBallsMin',
}

function parseFlexibleMinutes(input: string): number | null {
  return parseRaceTimeToMinutes(input) ?? parseDurationToMinutes(input)
}

function ResultCell({ minutes }: { minutes: number | null | undefined }) {
  return (
    <span
      className={cn(
        'block text-right text-sm font-semibold tabular-nums',
        minutes != null ? 'text-foreground' : 'text-muted-foreground/40',
      )}
    >
      {minutes != null ? formatHyroxTime(minutes) : '—'}
    </span>
  )
}

/** Cumulative clock after finishing this row — muted. */
function ElapsedCell({ minutes }: { minutes: number | null | undefined }) {
  return (
    <span
      className={cn(
        'block text-right text-sm tabular-nums',
        minutes != null ? 'text-muted-foreground' : 'text-muted-foreground/35',
      )}
    >
      {minutes != null ? formatHyroxTime(minutes) : '—'}
    </span>
  )
}

function Unit({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

function TableHeader({ showElapsed }: { showElapsed: boolean }) {
  return (
    <div
      className={cn(
        'hidden border-b border-border/50 bg-muted/30 sm:grid sm:items-center sm:gap-x-3 sm:px-4 sm:py-2',
        showElapsed
          ? 'sm:grid-cols-[minmax(7rem,1.1fr)_minmax(0,1fr)_minmax(6.25rem,0.8fr)_minmax(3.5rem,0.4fr)_minmax(4.25rem,0.55fr)]'
          : 'sm:grid-cols-[minmax(7.5rem,1.2fr)_minmax(0,1.2fr)_minmax(6.5rem,0.85fr)_minmax(3.75rem,0.45fr)]',
      )}
    >
      <span className={HEADER_CELL}>Station</span>
      <span aria-hidden />
      <span className={cn(HEADER_CELL, 'text-right')}>Pace</span>
      <span className={cn(HEADER_CELL, 'text-right')}>Time</span>
      {showElapsed ? (
        <span className={cn(HEADER_CELL, 'text-right leading-tight')}>
          Time after
          <br />
          station
        </span>
      ) : null}
    </div>
  )
}

function TableRow({
  label,
  hint,
  slider,
  value,
  resultMin,
  elapsedMin,
  showElapsed,
  emphasize,
  muted,
}: {
  label: string
  hint?: string
  slider?: ReactNode
  /** Pace sports only (Run / SkiErg / RowErg). */
  value?: ReactNode
  resultMin: number | null | undefined
  /** Race clock after this station — detailed plan only. */
  elapsedMin?: number | null
  showElapsed?: boolean
  emphasize?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'grid items-center gap-x-2 gap-y-1.5 border-b border-border/40 px-3 py-2.5 last:border-b-0 sm:gap-x-3 sm:px-4 sm:py-2',
        showElapsed
          ? '[grid-template-areas:"label_time"_"slider_slider"_"value_value"] grid-cols-[minmax(0,1fr)_auto] sm:[grid-template-areas:"label_slider_value_time_after"] sm:grid-cols-[minmax(7rem,1.1fr)_minmax(0,1fr)_minmax(6.25rem,0.8fr)_minmax(3.5rem,0.4fr)_minmax(4.25rem,0.55fr)]'
          : '[grid-template-areas:"label_time"_"slider_slider"_"value_value"] grid-cols-[minmax(0,1fr)_auto] sm:[grid-template-areas:"label_slider_value_time"] sm:grid-cols-[minmax(7.5rem,1.2fr)_minmax(0,1.2fr)_minmax(6.5rem,0.85fr)_minmax(3.75rem,0.45fr)]',
        emphasize && 'bg-muted/25',
        muted && 'bg-orange-500/[0.04]',
      )}
    >
      <div className="min-w-0 [grid-area:label]">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            muted ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {label}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{hint}</p>
        ) : null}
      </div>

      <div className="min-w-0 [grid-area:slider]">{slider ?? null}</div>

      <div className="flex min-w-0 justify-end [grid-area:value]">{value ?? null}</div>

      <div className="flex flex-col items-end justify-center [grid-area:time]">
        <ResultCell minutes={resultMin} />
        {showElapsed ? (
          <span className="text-[10px] tabular-nums text-muted-foreground sm:hidden">
            after {elapsedMin != null ? formatHyroxTime(elapsedMin) : '—'}
          </span>
        ) : null}
      </div>

      {showElapsed ? (
        <div className="hidden [grid-area:after] sm:block">
          <ElapsedCell minutes={elapsedMin} />
        </div>
      ) : null}
    </div>
  )
}

/** Running total through row index; null if any prior segment is missing. */
function cumulativeThrough(
  segments: Array<number | null | undefined>,
  index: number,
): number | null {
  let sum = 0
  for (let i = 0; i <= index; i++) {
    const part = segments[i]
    if (part == null) return null
    sum += part
  }
  return sum
}

function PaceSlider({
  value,
  onChange,
  ariaLabel,
  minSec,
  maxSec,
  fallbackSec,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  minSec: number
  maxSec: number
  fallbackSec: number
}) {
  const parsed = parsePaceMinPerKm(value)
  const sliderSec = parsed != null ? Math.round(parsed * 60) : fallbackSec

  return (
    <CalculatorValueSlider
      value={sliderSec}
      min={minSec}
      max={maxSec}
      step={1}
      compact
      onChange={(sec) => onChange(formatPaceMinPerKmPrecise(sec / 60))}
      aria-label={`Adjust ${ariaLabel}`}
    />
  )
}

function DurationSlider({
  value,
  onChange,
  ariaLabel,
  minSec = STATION_SLIDER_MIN,
  maxSec = STATION_SLIDER_MAX,
  fallbackSec = 180,
  step = 5,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  minSec?: number
  maxSec?: number
  fallbackSec?: number
  step?: number
}) {
  const minutes = parseFlexibleMinutes(value)
  const sliderSec = minutes != null ? Math.round(minutes * 60) : fallbackSec

  return (
    <CalculatorValueSlider
      value={sliderSec}
      min={minSec}
      max={maxSec}
      step={step}
      compact
      onChange={(sec) => onChange(formatRaceTime(sec / 60))}
      aria-label={`Adjust ${ariaLabel}`}
    />
  )
}

function PaceValue({
  value,
  onChange,
  placeholder,
  ariaLabel,
  unit,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  unit: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        variant="ghost"
        className={VALUE_INPUT}
        aria-label={ariaLabel}
      />
      <Unit>{unit}</Unit>
    </div>
  )
}

function ErgValue({
  pace,
  approachSec,
  onPaceChange,
  onApproachChange,
  paceLabel,
  approachLabel,
}: {
  pace: string
  approachSec: string
  onPaceChange: (value: string) => void
  onApproachChange: (value: string) => void
  paceLabel: string
  approachLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1">
      <PaceValue
        value={pace}
        onChange={onPaceChange}
        placeholder="2:00"
        ariaLabel={paceLabel}
        unit="/500m"
      />
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-muted-foreground">+</span>
        <Input
          value={approachSec}
          onChange={(e) => onApproachChange(e.target.value)}
          placeholder="15"
          inputMode="numeric"
          variant="ghost"
          className={APPROACH_INPUT}
          aria-label={approachLabel}
        />
        <Unit>sec</Unit>
      </div>
    </div>
  )
}

function stationMinutes(result: HyroxResult, id: HyroxStationId): number | null {
  const key = STATION_RESULT_KEY[id]
  const value = result[key]
  return typeof value === 'number' ? value : null
}

export function HyroxTimeCalculator({ state, onChange }: HyroxTimeCalculatorProps) {
  const [detailedPlan, setDetailedPlan] = useState(false)
  const result = useMemo(() => computeHyroxResult(state), [state])
  const runLapMin = useMemo(() => parsePaceMinPerKm(state.runPace), [state.runPace])

  function patch(partial: Partial<HyroxCalculatorState>) {
    onChange({ ...state, ...partial, scenario: 'custom' })
  }

  function applyScenario(scenario: HyroxScenario) {
    onChange({
      scenario,
      ...HYROX_SCENARIO_DEFAULTS[scenario],
    })
  }

  const share = (minutes: number) => {
    if (!result.totalMin || result.totalMin <= 0) return 0
    if (minutes <= 0) return 0
    return Math.max(1, Math.round((minutes / result.totalMin) * 100))
  }

  const racePlanSegments = useMemo(() => {
    const parts: Array<number | null> = []
    for (let i = 0; i < HYROX_STATIONS.length; i++) {
      parts.push(runLapMin)
      parts.push(stationMinutes(result, HYROX_STATIONS[i]!.id))
    }
    parts.push(result.roxzoneMin)
    return parts
  }, [result, runLapMin])

  const raceElapsed = (index: number) => cumulativeThrough(racePlanSegments, index)

  const runPaceControls = {
    slider: (
      <PaceSlider
        value={state.runPace}
        onChange={(runPace) => patch({ runPace })}
        ariaLabel="Run pace per kilometre"
        minSec={PACE_SLIDER_MIN}
        maxSec={PACE_SLIDER_MAX}
        fallbackSec={285}
      />
    ),
    value: (
      <PaceValue
        value={state.runPace}
        onChange={(runPace) => patch({ runPace })}
        placeholder="4:45"
        ariaLabel="Run pace per kilometre"
        unit="/km"
      />
    ),
  }

  function renderStationRow(
    id: HyroxStationId,
    opts: { showElapsed?: boolean; elapsedMin?: number | null; hint?: string } = {},
  ) {
    const minutes = stationMinutes(result, id)

    if (id === 'ski') {
      return (
        <TableRow
          key="ski"
          label="SkiErg"
          hint={opts.hint ?? '1000 m + approach'}
          showElapsed={opts.showElapsed}
          elapsedMin={opts.elapsedMin}
          slider={
            <PaceSlider
              value={state.skiPacePer500}
              onChange={(skiPacePer500) => patch({ skiPacePer500 })}
              ariaLabel="SkiErg pace per 500 metres"
              minSec={ERG_SLIDER_MIN}
              maxSec={ERG_SLIDER_MAX}
              fallbackSec={120}
            />
          }
          value={
            <ErgValue
              pace={state.skiPacePer500}
              approachSec={state.skiApproachSec}
              onPaceChange={(skiPacePer500) => patch({ skiPacePer500 })}
              onApproachChange={(skiApproachSec) => patch({ skiApproachSec })}
              paceLabel="SkiErg pace per 500 metres"
              approachLabel="SkiErg approach seconds from arc"
            />
          }
          resultMin={minutes}
        />
      )
    }

    if (id === 'row') {
      return (
        <TableRow
          key="row"
          label="RowErg"
          hint={opts.hint ?? '1000 m + approach'}
          showElapsed={opts.showElapsed}
          elapsedMin={opts.elapsedMin}
          slider={
            <PaceSlider
              value={state.rowPacePer500}
              onChange={(rowPacePer500) => patch({ rowPacePer500 })}
              ariaLabel="RowErg pace per 500 metres"
              minSec={ERG_SLIDER_MIN}
              maxSec={ERG_SLIDER_MAX}
              fallbackSec={120}
            />
          }
          value={
            <ErgValue
              pace={state.rowPacePer500}
              approachSec={state.rowApproachSec}
              onPaceChange={(rowPacePer500) => patch({ rowPacePer500 })}
              onApproachChange={(rowApproachSec) => patch({ rowApproachSec })}
              paceLabel="RowErg pace per 500 metres"
              approachLabel="RowErg approach seconds from arc"
            />
          }
          resultMin={minutes}
        />
      )
    }

    const field =
      id === 'sledPush'
        ? ('sledPush' as const)
        : id === 'sledPull'
          ? ('sledPull' as const)
          : id === 'burpees'
            ? ('burpees' as const)
            : id === 'farmers'
              ? ('farmers' as const)
              : id === 'lunges'
                ? ('lunges' as const)
                : ('wallBalls' as const)

    const label = HYROX_STATIONS.find((s) => s.id === id)!.label

    return (
      <TableRow
        key={id}
        label={label}
        showElapsed={opts.showElapsed}
        elapsedMin={opts.elapsedMin}
        slider={
          <DurationSlider
            value={state[field]}
            onChange={(next) => patch({ [field]: next })}
            ariaLabel={`${label} time`}
          />
        }
        resultMin={minutes}
      />
    )
  }

  return (
    <div className="space-y-4">
      <CalculatorHeroCard
        action={
          <Caption className="hidden max-w-[14rem] text-right normal-case tracking-normal sm:block">
            8×1 km + stations · table view
          </Caption>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Starting point
            </p>
            <SegmentedControl aria-label="HYROX scenario">
              {SCENARIOS.map(({ id, label }) => (
                <SegmentedControlItem
                  key={id}
                  active={state.scenario === id}
                  onClick={() => applyScenario(id)}
                >
                  {label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <div className="rounded-[6px] border border-border/60 bg-muted/20 px-3 py-3 text-center sm:px-4 sm:py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estimated finish
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {result.totalMin != null ? formatHyroxTime(result.totalMin) : '—'}
            </p>
          </div>

          <div className="overflow-hidden rounded-[6px] border border-border/60">
            <TableHeader showElapsed={detailedPlan} />
            {!detailedPlan ? (
              <>
                <TableRow
                  label="Run pace"
                  hint="8 × 1 km"
                  emphasize
                  slider={runPaceControls.slider}
                  value={runPaceControls.value}
                  resultMin={result.runMin}
                />
                {HYROX_STATIONS.map((station) => renderStationRow(station.id))}
                <TableRow
                  label="Roxzone"
                  hint="Total transition time"
                  emphasize
                  slider={
                    <DurationSlider
                      value={state.roxzoneTotal}
                      onChange={(roxzoneTotal) => patch({ roxzoneTotal })}
                      ariaLabel="Total Roxzone time"
                      minSec={60}
                      maxSec={ROXZONE_SLIDER_MAX}
                      fallbackSec={280}
                      step={5}
                    />
                  }
                  resultMin={result.roxzoneMin}
                />
              </>
            ) : (
              <>
                {HYROX_STATIONS.map((station, stationIndex) => {
                  const runSegIndex = stationIndex * 2
                  const stationSegIndex = runSegIndex + 1
                  return (
                    <div key={station.id}>
                      <TableRow
                        label={`Run ${stationIndex + 1}`}
                        hint="1 km"
                        muted
                        showElapsed
                        slider={stationIndex === 0 ? runPaceControls.slider : undefined}
                        value={stationIndex === 0 ? runPaceControls.value : undefined}
                        resultMin={runLapMin}
                        elapsedMin={raceElapsed(runSegIndex)}
                      />
                      {renderStationRow(station.id, {
                        showElapsed: true,
                        elapsedMin: raceElapsed(stationSegIndex),
                        hint: station.kind === 'erg1000' ? '1000 m + approach' : undefined,
                      })}
                    </div>
                  )
                })}
                <TableRow
                  label="Roxzone"
                  hint="Total transition time"
                  emphasize
                  showElapsed
                  slider={
                    <DurationSlider
                      value={state.roxzoneTotal}
                      onChange={(roxzoneTotal) => patch({ roxzoneTotal })}
                      ariaLabel="Total Roxzone time"
                      minSec={60}
                      maxSec={ROXZONE_SLIDER_MAX}
                      fallbackSec={280}
                      step={5}
                    />
                  }
                  resultMin={result.roxzoneMin}
                  elapsedMin={raceElapsed(racePlanSegments.length - 1)}
                />
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant={detailedPlan ? 'secondary' : 'ghost'}
              size="sm"
              aria-expanded={detailedPlan}
              onClick={() => setDetailedPlan((open) => !open)}
              className="gap-1.5"
            >
              Detailed race plan
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition', detailedPlan && 'rotate-180')}
                aria-hidden
              />
            </Button>
          </div>

          {result.totalMin != null ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Time share
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-orange-500"
                  style={{ width: `${share(result.runMin ?? 0)}%` }}
                  title="Running"
                />
                <div
                  className="bg-violet-500"
                  style={{ width: `${share(result.stationsMin ?? 0)}%` }}
                  title="Workouts"
                />
                <div
                  className="bg-zinc-400"
                  style={{ width: `${share(result.roxzoneMin ?? 0)}%` }}
                  title="Roxzone"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Running', value: result.runMin, color: 'bg-orange-500' },
                  { label: 'Workouts', value: result.stationsMin, color: 'bg-violet-500' },
                  { label: 'Roxzone', value: result.roxzoneMin, color: 'bg-zinc-400' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[6px] border border-border/50 px-2.5 py-2"
                  >
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} aria-hidden />
                      {item.label}
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                      {item.value != null ? formatHyroxTime(item.value) : '—'}
                      {item.value != null ? (
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({share(item.value)}%)
                        </span>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <FieldHint>
            {FORMAT.paceMinPerKm} · Ski/Row use /500 m pace (×2 for 1000 m) plus editable approach
            seconds from the run arc to the machine (default 15 s). Open Detailed race plan to see
            each 1 km run interleaved with stations and the cumulative race clock.
          </FieldHint>
        </div>
      </CalculatorHeroCard>
    </div>
  )
}
