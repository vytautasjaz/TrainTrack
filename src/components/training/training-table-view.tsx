"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { format } from "date-fns";
import {
  fetchTrainingTableDays,
  type TrainingTableDayDto,
} from "@/app/actions/training-table";
import { PlanWorkoutModal } from "@/components/plan/plan-workout-modal";
import {
  planWorkoutUsesListDetailPanel,
  WorkoutDetailView,
} from "@/components/plan/workout-detail-view";
import { DayDropSection } from "@/components/plan/day-drop-section";
import { DayNoteSection } from "@/components/plan/day-note-section";
import { SeasonEventChips } from "@/components/plan/season-event-chips";
import { usePlanWeekDnd } from "@/components/plan/plan-week-dnd";
import { TrainingListWorkoutRow } from "@/components/training/training-list-workout-row";
import { ListDayWeatherMini } from "@/components/weather/list-day-weather";
import { formatWeatherPrecip } from "@/lib/weather/places";
import type { PlanDay } from "@/lib/plan-week";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { useFilteredPlanDays } from "@/components/training/use-plan-sport-filter-data";
import { collapseTriathlonRaceWorkouts } from "@/lib/triathlon-race-summary";
import { dayNoteHasVisibleContent } from "@/lib/day-notes";
import { addDateOnlyDays, parseDateOnly, toDateKey } from "@/lib/dates";
import {
  SHOW_ALL_DAYS_STORAGE_KEY,
  SHOW_EVENTS_STORAGE_KEY,
  SHOW_NOTES_STORAGE_KEY,
} from "@/lib/plan-calendar-layers";
import { useStoredFlag } from "@/hooks/use-stored-flag";
import { getMobileBottomChromeInset } from "@/lib/mobile-chrome";
import { cn } from "@/lib/utils";

const CHUNK_DAYS = 14;
const DAY_SECTION_ID = "training-table-day";
/** Ignore repeated top/bottom loads while content settles. */
const LOAD_COOLDOWN_MS = 450;
const LG_QUERY = "(min-width: 1024px)";

