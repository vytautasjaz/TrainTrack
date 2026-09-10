/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { WorkoutType } from '@prisma/client'
import {
  Columns2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Rows2,
} from 'lucide-react'
import { PlanTableView } from '@/components/plan/plan-table-view'
import { PlanWeekDndProvider, PlanWeekDndErrorBanner } from '@/components/plan/plan-week-dnd'
import { CalendarPeriodNav } from '@/components/plan/calendar-period-nav'
import { EditDefaultPlanSportsButton } from '@/components/coach/edit-default-plan-sports-button'
import { AddPlanSportRowButton } from '@/components/coach/add-plan-sport-row-button'
import {
  WeekCardSizeProvider,
  useWeekCardSize,
} from '@/components/plan/week-card-size-context'
import {
  WeekPortraitZoomProvider,
  useWeekPortraitZoom,
} from '@/components/plan/week-portrait-zoom-context'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { TrainingListFrame } from '@/components/training/training-list-frame'
import { TrainingListAddMenu } from '@/components/training/training-list-add-menu'
import { TrainingWeekToolbar } from '@/components/training/training-week-toolbar'
import {
  PageHeader,
  PageHeaderActions,
} from '@/components/ui/page-header'
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
import {
  addDateOnlyDays,
  formatDateOnly,
  parseDateOnly,
} from '@/lib/dates'
import type { PlanDay } from '@/lib/plan-week'
import type { WeatherPlace } from '@/lib/weather/places'
import { cn } from '@/lib/utils'
import { TABLE_FRAME } from '@/lib/table-styles'

const COMBINE_WEEKS_STORAGE_KEY = 'tt-combine-weeks'

