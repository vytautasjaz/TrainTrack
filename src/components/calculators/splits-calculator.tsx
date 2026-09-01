'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  CalculatorHeroCard,
  CalculatorHeroColumns,
  CalculatorHeroField,
} from '@/components/calculators/calculator-hero-card'
import { CalculatorValueSlider } from '@/components/calculators/calculator-value-slider'
import { FieldHint } from '@/components/calculators/calculator-help'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Caption } from '@/components/ui/typography'
import { ValueUnitField } from '@/components/ui/value-unit-field'
import { formatPaceMinPerKmPrecise, parsePaceMinPerKm } from '@/lib/athlete-preferences'
import { formatSpeedKmh } from '@/lib/calculators/pace-zones'
import {
  computeSplitRows,
  resolveSplitsMotion,
  type SplitsCalculatorState,
  type SplitsMode,
  type SplitsSport,
} from '@/lib/calculators/splits'
import { formatRaceTime, parsePositiveFloat, parseRaceTimeToMinutes } from '@/lib/calculators/race-time'
import { cn } from '@/lib/utils'

const INPUT_CLASS =
  'h-10 w-full min-w-0 text-center text-lg font-semibold tabular-nums tracking-tight'

const PACE_SLIDER_MIN_SEC = 3 * 60
const PACE_SLIDER_MAX_SEC = 10 * 60
const BIKE_SPEED_MIN = 15
const BIKE_SPEED_MAX = 50
const DISTANCE_MIN = 1
const DISTANCE_MAX = 200
const FINISH_SLIDER_MIN_SEC = 10 * 60
const FINISH_SLIDER_MAX_SEC = 8 * 60 * 60

type SplitsCalculatorProps = {
  state: SplitsCalculatorState
  onChange: (state: SplitsCalculatorState) => void
}

function formatKm(km: number): string {
  if (Number.isInteger(km)) return String(km)
  return (Math.round(km * 100) / 100).toString()
}

function formatSpeed(kmh: number): string {
  return (Math.round(kmh * 10) / 10).toString()
}

/** Keep pace/speed + distance + finish always consistent. Distance is the anchor when finish changes. */
function syncFromRate(
  state: SplitsCalculatorState,
  next: { runPace?: string; bikeSpeedKmh?: string },
): Partial<SplitsCalculatorState> {
  const distance = parsePositiveFloat(state.distanceKm)
  if (state.sport === 'run') {
    const runPace = next.runPace ?? state.runPace
    const pace = parsePaceMinPerKm(runPace)
    if (pace == null || distance == null) return { runPace }
    return { runPace, distanceKm: state.distanceKm, finishTime: formatRaceTime(distance * pace) }
  }
  const bikeSpeedKmh = next.bikeSpeedKmh ?? state.bikeSpeedKmh
  const speed = parsePositiveFloat(bikeSpeedKmh)
  if (speed == null || distance == null) return { bikeSpeedKmh }
  return {
    bikeSpeedKmh,
    distanceKm: state.distanceKm,
    finishTime: formatRaceTime((distance / speed) * 60),
  }
}

function syncFromDistance(
  state: SplitsCalculatorState,
  distanceKm: string,
): Partial<SplitsCalculatorState> {
  const distance = parsePositiveFloat(distanceKm)
  if (state.sport === 'run') {
    const pace = parsePaceMinPerKm(state.runPace)
    if (pace == null || distance == null) return { distanceKm }
    return {
      distanceKm,
      runPace: state.runPace,
      finishTime: formatRaceTime(distance * pace),
    }
  }
  const speed = parsePositiveFloat(state.bikeSpeedKmh)
  if (speed == null || distance == null) return { distanceKm }
  return {
    distanceKm,
    bikeSpeedKmh: state.bikeSpeedKmh,
    finishTime: formatRaceTime((distance / speed) * 60),
  }
}

function syncFromFinish(
  state: SplitsCalculatorState,
  finishTime: string,
): Partial<SplitsCalculatorState> {
  const finishMin = parseRaceTimeToMinutes(finishTime)
  const distance = parsePositiveFloat(state.distanceKm)
  if (finishMin == null || distance == null || distance <= 0) return { finishTime }

  if (state.sport === 'run') {
    return {
      finishTime: formatRaceTime(finishMin),
      distanceKm: formatKm(distance),
      runPace: formatPaceMinPerKmPrecise(finishMin / distance),
    }
  }
  return {
    finishTime: formatRaceTime(finishMin),
    distanceKm: formatKm(distance),
    bikeSpeedKmh: formatSpeed(distance / (finishMin / 60)),
  }
}