function subscribeLg(onChange: () => void) {
  const mq = window.matchMedia(LG_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getLgSnapshot() {
  return window.matchMedia(LG_QUERY).matches;
}

function useIsLg() {
  // Server + hydration snapshot must match; prefer no panel until client knows.
  return useSyncExternalStore(subscribeLg, getLgSnapshot, () => false);
}

type TrainingTableViewProps = {
  initialDays: TrainingTableDayDto[];
  initialFromKey: string;
  initialToKey: string;
  isCoach: boolean;
  canEditDayNotes?: boolean;
  athleteId?: string;
};

function toPlanDays(days: TrainingTableDayDto[]): PlanDay[] {
  return days.map((day) => ({
    date: parseDateOnly(day.dateKey),
    dateKey: day.dateKey,
    dayLabel: day.dayLabel,
    dateLabel: day.dateLabel,
    isToday: day.isToday,
    workouts: day.workouts,
    dayNote: day.dayNote ?? null,
    seasonEvents: day.seasonEvents ?? [],
    weather: day.weather ?? null,
  }));
}

function dayHasListContent(
  day: {
    workouts: PlanWorkoutDetail[];
    dayNote?: PlanDay["dayNote"];
    seasonEvents?: PlanDay["seasonEvents"];
  },
  opts: { showNotes: boolean; showEvents: boolean },
) {
  return (
    day.workouts.length > 0 ||
    (opts.showNotes && dayNoteHasVisibleContent(day.dayNote)) ||
    (opts.showEvents && (day.seasonEvents?.length ?? 0) > 0)
  );
}

function isWeekendDate(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function mergeDays(
  existing: TrainingTableDayDto[],
  incoming: TrainingTableDayDto[],
): TrainingTableDayDto[] {
  const byKey = new Map(existing.map((d) => [d.dateKey, d]));
  for (const day of incoming) byKey.set(day.dateKey, day);
  return [...byKey.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function getBottomInset() {
  return getMobileBottomChromeInset();
}

function daySectionEl(dateKey: string) {
  return document.getElementById(`${DAY_SECTION_ID}-${dateKey}`);
}

export function TrainingTableView({
  initialDays,
  initialFromKey,
  initialToKey,
  isCoach,
  canEditDayNotes = false,
  athleteId,
}: TrainingTableViewProps) {
  const [days, setDays] = useState(initialDays);
  const [fromKey, setFromKey] = useState(initialFromKey);
  const [toKey, setToKey] = useState(initialToKey);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingFuture, setLoadingFuture] = useState(false);
  const [selected, setSelected] = useState<PlanWorkoutDetail | null>(null);
  const [listHeight, setListHeight] = useState<number | null>(null);
  const [showNotes] = useStoredFlag(SHOW_NOTES_STORAGE_KEY, true);
  const [showEvents] = useStoredFlag(SHOW_EVENTS_STORAGE_KEY, true);
  const [showAllDays] = useStoredFlag(SHOW_ALL_DAYS_STORAGE_KEY, false);
  const isLg = useIsLg();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingPastRef = useRef(false);
  const loadingFutureRef = useRef(false);
  const userScrolledRef = useRef(false);
  /** Past chunks only after the user scrolls upward near the top of the list. */
  const wantsPastRef = useRef(false);
  const emptyPastStreakRef = useRef(0);
  const emptyFutureStreakRef = useRef(0);
  const hasScrolledToInitial = useRef(false);
  const pastCooldownUntilRef = useRef(0);
  const futureCooldownUntilRef = useRef(0);
  /** While true, skip the one-shot "scroll to yesterday" effect + height churn. */
  const pinningPastScrollRef = useRef(false);
  const pastPinCleanupRef = useRef<(() => void) | null>(null);
  /** Apply inside useLayoutEffect during flushSync — survives Chrome scrollTop=0 quirks. */
  const pendingPastPinRef = useRef<{
    anchorKey: string | null;
    anchorOffsetTop: number;
    scrollTop: number;
    scrollHeight: number;
  } | null>(null);
  /** Hold restored scrollTop briefly so layout/height updates cannot snap back to 0. */
  const lockedScrollTopRef = useRef<number | null>(null);

  // Reset when athlete/server initial window changes (by range keys, not array identity).
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDays(initialDays);
      setFromKey(initialFromKey);
      setToKey(initialToKey);
    }, 0);
    userScrolledRef.current = false;
    wantsPastRef.current = false;
    emptyPastStreakRef.current = 0;
    emptyFutureStreakRef.current = 0;
    hasScrolledToInitial.current = false;
    pinningPastScrollRef.current = false;
    lockedScrollTopRef.current = null;
    pendingPastPinRef.current = null;
    pastPinCleanupRef.current?.();
    pastPinCleanupRef.current = null;
    pastCooldownUntilRef.current = 0;
    futureCooldownUntilRef.current = 0;
    return () => window.clearTimeout(timeoutId);
    // Intentionally omit initialDays identity — parent rebuilds a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on window/athlete only
  }, [athleteId, initialFromKey, initialToKey]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (pinningPastScrollRef.current) return;
      const frame = el.closest('[data-training-list-frame="fixed"]');
      if (frame) {
        // Parent frame already sizes to the viewport chrome — fill it.
        setListHeight(null);
        el.style.height = "100%";
        return;
      }
      el.style.height = "";
      const top = el.getBoundingClientRect().top;
      const bottom = getBottomInset();
      setListHeight(
        Math.max(180, Math.round(window.innerHeight - top - bottom)),
      );
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(document.documentElement);
    const headerEl = document.querySelector("header");
    if (headerEl) observer.observe(headerEl);
    const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
    if (bottomNav) observer.observe(bottomNav);

    // Tab bar is portaled after first paint — recalc once it appears.
    const bodyObserver = new MutationObserver(() => updateHeight());
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    const retryId = window.setTimeout(updateHeight, 120);

    return () => {
      window.removeEventListener("resize", updateHeight);
      observer.disconnect();
      bodyObserver.disconnect();
      window.clearTimeout(retryId);
    };
  }, []);

  // Restore scroll when past days are prepended (runs inside flushSync before paint).
  useLayoutEffect(() => {
    const pending = pendingPastPinRef.current;
    if (!pending) return;
    pendingPastPinRef.current = null;

    const container = scrollRef.current;
    if (!container) return;

    // Force layout so scrollHeight/offsetTop include prepended rows.
    void container.offsetHeight;

    const anchor = pending.anchorKey
      ? daySectionEl(pending.anchorKey)
      : null;
    let nextTop: number;
    if (anchor) {
      nextTop =
        pending.scrollTop + (anchor.offsetTop - pending.anchorOffsetTop);
    } else {
      nextTop =
        pending.scrollTop +
        (container.scrollHeight - pending.scrollHeight);
    }
    nextTop = Math.max(0, nextTop);
    container.scrollTop = nextTop;
    lockedScrollTopRef.current = container.scrollTop;
  }, [days]);

  const loadPast = useCallback(async () => {
    if (loadingPastRef.current) return;
    if (!wantsPastRef.current) return;
    if (Date.now() < pastCooldownUntilRef.current) return;
    if (emptyPastStreakRef.current >= 4) return;

    const container = scrollRef.current;
    if (!container) return;

    loadingPastRef.current = true;
    setLoadingPast(true);
    try {
      const end = addDateOnlyDays(parseDateOnly(fromKey), -1);
      const start = addDateOnlyDays(end, -(CHUNK_DAYS - 1));
      const chunk = await fetchTrainingTableDays(
        toDateKey(start),
        toDateKey(end),
      );
      const hadWorkouts = chunk.some((d) =>
        d.workouts.some((w) => w.type !== "REST" && w.type !== "RECOVERY"),
      );
      emptyPastStreakRef.current = hadWorkouts
        ? 0
        : emptyPastStreakRef.current + 1;

      // Pin the first on-screen day (offsetTop survives sticky headers better).
      const containerTop = container.getBoundingClientRect().top;
      let anchorKey: string | null = null;
      let anchorOffsetTop = 0;
      const sections = container.querySelectorAll<HTMLElement>(
        `[data-plan-day-section]`,
      );
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.bottom > containerTop + 8) {
          anchorKey = section.dataset.planDaySection ?? null;
          anchorOffsetTop = section.offsetTop;
          break;
        }
      }

      pastPinCleanupRef.current?.();
      pinningPastScrollRef.current = true;
      hasScrolledToInitial.current = true;
      lockedScrollTopRef.current = null;

      pendingPastPinRef.current = {
        anchorKey,
        anchorOffsetTop,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      };

      flushSync(() => {
        setDays((prev) => mergeDays(prev, chunk));
        setFromKey(toDateKey(start));
        setLoadingPast(false);
      });

      // Backup if layout effect somehow missed (should already be applied).
      if (lockedScrollTopRef.current == null && pendingPastPinRef.current) {
        const pending = pendingPastPinRef.current;
        pendingPastPinRef.current = null;
        void container.offsetHeight;
        const anchor = pending.anchorKey
          ? daySectionEl(pending.anchorKey)
          : null;
        const nextTop = anchor
          ? pending.scrollTop + (anchor.offsetTop - pending.anchorOffsetTop)
          : pending.scrollTop +
            (container.scrollHeight - pending.scrollHeight);
        container.scrollTop = Math.max(0, nextTop);
        lockedScrollTopRef.current = container.scrollTop;
      }

      // Hold the restored position while late layout settles (Chrome can snap to 0).
      let frames = 0;
      let rafId = 0;
      const release = () => {
        lockedScrollTopRef.current = null;
        pinningPastScrollRef.current = false;
        pastPinCleanupRef.current = null;
      };
      const tick = () => {
        const el = scrollRef.current;
        const locked = lockedScrollTopRef.current;
        if (el && locked != null && Math.abs(el.scrollTop - locked) > 1) {
          el.scrollTop = locked;
        }
        frames += 1;
        if (frames < 12) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        release();
      };
      rafId = requestAnimationFrame(tick);
      pastPinCleanupRef.current = () => {
        cancelAnimationFrame(rafId);
        release();
      };
    } catch {
      pendingPastPinRef.current = null;
      lockedScrollTopRef.current = null;
      pinningPastScrollRef.current = false;
      setLoadingPast(false);
    } finally {
      loadingPastRef.current = false;
      pastCooldownUntilRef.current = Date.now() + LOAD_COOLDOWN_MS;
    }
  }, [fromKey]);

  const loadFuture = useCallback(async () => {
    if (loadingFutureRef.current) return;
    if (pinningPastScrollRef.current) return;
    if (Date.now() < futureCooldownUntilRef.current) return;
    const container = scrollRef.current;
    const shortPage = container
      ? container.scrollHeight <= container.clientHeight + 40
      : false;
    if (!userScrolledRef.current && !shortPage) return;
    if (emptyFutureStreakRef.current >= 4) return;
    loadingFutureRef.current = true;
    setLoadingFuture(true);
    try {
      const start = addDateOnlyDays(parseDateOnly(toKey), 1);
      const end = addDateOnlyDays(start, CHUNK_DAYS - 1);
      const chunk = await fetchTrainingTableDays(
        toDateKey(start),
        toDateKey(end),
      );
      const hadWorkouts = chunk.some((d) =>
        d.workouts.some((w) => w.type !== "REST" && w.type !== "RECOVERY"),
      );
      emptyFutureStreakRef.current = hadWorkouts
        ? 0
        : emptyFutureStreakRef.current + 1;
      setDays((prev) => mergeDays(prev, chunk));
      setToKey(toDateKey(end));
    } catch {
      // keep existing window
    } finally {
      loadingFutureRef.current = false;
      setLoadingFuture(false);
      futureCooldownUntilRef.current = Date.now() + LOAD_COOLDOWN_MS;
    }
  }, [toKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let lastY = container.scrollTop;
    let touchStartY = 0;
    const onScroll = () => {
      const locked = lockedScrollTopRef.current;
      if (locked != null) {
        if (Math.abs(container.scrollTop - locked) > 1) {
          container.scrollTop = locked;
        }
        return;
      }
      const y = container.scrollTop;
      userScrolledRef.current = true;
      if (y < lastY && y < 80) wantsPastRef.current = true;
      lastY = y;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && container.scrollTop <= 2) {
        wantsPastRef.current = true;
        void loadPast();
      }
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      if (container.scrollTop <= 2 && y - touchStartY > 28) {
        wantsPastRef.current = true;
        void loadPast();
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("wheel", onWheel, { passive: true });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
    };
  }, [loadPast, listHeight]);

  useEffect(() => {
    const top = topSentinelRef.current;
    const bottom = bottomSentinelRef.current;
    const root = scrollRef.current;
    if (!top || !bottom || !root) return;

    const topObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (loadingPastRef.current) continue;
          if (pinningPastScrollRef.current) continue;
          if (Date.now() < pastCooldownUntilRef.current) continue;
          void loadPast();
        }
      },
      { root, rootMargin: "0px", threshold: 0 },
    );
    const bottomObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (loadingFutureRef.current) continue;
          if (pinningPastScrollRef.current) continue;
          if (Date.now() < futureCooldownUntilRef.current) continue;
          void loadFuture();
        }
      },
      { root, rootMargin: "240px 0px", threshold: 0 },
    );

    topObserver.observe(top);
    bottomObserver.observe(bottom);
    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [loadPast, loadFuture, listHeight]);

  const planDays = useMemo(() => toPlanDays(days), [days]);
  const filteredDays = useFilteredPlanDays(planDays);
  const dnd = usePlanWeekDnd();
  const showEmptyDropDays = isCoach && dnd?.dragItem?.kind === "plan";

  const layerOpts = useMemo(
    () => ({ showNotes, showEvents }),
    [showNotes, showEvents],
  );

  const displayDays = useMemo(() => {
    const mapped = filteredDays.map((day) => ({
      ...day,
      workouts: collapseTriathlonRaceWorkouts(
        day.workouts.filter((w) => w.type !== "REST" && w.type !== "RECOVERY"),
      ),
    }));
    if (showAllDays) return mapped;
    if (!showEmptyDropDays) {
      // Skip empty days — keep Today even with no workouts (placeholder row).
      return mapped.filter(
        (day) => day.isToday || dayHasListContent(day, layerOpts),
      );
    }
    // While dragging, fill empty days between first/last content days so
    // coaches can drop onto rest days without exploding the list.
    const withContent = mapped.filter(
      (day) => day.isToday || dayHasListContent(day, layerOpts),
    );
    if (withContent.length === 0) return mapped;
    const firstKey = withContent[0]!.dateKey;
    const lastKey = withContent[withContent.length - 1]!.dateKey;
    return mapped.filter(
      (day) => day.dateKey >= firstKey && day.dateKey <= lastKey,
    );
  }, [filteredDays, showEmptyDropDays, showAllDays, layerOpts]);

  useLayoutEffect(() => {
    if (hasScrolledToInitial.current || pinningPastScrollRef.current) return;
    // Desktop uses measured height; mobile fixed frame sets height: 100%.
    const container = scrollRef.current;
    if (!container) return;
    const ready =
      listHeight != null ||
      container.style.height === "100%" ||
      container.clientHeight > 0;
    if (!ready) return;

    const viewport = container.clientHeight;
    if (viewport <= 0) return;

    const todayKey = displayDays.find((d) => d.isToday)?.dateKey;
    const todayEl = todayKey ? daySectionEl(todayKey) : null;
    void container.offsetHeight;

    // Sticky Day / Workout headers sit over the list — keep Today below them.
    const stickyHeader = container.querySelector<HTMLElement>(
      "[data-list-col-header]",
    );
    const stickyH = stickyHeader?.getBoundingClientRect().height ?? 0;
    const usableViewport = Math.max(0, viewport - stickyH);

    if (todayEl) {
      const containerTop = container.getBoundingClientRect().top;
      const todayTop =
        container.scrollTop +
        (todayEl.getBoundingClientRect().top - containerTop);
      const fromTodayToEnd = container.scrollHeight - todayTop;
      // Enough upcoming content → pin so one day sits above Today
      // (Today is the second visible row under the sticky header).
      if (fromTodayToEnd >= usableViewport - 4) {
        const todayIdx = displayDays.findIndex((d) => d.isToday);
        const dayAbove =
          todayIdx > 0 ? daySectionEl(displayDays[todayIdx - 1]!.dateKey) : null;
        if (dayAbove) {
          const aboveTop =
            container.scrollTop +
            (dayAbove.getBoundingClientRect().top - containerTop);
          container.scrollTop = Math.max(0, aboveTop - stickyH);
        } else {
          container.scrollTop = Math.max(0, todayTop - stickyH);
        }
        hasScrolledToInitial.current = true;
        return;
      }
    }

    // Little (or nothing) planned ahead → fill the viewport with past
    // workouts; Today sits lower in the list.
    container.scrollTop = Math.max(
      0,
      container.scrollHeight - viewport,
    );
    hasScrolledToInitial.current = true;
  }, [listHeight, displayDays]);

  useEffect(() => {
    return () => {
      pastPinCleanupRef.current?.();
      pastPinCleanupRef.current = null;
    };
  }, []);

  // Keep selection in sync when list data refreshes; clear if workout is gone.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return prev;
      return (
        days.flatMap((d) => d.workouts).find((w) => w.id === prev.id) ?? null
      );
    });
  }, [days]);

  const panelWorkout =
    selected && planWorkoutUsesListDetailPanel(isCoach, selected)
      ? selected
      : null;
  const showDesktopPanel = isLg;
  const showModal =
    selected != null &&
    (!isLg || !planWorkoutUsesListDetailPanel(isCoach, selected));

  return (
    <>
      <div
        className="flex min-h-0 max-lg:h-full max-lg:min-h-0 max-lg:flex-1 items-stretch gap-8"
        style={listHeight != null ? { height: listHeight } : undefined}
      >
        <div
          ref={scrollRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain [overflow-anchor:none] [scrollbar-gutter:stable] max-lg:h-full"
          aria-busy={loadingPast || loadingFuture}
        >
          {/* Zero-height sticky overlays — load labels must not shift scroll height */}
          <div className="pointer-events-none sticky top-0 z-10 h-0 overflow-visible">
            {loadingPast ? (
              <p className="bg-background/80 py-1.5 text-center text-[10px] text-muted-foreground/80 backdrop-blur-[1px]">
                Loading earlier…
              </p>
            ) : null}
          </div>

          {/* Column headers — sticky, desktop only; match row column geometry */}
          <div
            data-list-col-header
            className="sticky top-0 z-10 hidden w-full items-center border-b border-[var(--tt-line,#ebebeb)] bg-background/98 backdrop-blur-[2px] lg:flex"
          >
            <div className="flex w-[5rem] shrink-0 items-center justify-center border-r border-[var(--tt-line,#ebebeb)] px-1.5 py-2.5">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Day
              </p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-4 pl-[calc(0.75rem+3px)] pr-2.5">
              {/* Spacer = sport icon column in rows */}
              <div className="h-8 w-8 shrink-0" aria-hidden />
              <p className="w-[20rem] shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Workout / Event
              </p>
              <p className="-ml-2 w-[5.5rem] shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Details
              </p>
              <p className="w-[4.5rem] shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Dur / Dist
              </p>
              <p className="ml-auto w-[4.75rem] shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                Status
              </p>
            </div>
          </div>

          {/* Flat table — mobile: no wrapper; desktop: rounded card */}
          <div className="w-full pb-2 max-lg:pb-0">
            <div ref={topSentinelRef} className="h-px w-full" aria-hidden />

            {displayDays.length === 0 ? (
              <p className="mt-4 rounded-[10px] border border-dashed border-[var(--tt-line,#ebebeb)] bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No workouts from today onward yet. Scroll down for later days,
                or pull up for earlier ones.
              </p>
            ) : (
              <div>
                {displayDays.map((day, dayIdx) => {
                  const hasContent =
                    day.workouts.length > 0 ||
                    (showNotes && dayNoteHasVisibleContent(day.dayNote)) ||
                    (showEvents && (day.seasonEvents?.length ?? 0) > 0);
                  const isFirst = dayIdx === 0;
                  const weekend = isWeekendDate(day.date);

                  // All rows for this day (workouts + events + notes)
                  const totalRows =
                    day.workouts.length +
                    (showEvents && (day.seasonEvents?.length ?? 0) > 0
                      ? 1
                      : 0) +
                    (showNotes && dayNoteHasVisibleContent(day.dayNote)
                      ? 1
                      : 0) +
                    (!hasContent ? 1 : 0);

                  return (
                    <DayDropSection
                      key={day.dateKey}
                      id={`${DAY_SECTION_ID}-${day.dateKey}`}
                      dateKey={day.dateKey}
                      enabled={isCoach}
                      className={cn(
                        "scroll-mt-14",
                        day.isToday && "scroll-mt-16",
                        !isFirst && "border-t border-[var(--tt-line,#ebebeb)]",
                      )}
                    >
                      <div className="flex">
                        {/* DAY column — weekend gray only here */}
                        <div
                          className={cn(
                            "flex w-[3.75rem] shrink-0 flex-col items-center justify-start px-1 text-center sm:w-[5.5rem] sm:items-start sm:px-2.5 sm:text-left lg:w-[5rem] lg:items-center lg:px-1 lg:text-center",
                            totalRows > 1 ? "pt-3" : "py-3",
                            weekend &&
                              !day.isToday &&
                              "bg-[color-mix(in_srgb,var(--color-muted,#f5f5f5)_90%,var(--color-card,#fff))]",
                          )}
                        >
                          {day.isToday ? (
                            <>
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand,#da2f36)]">
                                Today
                              </span>
                              <span className="mt-0.5 text-[15px] font-bold leading-none text-[var(--tt-ink,#111)]">
                                {format(day.date, "d")}
                              </span>
                              <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-[var(--tt-ink-soft,#6b6b6b)]">
                                {format(day.date, "MMM")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold uppercase tracking-[0.08em]",
                                  day.date <
                                    new Date(new Date().setHours(0, 0, 0, 0))
                                    ? "text-[var(--tt-ink-faint,#9a9a9a)]"
                                    : "text-[var(--tt-ink-soft,#6b6b6b)]",
                                )}
                              >
                                {format(day.date, "EEE")}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 text-[15px] font-bold leading-none",
                                  day.date <
                                    new Date(new Date().setHours(0, 0, 0, 0))
                                    ? "text-[var(--tt-ink-faint,#9a9a9a)]"
                                    : "text-[var(--tt-ink,#111)]",
                                )}
                              >
                                {format(day.date, "d")}
                              </span>
                              <span
                                className={cn(
                                  "text-[9px] font-medium uppercase tracking-[0.04em]",
                                  day.date <
                                    new Date(new Date().setHours(0, 0, 0, 0))
                                    ? "text-[var(--tt-ink-faint,#9a9a9a)]"
                                    : "text-[var(--tt-ink-soft,#6b6b6b)]",
                                )}
                              >
                                {format(day.date, "MMM")}
                              </span>
                            </>
                          )}
                        </div>

                        {/* CONTENT column — single today wash (not stacked on rows) */}
                        <div
                          className={cn(
                            "min-w-0 flex-1",
                            day.isToday &&
                              "bg-[var(--tt-today-wash,rgb(218_47_54/0.035))]",
                          )}
                        >
                          {/* Empty day — Today always; other empties with All days / coach DnD */}
                          {!hasContent ? (
                            <div className="flex items-center py-3.5 pl-4 pr-3.5 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">
                              {day.isToday
                                ? "Nothing planned for today"
                                : isCoach
                                  ? "Drop workout here"
                                  : "Nothing planned"}
                            </div>
                          ) : null}

                          {/* Workout rows */}
                          {day.workouts.map((workout, i) => (
                            <TrainingListWorkoutRow
                              key={workout.id}
                              workout={workout}
                              isCoach={isCoach}
                              last={i === day.workouts.length - 1}
                              selected={
                                showDesktopPanel &&
                                panelWorkout?.id === workout.id
                              }
                              isToday={day.isToday}
                              onOpen={() => setSelected(workout)}
                            />
                          ))}

                          {/* Weather under workouts — skip empty slot wrappers (white gaps) */}
                          {day.weather &&
                          day.weather.slots.some(
                            (s) =>
                              s.temperatureC != null ||
                              Boolean(formatWeatherPrecip(s)),
                          ) ? (
                            <div className="hidden items-center pl-[calc(0.75rem+3px)] pr-2.5 py-1.5 lg:flex">
                              <ListDayWeatherMini weather={day.weather} />
                            </div>
                          ) : null}

                          {/* Events strip */}
                          {showEvents && (day.seasonEvents?.length ?? 0) > 0 ? (
                            <div
                              className={cn(
                                "bg-amber-50/90 px-4 py-3",
                                day.workouts.length > 0 &&
                                  "border-t border-[var(--tt-line,#ebebeb)]",
                              )}
                            >
                              <SeasonEventChips
                                events={day.seasonEvents ?? []}
                                variant="strip"
                                editable={isCoach}
                                dateKey={day.dateKey}
                              />
                            </div>
                          ) : null}

                          {/* Notes strip */}
                          {showNotes &&
                          dayNoteHasVisibleContent(day.dayNote) ? (
                            <div
                              className={cn(
                                "bg-amber-50/90 px-4 py-3",
                                (day.workouts.length > 0 ||
                                  (showEvents &&
                                    (day.seasonEvents?.length ?? 0) > 0)) &&
                                  "border-t border-[var(--tt-line,#ebebeb)]",
                              )}
                            >
                              <DayNoteSection
                                dateKey={day.dateKey}
                                note={day.dayNote}
                                canEdit={canEditDayNotes}
                                noteKind={isCoach ? "coach" : "athlete"}
                                athleteId={athleteId}
                                compact
                                showFullText
                                hideEmptyAdd
                                variant="strip"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </DayDropSection>
                  );
                })}
              </div>
            )}

            <div ref={bottomSentinelRef} className="h-px w-full" aria-hidden />
          </div>

          <div className="pointer-events-none sticky bottom-0 z-10 h-0 overflow-visible">
            {loadingFuture ? (
              <p className="absolute inset-x-0 bottom-0 bg-background/80 py-1.5 text-center text-[10px] text-muted-foreground/80 backdrop-blur-[1px]">
                Loading later…
              </p>
            ) : null}
          </div>
        </div>

        {showDesktopPanel ? (
          <aside
            className="hidden min-h-0 w-[28rem] shrink-0 flex-col lg:flex xl:w-[30rem]"
            aria-label="Workout detail"
          >
            <div
              className={cn(
                "flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-[var(--tt-line,#ebebeb)] bg-white",
                "shadow-[0_1px_2px_rgb(0_0_0_/0.03),0_2px_8px_rgb(0_0_0_/0.03)]",
              )}
            >
              {panelWorkout ? (
                <WorkoutDetailView
                  key={panelWorkout.id}
                  workout={panelWorkout}
                  isCoach={isCoach}
                  active
                  heroTone="light"
                  onClose={() => setSelected(null)}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Workout detail
                  </p>
                  <p className="max-w-[16rem] text-[13px] leading-snug text-muted-foreground">
                    Select a workout from the list to open it here.
                  </p>
                </div>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {showModal && selected ? (
        <PlanWorkoutModal
          workout={selected}
          isCoach={isCoach}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      ) : null}
    </>
  );
}
