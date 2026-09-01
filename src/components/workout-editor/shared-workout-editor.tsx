/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  BookOpen,
  BookmarkPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  ListPlus,
  MessageSquare,
  Rows3,
  Save,
  X,
} from "lucide-react";
import { SessionType, WorkoutStatus, WorkoutType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { PrivateNoteToggle } from "@/components/ui/private-note-toggle";
import { Textarea } from "@/components/ui/textarea";
import {
  SelectDropdownContent,
  SelectDropdownItem,
} from "@/components/ui/select-dropdown";
import { AthleteWorkoutDetailCard } from "@/components/plan/athlete-workout-detail-card";
import { CoachWorkoutChatPanel } from "@/components/plan/ask-coach-section";
import { WorkoutEditorSectionSkeleton } from "@/components/workout-editor/workout-editor-section-skeleton";
import { useWorkoutCoachingThread } from "@/hooks/use-workout-coaching-thread";
import { threadHasChatConversation } from "@/lib/coaching-inbox-shared";
import { workoutHasCoachingChat } from "@/lib/plan-workout";
import { EditableWorkoutCardShell } from "@/components/workout-editor/editable-workout-card-shell";
import { IncludeItemsEditor } from "@/components/workout-editor/include-items-editor";
import { formatIncludeItemsForSubtitle } from "@/components/workout-editor/include-items-summary";
import { WorkoutBlockBuilder } from "@/components/plan/workout-block-builder";
import { WorkoutLibraryPicker } from "@/components/workout-builder/workout-library-picker";
import { SwimWorkoutDetailsFields } from "@/components/swim-workout/swim-workout-details-fields";
import {
  createAthleteWorkoutFromModal,
  createWorkoutFromModal,
  getAthletePreferencesForWorkoutModal,
  getCoachEditorPrefsForModal,
  getCoachLibraryForPicker,
  saveWorkoutDraftToLibrary,
  saveTemplateBuilder,
  updateWorkoutFromModal,
  type WorkoutLibraryFolderPickerItem,
  type WorkoutTemplatePickerItem,
} from "@/app/actions/workout-builder";
import { SaveToLibraryDialog } from "@/components/workout-editor/save-to-library-dialog";
import {
  createSwimWorkoutFromModal,
  saveSwimTemplateFromModal,
  updateSwimWorkoutFromModal,
} from "@/app/actions/swim-workout";
import {
  hasBikeSpeedPreferences,
  hasPacePreferences,
  hasSwimCssPreference,
  type AthletePreferences,
} from "@/lib/athlete-preferences";
import {
  formatMissingIntensityZoneMessage,
  missingIntensityZoneLabels,
} from "@/lib/workout-builder/missing-intensity-prefs";
import type { WorkoutBuilderPrefs } from "@/lib/workout-builder/workout-builder-prefs";
import {
  APPROX_DISTANCE_TAG,
  APPROX_DURATION_TAG,
  PRIMARY_METRIC_TAG_PREFIX,
  SECONDARY_METRIC_ON_TAG,
  approxMetricsFromTags,
  durationUnitFromTags,
  primaryMetricFromTags,
  secondaryMetricVisibleFromTags,
} from "@/lib/workout-approx-tags";
import { metricSourceFromEditorIntent } from "@/lib/workout-metric-source";
import {
  BIKE_WORKOUT_KINDS,
  autoBikeSubtitle,
  bikeEnvironmentFromTags,
  bikeKindFromTags,
  bikeKindMeta,
  bikeWorkoutTags,
  estimateBikeKmFromMinutes,
  estimateBikeMinutesFromKm,
  type BikeEnvironment,
  type BikeWorkoutKind,
} from "@/lib/bike-workout/defaults";
import {
  createDefaultSwimStructure,
  defaultSwimWorkoutForm,
} from "@/lib/swim-workout/defaults";
import {
  hasSwimStructureContent,
  workoutDistanceMeters,
  workoutDistanceMetersDraft,
} from "@/lib/swim-workout/calculations";
import { swimWorkoutToForm } from "@/lib/swim-workout/form-mappers";
import type { SwimWorkoutForm } from "@/lib/swim-workout/types";
import {
  emptyStructure,
  hasIncludeItems,
  hasStructureContent,
  parseStructure,
} from "@/lib/workout-builder/utils";
import type {
  WorkoutIncludeItem,
  WorkoutStructure,
} from "@/lib/workout-builder/types";
import {
  estimateDistanceKmFromDurationMinutes,
  estimateDurationMinutesFromDistanceKm,
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from "@/lib/workout-builder/segment-estimation";
import {
  customBikeKindLabel,
  customSessionTypeLabel,
  enabledBikeOptionRows,
  enabledSessionOptionRows,
  type WorkoutTypePrefs,
} from "@/lib/workout-builder/workout-type-prefs";
import { WORKOUT_TYPE_LABELS, SPORT_ROW_ORDER } from "@/lib/constants";
import { WORKOUT_EDITOR_SECTION_ACTIVE } from "@/lib/workout-editor/sport-theme";
import {
  getSportEditorConfig,
  type DurationUnit,
  type SharedWorkoutEditorProps,
  type WorkoutPrimaryMetric,
  type WorkoutPrimaryMetricState,
} from "@/lib/workout-editor/types";
import type { PlanWorkoutDetail } from "@/lib/plan-workout";
import { parseDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/lib/action-error";

function formatDistanceInputValue(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "";
  return String(Math.round(km * 10) / 10);
}

function splitMinutes(total: number): { hours: string; minutes: string } {
  const safe = Math.max(0, Math.round(total));
  return {
    hours: String(Math.floor(safe / 60)),
    minutes: String(safe % 60).padStart(2, "0"),
  };
}

function formatDurationInput(totalMinutes: number, unit: DurationUnit): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  if (unit === "min") return String(safe);
  const split = splitMinutes(safe);
  return `${split.hours}:${split.minutes}`;
}

function parseDurationInput(value: string, unit: DurationUnit): number {
  if (unit === "min") {
    const n = Number.parseInt(value.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  const cleaned = value.trim();
  if (!cleaned) return 0;
  if (cleaned.includes(":")) {
    const [hRaw = "0", mRaw = "0"] = cleaned.split(":");
    const h = Number.parseInt(hRaw.replace(/\D/g, "") || "0", 10);
    const m = Number.parseInt(mRaw.replace(/\D/g, "").slice(0, 2) || "0", 10);
    return Math.max(0, h * 60 + m);
  }
  const hoursOnly = Number.parseInt(cleaned.replace(/\D/g, ""), 10);
  return Number.isFinite(hoursOnly) ? Math.max(0, hoursOnly * 60) : 0;
}

function sanitizeHoursInput(value: string): string {
  const cleaned = value.replace(/[^\d:]/g, "");
  const colonIndex = cleaned.indexOf(":");
  if (colonIndex === -1) return cleaned.slice(0, 3);
  const hours = cleaned.slice(0, colonIndex).replace(/\D/g, "").slice(0, 3);
  const minutes = cleaned
    .slice(colonIndex + 1)
    .replace(/\D/g, "")
    .slice(0, 2);
  return `${hours}:${minutes}`;
}

/** Open Build workout / Structured when the saved session was built that way. */
function workoutShouldOpenDetails(
  workout: PlanWorkoutDetail | null | undefined,
): boolean {
  if (!workout) return false;
  if (workout.type === WorkoutType.SWIM) {
    return hasSwimStructureContent(workout.swimStructure);
  }
  if (
    workout.structure &&
    hasStructureContent(parseStructure(workout.structure))
  ) {
    return true;
  }
  // Strength (and other description-only sports) use Build workout for the notes body.
  if (
    getSportEditorConfig(workout.type).descriptionOnly &&
    Boolean(workout.description?.trim())
  ) {
    return true;
  }
  return false;
}

/** Include is exclusive with Build workout — only open it when there are no blocks. */
function workoutShouldOpenInclude(
  workout: PlanWorkoutDetail | null | undefined,
): boolean {
  if (!workout || workout.type === WorkoutType.SWIM) return false;
  if (workoutShouldOpenDetails(workout)) return false;
  return hasIncludeItems(parseStructure(workout.structure));
}

function initialEditorPanels(workout: PlanWorkoutDetail | null | undefined) {
  if (workout && workoutHasCoachingChat(workout)) {
    return { detailsOpen: false, includeOpen: false, chatOpen: true };
  }
  return {
    detailsOpen: workoutShouldOpenDetails(workout),
    includeOpen: workoutShouldOpenInclude(workout),
    chatOpen: false,
  };
}

function structureHeroKey(
  sportType: WorkoutType,
  structure: WorkoutStructure,
  swimStructure: unknown,
): string {
  if (sportType === WorkoutType.SWIM) {
    return JSON.stringify(swimStructure ?? null);
  }
  return JSON.stringify(structure);
}

function autoBikeTitleFromPrefs(
  environment: BikeEnvironment,
  kind: BikeWorkoutKind,
  prefs?: WorkoutTypePrefs | null,
  optionId?: string | null,
): string {
  const label = customBikeKindLabel(kind, prefs, optionId);
  if (environment === "indoor") return `Indoor ${label}`;
  return label;
}

function autoSubtitle(
  sportType: WorkoutType,
  sessionType: SessionType | null,
  bikeKind: BikeWorkoutKind | null,
  durationMin: number,
  distanceKm: number,
  includeItems: WorkoutIncludeItem[] = [],
  typePrefs?: WorkoutTypePrefs | null,
  optionId?: string | null,
): string {
  const includeSuffix = formatIncludeItemsForSubtitle(includeItems);
  let base = "";
  if (sportType === WorkoutType.BIKE && bikeKind) {
    base = autoBikeSubtitle(bikeKind, durationMin, distanceKm);
  } else if (sessionType) {
    const label = customSessionTypeLabel(
      sessionType,
      sportType,
      typePrefs,
      optionId,
    );
    const parts: string[] = [];
    if (durationMin > 0) parts.push(`${durationMin} min`);
    if (distanceKm > 0) {
      parts.push(
        sportType === WorkoutType.SWIM
          ? `${Math.round(distanceKm * 1000)} m`
          : `${Math.round(distanceKm * 10) / 10} km`,
      );
    }
    parts.push(label);
    base = parts.join(" · ");
  }
  if (!base) return includeSuffix;
  if (!includeSuffix) return base;
  return `${base} · ${includeSuffix}`;
}

function genericWorkoutTags(
  primaryMetric: WorkoutPrimaryMetric,
  approx: { duration?: boolean; distance?: boolean },
  durationUnit: DurationUnit,
  extra: string[] = [],
): string[] {
  const tags = [
    `${PRIMARY_METRIC_TAG_PREFIX}${primaryMetric}`,
    `durationUnit:${durationUnit}`,
    ...extra,
  ];
  if (approx.duration) tags.push(APPROX_DURATION_TAG);
  if (approx.distance) tags.push(APPROX_DISTANCE_TAG);
  return tags;
}

function defaultAthleteSessionType(sportType: WorkoutType): SessionType {
  switch (sportType) {
    case WorkoutType.STRENGTH:
      return SessionType.STRENGTH;
    case WorkoutType.HYROX:
      return SessionType.HYROX;
    default:
      return SessionType.EASY_RUN;
  }
}

export function SharedWorkoutEditor({
  mode = "plan",
  sportType: initialSport,
  date,
  workout = null,
  entityId,
  athleteMode = false,
  onSaved,
  onCancel,
  embedded = false,
  className,
}: SharedWorkoutEditorProps) {
  const isEdit = Boolean(workout) || Boolean(entityId);
  const isTemplate = mode === "template";
  const [sportType, setSportType] = useState<WorkoutType>(
    workout?.type ?? initialSport,
  );
  const config = useMemo(() => getSportEditorConfig(sportType), [sportType]);
  const sportOptions = useMemo(
    () =>
      SPORT_ROW_ORDER.filter(
        (t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY,
      ),
    [],
  );

  const [pending, startTransition] = useTransition();
  const [workoutReady, setWorkoutReady] = useState(!workout);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [shellHeight, setShellHeight] = useState<number | null>(null);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const editorColumnRef = useRef<HTMLDivElement>(null);
  const heightPinnedRef = useRef(false);
  const resizeDragRef = useRef<{ startY: number; startH: number } | null>(
    null,
  );
  const libraryCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [templates, setTemplates] = useState<WorkoutTemplatePickerItem[]>([]);
  const [libraryFolders, setLibraryFolders] = useState<
    WorkoutLibraryFolderPickerItem[]
  >([]);
  const [preferences, setPreferences] = useState<AthletePreferences | null>(
    null,
  );
  const [builderPrefs, setBuilderPrefs] = useState<WorkoutBuilderPrefs | null>(
    null,
  );
  const [typePrefs, setTypePrefs] = useState<WorkoutTypePrefs | null>(null);
  const [selectedSessionOptionId, setSelectedSessionOptionId] = useState<
    string | null
  >(null);
  const [selectedBikeOptionId, setSelectedBikeOptionId] = useState<
    string | null
  >(null);

  const [sessionType, setSessionType] = useState<SessionType | null>(
    workout?.sessionType ?? null,
  );
  const [bikeKind, setBikeKind] = useState<BikeWorkoutKind | null>(() => {
    if (workout?.type === WorkoutType.BIKE) {
      return bikeKindFromTags(workout.tags ?? []) ?? "CUSTOM";
    }
    return null;
  });
  const [environment, setEnvironment] = useState<BikeEnvironment>("outdoor");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [titleAuto, setTitleAuto] = useState(false);
  const [subtitleAuto, setSubtitleAuto] = useState(false);
  const [primaryMetric, setPrimaryMetric] =
    useState<WorkoutPrimaryMetricState>(null);
  const [secondaryMetricVisible, setSecondaryMetricVisible] = useState(false);
  const [durationMin, setDurationMin] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    config.durationUnitDefault,
  );
  const [durationInput, setDurationInput] = useState("");
  const [distanceInput, setDistanceInput] = useState("");
  const [durationManual, setDurationManual] = useState(false);
  const [distanceManual, setDistanceManual] = useState(false);
  // Separately tracked auto-estimate strings shown in the Auto cell
  const [autoDistanceInput, setAutoDistanceInput] = useState("");
  const [autoDurationInput, setAutoDurationInput] = useState("");
  const initialPanels = initialEditorPanels(workout);
  const [detailsOpen, setDetailsOpen] = useState(() => initialPanels.detailsOpen);
  const [includeOpen, setIncludeOpen] = useState(() => initialPanels.includeOpen);
  const [chatOpen, setChatOpen] = useState(() => initialPanels.chatOpen);
  const autoOpenedChatRef = useRef(initialPanels.chatOpen);
  /** Skip structure→hero resync until the coach edits structure content. */
  const structureHeroKeyRef = useRef<string | null>(null);
  /** Skip simple-metric re-estimation after hydrating a saved workout. */
  const simpleMetricsHydratedRef = useRef<string | null>(null);
  const showChatTab = !athleteMode && !isTemplate && Boolean(workout?.id);
  const {
    thread: coachingThread,
    ready: coachingThreadReady,
    setThread: setCoachingThread,
  } = useWorkoutCoachingThread(showChatTab ? workout?.id : undefined);
  const chatTabMessageCount =
    coachingThread && threadHasChatConversation(coachingThread.messages)
      ? coachingThread.messages.length
      : (workout?.coachingChat?.messageCount ?? 0);
  const showChatTabBadge =
    chatTabMessageCount > 0 &&
    ((workout != null && workoutHasCoachingChat(workout)) ||
      Boolean(
        coachingThread && threadHasChatConversation(coachingThread.messages),
      ));
  const [simpleConfirmOpen, setSimpleConfirmOpen] = useState(false);
  const [modeConflict, setModeConflict] = useState<"to-build" | "to-include" | null>(
    null,
  );
  const [pendingLibraryTemplate, setPendingLibraryTemplate] =
    useState<WorkoutTemplatePickerItem | null>(null);
  const [saveToLibraryOpen, setSaveToLibraryOpen] = useState(false);
  const [librarySavePending, setLibrarySavePending] = useState(false);
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null);
  const [librarySaveOk, setLibrarySaveOk] = useState(false);
  const libraryBaselineRef = useRef<string | null>(null);
  const libraryBaselineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const libraryFingerprintStateRef = useRef({
    title: "",
    subtitle: "",
    sessionType: null as SessionType | null,
    bikeKind: null as BikeWorkoutKind | null,
    sportType: initialSport,
    structure: emptyStructure() as WorkoutStructure,
    includeItems: [] as WorkoutIncludeItem[],
    swimStructure: null as SwimWorkoutForm["swimStructure"],
    coachNotes: "",
    durationManual: false,
    distanceManual: false,
    durationInput: "",
    distanceInput: "",
    detailsOpen: false,
    includeOpen: false,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [structure, setStructure] =
    useState<WorkoutStructure>(emptyStructure());
  const [includeItems, setIncludeItems] = useState<WorkoutIncludeItem[]>([]);
  const [coachNotes, setCoachNotes] = useState("");
  const [coachNotesPrivate, setCoachNotesPrivate] = useState(false);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [swimForm, setSwimForm] = useState<SwimWorkoutForm>(
    defaultSwimWorkoutForm(),
  );

  const typeSelected = config.useBikeKinds
    ? Boolean(bikeKind)
    : Boolean(sessionType);

  libraryFingerprintStateRef.current = {
    title,
    subtitle,
    sessionType,
    bikeKind,
    sportType,
    structure,
    includeItems,
    swimStructure: swimForm.swimStructure,
    coachNotes,
    durationManual,
    distanceManual,
    durationInput,
    distanceInput,
    detailsOpen,
    includeOpen,
  };

  useEffect(() => {
    void getAthletePreferencesForWorkoutModal().then(setPreferences);
    if (!athleteMode) {
      void getCoachEditorPrefsForModal()
        .then((prefs) => {
          setBuilderPrefs(prefs.builder);
          setTypePrefs(prefs.sessionOptions);
        })
        .catch(() => {
          /* Athlete/non-coach workspace — keep defaults */
        });
    }
    if (athleteMode) return;
    void getCoachLibraryForPicker()
      .then(({ templates: items, folders }) => {
        setTemplates(items);
        setLibraryFolders(folders);
      })
      .catch(() => {
        setTemplates([]);
        setLibraryFolders([]);
      });
  }, [athleteMode]);

  useEffect(() => {
    if (!workout?.id) return;
    if (workoutHasCoachingChat(workout) && !autoOpenedChatRef.current) {
      autoOpenedChatRef.current = true;
      setChatOpen(true);
      setDetailsOpen(false);
      setIncludeOpen(false);
    }
  }, [workout?.id, workout?.coachingChat?.messageCount]);

  useEffect(() => {
    if (autoOpenedChatRef.current || !coachingThreadReady) return;
    if (coachingThread && threadHasChatConversation(coachingThread.messages)) {
      autoOpenedChatRef.current = true;
      setChatOpen(true);
      setDetailsOpen(false);
      setIncludeOpen(false);
    }
  }, [coachingThread, coachingThreadReady]);

  useEffect(() => {
    return () => {
      if (libraryCloseTimerRef.current) {
        clearTimeout(libraryCloseTimerRef.current);
      }
      if (libraryBaselineTimerRef.current) {
        clearTimeout(libraryBaselineTimerRef.current);
      }
    };
  }, []);

  function clearLibraryShellHeightSoon() {
    if (libraryCloseTimerRef.current) {
      clearTimeout(libraryCloseTimerRef.current);
    }
    libraryCloseTimerRef.current = setTimeout(() => {
      if (!heightPinnedRef.current) {
        setShellHeight(null);
      }
      libraryCloseTimerRef.current = null;
    }, 320);
  }

  function clampShellHeight(height: number) {
    const maxH = Math.min(
      typeof window !== "undefined" ? window.innerHeight * 0.92 : 832,
      52 * 16,
    );
    const minH = 360;
    return Math.round(Math.min(maxH, Math.max(minH, height)));
  }

  function fitShellToEditorContent() {
    const desktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches;
    if (!desktop) return;

    const col = editorColumnRef.current;
    if (!col) return;
    const scroller = col.querySelector<HTMLElement>(
      "[data-workout-editor-scroll]",
    );
    if (!scroller) return;

    const chrome = col.getBoundingClientRect().height - scroller.clientHeight;
    const natural = chrome + scroller.scrollHeight;
    const next = clampShellHeight(natural);

    setShellHeight((prev) => {
      if (prev == null) return next;
      // Grow to fit applied workout; keep taller manual size if user stretched more.
      return Math.max(prev, next);
    });
  }

  function scheduleFitShellToEditor() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitShellToEditorContent();
        // Details/blocks may paint one frame later.
        window.setTimeout(() => fitShellToEditorContent(), 60);
      });
    });
  }

  function openLibraryPanel() {
    if (libraryCloseTimerRef.current) {
      clearTimeout(libraryCloseTimerRef.current);
      libraryCloseTimerRef.current = null;
    }
    // Side-by-side only: lock shell to the editor column so the library
    // scrolls inside and cannot stretch modal height.
    const desktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches;
    if (desktop && !heightPinnedRef.current) {
      const height = editorColumnRef.current?.getBoundingClientRect().height;
      if (height && height > 0) {
        setShellHeight(clampShellHeight(height));
      }
    }
    setLibraryOpen(true);
  }

  function closeLibraryPanel() {
    setLibraryOpen(false);
    // Keep locked height while the drawer animates closed, then release so the
    // shell returns to the editor's natural size (unless user resized).
    if (!heightPinnedRef.current) {
      clearLibraryShellHeightSoon();
    }
  }

  function toggleLibraryPanel() {
    if (libraryOpen) closeLibraryPanel();
    else openLibraryPanel();
  }

  function onHeightResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (embedded) return;
    const el = shellRef.current;
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    const startH =
      shellHeight ?? el.getBoundingClientRect().height;
    resizeDragRef.current = { startY: event.clientY, startH };
    heightPinnedRef.current = true;
    setIsResizingHeight(true);
    setShellHeight(clampShellHeight(startH));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHeightResizePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = resizeDragRef.current;
    if (!drag) return;
    const next = drag.startH + (event.clientY - drag.startY);
    setShellHeight(clampShellHeight(next));
  }

  function onHeightResizePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeDragRef.current) return;
    resizeDragRef.current = null;
    setIsResizingHeight(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  useEffect(() => {
    setDurationUnit(getSportEditorConfig(sportType).durationUnitDefault);
  }, [sportType]);

  useEffect(() => {
    if (!workout) {
      setSessionType(null);
      setBikeKind(null);
      setEnvironment("outdoor");
      setSportType(initialSport);
      setTitle("");
      setSubtitle("");
      setTitleAuto(false);
      setSubtitleAuto(false);
      setPrimaryMetric(null);
      setSecondaryMetricVisible(false);
      setDurationMin(0);
      setDistanceKm(0);
      setDurationInput("");
      setDistanceInput("");
      setAutoDistanceInput("");
      setAutoDurationInput("");
      setDurationManual(false);
      setDistanceManual(false);
      setDetailsOpen(false);
      setIncludeOpen(false);
      setChatOpen(false);
      setStructure(emptyStructure());
      setIncludeItems([]);
      setCoachNotes("");
      setCoachNotesPrivate(false);
      setTemplateId(undefined);
      setSwimForm(defaultSwimWorkoutForm());
      setWorkoutReady(true);
      structureHeroKeyRef.current = null;
      simpleMetricsHydratedRef.current = null;
      return;
    }

    setWorkoutReady(false);
    const planned = workout.plannedDuration ?? 0;
    const plannedDistance =
      workout.type === WorkoutType.SWIM
        ? (workout.plannedDistanceMeters ?? 0) / 1000
        : (workout.plannedDistance ?? 0);
    const hasDuration = planned > 0;
    const hasDistance = plannedDistance > 0;
    setSportType(workout.type);
    setSessionType(workout.sessionType);
    if (workout.type === WorkoutType.BIKE) {
      const tags = workout.tags ?? [];
      setEnvironment(bikeEnvironmentFromTags(tags));
      setBikeKind(bikeKindFromTags(tags) ?? "CUSTOM");
    } else {
      setBikeKind(null);
    }
    setTitle(workout.title);
    setTitleAuto(false);
    setSubtitle(workout.description ?? "");
    setSubtitleAuto(false);
    setDurationMin(hasDuration ? planned : 0);
    setDistanceKm(hasDistance ? plannedDistance : 0);
    const unit =
      durationUnitFromTags(workout.tags) ??
      getSportEditorConfig(workout.type).durationUnitDefault;
    setDurationUnit(unit);
    setDurationInput(hasDuration ? formatDurationInput(planned, unit) : "");
    setDistanceInput(
      hasDistance
        ? workout.type === WorkoutType.SWIM
          ? String(Math.round(plannedDistance * 1000))
          : formatDistanceInputValue(plannedDistance)
        : "",
    );
    const approx = approxMetricsFromTags(workout.tags);
    const hasSavedStructure = Boolean(
      workout.structure &&
      hasStructureContent(parseStructure(workout.structure)),
    );
    const hasSwimStructure = hasSwimStructureContent(workout.swimStructure);
    const durationIsManual =
      hasDuration &&
      (workout.plannedDurationSource
        ? workout.plannedDurationSource === "MANUAL"
        : hasSavedStructure || hasSwimStructure || !approx.duration);
    const distanceIsManual =
      hasDistance &&
      (workout.plannedDistanceSource
        ? workout.plannedDistanceSource === "MANUAL"
        : hasSavedStructure || hasSwimStructure || !approx.distance);
    setDurationManual(durationIsManual);
    setDistanceManual(distanceIsManual);
    setAutoDurationInput(
      hasDuration && !durationIsManual
        ? formatDurationInput(planned, unit)
        : "",
    );
    setAutoDistanceInput(
      hasDistance && !distanceIsManual
        ? workout.type === WorkoutType.SWIM
          ? String(Math.round(plannedDistance * 1000))
          : formatDistanceInputValue(plannedDistance)
        : "",
    );
    if (!durationIsManual) setDurationInput("");
    if (!distanceIsManual) setDistanceInput("");
    setPrimaryMetric(
      primaryMetricFromTags(workout.tags) ??
        (hasDistance || !hasDuration ? "distance" : "duration"),
    );
    setSecondaryMetricVisible(secondaryMetricVisibleFromTags(workout.tags));
    const parsedStructure = parseStructure(workout.structure);
    setStructure(parsedStructure ?? emptyStructure());
    setIncludeItems(parsedStructure.includeItems ?? []);
    const panels = initialEditorPanels(workout);
    setChatOpen(panels.chatOpen);
    setDetailsOpen(panels.detailsOpen);
    setIncludeOpen(panels.includeOpen);
    setCoachNotes(workout.coachNotes ?? "");
    setCoachNotesPrivate(Boolean(workout.coachNotesPrivate));
    if (workout.type === WorkoutType.SWIM) {
      setSwimForm(
        swimWorkoutToForm({
          title: workout.title,
          description: workout.description,
          swimEnvironment: workout.swimEnvironment,
          plannedDistanceMeters: workout.plannedDistanceMeters,
          plannedDuration: workout.plannedDuration,
          coachNotes: workout.coachNotes,
          swimStructure: workout.swimStructure,
        }),
      );
    }
    structureHeroKeyRef.current = structureHeroKey(
      workout.type,
      parsedStructure ?? emptyStructure(),
      workout.swimStructure,
    );
    simpleMetricsHydratedRef.current = workout.id;
    setWorkoutReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id, initialSport]);

  const metricsFromDetails = useMemo(() => {
    if (!detailsOpen) return false;
    if (sportType === WorkoutType.SWIM) {
      return Boolean(swimForm.builderEnabled && swimForm.swimStructure);
    }
    return hasStructureContent(structure);
  }, [detailsOpen, sportType, structure, swimForm]);

  /** Structure/swim sets drive hero metrics regardless of active editor tab. */
  const structureDrivesHero = useMemo(() => {
    if (sportType === WorkoutType.SWIM) {
      return hasSwimStructureContent(swimForm.swimStructure);
    }
    return hasStructureContent(structure);
  }, [sportType, structure, swimForm.swimStructure]);

  const canAutoEstimate =
    sportType !== WorkoutType.SWIM ||
    structureDrivesHero ||
    hasSwimCssPreference(preferences);

  useEffect(() => {
    if (!titleAuto || !typeSelected) return;
    if (sportType === WorkoutType.BIKE && bikeKind) {
      setTitle(
        autoBikeTitleFromPrefs(
          environment,
          bikeKind,
          typePrefs,
          selectedBikeOptionId,
        ),
      );
      return;
    }
    if (sessionType) {
      setTitle(
        customSessionTypeLabel(
          sessionType,
          sportType,
          typePrefs,
          selectedSessionOptionId,
        ),
      );
    }
  }, [
    sessionType,
    bikeKind,
    environment,
    sportType,
    titleAuto,
    typeSelected,
    typePrefs,
    selectedSessionOptionId,
    selectedBikeOptionId,
  ]);

  useEffect(() => {
    if (!subtitleAuto || !typeSelected) return;
    setSubtitle(
      autoSubtitle(
        sportType,
        sessionType,
        bikeKind,
        durationMin,
        distanceKm,
        includeItems,
        typePrefs,
        sportType === WorkoutType.BIKE
          ? selectedBikeOptionId
          : selectedSessionOptionId,
      ),
    );
  }, [
    sessionType,
    bikeKind,
    sportType,
    durationMin,
    distanceKm,
    subtitleAuto,
    typeSelected,
    includeItems,
    typePrefs,
    selectedSessionOptionId,
    selectedBikeOptionId,
  ]);

  useEffect(() => {
    if (!structureDrivesHero) return;
    const key = structureHeroKey(
      sportType,
      structure,
      swimForm.swimStructure,
    );
    if (structureHeroKeyRef.current === key) return;
    structureHeroKeyRef.current = key;

    if (sportType === WorkoutType.SWIM && swimForm.swimStructure) {
      const meters = workoutDistanceMetersDraft(swimForm.swimStructure);
      const km = meters / 1000;
      const computedDistanceKm = km > 0 ? km : 0;
      const computedDistanceInput = meters > 0 ? String(meters) : "";
      const css = preferences?.swimCssSecPer100m;
      const computedMinutes =
        typeof css === "number" && css > 0 && meters > 0
          ? estimateDurationMinutesFromDistanceKm(
              km,
              preferences,
              undefined,
              sportType,
            )
          : 0;
      const computedDurationInput =
        computedMinutes > 0
          ? formatDurationInput(computedMinutes, durationUnit)
          : "";

      setAutoDistanceInput(computedDistanceInput);
      setAutoDurationInput(computedDurationInput);
      setDistanceManual(false);
      setDistanceInput("");
      setDistanceKm(computedDistanceKm);

      if (typeof css === "number" && css > 0 && meters > 0) {
        setDurationManual(false);
        setDurationInput("");
        setDurationMin(computedMinutes);
      }

      if (primaryMetric == null && computedDistanceKm > 0) {
        setPrimaryMetric("distance");
        setSecondaryMetricVisible(false);
      }
      return;
    }
    const minutes = Math.round(
      estimateStructureDurationMinutes(structure, preferences, sportType),
    );
    const km =
      Math.round(
        estimateStructureDistanceKm(structure, preferences, sportType) * 10,
      ) / 10;
    const computedDurationInput =
      minutes > 0 ? formatDurationInput(minutes, durationUnit) : "";
    const computedDistanceInput =
      km > 0 ? formatDistanceInputValue(km) : "";

    setAutoDurationInput(computedDurationInput);
    setAutoDistanceInput(computedDistanceInput);

    // Structure drives hero metrics unless the coach typed a manual override.
    const durationEmpty = !durationInput.trim();
    const distanceEmpty = !distanceInput.trim();
    if (!durationManual || durationEmpty) {
      if (durationEmpty) setDurationManual(false);
      setDurationMin(minutes);
    }
    if (!distanceManual || distanceEmpty) {
      if (distanceEmpty) setDistanceManual(false);
      setDistanceKm(km);
    }

    if (primaryMetric == null && (minutes > 0 || km > 0)) {
      setPrimaryMetric(km > 0 ? "distance" : "duration");
      setSecondaryMetricVisible(false);
    }
  }, [
    structureDrivesHero,
    structure,
    preferences,
    durationUnit,
    sportType,
    swimForm.swimStructure,
  ]);

  function clearHydratedMetricGuards() {
    simpleMetricsHydratedRef.current = null;
  }

  function resolveSwimPlannedMeters(): number {
    if (hasSwimStructureContent(swimForm.swimStructure)) {
      return workoutDistanceMeters(swimForm.swimStructure);
    }
    return Math.round(distanceKm * 1000);
  }

  function formatDistanceEstimate(estimatedKm: number) {
    if (estimatedKm <= 0) return "";
    return config.distanceUnit === "m"
      ? String(Math.round(estimatedKm * 1000))
      : formatDistanceInputValue(estimatedKm);
  }

  function estimationSessionType() {
    return sessionType ?? SessionType.EASY_RUN;
  }

  function estimationBikeKind() {
    return bikeKind ?? "EASY";
  }

  function estimateDistanceFromDuration(minutes: number) {
    if (minutes <= 0 || !config.showDistance) return 0;
    return sportType === WorkoutType.BIKE
      ? estimateBikeKmFromMinutes(minutes, estimationBikeKind(), preferences)
      : estimateDistanceKmFromDurationMinutes(
          minutes,
          preferences,
          estimationSessionType(),
          sportType,
        );
  }

  function estimateDurationFromDistance(km: number) {
    if (km <= 0) return 0;
    return sportType === WorkoutType.BIKE
      ? estimateBikeMinutesFromKm(km, estimationBikeKind(), preferences)
      : estimateDurationMinutesFromDistanceKm(
          km,
          preferences,
          estimationSessionType(),
          sportType,
        );
  }

  useEffect(() => {
    if (metricsFromDetails || structureDrivesHero || !config.showDistance) return;
    if (
      simpleMetricsHydratedRef.current &&
      workout?.id === simpleMetricsHydratedRef.current
    ) {
      return;
    }

    // Keep Auto cells in sync from the opposite manual metric
    if (durationManual && durationMin > 0) {
      const estimated = estimateDistanceFromDuration(durationMin);
      const formatted = formatDistanceEstimate(estimated);
      setAutoDistanceInput(formatted);
      if (!distanceManual) setDistanceKm(estimated);
    } else if (!durationManual) {
      setAutoDistanceInput("");
    }

    if (distanceManual && distanceKm > 0) {
      const estimated = estimateDurationFromDistance(distanceKm);
      const formatted =
        estimated > 0 ? formatDurationInput(estimated, durationUnit) : "";
      setAutoDurationInput(formatted);
      if (!durationManual) setDurationMin(estimated);
    } else if (!distanceManual) {
      setAutoDurationInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metricsFromDetails,
    structureDrivesHero,
    durationManual,
    distanceManual,
    durationMin,
    distanceKm,
    sessionType,
    bikeKind,
    sportType,
    durationUnit,
    config.showDistance,
    config.distanceUnit,
    workout?.id,
  ]);

  function handleDurationChange(raw: string) {
    if (metricsFromDetails || structureDrivesHero) return;
    clearHydratedMetricGuards();
    const nextValue =
      durationUnit === "hours"
        ? sanitizeHoursInput(raw)
        : raw.replace(/\D/g, "");
    if (!nextValue || nextValue === ":") {
      setDurationManual(true);
      setDurationMin(0);
      setDurationInput("");
      setAutoDistanceInput("");
      if (!distanceManual || !distanceInput.trim()) setDistanceKm(0);
      const otherHasValue = distanceInput.trim().length > 0 || distanceKm > 0;
      if (otherHasValue) {
        setPrimaryMetric("distance");
        setSecondaryMetricVisible(false);
      } else {
        // Stay pending-primary on this field (large + grey) until focus moves
        setPrimaryMetric("duration");
        setSecondaryMetricVisible(false);
      }
      return;
    }
    setPrimaryMetric("duration");
    setDurationManual(true);
    setSecondaryMetricVisible(false);
    setDurationInput(nextValue);
    const total = parseDurationInput(nextValue, durationUnit);
    setDurationMin(total);

    // If distance wasn't manually typed, switch it to Auto and fill estimate
    const distanceHasManualValue = distanceInput.trim().length > 0;
    if (canAutoEstimate && config.showDistance) {
      const estimated = estimateDistanceFromDuration(total);
      const formatted = formatDistanceEstimate(estimated);
      setAutoDistanceInput(formatted);
      if (!distanceHasManualValue) {
        setDistanceManual(false);
        setDistanceKm(estimated);
      }
    }
  }

  function handleDistanceChange(raw: string) {
    if (metricsFromDetails || structureDrivesHero) return;
    clearHydratedMetricGuards();
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (!cleaned) {
      setDistanceManual(true);
      setDistanceKm(0);
      setDistanceInput("");
      setAutoDurationInput("");
      if (!durationManual || !durationInput.trim()) setDurationMin(0);
      const otherHasValue = durationInput.trim().length > 0 || durationMin > 0;
      if (otherHasValue) {
        setPrimaryMetric("duration");
        setSecondaryMetricVisible(false);
      } else {
        setPrimaryMetric("distance");
        setSecondaryMetricVisible(false);
      }
      return;
    }
    const value = Number.parseFloat(cleaned);
    if (!Number.isFinite(value) || value < 0) return;
    setPrimaryMetric("distance");
    setDistanceManual(true);
    setSecondaryMetricVisible(false);
    setDistanceInput(cleaned);
    const km = config.distanceUnit === "m" ? value / 1000 : value;
    setDistanceKm(km);
    if (sportType === WorkoutType.SWIM) {
      setSwimForm((prev) => ({
        ...prev,
        plannedDistanceMeters: Math.round(value),
      }));
    }

    const durationHasManualValue = durationInput.trim().length > 0;
    if (canAutoEstimate) {
      const estimated = estimateDurationFromDistance(km);
      const formatted =
        estimated > 0 ? formatDurationInput(estimated, durationUnit) : "";
      setAutoDurationInput(formatted);
      if (!durationHasManualValue) {
        setDurationManual(false);
        setDurationMin(estimated);
      }
    }
  }

  function toggleDurationUnit(event: MouseEvent) {
    event.stopPropagation();
    setDurationUnit((prev) => {
      const next: DurationUnit = prev === "min" ? "hours" : "min";
      const formatted =
        durationMin > 0 ? formatDurationInput(durationMin, next) : "";
      // Keep display in sync for both Manual and Auto (incl. builder estimates).
      if (durationManual) {
        setDurationInput(formatted);
      }
      if (autoDurationInput.trim() || !durationManual || structureDrivesHero) {
        setAutoDurationInput(formatted);
      }
      return next;
    });
  }

  function handleDistanceSourceChange(source: "manual" | "auto") {
    clearHydratedMetricGuards();
    if (source === "manual") {
      setDistanceManual(true);
      const seed =
        distanceInput.trim() || autoDistanceInput?.replace(/[^\d.]/g, "") || "";
      if (seed) {
        if (!distanceInput.trim() && autoDistanceInput) {
          setDistanceInput(seed);
        }
        const value = Number.parseFloat(seed.replace(/[^\d.]/g, ""));
        if (Number.isFinite(value) && value >= 0) {
          const km = config.distanceUnit === "m" ? value / 1000 : value;
          setDistanceKm(km);
        }
      }
      return;
    }

    // Restore Auto from the opposite manual metric (fresh estimate).
    setDistanceManual(false);
    setDistanceInput("");
    if (canAutoEstimate && durationManual && durationMin > 0) {
      const estimated = estimateDistanceFromDuration(durationMin);
      const formatted = formatDistanceEstimate(estimated);
      setAutoDistanceInput(formatted);
      setDistanceKm(estimated);
      return;
    }
    if (autoDistanceInput) {
      const cleaned = autoDistanceInput.replace(/[^\d.]/g, "");
      const value = Number.parseFloat(cleaned);
      if (Number.isFinite(value) && value > 0) {
        const km = config.distanceUnit === "m" ? value / 1000 : value;
        setDistanceKm(km);
        return;
      }
    }
    setDistanceKm(0);
    setAutoDistanceInput("");
  }

  function handleDurationSourceChange(source: "manual" | "auto") {
    clearHydratedMetricGuards();
    if (source === "manual") {
      setDurationManual(true);
      const seed = durationInput.trim() || autoDurationInput || "";
      if (seed) {
        if (!durationInput.trim() && autoDurationInput) {
          setDurationInput(autoDurationInput);
        }
        setDurationMin(parseDurationInput(seed, durationUnit));
      }
      return;
    }

    // Restore Auto from the opposite manual metric (fresh estimate).
    setDurationManual(false);
    setDurationInput("");
    if (canAutoEstimate && distanceManual && distanceKm > 0) {
      const estimated = estimateDurationFromDistance(distanceKm);
      const formatted =
        estimated > 0 ? formatDurationInput(estimated, durationUnit) : "";
      setAutoDurationInput(formatted);
      setDurationMin(estimated);
      return;
    }
    if (autoDurationInput) {
      setDurationMin(parseDurationInput(autoDurationInput, durationUnit));
      return;
    }
    setDurationMin(0);
    setAutoDurationInput("");
  }

  function libraryContentFingerprint() {
    const s = libraryFingerprintStateRef.current;
    return JSON.stringify({
      title: s.title.trim(),
      subtitle: s.subtitle.trim(),
      sessionType: s.sessionType,
      bikeKind: s.bikeKind,
      sportType: s.sportType,
      structure: s.structure,
      includeItems: s.includeItems,
      swimStructure: s.swimStructure,
      coachNotes: s.coachNotes.trim(),
      durationManual: s.durationManual,
      distanceManual: s.distanceManual,
      durationInput: s.durationInput,
      distanceInput: s.distanceInput,
      detailsOpen: s.detailsOpen,
      includeOpen: s.includeOpen,
    });
  }

  function armLibraryBaselineCapture() {
    if (libraryBaselineTimerRef.current) {
      clearTimeout(libraryBaselineTimerRef.current);
    }
    // Treat as clean while settling after apply (auto-estimates may lag a tick).
    libraryBaselineRef.current = null;
    libraryBaselineTimerRef.current = setTimeout(() => {
      libraryBaselineRef.current = libraryContentFingerprint();
      libraryBaselineTimerRef.current = null;
    }, 150);
  }

  function isLibraryContentDirty(): boolean {
    if (!templateId || !libraryBaselineRef.current) return false;
    return libraryContentFingerprint() !== libraryBaselineRef.current;
  }

  function hasMeaningfulManualDraft(): boolean {
    return (
      Boolean(title.trim()) ||
      Boolean(subtitle.trim()) ||
      durationMin > 0 ||
      distanceKm > 0 ||
      hasStructureContent(structure) ||
      includeItems.length > 0 ||
      hasSwimStructureContent(swimForm.swimStructure) ||
      Boolean(coachNotes.trim()) ||
      typeSelected
    );
  }

  function editorHasLibraryOverwriteRisk(nextTemplateId: string): boolean {
    if (templateId === nextTemplateId) return false;
    // Browsing library templates without edits: no warning.
    if (templateId) return isLibraryContentDirty();
    // Started a workout manually, then picking from library.
    return hasMeaningfulManualDraft();
  }

  function requestApplyTemplate(item: WorkoutTemplatePickerItem) {
    if (templateId === item.id) return;
    if (editorHasLibraryOverwriteRisk(item.id)) {
      setPendingLibraryTemplate(item);
      return;
    }
    applyTemplate(item);
  }

  function applyTemplate(item: WorkoutTemplatePickerItem) {
    const nextSport = item.type;
    const nextConfig = getSportEditorConfig(nextSport);
    const nextDurationUnit =
      nextSport !== sportType ? nextConfig.durationUnitDefault : durationUnit;

    if (nextSport !== sportType) {
      setSportType(nextSport);
      setDurationUnit(nextDurationUnit);
    }

    setTitle(item.title);
    setTitleAuto(false);
    setSessionType(item.sessionType);
    if (nextSport === WorkoutType.BIKE) {
      const kind =
        BIKE_WORKOUT_KINDS.find((k) => k.sessionType === item.sessionType)
          ?.id ?? "CUSTOM";
      setBikeKind(kind);
    } else {
      setBikeKind(null);
    }
    const nextDuration = item.durationMin ?? 0;
    const nextDistance = item.distanceKm ?? 0;
    const hasDuration = nextDuration > 0;
    const hasDistance = nextDistance > 0;
    setDurationManual(hasDuration);
    setDistanceManual(hasDistance);
    setDurationMin(hasDuration ? nextDuration : 0);
    setDistanceKm(hasDistance ? nextDistance : 0);
    setDurationInput(
      hasDuration ? formatDurationInput(nextDuration, nextDurationUnit) : "",
    );
    setDistanceInput(
      hasDistance
        ? nextConfig.distanceUnit === "m"
          ? String(Math.round(nextDistance * 1000))
          : formatDistanceInputValue(nextDistance)
        : "",
    );
    setAutoDistanceInput("");
    setAutoDurationInput("");
    setPrimaryMetric(
      hasDistance && !hasDuration
        ? "distance"
        : hasDuration && !hasDistance
          ? "duration"
          : hasDistance
            ? "distance"
            : hasDuration
              ? "duration"
              : null,
    );
    setSecondaryMetricVisible(false);
    simpleMetricsHydratedRef.current = null;
    structureHeroKeyRef.current = null;
    if (nextSport === WorkoutType.SWIM) {
      setSwimForm({
        ...defaultSwimWorkoutForm(),
        title: item.title,
        description: item.description ?? "",
        plannedDistanceMeters: hasDistance
          ? Math.round(nextDistance * 1000)
          : null,
        plannedDuration: hasDuration ? nextDuration : null,
        swimStructure: item.structure as SwimWorkoutForm["swimStructure"],
        builderEnabled: hasSwimStructureContent(
          item.structure as SwimWorkoutForm["swimStructure"],
        ),
      });
      setDetailsOpen(
        hasSwimStructureContent(
          item.structure as SwimWorkoutForm["swimStructure"],
        ),
      );
      setStructure(emptyStructure());
      setIncludeItems([]);
      setIncludeOpen(false);
    } else {
      const parsed = parseStructure(item.structure);
      const hasBlocks = hasStructureContent(parsed);
      const hasIncludes = (parsed.includeItems?.length ?? 0) > 0;
      setStructure(parsed);
      setIncludeItems(parsed.includeItems ?? []);
      setSwimForm(defaultSwimWorkoutForm());
      setDetailsOpen(
        hasBlocks ||
          (!hasIncludes &&
            nextConfig.descriptionOnly &&
            Boolean(item.description?.trim())),
      );
      setIncludeOpen(!hasBlocks && hasIncludes);
    }
    setCoachNotes(item.notes ?? "");
    setCoachNotesPrivate(false);
    setTemplateId(item.id);
    setSubtitleAuto(false);
    setSubtitle(item.description?.trim() ?? "");
    // Keep library open with the same filters; grow modal to fit workout.
    armLibraryBaselineCapture();
    scheduleFitShellToEditor();
  }

  function buildMetricSources() {
    const fromStructure = structureDrivesHero;
    return {
      plannedDurationSource: metricSourceFromEditorIntent({
        hasValue: durationMin > 0 && typeSelected,
        manual: durationManual,
        fromStructure,
      }),
      plannedDistanceSource: metricSourceFromEditorIntent({
        hasValue:
          config.showDistance &&
          config.distanceUnit === "km" &&
          distanceKm > 0 &&
          typeSelected,
        manual: distanceManual,
        fromStructure,
      }),
    };
  }

  function buildTags() {
    const approx = {
      duration:
        !structureDrivesHero &&
        !durationManual &&
        durationMin > 0 &&
        typeSelected,
      distance:
        !structureDrivesHero &&
        !distanceManual &&
        distanceKm > 0 &&
        typeSelected,
    };
    const resolvedPrimary: WorkoutPrimaryMetric =
      primaryMetric ??
      (!config.showDistance
        ? "duration"
        : distanceKm > 0 && durationMin <= 0
          ? "distance"
          : durationMin > 0 && distanceKm <= 0
            ? "duration"
            : config.showDistance
              ? "distance"
              : "duration");
    const secondaryExtra = secondaryMetricVisible
      ? [SECONDARY_METRIC_ON_TAG]
      : [];
    if (sportType === WorkoutType.BIKE && bikeKind) {
      return [
        ...bikeWorkoutTags(
          environment,
          bikeKind,
          resolvedPrimary,
          approx,
          durationUnit,
        ),
        ...secondaryExtra,
      ];
    }
    return genericWorkoutTags(
      resolvedPrimary,
      approx,
      durationUnit,
      secondaryExtra,
    );
  }

  /** Live draft → athlete-facing card shape (same resolution as save). */
  function buildAthletePreview(): PlanWorkoutDetail {
    const resolvedSession =
      sportType === WorkoutType.BIKE && bikeKind
        ? bikeKindMeta(bikeKind).sessionType
        : (sessionType ?? SessionType.CUSTOM);

    if (sportType === WorkoutType.SWIM) {
      const meters = resolveSwimPlannedMeters();
      return {
        id: workout?.id ?? "preview",
        title: title.trim() || "Swim",
        dateKey: date,
        type: WorkoutType.SWIM,
        sessionType: resolvedSession,
        status: workout?.status ?? WorkoutStatus.PLANNED,
        description: subtitle.trim() || null,
        plannedDistance: null,
        plannedDistanceMeters: meters > 0 ? meters : null,
        plannedDuration: durationMin > 0 ? durationMin : null,
        swimEnvironment: swimForm.swimEnvironment,
        coachNotes: coachNotes.trim() || null,
        coachNotesPrivate,
        structure: null,
        swimStructure: hasSwimStructureContent(swimForm.swimStructure)
          ? (swimForm.swimStructure ?? null)
          : null,
        tags: buildTags(),
        selfLogged: workout?.selfLogged ?? false,
        rescheduledFromDateKey: workout?.rescheduledFromDateKey ?? null,
        result: null,
      };
    }

    const persistDetails = hasStructureContent(structure);
    const persistInclude =
      includeItems.length > 0 && !hasStructureContent(structure);
    const structureToSave = {
      ...(persistDetails ? structure : emptyStructure()),
      coachNotes: coachNotes || undefined,
      includeItems: persistInclude ? includeItems : [],
    };
    const resolvedTitle =
      title.trim() ||
      (titleAuto && typeSelected
        ? sportType === WorkoutType.BIKE && bikeKind
          ? autoBikeTitleFromPrefs(
              environment,
              bikeKind,
              typePrefs,
              selectedBikeOptionId,
            )
          : sessionType
            ? customSessionTypeLabel(
                sessionType,
                sportType,
                typePrefs,
                selectedSessionOptionId,
              )
            : ""
        : "") ||
      WORKOUT_TYPE_LABELS[sportType];
    const resolvedDescription =
      subtitleAuto && typeSelected
        ? autoSubtitle(
            sportType,
            sessionType,
            bikeKind,
            durationMin,
            distanceKm,
            includeItems,
            typePrefs,
            sportType === WorkoutType.BIKE
              ? selectedBikeOptionId
              : selectedSessionOptionId,
          )
        : subtitle.trim();

    return {
      id: workout?.id ?? "preview",
      title: resolvedTitle,
      dateKey: date,
      type: sportType,
      sessionType: resolvedSession,
      status: workout?.status ?? WorkoutStatus.PLANNED,
      description: resolvedDescription || null,
      plannedDistance:
        config.showDistance && config.distanceUnit === "km" && distanceKm > 0
          ? distanceKm
          : null,
      plannedDistanceMeters: null,
      plannedDuration: durationMin > 0 ? durationMin : null,
      swimEnvironment: null,
      coachNotes: coachNotes.trim() || null,
      coachNotesPrivate,
      structure: persistDetails || persistInclude ? structureToSave : null,
      swimStructure: null,
      tags: buildTags(),
      selfLogged: workout?.selfLogged ?? false,
      rescheduledFromDateKey: workout?.rescheduledFromDateKey ?? null,
      result: null,
    };
  }

  function resolveDraftTitle() {
    return (
      title.trim() ||
      (titleAuto && typeSelected
        ? sportType === WorkoutType.BIKE && bikeKind
          ? autoBikeTitleFromPrefs(
              environment,
              bikeKind,
              typePrefs,
              selectedBikeOptionId,
            )
          : sessionType
            ? customSessionTypeLabel(
                sessionType,
                sportType,
                typePrefs,
                selectedSessionOptionId,
              )
            : ""
        : "") ||
      WORKOUT_TYPE_LABELS[sportType]
    );
  }

  function resolveDraftDescription() {
    if (subtitleAuto && typeSelected) {
      return autoSubtitle(
        sportType,
        sessionType,
        bikeKind,
        durationMin,
        distanceKm,
        includeItems,
        typePrefs,
        sportType === WorkoutType.BIKE
          ? selectedBikeOptionId
          : selectedSessionOptionId,
      );
    }
    return subtitle.trim();
  }

  function saveDraftToLibrary(input: {
    title: string;
    folderId: string | null;
  }) {
    setLibrarySavePending(true);
    setLibrarySaveError(null);
    startTransition(async () => {
      try {
        const resolvedSession =
          sportType === WorkoutType.BIKE && bikeKind
            ? bikeKindMeta(bikeKind).sessionType
            : (sessionType ?? SessionType.CUSTOM);
        const sources = buildMetricSources();

        if (sportType === WorkoutType.SWIM) {
          const meters = resolveSwimPlannedMeters();
          await saveWorkoutDraftToLibrary({
            title: input.title,
            description: subtitle.trim() || null,
            sportType,
            sessionType: resolvedSession,
            folderId: input.folderId,
            durationMin: durationMin > 0 ? durationMin : null,
            notes: coachNotes.trim() || null,
            swimEnvironment: swimForm.swimEnvironment,
            swimStructure: hasSwimStructureContent(swimForm.swimStructure)
              ? (swimForm.swimStructure ?? null)
              : null,
            plannedDistanceMeters: meters > 0 ? meters : null,
            tags: buildTags(),
            durationSource: sources.plannedDurationSource,
            plannedDistanceMetersSource: sources.plannedDistanceSource,
          });
        } else {
          const persistDetails = hasStructureContent(structure);
          const persistInclude =
            includeItems.length > 0 && !hasStructureContent(structure);
          const structureToSave = {
            ...(persistDetails ? structure : emptyStructure()),
            coachNotes: coachNotes || undefined,
            includeItems: persistInclude ? includeItems : [],
          };
          await saveWorkoutDraftToLibrary({
            title: input.title,
            description: resolveDraftDescription() || null,
            sportType,
            sessionType: resolvedSession,
            folderId: input.folderId,
            durationMin: durationMin > 0 ? durationMin : null,
            distanceKm:
              config.showDistance &&
              config.distanceUnit === "km" &&
              distanceKm > 0
                ? distanceKm
                : null,
            durationSource: sources.plannedDurationSource,
            distanceSource: sources.plannedDistanceSource,
            notes: coachNotes.trim() || null,
            structure:
              persistDetails || persistInclude ? structureToSave : null,
            tags: buildTags(),
          });
        }

        const library = await getCoachLibraryForPicker();
        setTemplates(library.templates);
        setLibraryFolders(library.folders);
        setLibrarySaveOk(true);
        setSaveToLibraryOpen(false);
        window.setTimeout(() => setLibrarySaveOk(false), 2500);
      } catch (err) {
        setLibrarySaveError(toUserMessage(err, "Could not save to library"));
      } finally {
        setLibrarySavePending(false);
      }
    });
  }

  function save() {
    startTransition(async () => {
      setSaveError(null);
      try {
      if (athleteMode) {
        await createAthleteWorkoutFromModal({
          title: title.trim() || WORKOUT_TYPE_LABELS[sportType],
          sportType,
          sessionType: sessionType ?? defaultAthleteSessionType(sportType),
          scheduledDate: date,
          plannedDistance:
            config.showDistance && distanceKm > 0 ? distanceKm : undefined,
          plannedDuration: durationMin > 0 ? durationMin : undefined,
          description: subtitle.trim() || undefined,
        });
        onSaved?.();
        return;
      }

      if (sportType === WorkoutType.SWIM) {
        const meters = resolveSwimPlannedMeters();
        const payload = {
          ...swimForm,
          title: title.trim() || "Swim",
          description: subtitle.trim(),
          plannedDistanceMeters: meters > 0 ? meters : null,
          plannedDuration: durationMin > 0 ? durationMin : null,
          coachNotes: coachNotes.trim() || null,
          coachNotesPrivate,
          builderEnabled: hasSwimStructureContent(swimForm.swimStructure),
          swimStructure: hasSwimStructureContent(swimForm.swimStructure)
            ? (swimForm.swimStructure ?? null)
            : null,
          scheduledDate: date,
          templateId,
          tags: buildTags(),
        };

        if (isTemplate) {
          await saveSwimTemplateFromModal(entityId ?? null, payload);
          onSaved?.();
          return;
        }

        if (isEdit && workout) {
          await updateSwimWorkoutFromModal(workout.id, payload);
        } else {
          await createSwimWorkoutFromModal(payload);
        }
        onSaved?.();
        return;
      }

      const resolvedSession =
        sportType === WorkoutType.BIKE && bikeKind
          ? bikeKindMeta(bikeKind).sessionType
          : (sessionType ?? SessionType.CUSTOM);
      const persistDetails = hasStructureContent(structure);
      const persistInclude =
        includeItems.length > 0 && !hasStructureContent(structure);
      const structureToSave = {
        ...(persistDetails ? structure : emptyStructure()),
        coachNotes: coachNotes || undefined,
        includeItems: persistInclude ? includeItems : [],
      };
      const resolvedTitle =
        title.trim() ||
        (titleAuto && typeSelected
          ? sportType === WorkoutType.BIKE && bikeKind
            ? autoBikeTitleFromPrefs(
                environment,
                bikeKind,
                typePrefs,
                selectedBikeOptionId,
              )
            : sessionType
              ? customSessionTypeLabel(
                  sessionType,
                  sportType,
                  typePrefs,
                  selectedSessionOptionId,
                )
              : ""
          : "") ||
        WORKOUT_TYPE_LABELS[sportType];
      const resolvedDescription =
        subtitleAuto && typeSelected
          ? autoSubtitle(
              sportType,
              sessionType,
              bikeKind,
              durationMin,
              distanceKm,
              includeItems,
              typePrefs,
              sportType === WorkoutType.BIKE
                ? selectedBikeOptionId
                : selectedSessionOptionId,
            )
          : subtitle.trim();

      if (isTemplate) {
        const payload = {
          title: resolvedTitle,
          description: resolvedDescription || undefined,
          sportType,
          sessionType: resolvedSession,
          tags: buildTags(),
          structure:
            persistDetails || persistInclude
              ? structureToSave
              : emptyStructure(),
          estimatedDuration: durationMin > 0 ? durationMin : undefined,
        };
        if (entityId) {
          await saveTemplateBuilder(payload, entityId);
        } else {
          await saveTemplateBuilder(payload);
        }
        onSaved?.();
        return;
      }

      const payload = {
        title: resolvedTitle,
        description: resolvedDescription || undefined,
        sportType,
        sessionType: resolvedSession,
        scheduledDate: date,
        plannedDuration: durationMin > 0 ? durationMin : undefined,
        plannedDistance:
          config.showDistance && config.distanceUnit === "km" && distanceKm > 0
            ? distanceKm
            : undefined,
        ...buildMetricSources(),
        coachNotes: coachNotes.trim() || undefined,
        coachNotesPrivate,
        structure:
          persistDetails || persistInclude ? structureToSave : undefined,
        templateId,
        allowPaceEstimate: typeSelected || persistDetails,
        tags: buildTags(),
      };

      if (isEdit && workout) {
        await updateWorkoutFromModal({ ...payload, workoutId: workout.id });
      } else {
        await createWorkoutFromModal(payload);
      }
      onSaved?.();
      } catch (err) {
        setSaveError(toUserMessage(err, 'Could not save workout'));
      }
    });
  }

  const sessionPrefRows = enabledSessionOptionRows(sportType, typePrefs);
  const bikePrefRows = enabledBikeOptionRows(typePrefs);
  const sessionSelectValue =
    selectedSessionOptionId &&
    sessionPrefRows.some((row) => row.id === selectedSessionOptionId)
      ? selectedSessionOptionId
      : (sessionPrefRows.find(
          (row) => row.sessionType === sessionType && row.name === title,
        )?.id ??
        sessionPrefRows.find((row) => row.sessionType === sessionType)?.id ??
        sessionType ??
        undefined);
  const bikeSelectValue =
    selectedBikeOptionId &&
    bikePrefRows.some((row) => row.id === selectedBikeOptionId)
      ? selectedBikeOptionId
      : (bikePrefRows.find((row) => row.kind === bikeKind && row.name === title)
          ?.id ??
        bikePrefRows.find((row) => row.kind === bikeKind)?.id ??
        bikeKind ??
        undefined);
  const sessionOptions = (() => {
    const options = sessionPrefRows.map((row) => ({
      value: row.id,
      label: row.name,
    }));
    if (
      sessionType &&
      !sessionPrefRows.some((row) => row.sessionType === sessionType)
    ) {
      options.unshift({
        value: sessionType,
        label: customSessionTypeLabel(sessionType, sportType, typePrefs),
      });
    }
    return options;
  })();
  const bikeKindOptions = (() => {
    const options = bikePrefRows.map((row) => ({
      value: row.id,
      label: row.name,
    }));
    if (bikeKind && !bikePrefRows.some((row) => row.kind === bikeKind)) {
      options.unshift({
        value: bikeKind,
        label: customBikeKindLabel(bikeKind, typePrefs),
      });
    }
    return options;
  })();

  const missingPrefs =
    preferences && typeSelected
      ? sportType === WorkoutType.BIKE
        ? !hasBikeSpeedPreferences(preferences)
        : sportType === WorkoutType.RUN
          ? !hasPacePreferences(preferences)
          : sportType === WorkoutType.SWIM
            ? !hasSwimCssPreference(preferences)
            : false
      : false;

  const missingPrefsLabel =
    sportType === WorkoutType.BIKE
      ? "bike speed zones"
      : sportType === WorkoutType.SWIM
        ? "critical swim speed (CSS)"
        : "run pace zones";

  const missingZoneLabels = useMemo(
    () =>
      detailsOpen && !athleteMode
        ? missingIntensityZoneLabels(structure, preferences, sportType)
        : [],
    [detailsOpen, athleteMode, structure, preferences, sportType],
  );
  const missingZoneMessage = formatMissingIntensityZoneMessage(
    missingZoneLabels,
    sportType,
  );

  const footer = (
    <div className="border-t border-[var(--tt-line,#ebebeb)] px-5 py-3 sm:px-6">
      {saveError ? (
        <FormError message={saveError} className="mb-2" />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
      {previewOpen ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreviewOpen(false)}
        >
          Back to edit
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onCancel?.()}
        >
          Cancel
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!athleteMode && !previewOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        ) : null}
        {!athleteMode && !isTemplate && !previewOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={pending || librarySavePending}
            onClick={() => {
              setLibrarySaveError(null);
              setSaveToLibraryOpen(true);
            }}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            {librarySaveOk ? "Saved to library" : "Save to library"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={save}
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      </div>
    </div>
  );

  if (previewOpen && !athleteMode) {
    return (
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          !embedded &&
            "w-full max-w-[42rem] overflow-hidden rounded-[10px] border border-white/20 bg-white shadow-[0_0_0_1px_rgba(15,18,39,0.35),0_24px_64px_rgba(0,0,0,0.42)] sm:w-[42rem]",
          className,
        )}
      >
        {!embedded && onCancel ? (
          <button
            type="button"
            onClick={() => onCancel()}
            className="absolute right-3 top-3 z-20 rounded-md p-1.5 text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <div
          className={cn(
            "flex flex-row items-start justify-between gap-3 border-b border-[var(--tt-line,#ebebeb)] px-5 py-4 sm:px-6",
            !embedded && "pr-12",
          )}
        >
          <div>
            <h2 className="text-lg font-semibold">Athlete preview</h2>
            <p className="text-sm text-muted-foreground">
              How this workout looks for the athlete
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          <AthleteWorkoutDetailCard workout={buildAthletePreview()} />
        </div>
        {footer}
      </div>
    );
  }

  const dateLabel = date
    ? (() => {
        const d = parseDateOnly(date);
        return d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
      })()
    : null;

  const workoutTypeControl =
    !athleteMode && sportType !== WorkoutType.SWIM ? (
      config.useBikeKinds ? (
        <SelectPrimitive.Root
          value={bikeSelectValue}
          onValueChange={(value) => {
            const row = bikePrefRows.find((item) => item.id === value);
            if (row) {
              setSelectedBikeOptionId(row.id);
              setBikeKind(row.kind);
              if (titleAuto || !title.trim()) {
                setTitleAuto(true);
                setTitle(
                  autoBikeTitleFromPrefs(
                    environment,
                    row.kind,
                    typePrefs,
                    row.id,
                  ),
                );
              }
              return;
            }
            setSelectedBikeOptionId(null);
            setBikeKind(value as BikeWorkoutKind);
            if (titleAuto || !title.trim()) {
              setTitleAuto(true);
              setTitle(
                autoBikeTitleFromPrefs(
                  environment,
                  value as BikeWorkoutKind,
                  typePrefs,
                ),
              );
            }
          }}
        >
          <SelectPrimitive.Trigger
            aria-label="Workout type"
            className={cn(
              "group inline-flex max-w-full items-center justify-center gap-1 bg-transparent text-center text-[20px] font-bold leading-tight outline-none",
              bikeKind ? "text-white" : "text-white/35",
            )}
          >
            <span className="truncate">
              {bikeKind
                ? customBikeKindLabel(bikeKind, typePrefs, selectedBikeOptionId)
                : "Select"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/50 transition group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Trigger>
          <SelectDropdownContent align="center" className="z-[210]">
            {bikeKindOptions.map((option) => (
              <SelectDropdownItem key={option.value} option={option} />
            ))}
          </SelectDropdownContent>
        </SelectPrimitive.Root>
      ) : (
        <SelectPrimitive.Root
          value={sessionSelectValue}
          onValueChange={(value) => {
            const row = sessionPrefRows.find((item) => item.id === value);
            if (row) {
              setSelectedSessionOptionId(row.id);
              setSessionType(row.sessionType);
              if (titleAuto || !title.trim()) {
                setTitleAuto(true);
                setTitle(row.name);
              }
              return;
            }
            const next = value as SessionType;
            setSelectedSessionOptionId(null);
            setSessionType(next);
            if (titleAuto || !title.trim()) {
              setTitleAuto(true);
              setTitle(customSessionTypeLabel(next, sportType, typePrefs));
            }
          }}
        >
          <SelectPrimitive.Trigger
            aria-label="Workout type"
            className={cn(
              "group inline-flex max-w-full items-center justify-center gap-1 bg-transparent text-center text-[20px] font-bold leading-tight outline-none",
              sessionType ? "text-white" : "text-white/35",
            )}
          >
            <span className="truncate">
              {sessionType
                ? customSessionTypeLabel(
                    sessionType,
                    sportType,
                    typePrefs,
                    selectedSessionOptionId,
                  )
                : "Select"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/50 transition group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Trigger>
          <SelectDropdownContent align="center" className="z-[210]">
            {sessionOptions.map((option) => (
              <SelectDropdownItem key={option.value} option={option} />
            ))}
          </SelectDropdownContent>
        </SelectPrimitive.Root>
      )
    ) : null;

  function handleSportChange(next: WorkoutType) {
    if (next === sportType) return;
    const prev = sportType;
    const nextConfig = getSportEditorConfig(next);
    setSportType(next);
    setDurationUnit(nextConfig.durationUnitDefault);
    setPrimaryMetric(null);
    setSecondaryMetricVisible(false);
    setBikeKind(null);
    setSessionType(null);
    setDetailsOpen(false);
    setIncludeOpen(false);
    setChatOpen(false);
    setStructure(emptyStructure());
    setIncludeItems([]);
    setSwimForm(defaultSwimWorkoutForm());
    setTemplateId(undefined);
    setTitleAuto(true);
    setSubtitleAuto(true);
    if (next === WorkoutType.SWIM || prev === WorkoutType.SWIM) {
      setDistanceKm(0);
      setDistanceInput("");
      setAutoDistanceInput("");
      setDistanceManual(true);
    }
    setDurationInput(
      durationMin > 0
        ? formatDurationInput(durationMin, nextConfig.durationUnitDefault)
        : "",
    );
    setAutoDurationInput("");
  }

  function switchToBuildWorkout() {
    setIncludeOpen(false);
    setIncludeItems([]);
    setChatOpen(false);
    setDetailsOpen(true);
  }

  function switchToInclude() {
    setDetailsOpen(false);
    setStructure(emptyStructure());
    setChatOpen(false);
    setIncludeOpen(true);
  }

  function switchToChat() {
    setDetailsOpen(false);
    setIncludeOpen(false);
    setChatOpen(true);
  }

  function switchToSwimSimple() {
    if (!detailsOpen && !chatOpen) return;
    if (detailsOpen && hasSwimStructureContent(swimForm.swimStructure)) {
      setSimpleConfirmOpen(true);
      return;
    }
    setChatOpen(false);
    setIncludeOpen(false);
    setDetailsOpen(false);
    setSwimForm((prev) => ({
      ...prev,
      builderEnabled: false,
      swimStructure: null,
    }));
  }

  function switchToSwimStructured() {
    if (detailsOpen && !chatOpen) return;
    setChatOpen(false);
    setIncludeOpen(false);
    setDetailsOpen(true);
    setSwimForm((prev) => ({
      ...prev,
      builderEnabled: true,
      swimStructure: prev.swimStructure ?? createDefaultSwimStructure(),
    }));
  }

  function selectChatTab() {
    if (chatOpen) return;
    switchToChat();
  }

  function selectBuildWorkoutTab() {
    if (detailsOpen && !includeOpen && !chatOpen) return;
    if (includeItems.length > 0) {
      setModeConflict("to-build");
      return;
    }
    switchToBuildWorkout();
  }

  function selectIncludeTab() {
    if (includeOpen && !detailsOpen && !chatOpen) return;
    if (hasStructureContent(structure)) {
      setModeConflict("to-include");
      return;
    }
    switchToInclude();
  }

  const body = (
    <div
      ref={editorColumnRef}
      className="relative flex min-h-0 w-full flex-1 flex-col sm:w-[42rem] sm:shrink-0"
    >
      {!embedded && onCancel ? (
        <button
          type="button"
          onClick={() => onCancel()}
          className="absolute right-3 top-3 z-20 rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {isTemplate ? (
        <div
          className={cn(
            "flex flex-row items-start justify-between gap-3 border-b border-white/[0.08] bg-[var(--tt-workout-hero-bg,#151827)] px-5 py-4 text-white/[0.92] sm:px-6",
            !embedded && "pr-12",
          )}
        >
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isEdit ? "Edit template" : "New template"}
            </h2>
            <p className="text-sm text-white/55">
              {WORKOUT_TYPE_LABELS[sportType]}
            </p>
          </div>
        </div>
      ) : null}

      <div data-workout-editor-scroll className="min-h-0 flex-1 overflow-y-auto">
        <EditableWorkoutCardShell
          sportType={sportType}
          title={title}
          subtitle={subtitle}
          titleAuto={titleAuto}
          subtitleAuto={subtitleAuto}
          dateLabel={!isTemplate ? dateLabel : null}
          workoutTypeControl={workoutTypeControl}
          sportOptions={!athleteMode ? sportOptions : undefined}
          onSportChange={!athleteMode ? handleSportChange : undefined}
          primaryMetric={primaryMetric}
          durationInput={durationInput}
          distanceInput={distanceInput}
          durationManual={durationManual}
          distanceManual={distanceManual}
          secondaryMetricVisible={secondaryMetricVisible}
          autoDistanceInput={autoDistanceInput}
          autoDurationInput={autoDurationInput}
          metricsLocked={false}
          distanceLocked={false}
          durationLocked={false}
          showDistance={config.showDistance}
          distanceUnit={config.distanceUnit}
          durationUnit={durationUnit}
          allowDurationUnitToggle={config.allowDurationUnitToggle}
          onTitleChange={(value) => {
            setTitle(value);
            setTitleAuto(false);
          }}
          onSubtitleChange={(value) => {
            setSubtitle(value);
            setSubtitleAuto(false);
          }}
          onTitleAutoEnable={() => {
            if (!typeSelected) return;
            setTitleAuto(true);
            if (sportType === WorkoutType.BIKE && bikeKind) {
              setTitle(
                autoBikeTitleFromPrefs(
                  environment,
                  bikeKind,
                  typePrefs,
                  selectedBikeOptionId,
                ),
              );
            } else if (sessionType) {
              setTitle(
                customSessionTypeLabel(
                  sessionType,
                  sportType,
                  typePrefs,
                  selectedSessionOptionId,
                ),
              );
            }
          }}
          onSubtitleAutoEnable={() => {
            if (!typeSelected) return;
            setSubtitleAuto(true);
            setSubtitle(
              autoSubtitle(
                sportType,
                sessionType,
                bikeKind,
                durationMin,
                distanceKm,
                includeItems,
                typePrefs,
                sportType === WorkoutType.BIKE
                  ? selectedBikeOptionId
                  : selectedSessionOptionId,
              ),
            );
          }}
          onDurationChange={handleDurationChange}
          onDistanceChange={handleDistanceChange}
          onPrimaryMetricChange={setPrimaryMetric}
          onDistanceSourceChange={handleDistanceSourceChange}
          onDurationSourceChange={handleDurationSourceChange}
          onSecondaryMetricVisibleChange={setSecondaryMetricVisible}
          onToggleDurationUnit={toggleDurationUnit}
        />

        {!athleteMode && sportType !== WorkoutType.SWIM ? (
          <div
            role="toolbar"
            aria-label="Workout sections"
            className="flex items-stretch border-b border-[var(--tt-line,#ebebeb)]"
          >
            <button
              type="button"
              onClick={selectBuildWorkoutTab}
              aria-pressed={detailsOpen}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                detailsOpen
                  ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                  : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Build workout
            </button>
            <div
              className="w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]"
              aria-hidden
            />
            <button
              type="button"
              onClick={selectIncludeTab}
              aria-pressed={includeOpen}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                includeOpen
                  ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                  : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
              )}
            >
              <ListPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Include
              {includeItems.length > 0 ? (
                <span className="tabular-nums text-[11px] opacity-70">
                  {includeItems.length}
                </span>
              ) : null}
            </button>
            {showChatTab ? (
              <>
                <div
                  className="w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={selectChatTab}
                  aria-pressed={chatOpen}
                  className={cn(
                    "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                    chatOpen
                      ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                      : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Chat
                  {(coachingThread && threadHasChatConversation(coachingThread.messages)) ? (
                    <span className="tabular-nums text-[11px] opacity-70">
                      {coachingThread.messages.length}
                    </span>
                  ) : showChatTabBadge ? (
                    <span className="tabular-nums text-[11px] opacity-70">
                      {chatTabMessageCount}
                    </span>
                  ) : null}
                </button>
              </>
            ) : null}
            {!isEdit ? (
              <>
                <div
                  className="w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={toggleLibraryPanel}
                  aria-pressed={libraryOpen}
                  aria-expanded={libraryOpen}
                  className={cn(
                    "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                    libraryOpen
                      ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                      : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Library
                  {libraryOpen ? (
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  )}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {sportType === WorkoutType.SWIM && !athleteMode ? (
          <div
            role="toolbar"
            aria-label="Swim workout mode"
            className="flex items-stretch border-b border-[var(--tt-line,#ebebeb)]"
          >
            <button
              type="button"
              aria-pressed={!detailsOpen && !chatOpen}
              onClick={switchToSwimSimple}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                !detailsOpen && !chatOpen
                  ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                  : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
              )}
            >
              Simple
            </button>
            <div
              className="w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]"
              aria-hidden
            />
            <button
              type="button"
              aria-pressed={detailsOpen && !chatOpen}
              onClick={switchToSwimStructured}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                detailsOpen && !chatOpen
                  ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                  : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
              )}
            >
              <Rows3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Structured
            </button>
            {showChatTab ? (
              <>
                <div
                  className="w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={selectChatTab}
                  aria-pressed={chatOpen}
                  className={cn(
                    "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                    chatOpen
                      ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                      : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Chat
                  {(coachingThread && threadHasChatConversation(coachingThread.messages)) ? (
                    <span className="tabular-nums text-[11px] opacity-70">
                      {coachingThread.messages.length}
                    </span>
                  ) : showChatTabBadge ? (
                    <span className="tabular-nums text-[11px] opacity-70">
                      {chatTabMessageCount}
                    </span>
                  ) : null}
                </button>
              </>
            ) : null}
            {!isEdit ? (
              <>
                <div
                  className="w-px shrink-0 self-stretch bg-[var(--tt-line,#ebebeb)]"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={toggleLibraryPanel}
                  aria-pressed={libraryOpen}
                  aria-expanded={libraryOpen}
                  className={cn(
                    "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-center text-[12px] font-medium tracking-[0.02em] transition-colors",
                    libraryOpen
                      ? cn("font-semibold", WORKOUT_EDITOR_SECTION_ACTIVE.section, WORKOUT_EDITOR_SECTION_ACTIVE.sectionText)
                      : "bg-transparent text-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink-soft,#6b7280)]",
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Library
                  {libraryOpen ? (
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  )}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {missingPrefs && (
            <div className="rounded-[6px] border border-amber-300/70 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
              Add {missingPrefsLabel} in Preferences to estimate distance/time.
              <Button
                asChild
                variant="link"
                size="xs"
                className="ml-1 h-auto px-0 text-amber-900"
              >
                <Link href="/settings/preferences">Set defaults</Link>
              </Button>
            </div>
          )}

          {!missingPrefs && missingZoneMessage ? (
            <div className="rounded-[6px] border border-amber-300/70 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
              {missingZoneMessage}{" "}
              <Button
                asChild
                variant="link"
                size="xs"
                className="h-auto px-0 text-amber-900"
              >
                <Link href="/settings/preferences">Update preferences</Link>
              </Button>
            </div>
          ) : null}

          {!athleteMode && sportType === WorkoutType.SWIM && detailsOpen && !chatOpen ? (
            !workoutReady ? (
              <WorkoutEditorSectionSkeleton variant="swim" />
            ) : (
            <SwimWorkoutDetailsFields
              form={{
                ...swimForm,
                builderEnabled: true,
                swimStructure:
                  swimForm.swimStructure ?? createDefaultSwimStructure(),
              }}
              onChange={(patch) => {
                setSwimForm((prev) => ({
                  ...prev,
                  ...patch,
                  builderEnabled: true,
                }));
              }}
            />
            )
          ) : null}

          {!athleteMode &&
          sportType === WorkoutType.SWIM &&
          !detailsOpen &&
          !chatOpen ? (
            !workoutReady ? (
              <WorkoutEditorSectionSkeleton variant="generic" />
            ) : (
            <p className="py-2 text-sm text-muted-foreground">
              Simple swim — set distance, duration, and environment on the card above.
            </p>
            )
          ) : null}

          {!athleteMode && sportType !== WorkoutType.SWIM && detailsOpen && !chatOpen ? (
            !workoutReady ? (
              <WorkoutEditorSectionSkeleton variant="blocks" />
            ) : config.detailsKind === "blocks" ? (
              <WorkoutBlockBuilder
                structure={structure}
                onChange={setStructure}
                sportType={sportType}
                athletePreferences={preferences}
                builderPrefs={builderPrefs}
              />
            ) : (
              <Textarea
                value={subtitle}
                onChange={(e) => {
                  setSubtitle(e.target.value);
                  setSubtitleAuto(false);
                }}
                rows={4}
                placeholder="Describe the session…"
              />
            )
          ) : null}

          {!athleteMode && sportType !== WorkoutType.SWIM && includeOpen && !chatOpen ? (
            !workoutReady ? (
              <WorkoutEditorSectionSkeleton variant="include" />
            ) : (
            <IncludeItemsEditor
              items={includeItems}
              onChange={setIncludeItems}
              durationMinutes={durationMin > 0 ? durationMin : undefined}
            />
            )
          ) : null}

          {chatOpen && showChatTab && workout?.id ? (
            !workoutReady ? (
              <WorkoutEditorSectionSkeleton variant="chat" />
            ) : (
            <CoachWorkoutChatPanel
              workoutId={workout.id}
              thread={coachingThread}
              fetchDone={coachingThreadReady}
              onThreadChange={setCoachingThread}
            />
            )
          ) : null}

          {!athleteMode && !chatOpen && (
            <FormField label="Coach notes (optional)">
              <Textarea
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Focus cues for the athlete."
              />
              <PrivateNoteToggle
                hideFrom="athlete"
                checked={coachNotesPrivate}
                onCheckedChange={setCoachNotesPrivate}
                className="mt-2"
              />
            </FormField>
          )}
        </div>
      </div>

      {footer}

      <SaveToLibraryDialog
        open={saveToLibraryOpen}
        onOpenChange={(open) => {
          setSaveToLibraryOpen(open);
          if (!open) setLibrarySaveError(null);
        }}
        sportType={sportType}
        defaultTitle={resolveDraftTitle()}
        folders={libraryFolders}
        pending={librarySavePending}
        error={librarySaveError}
        onConfirm={saveDraftToLibrary}
      />

      <ConfirmDialog
        open={pendingLibraryTemplate != null}
        onOpenChange={(open) => {
          if (!open) setPendingLibraryTemplate(null);
        }}
        title="Replace workout content?"
        description={
          templateId
            ? "You edited this workout. Applying another library workout will overwrite your changes."
            : "You already started this workout. Applying a library workout will overwrite your current content."
        }
        confirmLabel="Replace"
        cancelLabel="Cancel"
        tone="default"
        onConfirm={() => {
          if (!pendingLibraryTemplate) return;
          const next = pendingLibraryTemplate;
          setPendingLibraryTemplate(null);
          applyTemplate(next);
        }}
      />

      <ConfirmDialog
        open={simpleConfirmOpen}
        onOpenChange={setSimpleConfirmOpen}
        title="Switch to Simple Swim?"
        description="Switching to Simple Swim will remove the workout structure. The workout distance and duration will be preserved."
        confirmLabel="Switch"
        cancelLabel="Cancel"
        tone="default"
        onConfirm={() => {
          setDetailsOpen(false);
          setSwimForm((prev) => ({
            ...prev,
            builderEnabled: false,
            swimStructure: null,
          }));
          setSimpleConfirmOpen(false);
        }}
      />

      <ConfirmDialog
        open={modeConflict != null}
        onOpenChange={(open) => {
          if (!open) setModeConflict(null);
        }}
        title={
          modeConflict === "to-include"
            ? "Can't use Include with a built workout"
            : "Can't use Build workout with Include"
        }
        description={
          modeConflict === "to-include"
            ? "Build workout and Include can't be on at the same time. Switching to Include will remove the workout blocks."
            : "Build workout and Include can't be on at the same time. Switching to Build workout will remove include items."
        }
        confirmLabel={
          modeConflict === "to-include" ? "Switch to Include" : "Switch to Build workout"
        }
        cancelLabel="Cancel"
        tone="default"
        onConfirm={() => {
          if (modeConflict === "to-include") switchToInclude();
          else switchToBuildWorkout();
          setModeConflict(null);
        }}
      />
    </div>
  );

  const canShowLibrary = !isEdit && !athleteMode;

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative flex min-h-0 max-h-full w-full flex-col sm:w-auto sm:flex-row",
        !embedded &&
          "overflow-hidden rounded-[10px] border border-white/20 bg-white shadow-[0_0_0_1px_rgba(15,18,39,0.35),0_24px_64px_rgba(0,0,0,0.42)]",
        shellHeight != null &&
          !isResizingHeight &&
          "transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        className,
      )}
      style={shellHeight != null ? { height: shellHeight } : undefined}
    >
      {body}
      {canShowLibrary ? (
        <div
          aria-hidden={!libraryOpen}
          className={cn(
            "min-h-0 overflow-hidden bg-white transition-[width,max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            // Desktop: height follows editor column (h-0 + min-h-full), width slides.
            "sm:h-0 sm:min-h-full sm:self-auto",
            libraryOpen
              ? "max-h-[min(42vh,22rem)] w-full border-t border-[var(--tt-line,#ebebeb)] opacity-100 sm:max-h-none sm:w-[20rem] sm:border-l sm:border-t-0 sm:opacity-100"
              : "pointer-events-none max-h-0 w-full border-0 opacity-0 sm:w-0 sm:opacity-100",
          )}
        >
          <aside className="flex h-full min-h-0 w-full flex-col sm:w-[20rem]">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--tt-line,#ebebeb)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--tt-ink-faint,#9a9a9a)]">
                  Library
                </p>
                <p className="text-[13px] font-semibold text-[var(--tt-ink,#111)]">
                  Pick a template
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeLibraryPanel()}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-black/[0.04] hover:text-foreground"
                aria-label="Close library"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <WorkoutLibraryPicker
              variant="panel"
              templates={templates}
              folders={libraryFolders}
              activeSport={sportType}
              selectedTemplateId={templateId ?? ""}
              onSelect={requestApplyTemplate}
            />
          </aside>
        </div>
      ) : null}
      {!embedded ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize modal height"
          onPointerDown={onHeightResizePointerDown}
          onPointerMove={onHeightResizePointerMove}
          onPointerUp={onHeightResizePointerUp}
          onPointerCancel={onHeightResizePointerUp}
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 flex h-4 cursor-ns-resize items-end justify-center pb-1.5",
            "touch-none select-none",
            isResizingHeight && "bg-black/[0.03]",
          )}
        >
          <span
            className={cn(
              "h-1 w-10 rounded-full bg-[var(--tt-ink,#111)]/20 transition",
              isResizingHeight && "bg-[var(--tt-ink,#111)]/40",
            )}
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );
}