/** Quick picks that fit under the current total distance/time. */
function splitQuickPicks(
  mode: SplitsMode,
  totalKm: number | null,
  totalMin: number | null,
): { value: string; label: string }[] {
  if (mode === 'distance') {
    const candidates = [0.5, 1, 2, 3, 5, 10, 15, 20]
    const limit = totalKm != null && totalKm > 0 ? totalKm : 50
    return candidates
      .filter((km) => km < limit)
      .map((km) => ({
        value: String(km),
        label: `${km} km`,
      }))
  }

  const candidates = [5, 10, 15, 20, 30, 45, 60]
  const limit = totalMin != null && totalMin > 0 ? totalMin : 180
  return candidates
    .filter((min) => min < limit)
    .map((min) => ({
      value: String(min),
      label: `${min} min`,
    }))
}

const SPLIT_UNIT_OPTIONS = [
  { value: 'km', label: 'km' },
  { value: 'min', label: 'min' },
] as const

export function SplitsCalculator({ state, onChange }: SplitsCalculatorProps) {
  const motion = useMemo(() => resolveSplitsMotion(state), [state])
  const rows = useMemo(() => computeSplitRows(state), [state])

  const isRun = state.sport === 'run'
  const paceMinPerKm = motion.paceMinPerKm ?? parsePaceMinPerKm(state.runPace)
  const paceSliderSec = paceMinPerKm != null ? Math.round(paceMinPerKm * 60) : null
  const bikeSpeedValue =
    !isRun && motion.speedKmh != null
      ? motion.speedKmh
      : parsePositiveFloat(state.bikeSpeedKmh)
  const distanceValue = motion.distanceKm ?? parsePositiveFloat(state.distanceKm)
  const finishSliderSec =
    motion.finishMin != null ? Math.round(motion.finishMin * 60) : null

  function patch(partial: Partial<SplitsCalculatorState>) {
    onChange({ ...state, ...partial })
  }

  function setSport(sport: SplitsSport) {
    if (sport === state.sport) return
    const distance = state.distanceKm.trim()
      ? state.distanceKm
      : sport === 'bike'
        ? '40'
        : '10'
    const base = { ...state, sport, distanceKm: distance }
    if (sport === 'bike') {
      const bikeSpeedKmh = state.bikeSpeedKmh.trim() ? state.bikeSpeedKmh : '30'
      patch({ sport, ...syncFromRate({ ...base, bikeSpeedKmh }, { bikeSpeedKmh }) })
      return
    }
    const runPace = state.runPace.trim() ? state.runPace : '5:00'
    patch({ sport, ...syncFromRate({ ...base, runPace }, { runPace }) })
  }

  function setSplitMode(splitMode: SplitsMode) {
    patch({ splitMode })
  }

  function setSplitUnit(unit: string) {
    setSplitMode(unit === 'min' ? 'time' : 'distance')
  }

  function setSplitEvery(value: string) {
    if (state.splitMode === 'distance') {
      patch({ splitEveryKm: value })
      return
    }
    patch({ splitEveryMin: value })
  }

  const splitEveryValue =
    state.splitMode === 'distance' ? state.splitEveryKm : state.splitEveryMin
  const quickPicks = splitQuickPicks(state.splitMode, motion.distanceKm, motion.finishMin)

  function handlePaceChange(runPace: string) {
    patch(syncFromRate(state, { runPace }))
  }

  function handlePaceSlider(sec: number) {
    handlePaceChange(formatPaceMinPerKmPrecise(sec / 60))
  }

  function handleBikeSpeedChange(bikeSpeedKmh: string) {
    patch(syncFromRate(state, { bikeSpeedKmh }))
  }

  function handleBikeSpeedSlider(kmh: number) {
    handleBikeSpeedChange(formatSpeed(kmh))
  }

  function handleDistanceChange(distanceKm: string) {
    patch(syncFromDistance(state, distanceKm))
  }

  function handleDistanceSlider(km: number) {
    handleDistanceChange(formatKm(km))
  }

  function handleFinishChange(finishTime: string) {
    patch(syncFromFinish(state, finishTime))
  }

  function handleFinishSlider(sec: number) {
    handleFinishChange(formatRaceTime(sec / 60))
  }

  return (
    <div className="space-y-4">
      <CalculatorHeroCard
        action={
          <Caption className="max-w-[16rem] text-right normal-case tracking-normal">
            Pace or speed · distance · finish · splits
          </Caption>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sport
            </p>
            <SegmentedControl aria-label="Splits sport">
              <SegmentedControlItem active={state.sport === 'run'} onClick={() => setSport('run')}>
                Run
              </SegmentedControlItem>
              <SegmentedControlItem active={state.sport === 'bike'} onClick={() => setSport('bike')}>
                Bike
              </SegmentedControlItem>
            </SegmentedControl>
          </div>

          <CalculatorHeroColumns
            columns={[
              {
                content: isRun ? (
                  <CalculatorHeroField
                    label="Pace"
                    unit="/km"
                    align="center"
                    secondary={
                      motion.speedKmh != null ? (
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {formatSpeedKmh(motion.speedKmh)}
                        </p>
                      ) : null
                    }
                  >
                    <Input
                      value={state.runPace}
                      onChange={(e) => handlePaceChange(e.target.value)}
                      placeholder="5:00"
                      variant="ghost"
                      className={INPUT_CLASS}
                      aria-label="Run pace per kilometre"
                    />
                  </CalculatorHeroField>
                ) : (
                  <CalculatorHeroField label="Speed" unit="km/h" align="center">
                    <Input
                      value={state.bikeSpeedKmh}
                      onChange={(e) => handleBikeSpeedChange(e.target.value)}
                      placeholder="30"
                      inputMode="decimal"
                      variant="ghost"
                      className={INPUT_CLASS}
                      aria-label="Bike speed"
                    />
                  </CalculatorHeroField>
                ),
                control: isRun ? (
                  <CalculatorValueSlider
                    value={paceSliderSec}
                    min={PACE_SLIDER_MIN_SEC}
                    max={PACE_SLIDER_MAX_SEC}
                    step={1}
                    onChange={handlePaceSlider}
                    aria-label="Adjust pace"
                  />
                ) : (
                  <CalculatorValueSlider
                    value={bikeSpeedValue}
                    min={BIKE_SPEED_MIN}
                    max={BIKE_SPEED_MAX}
                    step={0.1}
                    onChange={handleBikeSpeedSlider}
                    aria-label="Adjust speed"
                  />
                ),
              },
              {
                content: (
                  <CalculatorHeroField label="Distance" unit="km" align="center">
                    <Input
                      value={state.distanceKm}
                      onChange={(e) => handleDistanceChange(e.target.value)}
                      placeholder="10"
                      inputMode="decimal"
                      variant="ghost"
                      className={INPUT_CLASS}
                      aria-label="Total distance"
                    />
                  </CalculatorHeroField>
                ),
                control: (
                  <CalculatorValueSlider
                    value={distanceValue}
                    min={DISTANCE_MIN}
                    max={DISTANCE_MAX}
                    step={1}
                    onChange={handleDistanceSlider}
                    aria-label="Adjust distance"
                  />
                ),
              },
              {
                content: (
                  <CalculatorHeroField label="Finish time" unit="h:mm:ss" align="center">
                    <Input
                      value={state.finishTime}
                      onChange={(e) => handleFinishChange(e.target.value)}
                      placeholder="50:00"
                      inputMode="numeric"
                      variant="ghost"
                      className={INPUT_CLASS}
                      aria-label="Finish time"
                    />
                  </CalculatorHeroField>
                ),
                control: (
                  <CalculatorValueSlider
                    value={finishSliderSec}
                    min={FINISH_SLIDER_MIN_SEC}
                    max={FINISH_SLIDER_MAX_SEC}
                    step={15}
                    onChange={handleFinishSlider}
                    aria-label="Adjust finish time"
                  />
                ),
              },
            ]}
          />

          <div className="space-y-2">
            <ValueUnitField
              label="Split every"
              unitValue={state.splitMode === 'distance' ? 'km' : 'min'}
              onUnitChange={setSplitUnit}
              unitOptions={[...SPLIT_UNIT_OPTIONS]}
              unitAriaLabel="Split unit"
              className="max-w-xs"
              shellClassName="h-10 min-w-[8.5rem] rounded-md"
            >
              <Input
                value={splitEveryValue}
                onChange={(e) => setSplitEvery(e.target.value)}
                placeholder={state.splitMode === 'distance' ? '1' : '15'}
                inputMode="decimal"
                variant="embedded"
                className="px-3 text-sm font-semibold tabular-nums"
                aria-label="Split interval"
              />
            </ValueUnitField>
            {quickPicks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {quickPicks.map((pick) => (
                  <Button
                    key={pick.value}
                    type="button"
                    size="xs"
                    variant={splitEveryValue === pick.value ? 'secondary' : 'ghost'}
                    onClick={() => setSplitEvery(pick.value)}
                  >
                    {pick.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[6px] border border-border/60">
            <div className="grid grid-cols-2 gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-4">
              <span>{state.splitMode === 'distance' ? 'Distance' : 'Time'}</span>
              <span>{state.splitMode === 'distance' ? 'Elapsed' : 'Distance'}</span>
            </div>

            {rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground sm:px-4">
                Enter pace/speed and distance (or finish time) to build the split table.
              </p>
            ) : (
              rows.map((row) => (
                <div
                  key={`${row.index}-${row.mark}`}
                  className={cn(
                    'grid grid-cols-2 gap-2 border-b border-border/40 px-3 py-2.5 text-center last:border-b-0 sm:px-4',
                    row.isFinish && 'bg-muted/25',
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {row.isFinish ? `Finish · ${row.mark}` : row.mark}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {state.splitMode === 'distance'
                      ? formatRaceTime(row.elapsedMin)
                      : `${formatKm(row.distanceKm)} km`}
                  </span>
                </div>
              ))
            )}
          </div>

          <FieldHint>
            Pace/speed, distance, and finish stay linked: change one and the others update. Split
            interval can be typed freely or picked from the quick options.
          </FieldHint>
        </div>
      </CalculatorHeroCard>
    </div>
  )
}
