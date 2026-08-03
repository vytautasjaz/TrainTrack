'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition, type MouseEvent } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { BookOpen, ChevronDown, Eye, LayoutGrid, ListPlus, Save, Settings2 } from 'lucide-react'
import { SessionType, WorkoutStatus, WorkoutType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField } from '@/components/ui/form-field'
import { Textarea } from '@/components/ui/textarea'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { SelectDropdownContent, SelectDropdownItem } from '@/components/ui/select-dropdown'
import { AthleteWorkoutDetailCard } from '@/components/plan/athlete-workout-detail-card'
import { EditableWorkoutCardShell } from '@/components/workout-editor/editable-workout-card-shell'
import { IncludeItemsEditor } from '@/components/workout-editor/include-items-editor'
import { formatIncludeItemsForSubtitle } from '@/components/workout-editor/include-items-summary'
import { WorkoutBlockBuilder } from '@/components/plan/workout-block-builder'
import { WorkoutLibraryPicker } from '@/components/workout-builder/workout-library-picker'
import { SwimWorkoutDetailsFields } from '@/components/swim-workout/swim-workout-details-fields'
import {
  createAthleteWorkoutFromModal,
  createWorkoutFromModal,
  getAthletePreferencesForWorkoutModal,
  getCoachTemplatesForPicker,
  getWorkoutBuilderPrefsForModal,
  saveTemplateBuilder,
  saveTemplateBuilderAndRedirect,
  updateWorkoutFromModal,
  type WorkoutTemplatePickerItem,
} from '@/app/actions/workout-builder'
import {
  createSwimWorkoutFromModal,
  getSwimTemplatesForCoach,
  saveSwimTemplateFromModal,
  updateSwimWorkoutFromModal,
} from '@/app/actions/swim-workout'
import {
  hasBikeSpeedPreferences,
  hasPacePreferences,
  hasSwimCssPreference,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import type { WorkoutBuilderPrefs } from '@/lib/workout-builder/workout-builder-prefs'
import {
  APPROX_DISTANCE_TAG,
  APPROX_DURATION_TAG,
  PRIMARY_METRIC_TAG_PREFIX,
  SECONDARY_METRIC_OFF_TAG,
  approxMetricsFromTags,
  durationUnitFromTags,
  primaryMetricFromTags,
  secondaryMetricVisibleFromTags,
} from '@/lib/workout-approx-tags'
import {
  BIKE_WORKOUT_KINDS,
  autoBikeSubtitle,
  autoBikeTitle,
  bikeEnvironmentFromTags,
  bikeKindFromTags,
  bikeKindLabel,
  bikeKindMeta,
  bikeWorkoutTags,
  estimateBikeKmFromMinutes,
  estimateBikeMinutesFromKm,
  type BikeEnvironment,
  type BikeWorkoutKind,
} from '@/lib/bike-workout/defaults'
import { createDefaultSwimStructure, defaultSwimWorkoutForm } from '@/lib/swim-workout/defaults'
import { hasSwimStructureContent, workoutDistanceMeters } from '@/lib/swim-workout/calculations'
import { swimWorkoutToForm } from '@/lib/swim-workout/form-mappers'
import type { SwimWorkoutForm } from '@/lib/swim-workout/types'
import { emptyStructure, hasStructureContent, parseStructure } from '@/lib/workout-builder/utils'
import type { WorkoutIncludeItem, WorkoutStructure } from '@/lib/workout-builder/types'
import {
  estimateDistanceKmFromDurationMinutes,
  estimateDurationMinutesFromDistanceKm,
  estimateStructureDistanceKm,
  estimateStructureDurationMinutes,
} from '@/lib/workout-builder/segment-estimation'
import { defaultWorkoutTitle } from '@/lib/workout-builder/default-structure'
import { getSessionTypeLabel, sessionTypesForSport } from '@/lib/workout-builder/session-modes'
import { WORKOUT_TYPE_LABELS, SPORT_ROW_ORDER } from '@/lib/constants'
import { getWorkoutEditorSportTheme } from '@/lib/workout-editor/sport-theme'
import { getSportEditorConfig, type DurationUnit, type SharedWorkoutEditorProps, type WorkoutPrimaryMetric } from '@/lib/workout-editor/types'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import { parseDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'

function formatDistanceInputValue(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return ''
  return String(Math.round(km * 10) / 10)
}

function splitMinutes(total: number): { hours: string; minutes: string } {
  const safe = Math.max(0, Math.round(total))
  return {
    hours: String(Math.floor(safe / 60)),
    minutes: String(safe % 60).padStart(2, '0'),
  }
}

function formatDurationInput(totalMinutes: number, unit: DurationUnit): string {
  const safe = Math.max(0, Math.round(totalMinutes))
  if (unit === 'min') return String(safe)
  const split = splitMinutes(safe)
  return `${split.hours}:${split.minutes}`
}

function parseDurationInput(value: string, unit: DurationUnit): number {
  if (unit === 'min') {
    const n = Number.parseInt(value.replace(/\D/g, ''), 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  const cleaned = value.trim()
  if (!cleaned) return 0
  if (cleaned.includes(':')) {
    const [hRaw = '0', mRaw = '0'] = cleaned.split(':')
    const h = Number.parseInt(hRaw.replace(/\D/g, '') || '0', 10)
    const m = Number.parseInt(mRaw.replace(/\D/g, '').slice(0, 2) || '0', 10)
    return Math.max(0, h * 60 + m)
  }
  const hoursOnly = Number.parseInt(cleaned.replace(/\D/g, ''), 10)
  return Number.isFinite(hoursOnly) ? Math.max(0, hoursOnly * 60) : 0
}

function sanitizeHoursInput(value: string): string {
  const cleaned = value.replace(/[^\d:]/g, '')
  const colonIndex = cleaned.indexOf(':')
  if (colonIndex === -1) return cleaned.slice(0, 3)
  const hours = cleaned.slice(0, colonIndex).replace(/\D/g, '').slice(0, 3)
  const minutes = cleaned.slice(colonIndex + 1).replace(/\D/g, '').slice(0, 2)
  return `${hours}:${minutes}`
}

function autoSubtitle(
  sportType: WorkoutType,
  sessionType: SessionType | null,
  bikeKind: BikeWorkoutKind | null,
  durationMin: number,
  distanceKm: number,
  includeItems: WorkoutIncludeItem[] = [],
): string {
  const includeSuffix = formatIncludeItemsForSubtitle(includeItems)
  let base = ''
  if (sportType === WorkoutType.BIKE && bikeKind) {
    base = autoBikeSubtitle(bikeKind, durationMin, distanceKm)
  } else if (sessionType) {
    const label = getSessionTypeLabel(sessionType, sportType)
    const parts: string[] = []
    if (durationMin > 0) parts.push(`${durationMin} min`)
    if (distanceKm > 0) {
      parts.push(
        sportType === WorkoutType.SWIM
          ? `${Math.round(distanceKm * 1000)} m`
          : `${Math.round(distanceKm * 10) / 10} km`,
      )
    }
    parts.push(label)
    base = parts.join(' · ')
  }
  if (!base) return includeSuffix
  if (!includeSuffix) return base
  return `${base} · ${includeSuffix}`
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
  ]
  if (approx.duration) tags.push(APPROX_DURATION_TAG)
  if (approx.distance) tags.push(APPROX_DISTANCE_TAG)
  return tags
}

export function SharedWorkoutEditor({
  mode = 'plan',
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
  const isEdit = Boolean(workout) || Boolean(entityId)
  const isTemplate = mode === 'template'
  const [sportType, setSportType] = useState<WorkoutType>(workout?.type ?? initialSport)
  const config = useMemo(() => getSportEditorConfig(sportType), [sportType])
  const sportTheme = useMemo(() => getWorkoutEditorSportTheme(sportType), [sportType])
  const sportOptions = useMemo(
    () => SPORT_ROW_ORDER.filter((t) => t !== WorkoutType.REST && t !== WorkoutType.RECOVERY),
    [],
  )

  const [pending, startTransition] = useTransition()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [templates, setTemplates] = useState<WorkoutTemplatePickerItem[]>([])
  const [preferences, setPreferences] = useState<AthletePreferences | null>(null)
  const [builderPrefs, setBuilderPrefs] = useState<WorkoutBuilderPrefs | null>(null)

  const [sessionType, setSessionType] = useState<SessionType | null>(
    workout?.sessionType ?? null,
  )
  const [bikeKind, setBikeKind] = useState<BikeWorkoutKind | null>(() => {
    if (workout?.type === WorkoutType.BIKE) {
      return bikeKindFromTags(workout.tags ?? []) ?? 'CUSTOM'
    }
    return null
  })
  const [environment, setEnvironment] = useState<BikeEnvironment>('outdoor')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [titleAuto, setTitleAuto] = useState(false)
  const [subtitleAuto, setSubtitleAuto] = useState(false)
  const [primaryMetric, setPrimaryMetric] = useState<WorkoutPrimaryMetric>(
    getSportEditorConfig(workout?.type ?? initialSport).showDistance
      ? 'distance'
      : 'duration',
  )
  const [secondaryMetricVisible, setSecondaryMetricVisible] = useState(false)
  const [durationMin, setDurationMin] = useState(0)
  const [distanceKm, setDistanceKm] = useState(0)
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(config.durationUnitDefault)
  const [durationInput, setDurationInput] = useState('')
  const [distanceInput, setDistanceInput] = useState('')
  const [durationManual, setDurationManual] = useState(true)
  const [distanceManual, setDistanceManual] = useState(true)
  // Separately tracked auto-estimate strings shown in the Auto cell
  const [autoDistanceInput, setAutoDistanceInput] = useState('')
  const [autoDurationInput, setAutoDurationInput] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [includeOpen, setIncludeOpen] = useState(false)
  const [simpleConfirmOpen, setSimpleConfirmOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [structure, setStructure] = useState<WorkoutStructure>(emptyStructure())
  const [includeItems, setIncludeItems] = useState<WorkoutIncludeItem[]>([])
  const [coachNotes, setCoachNotes] = useState('')
  const [templateId, setTemplateId] = useState<string | undefined>()
  const [swimForm, setSwimForm] = useState<SwimWorkoutForm>(defaultSwimWorkoutForm())

  const typeSelected = config.useBikeKinds ? Boolean(bikeKind) : Boolean(sessionType)

  useEffect(() => {
    void getAthletePreferencesForWorkoutModal().then(setPreferences)
    if (!athleteMode) {
      void getWorkoutBuilderPrefsForModal().then(setBuilderPrefs)
    }
    if (athleteMode) return
    if (sportType === WorkoutType.SWIM) {
      void getSwimTemplatesForCoach().then((items) =>
        setTemplates(
          items.map((t) => ({
            id: t.id,
            title: t.title,
            type: WorkoutType.SWIM,
            sessionType: SessionType.CUSTOM,
            description: t.description,
            distanceKm: t.plannedDistanceMeters != null ? t.plannedDistanceMeters / 1000 : null,
            durationMin: t.durationMin,
            notes: null,
            structure: t.swimStructure,
          })),
        ),
      )
      return
    }
    void getCoachTemplatesForPicker().then((items) =>
      setTemplates(items.filter((t) => t.type === sportType)),
    )
  }, [sportType, athleteMode])

  useEffect(() => {
    setDurationUnit(getSportEditorConfig(sportType).durationUnitDefault)
  }, [sportType])

  useEffect(() => {
    if (workout) {
      const planned = workout.plannedDuration ?? 0
      const plannedDistance =
        workout.type === WorkoutType.SWIM
          ? (workout.plannedDistanceMeters ?? 0) / 1000
          : (workout.plannedDistance ?? 0)
      const hasDuration = planned > 0
      const hasDistance = plannedDistance > 0
      setSportType(workout.type)
      setSessionType(workout.sessionType)
      if (workout.type === WorkoutType.BIKE) {
        const tags = workout.tags ?? []
        setEnvironment(bikeEnvironmentFromTags(tags))
        setBikeKind(bikeKindFromTags(tags) ?? 'CUSTOM')
      } else {
        setBikeKind(null)
      }
      setTitle(workout.title)
      setTitleAuto(false)
      setSubtitle(workout.description ?? '')
      setSubtitleAuto(false)
      setDurationMin(hasDuration ? planned : 0)
      setDistanceKm(hasDistance ? plannedDistance : 0)
      const unit =
        durationUnitFromTags(workout.tags) ??
        getSportEditorConfig(workout.type).durationUnitDefault
      setDurationUnit(unit)
      setDurationInput(hasDuration ? formatDurationInput(planned, unit) : '')
      setDistanceInput(
        hasDistance
          ? workout.type === WorkoutType.SWIM
            ? String(Math.round(plannedDistance * 1000))
            : formatDistanceInputValue(plannedDistance)
          : '',
      )
      const approx = approxMetricsFromTags(workout.tags)
      const hasSavedStructure = Boolean(
        workout.structure && hasStructureContent(parseStructure(workout.structure)),
      )
      const hasSwimStructure = Boolean(workout.swimStructure)
      const durationIsManual =
        hasDuration && (hasSavedStructure || hasSwimStructure || !approx.duration)
      const distanceIsManual =
        hasDistance && (hasSavedStructure || hasSwimStructure || !approx.distance)
      setDurationManual(durationIsManual)
      setDistanceManual(distanceIsManual)
      setAutoDurationInput(
        hasDuration && !durationIsManual ? formatDurationInput(planned, unit) : '',
      )
      setAutoDistanceInput(
        hasDistance && !distanceIsManual
          ? workout.type === WorkoutType.SWIM
            ? String(Math.round(plannedDistance * 1000))
            : formatDistanceInputValue(plannedDistance)
          : '',
      )
      // Keep Manual cell empty when the saved source was Auto
      if (!durationIsManual) setDurationInput('')
      if (!distanceIsManual) setDistanceInput('')
      setPrimaryMetric(
        primaryMetricFromTags(workout.tags) ??
          (hasDistance || !hasDuration ? 'distance' : 'duration'),
      )
      setSecondaryMetricVisible(secondaryMetricVisibleFromTags(workout.tags))
      const parsedStructure = parseStructure(workout.structure)
      setStructure(parsedStructure ?? emptyStructure())
      setIncludeItems(parsedStructure.includeItems ?? [])
      setDetailsOpen(hasSavedStructure || hasSwimStructure)
      setIncludeOpen((parsedStructure.includeItems?.length ?? 0) > 0)
      setCoachNotes(workout.coachNotes ?? '')
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
        )
      }
      return
    }

    setSessionType(null)
    setBikeKind(null)
    setEnvironment('outdoor')
    setSportType(initialSport)
    setTitle('')
    setSubtitle('')
    setTitleAuto(false)
    setSubtitleAuto(false)
    setPrimaryMetric(
      getSportEditorConfig(initialSport).showDistance ? 'distance' : 'duration',
    )
    setSecondaryMetricVisible(false)
    setDurationMin(0)
    setDistanceKm(0)
    setDurationInput('')
    setDistanceInput('')
    setAutoDistanceInput('')
    setAutoDurationInput('')
    setDurationManual(true)
    setDistanceManual(true)
    setDetailsOpen(false)
    setIncludeOpen(false)
    setStructure(emptyStructure())
    setIncludeItems([])
    setCoachNotes('')
    setTemplateId(undefined)
    setSwimForm(defaultSwimWorkoutForm())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id, initialSport])

  const metricsFromDetails = useMemo(() => {
    if (!detailsOpen) return false
    if (sportType === WorkoutType.SWIM) {
      return Boolean(swimForm.builderEnabled && swimForm.swimStructure)
    }
    return hasStructureContent(structure)
  }, [detailsOpen, sportType, structure, swimForm])

  const canAutoEstimate = sportType !== WorkoutType.SWIM || metricsFromDetails

  useEffect(() => {
    if (!titleAuto || !typeSelected) return
    if (sportType === WorkoutType.BIKE && bikeKind) {
      setTitle(autoBikeTitle(environment, bikeKind))
      return
    }
    if (sessionType) setTitle(defaultWorkoutTitle(sessionType, sportType))
  }, [sessionType, bikeKind, environment, sportType, titleAuto, typeSelected])

  useEffect(() => {
    if (!subtitleAuto || !typeSelected) return
    setSubtitle(autoSubtitle(sportType, sessionType, bikeKind, durationMin, distanceKm, includeItems))
  }, [sessionType, bikeKind, sportType, durationMin, distanceKm, subtitleAuto, typeSelected, includeItems])

  useEffect(() => {
    if (!metricsFromDetails) return
    if (sportType === WorkoutType.SWIM && swimForm.swimStructure) {
      const meters = workoutDistanceMeters(swimForm.swimStructure)
      const km = meters / 1000
      const computedDistanceKm = km > 0 ? km : 0
      const computedDistanceInput = meters > 0 ? String(meters) : ''
      const css = preferences?.swimCssSecPer100m
      const computedMinutes =
        typeof css === 'number' && css > 0 && meters > 0
          ? estimateDurationMinutesFromDistanceKm(km, preferences, undefined, sportType)
          : 0
      const computedDurationInput =
        computedMinutes > 0 ? formatDurationInput(computedMinutes, durationUnit) : ''

      // Keep computed values in AUTO cells
      setAutoDistanceInput(computedDistanceInput)
      setAutoDurationInput(computedDurationInput)

      // AUTO remains default while still allowing MANUAL override
      if (!distanceManual) {
        setDistanceKm(computedDistanceKm)
      }
      if (typeof css === 'number' && css > 0 && meters > 0 && !durationManual) {
        setDurationMin(computedMinutes)
      }
      return
    }
    const minutes = Math.round(estimateStructureDurationMinutes(structure, preferences, sportType))
    const km = Math.round(estimateStructureDistanceKm(structure, preferences, sportType) * 10) / 10
    const computedDurationInput = minutes > 0 ? formatDurationInput(minutes, durationUnit) : ''
    const computedDistanceInput = formatDistanceInputValue(km)

    // Keep computed values in AUTO cells
    setAutoDurationInput(computedDurationInput)
    setAutoDistanceInput(computedDistanceInput)

    // AUTO stays active by default, but if user switched to MANUAL keep their values
    if (!durationManual) {
      setDurationMin(minutes)
    }
    if (!distanceManual) {
      setDistanceKm(km)
    }
  }, [
    metricsFromDetails,
    structure,
    preferences,
    durationUnit,
    sportType,
    swimForm.swimStructure,
    durationManual,
    distanceManual,
  ])

  function formatDistanceEstimate(estimatedKm: number) {
    if (estimatedKm <= 0) return ''
    return config.distanceUnit === 'm'
      ? String(Math.round(estimatedKm * 1000))
      : formatDistanceInputValue(estimatedKm)
  }

  function estimationSessionType() {
    return sessionType ?? SessionType.EASY_RUN
  }

  function estimationBikeKind() {
    return bikeKind ?? 'EASY'
  }

  function estimateDistanceFromDuration(minutes: number) {
    if (minutes <= 0 || !config.showDistance) return 0
    return sportType === WorkoutType.BIKE
      ? estimateBikeKmFromMinutes(minutes, estimationBikeKind(), preferences)
      : estimateDistanceKmFromDurationMinutes(
          minutes,
          preferences,
          estimationSessionType(),
          sportType,
        )
  }

  function estimateDurationFromDistance(km: number) {
    if (km <= 0) return 0
    return sportType === WorkoutType.BIKE
      ? estimateBikeMinutesFromKm(km, estimationBikeKind(), preferences)
      : estimateDurationMinutesFromDistanceKm(
          km,
          preferences,
          estimationSessionType(),
          sportType,
        )
  }

  useEffect(() => {
    if (metricsFromDetails || !config.showDistance) return

    // Keep Auto cells in sync from the opposite manual metric
    if (durationManual && durationMin > 0) {
      const estimated = estimateDistanceFromDuration(durationMin)
      const formatted = formatDistanceEstimate(estimated)
      setAutoDistanceInput(formatted)
      if (!distanceManual) setDistanceKm(estimated)
    } else if (!durationManual) {
      setAutoDistanceInput('')
    }

    if (distanceManual && distanceKm > 0) {
      const estimated = estimateDurationFromDistance(distanceKm)
      const formatted = estimated > 0 ? formatDurationInput(estimated, durationUnit) : ''
      setAutoDurationInput(formatted)
      if (!durationManual) setDurationMin(estimated)
    } else if (!distanceManual) {
      setAutoDurationInput('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metricsFromDetails,
    durationManual,
    distanceManual,
    durationMin,
    distanceKm,
    preferences,
    sessionType,
    bikeKind,
    sportType,
    durationUnit,
    config.showDistance,
    config.distanceUnit,
  ])

  function handleDurationChange(raw: string) {
    if (metricsFromDetails) return
    const hadNoValues = durationMin <= 0 && distanceKm <= 0
    const nextValue =
      durationUnit === 'hours' ? sanitizeHoursInput(raw) : raw.replace(/\D/g, '')
    if (!nextValue || nextValue === ':') {
      setDurationManual(true)
      setDurationMin(0)
      setDurationInput('')
      setAutoDistanceInput('')
      if (!distanceManual || !distanceInput.trim()) setDistanceKm(0)
      return
    }
    if (hadNoValues) setPrimaryMetric('duration')
    setDurationManual(true)
    setDurationInput(nextValue)
    const total = parseDurationInput(nextValue, durationUnit)
    setDurationMin(total)

    // If distance wasn't manually typed, switch it to Auto and fill estimate
    const distanceHasManualValue = distanceInput.trim().length > 0
    if (canAutoEstimate && config.showDistance) {
      const estimated = estimateDistanceFromDuration(total)
      const formatted = formatDistanceEstimate(estimated)
      setAutoDistanceInput(formatted)
      if (!distanceHasManualValue) {
        setDistanceManual(false)
        setDistanceKm(estimated)
      }
    }
  }

  function handleDistanceChange(raw: string) {
    if (metricsFromDetails) return
    const hadNoValues = durationMin <= 0 && distanceKm <= 0
    const cleaned = raw.replace(/[^\d.]/g, '')
    if (!cleaned) {
      setDistanceManual(true)
      setDistanceKm(0)
      setDistanceInput('')
      setAutoDurationInput('')
      if (!durationManual || !durationInput.trim()) setDurationMin(0)
      return
    }
    const value = Number.parseFloat(cleaned)
    if (!Number.isFinite(value) || value < 0) return
    if (hadNoValues) setPrimaryMetric('distance')
    setDistanceManual(true)
    setDistanceInput(cleaned)
    const km = config.distanceUnit === 'm' ? value / 1000 : value
    setDistanceKm(km)
    if (sportType === WorkoutType.SWIM) {
      setSwimForm((prev) => ({ ...prev, plannedDistanceMeters: Math.round(value) }))
    }

    const durationHasManualValue = durationInput.trim().length > 0
    if (canAutoEstimate) {
      const estimated = estimateDurationFromDistance(km)
      const formatted = estimated > 0 ? formatDurationInput(estimated, durationUnit) : ''
      setAutoDurationInput(formatted)
      if (!durationHasManualValue) {
        setDurationManual(false)
        setDurationMin(estimated)
      }
    }
  }

  function toggleDurationUnit(event: MouseEvent) {
    event.stopPropagation()
    if (metricsFromDetails) return
    setDurationUnit((prev) => {
      const next: DurationUnit = prev === 'min' ? 'hours' : 'min'
      if (durationManual) {
        setDurationInput(durationMin > 0 ? formatDurationInput(durationMin, next) : '')
      }
      if (autoDurationInput) {
        const autoMin = parseDurationInput(autoDurationInput, prev)
        setAutoDurationInput(autoMin > 0 ? formatDurationInput(autoMin, next) : '')
      }
      return next
    })
  }

  function handleDistanceSourceChange(source: 'manual' | 'auto') {
    if (source === 'manual') {
      setDistanceManual(true)
      const seed = distanceInput.trim() || autoDistanceInput?.replace(/[^\d.]/g, '') || ''
      if (seed) {
        if (!distanceInput.trim() && autoDistanceInput) {
          setDistanceInput(seed)
        }
        const value = Number.parseFloat(seed.replace(/[^\d.]/g, ''))
        if (Number.isFinite(value) && value >= 0) {
          const km = config.distanceUnit === 'm' ? value / 1000 : value
          setDistanceKm(km)
        }
      }
      return
    }
    setDistanceManual(false)
    if (autoDistanceInput) {
      const cleaned = autoDistanceInput.replace(/[^\d.]/g, '')
      const value = Number.parseFloat(cleaned)
      if (Number.isFinite(value) && value > 0) {
        const km = config.distanceUnit === 'm' ? value / 1000 : value
        setDistanceKm(km)
      }
    }
  }

  function handleDurationSourceChange(source: 'manual' | 'auto') {
    if (source === 'manual') {
      setDurationManual(true)
      const seed = durationInput.trim() || autoDurationInput || ''
      if (seed) {
        if (!durationInput.trim() && autoDurationInput) {
          setDurationInput(autoDurationInput)
        }
        setDurationMin(parseDurationInput(seed, durationUnit))
      }
      return
    }
    setDurationManual(false)
    if (autoDurationInput) {
      setDurationMin(parseDurationInput(autoDurationInput, durationUnit))
    }
  }

  function applyTemplate(item: WorkoutTemplatePickerItem) {
    setTitle(item.title)
    setTitleAuto(false)
    setSessionType(item.sessionType)
    if (sportType === WorkoutType.BIKE) {
      const kind =
        BIKE_WORKOUT_KINDS.find((k) => k.sessionType === item.sessionType)?.id ?? 'CUSTOM'
      setBikeKind(kind)
    }
    const nextDuration = item.durationMin ?? 0
    const nextDistance = item.distanceKm ?? 0
    const hasDuration = nextDuration > 0
    const hasDistance = nextDistance > 0
    setDurationManual(hasDuration)
    setDistanceManual(hasDistance)
    setDurationMin(hasDuration ? nextDuration : 0)
    setDistanceKm(hasDistance ? nextDistance : 0)
    setDurationInput(hasDuration ? formatDurationInput(nextDuration, durationUnit) : '')
    setDistanceInput(
      hasDistance
        ? config.distanceUnit === 'm'
          ? String(Math.round(nextDistance * 1000))
          : formatDistanceInputValue(nextDistance)
        : '',
    )
    setAutoDistanceInput('')
    setAutoDurationInput('')
    if (sportType === WorkoutType.SWIM) {
      setSwimForm({
        ...defaultSwimWorkoutForm(),
        title: item.title,
        description: item.description ?? '',
        plannedDistanceMeters: hasDistance ? Math.round(nextDistance * 1000) : null,
        plannedDuration: hasDuration ? nextDuration : null,
        swimStructure: item.structure as SwimWorkoutForm['swimStructure'],
        builderEnabled: Boolean(item.structure),
      })
      setDetailsOpen(Boolean(item.structure))
    } else {
      const parsed = parseStructure(item.structure)
      setStructure(parsed)
      setIncludeItems(parsed.includeItems ?? [])
      setDetailsOpen(hasStructureContent(parsed))
      setIncludeOpen((parsed.includeItems?.length ?? 0) > 0)
    }
    setCoachNotes(item.notes ?? '')
    setTemplateId(item.id)
    setSubtitleAuto(false)
    setSubtitle(item.description?.trim() ?? '')
    setLibraryOpen(false)
  }

  function buildTags() {
    const approx = {
      duration: !metricsFromDetails && !durationManual && durationMin > 0 && typeSelected,
      distance: !metricsFromDetails && !distanceManual && distanceKm > 0 && typeSelected,
    }
    const secondaryExtra = secondaryMetricVisible ? [] : [SECONDARY_METRIC_OFF_TAG]
    if (sportType === WorkoutType.BIKE && bikeKind) {
      return [
        ...bikeWorkoutTags(environment, bikeKind, primaryMetric, approx, durationUnit),
        ...secondaryExtra,
      ]
    }
    return genericWorkoutTags(primaryMetric, approx, durationUnit, secondaryExtra)
  }

  /** Live draft → athlete-facing card shape (same resolution as save). */
  function buildAthletePreview(): PlanWorkoutDetail {
    const resolvedSession =
      sportType === WorkoutType.BIKE && bikeKind
        ? bikeKindMeta(bikeKind).sessionType
        : (sessionType ?? SessionType.CUSTOM)

    if (sportType === WorkoutType.SWIM) {
      const meters =
        detailsOpen && swimForm.swimStructure
          ? workoutDistanceMeters(swimForm.swimStructure)
          : Math.round(distanceKm * 1000)
      return {
        id: workout?.id ?? 'preview',
        title: title.trim() || 'Swim',
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
        structure: null,
        swimStructure: detailsOpen ? (swimForm.swimStructure ?? null) : null,
        tags: buildTags(),
        selfLogged: workout?.selfLogged ?? false,
        rescheduledFromDateKey: workout?.rescheduledFromDateKey ?? null,
        result: null,
      }
    }

    const structureToSave = {
      ...structure,
      coachNotes: coachNotes || undefined,
      includeItems,
    }
    const persistDetails = detailsOpen && hasStructureContent(structureToSave)
    const hasIncludeItems = includeItems.length > 0
    const resolvedTitle =
      title.trim() ||
      (titleAuto && typeSelected
        ? sportType === WorkoutType.BIKE && bikeKind
          ? autoBikeTitle(environment, bikeKind)
          : sessionType
            ? defaultWorkoutTitle(sessionType, sportType)
            : ''
        : '') ||
      WORKOUT_TYPE_LABELS[sportType]
    const resolvedDescription =
      subtitleAuto && typeSelected
        ? autoSubtitle(sportType, sessionType, bikeKind, durationMin, distanceKm, includeItems)
        : subtitle.trim()

    return {
      id: workout?.id ?? 'preview',
      title: resolvedTitle,
      dateKey: date,
      type: sportType,
      sessionType: resolvedSession,
      status: workout?.status ?? WorkoutStatus.PLANNED,
      description: resolvedDescription || null,
      plannedDistance:
        config.showDistance && config.distanceUnit === 'km' && distanceKm > 0
          ? distanceKm
          : null,
      plannedDistanceMeters: null,
      plannedDuration: durationMin > 0 ? durationMin : null,
      swimEnvironment: null,
      coachNotes: coachNotes.trim() || null,
      structure: persistDetails || hasIncludeItems ? structureToSave : null,
      swimStructure: null,
      tags: buildTags(),
      selfLogged: workout?.selfLogged ?? false,
      rescheduledFromDateKey: workout?.rescheduledFromDateKey ?? null,
      result: null,
    }
  }

  function save() {
    startTransition(async () => {
      if (athleteMode) {
        await createAthleteWorkoutFromModal({
          title: title.trim() || WORKOUT_TYPE_LABELS[sportType],
          sportType,
          sessionType: sessionType ?? SessionType.CUSTOM,
          scheduledDate: date,
          plannedDistance: config.showDistance && distanceKm > 0 ? distanceKm : undefined,
          plannedDuration: durationMin > 0 ? durationMin : undefined,
          description: subtitle.trim() || undefined,
        })
        onSaved?.()
        return
      }

      if (sportType === WorkoutType.SWIM) {
        const meters =
          detailsOpen && swimForm.swimStructure
            ? workoutDistanceMeters(swimForm.swimStructure)
            : Math.round(distanceKm * 1000)
        const payload = {
          ...swimForm,
          title: title.trim() || 'Swim',
          description: subtitle.trim(),
          plannedDistanceMeters: meters > 0 ? meters : null,
          plannedDuration: durationMin > 0 ? durationMin : null,
          coachNotes: coachNotes.trim() || null,
          builderEnabled: detailsOpen && Boolean(swimForm.swimStructure),
          swimStructure: detailsOpen ? (swimForm.swimStructure ?? null) : null,
          scheduledDate: date,
          templateId,
          tags: buildTags(),
        }

        if (isTemplate) {
          await saveSwimTemplateFromModal(entityId ?? null, payload)
          onSaved?.()
          return
        }

        if (isEdit && workout) {
          await updateSwimWorkoutFromModal(workout.id, payload)
        } else {
          await createSwimWorkoutFromModal(payload)
        }
        onSaved?.()
        return
      }

      const resolvedSession =
        sportType === WorkoutType.BIKE && bikeKind
          ? bikeKindMeta(bikeKind).sessionType
          : (sessionType ?? SessionType.CUSTOM)
      const structureToSave = {
        ...structure,
        coachNotes: coachNotes || undefined,
        includeItems,
      }
      const persistDetails = detailsOpen && hasStructureContent(structureToSave)
      const hasIncludeItems = includeItems.length > 0
      const resolvedTitle =
        title.trim() ||
        (titleAuto && typeSelected
          ? sportType === WorkoutType.BIKE && bikeKind
            ? autoBikeTitle(environment, bikeKind)
            : sessionType
              ? defaultWorkoutTitle(sessionType, sportType)
              : ''
          : '') ||
        WORKOUT_TYPE_LABELS[sportType]
      const resolvedDescription =
        subtitleAuto && typeSelected
          ? autoSubtitle(sportType, sessionType, bikeKind, durationMin, distanceKm, includeItems)
          : subtitle.trim()

      if (isTemplate) {
        const payload = {
          title: resolvedTitle,
          sportType,
          sessionType: resolvedSession,
          tags: buildTags(),
          structure: persistDetails || hasIncludeItems ? structureToSave : emptyStructure(),
          estimatedDuration: durationMin > 0 ? durationMin : undefined,
        }
        if (entityId) {
          await saveTemplateBuilder(payload, entityId)
          onSaved?.()
        } else {
          await saveTemplateBuilderAndRedirect(payload)
        }
        return
      }

      const payload = {
        title: resolvedTitle,
        description: resolvedDescription || undefined,
        sportType,
        sessionType: resolvedSession,
        scheduledDate: date,
        plannedDuration: durationMin > 0 ? durationMin : undefined,
        plannedDistance:
          config.showDistance && config.distanceUnit === 'km' && distanceKm > 0
            ? distanceKm
            : undefined,
        coachNotes: coachNotes.trim() || undefined,
        structure: persistDetails || hasIncludeItems ? structureToSave : undefined,
        templateId,
        allowPaceEstimate: typeSelected || persistDetails,
        tags: buildTags(),
      }

      if (isEdit && workout) {
        await updateWorkoutFromModal({ ...payload, workoutId: workout.id })
      } else {
        await createWorkoutFromModal(payload)
      }
      onSaved?.()
    })
  }

  const sessionOptions = sessionTypesForSport(sportType).map((s) => ({
    value: s,
    label: getSessionTypeLabel(s, sportType),
  }))

  const missingPrefs =
    preferences && (typeSelected || (sportType === WorkoutType.SWIM && metricsFromDetails))
      ? sportType === WorkoutType.BIKE
        ? !hasBikeSpeedPreferences(preferences)
        : sportType === WorkoutType.RUN
          ? !hasPacePreferences(preferences)
          : sportType === WorkoutType.SWIM
            ? !hasSwimCssPreference(preferences)
            : false
      : false

  const missingPrefsLabel =
    sportType === WorkoutType.BIKE
      ? 'bike speed zones'
      : sportType === WorkoutType.SWIM
        ? 'critical swim speed (CSS)'
        : 'run pace zones'

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
      {previewOpen ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
          Back to edit
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => onCancel?.()}>
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
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={save}>
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )

  if (previewOpen && !athleteMode) {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        <div
          className={cn(
            'flex flex-row items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6',
            !embedded && 'pr-12',
          )}
        >
          <div>
            <h2 className="text-lg font-semibold">Athlete preview</h2>
            <p className="text-sm text-muted-foreground">
              How this workout looks for the athlete
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <AthleteWorkoutDetailCard workout={buildAthletePreview()} />
        </div>
        {footer}
      </div>
    )
  }

  const dateLabel = date
    ? (() => {
        const d = parseDateOnly(date)
        return d.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      })()
    : null

  const intensityControl =
    !athleteMode && sportType !== WorkoutType.SWIM ? (
      config.useBikeKinds ? (
        <SelectPrimitive.Root
          value={bikeKind ?? undefined}
          onValueChange={(value) => {
            setBikeKind(value as BikeWorkoutKind)
            if (titleAuto || !title.trim()) {
              setTitleAuto(true)
              setTitle(autoBikeTitle(environment, value as BikeWorkoutKind))
            }
          }}
        >
          <SelectPrimitive.Trigger
            aria-label="Workout intensity"
            className={cn(
              'group inline-flex max-w-full items-center justify-center gap-1 bg-transparent text-center text-[20px] font-bold leading-tight outline-none',
              bikeKind ? 'text-[#111827]' : 'text-muted-foreground/45',
            )}
          >
            <span className="truncate">
              {bikeKind ? bikeKindLabel(bikeKind) : 'Select'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Trigger>
          <SelectDropdownContent align="center" className="z-[210]">
            {BIKE_WORKOUT_KINDS.map((option) => (
              <SelectDropdownItem
                key={option.id}
                option={{ value: option.id, label: option.label }}
              />
            ))}
          </SelectDropdownContent>
        </SelectPrimitive.Root>
      ) : (
        <SelectPrimitive.Root
          value={sessionType ?? undefined}
          onValueChange={(value) => {
            const next = value as SessionType
            setSessionType(next)
            if (titleAuto || !title.trim()) {
              setTitleAuto(true)
              setTitle(defaultWorkoutTitle(next, sportType))
            }
          }}
        >
          <SelectPrimitive.Trigger
            aria-label="Workout intensity"
            className={cn(
              'group inline-flex max-w-full items-center justify-center gap-1 bg-transparent text-center text-[20px] font-bold leading-tight outline-none',
              sessionType ? 'text-[#111827]' : 'text-muted-foreground/45',
            )}
          >
            <span className="truncate">
              {sessionType
                ? getSessionTypeLabel(sessionType, sportType)
                : 'Select'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Trigger>
          <SelectDropdownContent align="center" className="z-[210]">
            {sessionOptions.map((option) => (
              <SelectDropdownItem key={option.value} option={option} />
            ))}
          </SelectDropdownContent>
        </SelectPrimitive.Root>
      )
    ) : null

  function handleSportChange(next: WorkoutType) {
    if (next === sportType) return
    const prev = sportType
    const nextConfig = getSportEditorConfig(next)
    setSportType(next)
    setDurationUnit(nextConfig.durationUnitDefault)
    setPrimaryMetric(nextConfig.showDistance ? 'distance' : 'duration')
    setSecondaryMetricVisible(false)
    setBikeKind(null)
    setSessionType(null)
    setDetailsOpen(false)
    setIncludeOpen(false)
    setStructure(emptyStructure())
    setIncludeItems([])
    setSwimForm(defaultSwimWorkoutForm())
    setTemplateId(undefined)
    setTitleAuto(true)
    setSubtitleAuto(true)
    if (next === WorkoutType.SWIM || prev === WorkoutType.SWIM) {
      setDistanceKm(0)
      setDistanceInput('')
      setAutoDistanceInput('')
      setDistanceManual(true)
    }
    setDurationInput(
      durationMin > 0 ? formatDurationInput(durationMin, nextConfig.durationUnitDefault) : '',
    )
    setAutoDurationInput('')
  }

  const body = (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {isTemplate ? (
        <div
          className={cn(
            'flex flex-row items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6',
            !embedded && 'pr-12',
          )}
        >
          <div>
            <h2 className="text-lg font-semibold">
              {isEdit ? 'Edit template' : 'New template'}
            </h2>
            <p className="text-sm text-muted-foreground">{WORKOUT_TYPE_LABELS[sportType]}</p>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditableWorkoutCardShell
          sportType={sportType}
          title={title}
          subtitle={subtitle}
          titleAuto={titleAuto}
          subtitleAuto={subtitleAuto}
          dateLabel={!isTemplate ? dateLabel : null}
          intensityControl={intensityControl}
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
            setTitle(value)
            setTitleAuto(false)
          }}
          onSubtitleChange={(value) => {
            setSubtitle(value)
            setSubtitleAuto(false)
          }}
          onTitleAutoEnable={() => {
            if (!typeSelected) return
            setTitleAuto(true)
            if (sportType === WorkoutType.BIKE && bikeKind) {
              setTitle(autoBikeTitle(environment, bikeKind))
            } else if (sessionType) {
              setTitle(defaultWorkoutTitle(sessionType, sportType))
            }
          }}
          onSubtitleAutoEnable={() => {
            if (!typeSelected) return
            setSubtitleAuto(true)
            setSubtitle(autoSubtitle(sportType, sessionType, bikeKind, durationMin, distanceKm, includeItems))
          }}
          onDurationChange={handleDurationChange}
          onDistanceChange={handleDistanceChange}
          onPrimaryMetricChange={setPrimaryMetric}
          onDistanceSourceChange={handleDistanceSourceChange}
          onDurationSourceChange={handleDurationSourceChange}
          onSecondaryMetricVisibleChange={setSecondaryMetricVisible}
          onToggleDurationUnit={toggleDurationUnit}
        />

        <div className="space-y-5 px-5 py-5 sm:px-6">
        {!athleteMode && sportType !== WorkoutType.SWIM ? (
          <div className="flex gap-2">
            {!isEdit ? (
              <button
                type="button"
                onClick={() => {
                  setLibraryOpen((v) => {
                    const next = !v
                    if (next) {
                      setDetailsOpen(false)
                      setIncludeOpen(false)
                    }
                    return next
                  })
                }}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition',
                  libraryOpen
                    ? cn(sportTheme.section, sportTheme.sectionText)
                    : 'border-border bg-card text-foreground hover:border-border/80',
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Library
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setDetailsOpen((open) => {
                  const next = !open
                  if (next) setLibraryOpen(false)
                  return next
                })
              }}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition',
                detailsOpen
                  ? cn(sportTheme.section, sportTheme.sectionText)
                  : 'border-border bg-card text-foreground hover:border-border/80',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Build workout
            </button>
            <button
              type="button"
              onClick={() => {
                setIncludeOpen((open) => {
                  const next = !open
                  if (next) setLibraryOpen(false)
                  return next
                })
              }}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition',
                includeOpen
                  ? cn(sportTheme.section, sportTheme.sectionText)
                  : 'border-border bg-card text-foreground hover:border-border/80',
              )}
            >
              <ListPlus className="h-3.5 w-3.5" />
              Include
              {includeItems.length > 0 ? (
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold">
                  {includeItems.length}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        {libraryOpen && !isEdit && !athleteMode && (
          <WorkoutLibraryPicker
            templates={templates}
            selectedTemplateId={templateId ?? ''}
            onSelect={applyTemplate}
          />
        )}

        {sportType === WorkoutType.SWIM && !athleteMode ? (
          <SegmentedControl aria-label="Swim workout mode" className="w-full">
            <SegmentedControlItem
              active={!detailsOpen}
              className="flex-1"
              onClick={() => {
                if (!detailsOpen) return
                if (hasSwimStructureContent(swimForm.swimStructure)) {
                  setSimpleConfirmOpen(true)
                  return
                }
                setDetailsOpen(false)
                setSwimForm((prev) => ({
                  ...prev,
                  builderEnabled: false,
                  swimStructure: null,
                }))
              }}
            >
              Simple
            </SegmentedControlItem>
            <SegmentedControlItem
              active={detailsOpen}
              className="flex-1"
              onClick={() => {
                if (detailsOpen) return
                setDetailsOpen(true)
                setSwimForm((prev) => ({
                  ...prev,
                  builderEnabled: true,
                  swimStructure: prev.swimStructure ?? createDefaultSwimStructure(),
                }))
              }}
            >
              Structured
            </SegmentedControlItem>
          </SegmentedControl>
        ) : null}

        {missingPrefs && (
          <div className="rounded-[6px] border border-amber-300/70 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
            Add {missingPrefsLabel} in Preferences to estimate distance/time.
            <Button asChild variant="link" size="xs" className="ml-1 h-auto px-0 text-amber-900">
              <Link href="/settings/preferences">Set defaults</Link>
            </Button>
          </div>
        )}

        {!athleteMode && sportType === WorkoutType.SWIM && detailsOpen ? (
          <SwimWorkoutDetailsFields
            form={{
              ...swimForm,
              builderEnabled: true,
              swimStructure: swimForm.swimStructure ?? createDefaultSwimStructure(),
            }}
            onChange={(patch) => {
              setSwimForm((prev) => ({ ...prev, ...patch, builderEnabled: true }))
              if (patch.plannedDistanceMeters != null) {
                const m = patch.plannedDistanceMeters
                setDistanceKm(m / 1000)
                setDistanceInput(m > 0 ? String(m) : '')
                setDistanceManual(false)
              }
            }}
          />
        ) : null}

        {!athleteMode && sportType !== WorkoutType.SWIM && detailsOpen && (
          <div className="rounded-[6px] border border-border bg-card p-4">
            {config.detailsKind === 'blocks' ? (
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
                  setSubtitle(e.target.value)
                  setSubtitleAuto(false)
                }}
                rows={4}
                placeholder="Describe the session…"
              />
            )}
          </div>
        )}

        {!athleteMode && sportType !== WorkoutType.SWIM && includeOpen && (
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-start gap-2.5">
              <Settings2 className={cn('mt-0.5 h-4 w-4', sportTheme.sectionText)} />
              <div>
                <p className={cn('text-sm font-semibold', sportTheme.sectionText)}>Include</p>
                <p className={cn('text-xs opacity-80', sportTheme.sectionText)}>
                  Optional inserts that can be done anywhere and do not change base workout totals.
                </p>
              </div>
            </div>
            <IncludeItemsEditor items={includeItems} onChange={setIncludeItems} />
          </div>
        )}

        {!athleteMode && (
          <FormField label="Coach notes (optional)">
            <Textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Focus cues for the athlete."
            />
          </FormField>
        )}
      </div>
      </div>

      {footer}

      <ConfirmDialog
        open={simpleConfirmOpen}
        onOpenChange={setSimpleConfirmOpen}
        title="Switch to Simple Swim?"
        description="Switching to Simple Swim will remove the workout structure. The workout distance and duration will be preserved."
        confirmLabel="Switch"
        cancelLabel="Cancel"
        tone="default"
        onConfirm={() => {
          setDetailsOpen(false)
          setSwimForm((prev) => ({
            ...prev,
            builderEnabled: false,
            swimStructure: null,
          }))
          setSimpleConfirmOpen(false)
        }}
      />
    </div>
  )

  return body
}