/** Compact chrome label, e.g. "Sep 07 – Sep 13". */
function compactWeekNavLabel(weeks: PlanMultiWeekBlock[]): string {
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  if (!first || !last) return ''
  const start = parseDateOnly(first.weekStartKey)
  const end = addDateOnlyDays(parseDateOnly(last.weekStartKey), 6)
  return `${formatDateOnly(start, 'MMM dd')} – ${formatDateOnly(end, 'MMM dd')}`
}

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
  /** Title column under sticky chrome (eyebrow + “Training week.”). */
  stickyTitle?: ReactNode
  /** List / Week / Month switch only. */
  viewControls?: ReactNode
  canLogWorkout?: boolean
  canAddNote?: boolean
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
  forceLandscape = false,
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
  /** Expand mode: always use landscape matrix, even on a portrait phone. */
  forceLandscape?: boolean
}) {
  const { cardSize } = useWeekCardSize()
  const { zoom: portraitZoom } = useWeekPortraitZoom()

  const table = (
    <div
      className={cn(
        'w-full',
        forceLandscape
          ? 'block'
          : 'hidden landscape:max-lg:block lg:block',
      )}
    >
      <div className="@container overflow-hidden rounded-[0.5rem]">
        <div
          className="tt-week-matrix-scroll overflow-x-auto"
          data-week-portrait-zoom={forceLandscape ? 'fit' : portraitZoom}
        >
        <table
          className={cn(
            TABLE_FRAME,
            'tt-week-matrix-table w-full table-fixed text-left landscape:max-lg:text-[9px] lg:text-sm',
            forceLandscape && 'text-[9px] max-lg:text-[9px]',
          )}
          data-card-size={cardSize}
        >
          <colgroup>
            <col className="tt-week-label-col w-[11%]" />
            <col className="tt-week-day-col" span={7} />
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

  if (forceLandscape) {
    return table
  }

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
  stickyTitle,
  viewControls,
  canLogWorkout = false,
  canAddNote = false,
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
  /** Phone/tablet width — expand uses the fullscreen stage (not desktop frame). */
  const [mobilePhone, setMobilePhone] = useState(false)
  /** Portrait vs landscape inside that stage (portrait = CSS-rotate fake landscape). */
  const [portraitPhone, setPortraitPhone] = useState(false)
  const landscapeAutoExpandRef = useRef(false)
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

  // Track phone/tablet + orientation for the expanded week stage.
  useEffect(() => {
    const mobileMq = window.matchMedia('(max-width: 1023px)')
    const portraitMq = window.matchMedia(
      '(max-width: 1023px) and (orientation: portrait)',
    )
    function sync() {
      setMobilePhone(mobileMq.matches)
      setPortraitPhone(portraitMq.matches)
    }
    sync()
    mobileMq.addEventListener('change', sync)
    portraitMq.addEventListener('change', sync)
    return () => {
      mobileMq.removeEventListener('change', sync)
      portraitMq.removeEventListener('change', sync)
    }
  }, [])

  // Phone/tablet landscape → expand; leave landscape → collapse only if we auto-opened it.
  useEffect(() => {
    const mq = window.matchMedia(
      '(max-width: 1023px) and (orientation: landscape)',
    )

    function syncLandscapeExpand() {
      if (mq.matches) {
        setExpanded((prev) => {
          if (!prev) landscapeAutoExpandRef.current = true
          return true
        })
        setCalendarExpanded(true)
        return
      }
      if (landscapeAutoExpandRef.current) {
        landscapeAutoExpandRef.current = false
        setExpanded(false)
        setCalendarExpanded(false)
      }
    }

    syncLandscapeExpand()
    mq.addEventListener('change', syncLandscapeExpand)
    return () => {
      mq.removeEventListener('change', syncLandscapeExpand)
      landscapeAutoExpandRef.current = false
      setCalendarExpanded(false)
    }
  }, [])

  // Lock horizontal page overflow while the Week matrix is mounted (portrait only).
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia(
      '(max-width: 1023px) and (orientation: portrait)',
    )

    function syncLock() {
      root.classList.toggle(
        'tt-week-portrait-lock',
        mq.matches && !expanded,
      )
    }

    syncLock()
    mq.addEventListener('change', syncLock)
    return () => {
      mq.removeEventListener('change', syncLock)
      root.classList.remove('tt-week-portrait-lock')
    }
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        landscapeAutoExpandRef.current = false
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
    const next = !expanded
    if (!next) landscapeAutoExpandRef.current = false
    setExpanded(next)
    setCalendarExpanded(next)
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

  const weekLabel =
    weeks.length <= 1
      ? (weeks[0]?.weekLabel ?? '')
      : (() => {
          const firstLabel = weeks[0]?.weekLabel ?? ''
          const lastLabel = weeks[weeks.length - 1]?.weekLabel ?? ''
          const start = firstLabel.split('–')[0]?.trim() ?? firstLabel
          const end = lastLabel.includes('–')
            ? lastLabel.split('–').slice(1).join('–').trim()
            : lastLabel
          return `${start} – ${end}`
        })()

  const weekNavLabel = compactWeekNavLabel(weeks)

  const weekToolbarProps = {
    showNotes,
    onToggleNotes: toggleShowNotes,
    showEvents,
    onToggleEvents: toggleShowEvents,
    showWeather,
    onToggleWeather: toggleShowWeather,
    expanded,
    onToggleExpanded: toggleExpanded,
  }

  const weekAddMenu = (
    <TrainingListAddMenu
      isCoach={isCoach}
      athleteId={athleteId}
      canAddNote={canAddNote}
      canLogWorkout={canLogWorkout}
    />
  )

  const expandToggleBtn = !expanded ? (
    <button
      type="button"
      onClick={toggleExpanded}
      className="tt-inbox-mobile-icon-btn"
      aria-label="Expand week plan"
      title="Expand week plan"
    >
      <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  ) : null

  const stickyHeader = (
    <PageHeader className="tt-inbox-page-header tt-training-list-page-header mb-0 pt-0 lg:mb-0 lg:pt-0">
      <div className="flex w-full min-w-0 flex-col gap-2.5 lg:gap-2">
        <div
          className={cn(
            'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5',
            'max-lg:[grid-template-areas:"title_actions"_"period_views"]',
            'lg:items-end lg:gap-y-2 lg:[grid-template-areas:"title_views"_"period_toolbar"]',
          )}
        >
          <div className="min-w-0 [grid-area:title]">{stickyTitle}</div>
          <div className="tt-inbox-mobile-header-actions [grid-area:actions] lg:hidden">
            {weekAddMenu}
            <TrainingWeekToolbar mobileOnly {...weekToolbarProps} />
            {expandToggleBtn}
          </div>
          <div className="min-w-0 justify-self-end [grid-area:views]">
            {viewControls}
          </div>
          <div className="hidden [grid-area:toolbar] lg:block">
            <PageHeaderActions className="ml-0 flex-col items-end gap-2 pt-0 sm:gap-2.5">
              <TrainingWeekToolbar desktopOnly {...weekToolbarProps} />
            </PageHeaderActions>
          </div>
          <div className="hidden min-w-0 [grid-area:period] lg:block">
            <CalendarPeriodNav
              label={weekLabel}
              prevHref={prevWeekHref}
              nextHref={nextWeekHref}
              prevAriaLabel="Previous week"
              nextAriaLabel="Next week"
              align="start"
              size="subtitle"
              className="mb-0 mt-1 min-w-0"
            />
          </div>
          <div className="min-w-0 [grid-area:period] lg:hidden">
            <CalendarPeriodNav
              label={weekNavLabel}
              prevHref={prevWeekHref}
              nextHref={nextWeekHref}
              prevAriaLabel="Previous week"
              nextAriaLabel="Next week"
              align="start"
              className="mb-0 -ml-1.5 shrink-0"
            />
          </div>
        </div>

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
      </div>
    </PageHeader>
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
                'hidden items-center gap-1.5 rounded-[6px] border border-border bg-card px-3 py-1.5 lg:inline-flex',
                'text-xs font-medium text-muted-foreground transition hover:text-foreground',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Show next week
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
      forceLandscape={expanded}
    />
  )

  const weekPlanBody = (
    <div
      className={cn(
        'tt-week-view-root min-w-0 max-w-full space-y-4',
        expanded && 'space-y-2',
      )}
    >
      {showCombined || expanded ? (
        <PlanWeekDndProvider mode={isCoach ? 'coach' : 'athlete'}>
          <PlanWeekDndErrorBanner className="mb-4" />
          {combinedContent}
        </PlanWeekDndProvider>
      ) : (
        <div className="min-w-0 max-w-full space-y-6">
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
      {footerControls ? (
        <div className="tt-week-view-chrome min-w-0 px-4 lg:px-0">
          {footerControls}
        </div>
      ) : null}
    </div>
  )

  /**
   * Mobile expand always uses the fullscreen stage (same chrome as portrait + Expand).
   * Portrait: CSS-rotate fake landscape (keeps status bar / avoids notch on content).
   * Landscape: same stage, no rotate, inset by safe-area so the camera doesn’t cover cells.
   */
  const useMobileExpandStage = expanded && mobilePhone

  useEffect(() => {
    if (!useMobileExpandStage) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Prefer locking portrait while expanded so the CSS-rotate stage (status bar
    // visible) survives physically tilting the phone. iOS Safari usually rejects;
    // landscape then uses the same stage with safe-area insets instead.
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>
        })
      | undefined
    let cancelled = false
    let didLock = false
    if (
      orientation &&
      typeof orientation.lock === 'function' &&
      window.matchMedia('(orientation: portrait)').matches
    ) {
      void orientation
        .lock('portrait')
        .then(() => {
          if (cancelled) {
            try {
              orientation.unlock()
            } catch {
              /* ignore */
            }
            return
          }
          didLock = true
        })
        .catch(() => {
          /* ignore — not supported / not allowed */
        })
    }

    return () => {
      cancelled = true
      document.body.style.overflow = previousOverflow
      if (didLock && orientation) {
        try {
          orientation.unlock()
        } catch {
          /* ignore */
        }
      }
    }
  }, [useMobileExpandStage])

  return (
    <WeekPortraitZoomProvider>
      <WeekCardSizeProvider>
        {expanded ? (
          <button
            type="button"
            onClick={toggleExpanded}
            className="tt-week-expanded-collapse-btn"
            aria-label="Collapse week plan"
            title="Collapse week plan"
          >
            <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        ) : null}

        {useMobileExpandStage ? (
          <div
            className="tt-week-expand-rotate-root"
            data-expand-orientation={portraitPhone ? 'portrait' : 'landscape'}
            role="dialog"
            aria-label="Week plan landscape"
          >
            <div
              className="tt-week-expand-rotate-inner tt-calendar-expanded-root"
              data-expand-orientation={portraitPhone ? 'portrait' : 'landscape'}
            >
              {weekPlanBody}
            </div>
          </div>
        ) : (
          <TrainingListFrame
            scrollBody
            className={cn(expanded && 'tt-calendar-expanded-root')}
            header={stickyHeader}
          >
            {weekPlanBody}
          </TrainingListFrame>
        )}
      </WeekCardSizeProvider>
    </WeekPortraitZoomProvider>
  )
}
