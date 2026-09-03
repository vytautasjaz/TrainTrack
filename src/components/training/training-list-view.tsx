"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanDay } from "@/lib/plan-week";
import type { TrainingDay } from "@/lib/training-timeline";
import { todayKey, yesterdayKey } from "@/lib/training-timeline";
import { getMobileBottomChromeInset } from "@/lib/mobile-chrome";
import { PlanMobileDayStack } from "@/components/plan/plan-mobile-day-stack";
import { dayHasRecovery, recoveryDayStripClass } from "@/lib/recovery-day";
import { getDayRacePriority } from "@/lib/race-day";
import { cn } from "@/lib/utils";
import { useFilteredPlanDays } from "@/components/training/use-plan-sport-filter-data";

const LIST_DAY_SECTION_ID = "training-list-day";
const WEEK_SWIPE_THRESHOLD = 60;

type TrainingListViewProps = {
  days: TrainingDay[];
  planDays: PlanDay[];
  isCoach: boolean;
  canEditDayNotes?: boolean;
  athleteId?: string;
  header?: ReactNode;
  prevWeekHref: string;
  nextWeekHref: string;
  /** Fixed mobile shell vs normal page flow (desktop list tab). */
  variant?: "fixed" | "page";
  /** Scroll to this day on first layout (defaults to today when in the week). */
  initialScrollToKey?: string;
};

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function WeekDayGrid({
  weekDays,
  planDays,
  onDaySelect,
}: {
  weekDays: TrainingDay[];
  planDays: PlanDay[];
  onDaySelect: (dateKey: string) => void;
}) {
  const planDayByKey = new Map(planDays.map((d) => [d.dateKey, d]));

  return (
    <div className="grid w-full grid-cols-7 gap-1 sm:gap-1.5">
      {weekDays.map((day) => {
        const planDay = planDayByKey.get(day.dateKey);
        const dayWorkouts = (planDay?.workouts ?? []).filter(
          (w) => w.type !== "REST",
        );
        const racePriority = getDayRacePriority(dayWorkouts);
        const isRaceDay = racePriority != null;
        const isRecovery = dayHasRecovery(dayWorkouts);
        const nonRecoveryWorkouts = dayWorkouts.filter(
          (w) => w.type !== "RECOVERY",
        );
        const dayName = format(day.date, "EEEE");
        const weekend = isWeekend(day.date);

        return (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onDaySelect(day.dateKey)}
            aria-label={`Scroll to ${dayName}`}
            className={cn(
              "flex w-full min-w-0 cursor-pointer flex-col items-center rounded-xl px-0.5 py-2 transition active:scale-[0.98]",
              isRecovery
                ? recoveryDayStripClass(day.isToday)
                : day.isToday
                  ? "bg-foreground text-background"
                  : weekend
                    ? "border border-border/60 bg-muted/50"
                    : "border border-border/40 bg-card",
            )}
          >
            <p
              className={cn(
                "flex h-[2.2em] w-full items-center justify-center text-center text-[8px] font-semibold leading-[1.1] sm:text-[9px]",
                isRecovery || day.isToday
                  ? "opacity-90"
                  : weekend
                    ? "text-foreground/75"
                    : "text-muted-foreground",
              )}
            >
              <span className="line-clamp-2">{dayName}</span>
            </p>
            <p className="text-sm font-bold tabular-nums">
              {format(day.date, "d")}
            </p>
            <div className="mt-0.5 flex min-h-3 justify-center gap-0.5">
              {isRaceDay ? (
                <Flag
                  className={cn(
                    "h-2.5 w-2.5 fill-current/30 sm:h-3 sm:w-3",
                    racePriority === "A" && "text-red-600 dark:text-red-400",
                    racePriority === "B" && "text-blue-600 dark:text-blue-400",
                    racePriority === "C" && "text-emerald-600 dark:text-emerald-300",
                  )}
                />
              ) : (
                !isRecovery &&
                nonRecoveryWorkouts
                  .slice(0, 3)
                  .map((w) => (
                    <span
                      key={w.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        w.status === "COMPLETED"
                          ? "bg-green-500"
                          : w.status === "SKIPPED"
                            ? "bg-muted-foreground/50"
                            : day.isToday
                              ? "bg-background/80"
                              : "bg-foreground/35",
                      )}
                    />
                  ))
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WeekDayStrip({
  weekDays,
  planDays,
  onDaySelect,
  prevWeekHref,
  nextWeekHref,
}: {
  weekDays: TrainingDay[];
  planDays: PlanDay[];
  onDaySelect: (dateKey: string) => void;
  prevWeekHref: string;
  nextWeekHref: string;
}) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      touchStartX.current = null;
      return;
    }
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < WEEK_SWIPE_THRESHOLD) return;
    router.push(delta < 0 ? nextWeekHref : prevWeekHref);
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full"
        asChild
      >
        <Link href={prevWeekHref} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div
        className="min-w-0 flex-1 px-0.5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <WeekDayGrid
          weekDays={weekDays}
          planDays={planDays}
          onDaySelect={onDaySelect}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full"
        asChild
      >
        <Link href={nextWeekHref} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function withFullDayNames(days: PlanDay[]): PlanDay[] {
  return days.map((day) => ({
    ...day,
    dayLabel: format(day.date, "EEEE"),
  }));
}

function getAppHeaderHeight() {
  return document.querySelector("header")?.getBoundingClientRect().height ?? 48;
}

function getBottomInset() {
  return getMobileBottomChromeInset()
}

function getScrollTopForDay(
  container: HTMLElement,
  target: HTMLElement,
): number {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return container.scrollTop + (targetRect.top - containerRect.top);
}

function scrollDayIntoView(
  container: HTMLElement,
  dateKey: string,
  behavior: ScrollBehavior = "auto",
) {
  const target = document.getElementById(`${LIST_DAY_SECTION_ID}-${dateKey}`);
  if (!target) return false;

  const top = getScrollTopForDay(container, target);
  container.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

function TrainingListPanel({
  contentShellClass,
  dayStackInsetClass,
  stickyChrome,
  dayStack,
  workoutsScrollRef,
  panelClassName,
  panelStyle,
}: {
  contentShellClass: string;
  dayStackInsetClass: string;
  stickyChrome: ReactNode;
  dayStack: ReactNode;
  workoutsScrollRef: React.RefObject<HTMLDivElement | null>;
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("flex min-h-0 flex-col bg-background", panelClassName)}
      style={panelStyle}
    >
      <div
        className={cn(
          "relative z-10 shrink-0 border-b border-border/40 bg-background",
          "px-3 landscape:max-lg:px-2 lg:px-0",
          contentShellClass,
        )}
      >
        {stickyChrome}
      </div>

      <div
        ref={workoutsScrollRef}
        className={cn(
          "relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth [overflow-anchor:none] [scrollbar-gutter:stable]",
          "px-3 pb-3 pt-1 landscape:max-lg:px-2 lg:px-0",
        )}
      >
        <div className={contentShellClass}>
          <div className={dayStackInsetClass}>{dayStack}</div>
        </div>
      </div>
    </div>
  );
}

export function TrainingListView({
  days,
  planDays,
  isCoach,
  canEditDayNotes = false,
  athleteId,
  header,
  prevWeekHref,
  nextWeekHref,
  variant = "fixed",
  initialScrollToKey,
}: TrainingListViewProps) {
  const workoutsScrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledToInitial = useRef(false);
  const [layout, setLayout] = useState<{ top: number; bottom: number } | null>(
    null,
  );

  const filteredPlanDays = useFilteredPlanDays(planDays);
  const visibleDays = useMemo(
    () => withFullDayNames(filteredPlanDays),
    [filteredPlanDays],
  );
  const scrollTargetKey = useMemo(() => {
    if (
      initialScrollToKey &&
      planDays.some((d) => d.dateKey === initialScrollToKey)
    ) {
      return initialScrollToKey;
    }
    const yesterday = yesterdayKey();
    if (planDays.some((d) => d.dateKey === yesterday)) return yesterday;
    const today = todayKey();
    return planDays.some((d) => d.dateKey === today) ? today : null;
  }, [initialScrollToKey, planDays]);

  const isFixed = variant === "fixed";
  const contentShellClass = isFixed
    ? "mx-auto w-full max-w-lg"
    : "w-full max-w-5xl xl:max-w-6xl";
  const dayStackInsetClass = "px-1.5 sm:px-2";

  useLayoutEffect(() => {
    if (!isFixed) return;

    const updateLayout = () => {
      setLayout({
        top: getAppHeaderHeight(),
        bottom: getBottomInset(),
      });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    const headerEl = document.querySelector("header");
    const observer = new ResizeObserver(updateLayout);
    if (headerEl) observer.observe(headerEl);
    const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
    if (bottomNav) observer.observe(bottomNav);

    const bodyObserver = new MutationObserver(() => updateLayout());
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    const retryId = window.setTimeout(updateLayout, 120);

    return () => {
      window.removeEventListener("resize", updateLayout);
      observer.disconnect();
      bodyObserver.disconnect();
      window.clearTimeout(retryId);
    };
  }, [isFixed]);

  const scrollToTrainingDay = useCallback((dateKey: string) => {
    requestAnimationFrame(() => {
      const container = workoutsScrollRef.current;
      if (!container) return;
      scrollDayIntoView(container, dateKey, "smooth");
    });
  }, []);

  useLayoutEffect(() => {
    if (!scrollTargetKey || hasScrolledToInitial.current) return;

    const runScroll = () => {
      const container = workoutsScrollRef.current;
      if (!container) return;
      const scrolled = scrollDayIntoView(container, scrollTargetKey, "auto");
      if (scrolled) hasScrolledToInitial.current = true;
    };

    requestAnimationFrame(() => requestAnimationFrame(runScroll));
  }, [scrollTargetKey, layout, visibleDays, header]);

  const panelTop = layout?.top ?? 48;
  const panelBottom = layout?.bottom ?? 96;

  const weekStrip = (
    <WeekDayStrip
      weekDays={days}
      planDays={filteredPlanDays}
      onDaySelect={scrollToTrainingDay}
      prevWeekHref={prevWeekHref}
      nextWeekHref={nextWeekHref}
    />
  );

  const dayStack = (
    <PlanMobileDayStack
      days={visibleDays}
      isCoach={isCoach}
      canEditDayNotes={canEditDayNotes}
      athleteId={athleteId}
      coachEditable={false}
      headerAddMenu
      trainingMode
      daySectionIdPrefix={LIST_DAY_SECTION_ID}
      daySectionScrollMarginClass="scroll-mt-0"
      className="w-full pb-4"
    />
  );

  const stickyChrome = (
    <>
      {header && (
        <div
          className={cn(
            "space-y-4 pb-2 landscape:max-lg:space-y-3",
            isFixed && "pt-2",
          )}
        >
          {header}
        </div>
      )}
      {weekStrip}
    </>
  );

  const panelProps = {
    contentShellClass,
    dayStackInsetClass,
    stickyChrome,
    dayStack,
    workoutsScrollRef,
  };

  if (!isFixed) {
    return (
      <TrainingListPanel
        {...panelProps}
        panelClassName={cn("lg:h-[calc(100dvh-2rem)]", contentShellClass)}
      />
    );
  }

  return (
    <>
      {layout && (
        <div
          aria-hidden
          style={{
            height: `calc(100dvh - ${layout.top}px - ${layout.bottom}px)`,
          }}
        />
      )}

      <TrainingListPanel
        {...panelProps}
        panelClassName="fixed inset-x-0 z-30 lg:left-[var(--sidebar-width)]"
        panelStyle={{ top: panelTop, bottom: panelBottom }}
      />
    </>
  );
}
