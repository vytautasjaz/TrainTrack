/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { WorkoutType } from '@prisma/client'
import {
  CalendarDays,
  CloudSun,
  Columns2,
  Minus,
  Plus,
  Rows2,
  StickyNote,
} from 'lucide-react'
import { PlanTableView } from '@/components/plan/plan-table-view'
import { PlanWeekDndProvider } from '@/components/plan/plan-week-dnd'
import { CalendarPeriodNav } from '@/components/plan/calendar-period-nav'
import { EditDefaultPlanSportsButton } from '@/components/coach/edit-default-plan-sports-button'
import { AddPlanSportRowButton } from '@/components/coach/add-plan-sport-row-button'
import {
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import { availableExtraPlanSports } from '@/lib/plan-sports'
import {
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
  SHOW_WEATHER_SESSION_KEY,
  readSessionFlag,
  readStoredFlag,
  writeSessionFlag,
  writeStoredFlag,
} from '@/lib/plan-calendar-layers'
import type { PlanDay } from '@/lib/plan-week'
import type { WeatherPlace } from '@/lib/weather/places'
import { cn } from '@/lib/utils'
import { TABLE_FRAME } from '@/lib/table-styles'

const COMBINE_WEEKS_STORAGE_KEY = 'tt-combine-weeks'

export type PlanMultiWeekBlock = {
  weekStartKey: string
  weekLabel: string
  planDays: PlanDay[]
  weekExtraPlanSportRows: WorkoutType[]
  weekHiddenPlanSportRows: WorkoutType[]
}

export type WeatherLocation = {
  name: string
  lat: number
  lon: number
  isOverride: boolean
}

type PlanMultiWeekTablesProps = {
  weeks: PlanMultiWeekBlock[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  athleteName?: string
  planSportRows?: WorkoutType[]
  prevWeekHref: string
  nextWeekHref: string
  addWeekHref?: string | null
  removeWeekHref?: string | null
  header?: ReactNode
  swimCssSecPer100m?: number | null
  weatherLocation?: WeatherLocation | null
  /** Athlete preference: show forecast above workouts by default. */
  weatherVisibleByDefault?: boolean
}

const WEATHER_OVERRIDE_STORAGE_KEY = 'tt-weather-location-override'

function CombinedWeeksTable({
  weeks,
  isCoach,
  canEditDayNotes,
  athleteId,
  planSportRows,
  swimCssSecPer100m,
  showNotes,
  showEvents,
  showWeather,
  weatherLocation,
  onWeatherLocationSelect,
  onWeatherLocationReset,
}: {
  weeks: PlanMultiWeekBlock[]
  isCoach: boolean
  canEditDayNotes?: boolean
  athleteId?: string
  planSportRows: WorkoutType[]
  swimCssSecPer100m?: number | null
  showNotes: boolean
  showEvents: boolean
  showWeather: boolean
  weatherLocation?: WeatherLocation | null
  onWeatherLocationSelect?: (place: WeatherPlace) => void
  onWeatherLocationReset?: () => void
}) {
  const table = (
    <div className="hidden w-full landscape:max-lg:block lg:block">
      <div className="@container overflow-x-auto">
        <table
          className={cn(
            TABLE_FRAME,
            'w-full table-fixed text-left landscape:max-lg:text-[9px] lg:text-sm',
          )}
        >
          <colgroup>
            <col className="w-[11%]" />
            <col span={7} />
          </colgroup>
          {weeks.map((block, index) => (
            <PlanTableView
              key={block.weekStartKey}
              days={block.planDays}
              isCoach={isCoach}
              canEditDayNotes={canEditDayNotes}
              athleteId={athleteId}
              weekStartKey={block.weekStartKey}
              planSportRows={planSportRows}
              weekExtraPlanSportRows={block.weekExtraPlanSportRows}
              weekHiddenPlanSportRows={block.weekHiddenPlanSportRows}
              swimCssSecPer100m={swimCssSecPer100m}
              showNotes={showNotes}
              showEvents={showEvents}
              showWeather={showWeather}
              weatherLocation={weatherLocation}
              onWeatherLocationSelect={onWeatherLocationSelect}
              onWeatherLocationReset={onWeatherLocationReset}
              hideFooterRows
              tableFragment={index === 0 ? 'thead' : 'tbody-row'}
              skipDndProvider
            />
          ))}
        </table>
      </div>
    </div>
  )

  const portrait = (
    <div className="space-y-4 portrait:max-lg:block landscape:max-lg:hidden lg:hidden">
      {weeks.map((block) => (
        <PlanTableView
          key={block.weekStartKey}
          days={block.planDays}
          isCoach={isCoach}
          canEditDayNotes={canEditDayNotes}
          athleteId={athleteId}
          weekStartKey={block.weekStartKey}
          planSportRows={planSportRows}
          weekExtraPlanSportRows={block.weekExtraPlanSportRows}
          weekHiddenPlanSportRows={block.weekHiddenPlanSportRows}
          swimCssSecPer100m={swimCssSecPer100m}
          showNotes={showNotes}
          showEvents={showEvents}
          showWeather={showWeather}
          weatherLocation={weatherLocation}
          onWeatherLocationSelect={onWeatherLocationSelect}
          onWeatherLocationReset={onWeatherLocationReset}
          hideFooterRows
          skipDndProvider
        />
      ))}
    </div>
  )

  return (
    <>
      {portrait}
      {table}
    </>
  )
}

export function PlanMultiWeekTables({
  weeks,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  athleteName,
  planSportRows = [],
  prevWeekHref,
  nextWeekHref,
  addWeekHref,
  removeWeekHref,
  header,
  swimCssSecPer100m = null,
  weatherLocation = null,
  weatherVisibleByDefault = true,
}: PlanMultiWeekTablesProps) {
  const canCombine = weeks.length > 1
  const [combined, setCombined] = useState(true)
  const [showNotes, setShowNotes] = useState(() =>
    readStoredFlag(SHOW_NOTES_STORAGE_KEY, true),
  )
  const [showEvents, setShowEvents] = useState(() =>
    readStoredFlag(SHOW_EVENTS_STORAGE_KEY, true),
  )
  const [showWeather, setShowWeather] = useState(weatherVisibleByDefault)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMBINE_WEEKS_STORAGE_KEY)
      if (stored === '0') setCombined(false)
      else setCombined(true)
    } catch {
      setCombined(true)
    }
  }, [])

  useEffect(() => {
    const sessionOverride = readSessionFlag(SHOW_WEATHER_SESSION_KEY)
    setShowWeather(sessionOverride ?? weatherVisibleByDefault)
  }, [weatherVisibleByDefault])

  useEffect(() => {
    const hasQueryOverride = searchParams.has('wlat') && searchParams.has('wlon')
    if (hasQueryOverride) return
    try {
      const raw = localStorage.getItem(WEATHER_OVERRIDE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { lat?: string; lon?: string; name?: string }
      if (!parsed.lat || !parsed.lon) return
      const next = new URLSearchParams(searchParams.toString())
      next.set('wlat', parsed.lat)
      next.set('wlon', parsed.lon)
      if (parsed.name) next.set('wname', parsed.name)
      router.replace(`${pathname}?${next.toString()}`)
    } catch {
      /* ignore */
    }
  }, [pathname, router, searchParams])

  function setCombineWeeks(next: boolean) {
    setCombined(next)
    try {
      localStorage.setItem(COMBINE_WEEKS_STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function toggleShowNotes() {
    setShowNotes((prev) => {
      const next = !prev
      writeStoredFlag(SHOW_NOTES_STORAGE_KEY, next)
      return next
    })
  }

  function toggleShowEvents() {
    setShowEvents((prev) => {
      const next = !prev
      writeStoredFlag(SHOW_EVENTS_STORAGE_KEY, next)
      return next
    })
  }

  function toggleShowWeather() {
    setShowWeather((prev) => {
      const next = !prev
      writeSessionFlag(SHOW_WEATHER_SESSION_KEY, next)
      return next
    })
  }

  function applyWeatherOverride(place: WeatherPlace) {
    const lat = place.lat
    const lon = place.lon
    const nameRaw = place.label
    const next = new URLSearchParams(searchParams.toString())
    next.set('wlat', String(Math.round(lat * 10000) / 10000))
    next.set('wlon', String(Math.round(lon * 10000) / 10000))
    if (nameRaw) next.set('wname', nameRaw)
    else next.delete('wname')
    try {
      localStorage.setItem(
        WEATHER_OVERRIDE_STORAGE_KEY,
        JSON.stringify({ lat: next.get('wlat'), lon: next.get('wlon'), name: next.get('wname') ?? '' }),
      )
    } catch {
      /* ignore */
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  function resetWeatherOverride() {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('wlat')
    next.delete('wlon')
    next.delete('wname')
    try {
      localStorage.removeItem(WEATHER_OVERRIDE_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  const showCombined = canCombine && combined

  const combinedLabel = useMemo(() => {
    if (weeks.length === 0) return ''
    const first = weeks[0]?.weekLabel ?? ''
    const last = weeks[weeks.length - 1]?.weekLabel ?? ''
    if (weeks.length === 1) return first
    const start = first.split('–')[0]?.trim() ?? first
    const end = last.includes('–')
      ? last.split('–').slice(1).join('–').trim()
      : last
    return `${start} – ${end}`
  }, [weeks])

  const first = weeks[0]
  const typesInFirst = new Set(
    (first?.planDays ?? []).flatMap((d) => d.workouts.map((w) => w.type)),
  )
  const addableSports =
    isCoach && athleteId && first
      ? availableExtraPlanSports(
          planSportRows,
          first.weekExtraPlanSportRows,
          typesInFirst,
          first.weekHiddenPlanSportRows,
        )
      : []

  const toolbar = (
    <div className="mb-2 flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
      <CalendarPeriodNav
        label={combinedLabel}
        prevHref={prevWeekHref}
        nextHref={nextWeekHref}
        prevAriaLabel="Previous week"
        nextAriaLabel="Next week"
        align="start"
        className="mb-0 shrink-0"
      />

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1">
        <PlanSportFilterBar className="shrink-0" />

        <ToolbarDivider className="mx-1.5" />

        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarTextToggle
            pressed={showNotes}
            onClick={toggleShowNotes}
            title={showNotes ? 'Hide day notes' : 'Show day notes'}
          >
            <StickyNote className="h-3 w-3" aria-hidden />
            Notes
          </ToolbarTextToggle>
          <ToolbarTextToggle
            pressed={showEvents}
            onClick={toggleShowEvents}
            title={showEvents ? 'Hide season events' : 'Show season events'}
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            Events
          </ToolbarTextToggle>
          <ToolbarTextToggle
            pressed={showWeather}
            onClick={toggleShowWeather}
            title={showWeather ? 'Hide weather' : 'Show weather'}
          >
            <CloudSun className="h-3 w-3" aria-hidden />
            Weather
          </ToolbarTextToggle>
        </div>

        <ToolbarDivider className="mx-1.5" />

        <PlanViewModeControl className="shrink-0" />

        {isCoach && athleteId && athleteName && first ? (
          <>
            <ToolbarDivider className="mx-1.5" />
            <div className="flex shrink-0 flex-nowrap items-center gap-1">
              <EditDefaultPlanSportsButton
                athleteId={athleteId}
                athleteName={athleteName}
                planSportRows={planSportRows}
              />
              <AddPlanSportRowButton
                athleteId={athleteId}
                weekStartKey={first.weekStartKey}
                availableSports={addableSports}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )

  const footerControls =
    canCombine || addWeekHref || removeWeekHref ? (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canCombine ? (
          <button
            type="button"
            onClick={() => setCombineWeeks(!showCombined)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5',
              'text-xs font-medium transition',
              showCombined
                ? 'border-foreground/30 text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={showCombined}
          >
            {showCombined ? (
              <Columns2 className="h-3.5 w-3.5" />
            ) : (
              <Rows2 className="h-3.5 w-3.5" />
            )}
            {showCombined ? 'Separate weeks' : 'Combine weeks'}
          </button>
        ) : null}
        {addWeekHref ? (
          <Link
            href={addWeekHref}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5',
              'text-xs font-medium text-muted-foreground transition hover:text-foreground',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add week
          </Link>
        ) : null}
        {removeWeekHref ? (
          <Link
            href={removeWeekHref}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5',
              'text-xs font-medium text-muted-foreground transition hover:text-foreground',
            )}
          >
            <Minus className="h-3.5 w-3.5" />
            Remove week
          </Link>
        ) : null}
      </div>
    ) : null

  const combinedContent = (
    <CombinedWeeksTable
      weeks={weeks}
      isCoach={isCoach}
      canEditDayNotes={canEditDayNotes}
      athleteId={athleteId}
      planSportRows={planSportRows}
      swimCssSecPer100m={swimCssSecPer100m}
      showNotes={showNotes}
      showEvents={showEvents}
      showWeather={showWeather}
      weatherLocation={weatherLocation}
      onWeatherLocationSelect={applyWeatherOverride}
      onWeatherLocationReset={resetWeatherOverride}
    />
  )

  return (
    <div className="space-y-4">
      {header}
      {toolbar}
      {showCombined ? (
        <PlanWeekDndProvider mode={isCoach ? 'coach' : 'athlete'}>
          {combinedContent}
        </PlanWeekDndProvider>
      ) : (
        <div className="space-y-6">
          {weeks.map((block) => (
            <PlanTableView
              key={block.weekStartKey}
              days={block.planDays}
              isCoach={isCoach}
              canEditDayNotes={canEditDayNotes}
              athleteId={athleteId}
              weekStartKey={block.weekStartKey}
              planSportRows={planSportRows}
              weekExtraPlanSportRows={block.weekExtraPlanSportRows}
              weekHiddenPlanSportRows={block.weekHiddenPlanSportRows}
              swimCssSecPer100m={swimCssSecPer100m}
              showNotes={showNotes}
              showEvents={showEvents}
              showWeather={showWeather}
              weatherLocation={weatherLocation}
              onWeatherLocationSelect={applyWeatherOverride}
              onWeatherLocationReset={resetWeatherOverride}
            />
          ))}
        </div>
      )}
      {footerControls}
    </div>
  )
}
