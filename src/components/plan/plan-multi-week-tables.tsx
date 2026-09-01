/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { WorkoutType } from '@prisma/client'
import {
  CloudSun,
  CalendarDays,
  Columns2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Rows2,
  StickyNote,
} from 'lucide-react'
import { PlanTableView } from '@/components/plan/plan-table-view'
import { PlanWeekDndProvider, PlanWeekDndErrorBanner } from '@/components/plan/plan-week-dnd'
import { CalendarPeriodNav } from '@/components/plan/calendar-period-nav'
import { EditDefaultPlanSportsButton } from '@/components/coach/edit-default-plan-sports-button'
import { AddPlanSportRowButton } from '@/components/coach/add-plan-sport-row-button'
import {
  PlanSportFilterBar,
  PlanViewModeControl,
  ToolbarDivider,
  ToolbarFilterGroup,
  ToolbarTextToggle,
} from '@/components/training/plan-sport-filter-bar'
import {
  WeekCardSizeProvider,
  useWeekCardSize,
} from '@/components/plan/week-card-size-context'
import { WeekCardSizeSwitch } from '@/components/plan/week-card-size-switch'
import { FeedbackLayerToggle } from '@/components/training/feedback-layer-toggle'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { useTrainingLibrary } from '@/components/training/training-library-context'
import { TrainingLibraryToolbarToggle } from '@/components/training/training-library-toolbar-toggle'
import { availableExtraPlanSports } from '@/lib/plan-sports'
import {
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
  SHOW_WEATHER_SESSION_KEY,
  readSessionFlag,
  writeSessionFlag,
} from '@/lib/plan-calendar-layers'
import { useStoredFlag } from '@/hooks/use-stored-flag'
import { setCalendarExpanded } from '@/lib/calendar-expand'
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
  athleteAvatarUrl?: string | null
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

function WeekCardSizeToolbarControl() {
  const { cardSize, setCardSize } = useWeekCardSize()
  return <WeekCardSizeSwitch value={cardSize} onChange={setCardSize} />
}

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
  const { cardSize } = useWeekCardSize()

  const table = (
    <div className="hidden w-full landscape:max-lg:block lg:block">
      <div className="@container overflow-hidden rounded-[0.5rem]">
        <div className="overflow-x-auto">
        <table
          className={cn(
            TABLE_FRAME,
            'w-full table-fixed text-left landscape:max-lg:text-[9px] lg:text-sm',
          )}
          data-card-size={cardSize}
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
  athleteAvatarUrl,
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
  const [showNotes, setShowNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true)
  const [showEvents, setShowEvents] = useStoredFlag(
    SHOW_EVENTS_STORAGE_KEY,
    true,
  )
  const [showWeather, setShowWeather] = useState(weatherVisibleByDefault)
  const [expanded, setExpanded] = useState(false)
  const library = useTrainingLibrary()
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
    return () => {
      setCalendarExpanded(false)
    }
  }, [])

  useEffect(() => {
    if (!expanded) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setExpanded(false)
        setCalendarExpanded(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

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
    setShowNotes((prev) => !prev)
  }

  function toggleShowEvents() {
    setShowEvents((prev) => !prev)
  }

  function toggleShowWeather() {
    setShowWeather((prev) => {
      const next = !prev
      writeSessionFlag(SHOW_WEATHER_SESSION_KEY, next)
      return next
    })
  }

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev
      setCalendarExpanded(next)
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

  const showWeekFooter = canCombine || Boolean(addWeekHref) || Boolean(removeWeekHref)
  const showRowSettings = Boolean(
    isCoach && athleteId && athleteName && first,
  )

  const toolbar = (
    <div className="mb-2 flex min-w-0 items-end gap-1 overflow-x-auto pb-0.5">
      <div className="mb-0.5 flex min-w-0 shrink-0 items-end gap-3">
        {expanded && isCoach && athleteName ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <AthleteAvatar
              name={athleteName}
              avatarUrl={athleteAvatarUrl}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Planning for
              </p>
              <p className="truncate text-sm font-semibold leading-tight text-[var(--tt-ink,#111)]">
                {athleteName}
              </p>
            </div>
          </div>
        ) : null}
        <CalendarPeriodNav
          label={combinedLabel}
          prevHref={prevWeekHref}
          nextHref={nextWeekHref}
          prevAriaLabel="Previous week"
          nextAriaLabel="Next week"
          align="start"
          className="mb-0 shrink-0"
        />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-end gap-2">
        <ToolbarFilterGroup
          label="Filter"
          hint="Show or hide sports and workout statuses in the week grid"
        >
          <PlanSportFilterBar className="shrink-0" />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Layers"
          hint="Toggle Notes, Events, Weather, and Feedback on cards"
        >
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
              title={showWeather ? 'Hide weather row' : 'Show weather row'}
            >
              <CloudSun className="h-3 w-3" aria-hidden />
              Weather
            </ToolbarTextToggle>
            <FeedbackLayerToggle />
          </div>
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="View"
          hint="How workout cards are colored in the week grid"
        >
          <PlanViewModeControl className="shrink-0" />
        </ToolbarFilterGroup>

        <ToolbarDivider className="mb-1.5 mx-0.5" />

        <ToolbarFilterGroup
          label="Cards"
          hint="Week card density and expanded calendar"
        >
          <div className="flex items-center gap-0.5">
            <WeekCardSizeToolbarControl />
            <ToolbarTextToggle
              pressed={expanded}
              onClick={toggleExpanded}
              title={expanded ? 'Exit expanded view' : 'Expand week plan'}
              className="font-semibold text-foreground hover:text-foreground [&_svg]:opacity-100"
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </ToolbarTextToggle>
          </div>
        </ToolbarFilterGroup>

        {library ? (
          <>
            <ToolbarDivider className="mb-1.5 mx-0.5" />
            <ToolbarFilterGroup
              label="Library"
              hint="Open or close the workout library panel"
            >
              <TrainingLibraryToolbarToggle />
            </ToolbarFilterGroup>
          </>
        ) : null}
      </div>
    </div>
  )

  const footerControls =
    showWeekFooter || showRowSettings ? (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
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
        {showRowSettings && athleteId && athleteName && first ? (
          <div className="ml-auto flex flex-wrap items-center gap-1">
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
    <WeekCardSizeProvider>
      <div
        className={cn(
          'space-y-4',
          expanded && 'tt-calendar-expanded-root space-y-2',
        )}
      >
        {header}
        {toolbar}
        {showCombined ? (
          <PlanWeekDndProvider mode={isCoach ? 'coach' : 'athlete'}>
            <PlanWeekDndErrorBanner className="mb-4" />
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
    </WeekCardSizeProvider>
  )
}
