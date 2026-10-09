/**
 * Explicit safety / medical intake gate — runs BEFORE dose/blueprint generation.
 * Injury is not just an adapt-plan focus; unresolved red flags can block or constrain.
 */
import type {
  AthleteState,
  CapacityProfile,
  DoseProfile,
  IllnessStatus,
  InjurySeverity,
  PregnancyStatus,
  RedsRisk,
  SafetyFlag,
  SafetyGateResult,
  SafetyIntake,
  SafetyPlanningConstraint,
} from '@/lib/coach-engine/types'

export class CoachEngineSafetyError extends Error {
  readonly code = 'COACH_ENGINE_SAFETY'
  readonly gate: SafetyGateResult

  constructor(gate: SafetyGateResult) {
    super(
      gate.blockReason ??
        gate.summary ??
        'Plan generation blocked by safety intake.',
    )
    this.name = 'CoachEngineSafetyError'
    this.gate = gate
  }
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length ? t : null
}

function asBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (['true', 'yes', '1', 'y'].includes(v)) return true
    if (['false', 'no', '0', 'n'].includes(v)) return false
  }
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  return null
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

function parseInjurySeverity(value: unknown): InjurySeverity | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'none' || v === 'no' || v === 'clear') return 'none'
  if (v === 'mild' || v === 'niggle' || v === 'minor') return 'mild'
  if (v === 'moderate' || v === 'mod') return 'moderate'
  if (v === 'severe' || v === 'serious' || v === 'acute') return 'severe'
  return null
}

function parseIllness(value: unknown): IllnessStatus | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'none' || v === 'healthy' || v === 'well') return 'none'
  if (v === 'recovering' || v === 'recovery' || v === 'getting better') {
    return 'recovering'
  }
  if (v === 'active' || v === 'sick' || v === 'ill' || v === 'fever') {
    return 'active'
  }
  return null
}

function parseReds(value: unknown): RedsRisk | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'unknown' || v === '') return 'unknown'
  if (v === 'low' || v === 'none') return 'low'
  if (v === 'elevated' || v === 'moderate' || v === 'concern') return 'elevated'
  if (v === 'high' || v === 'severe' || v === 'red-s' || v === 'reds') {
    return 'high'
  }
  return null
}

function parsePregnancy(value: unknown): PregnancyStatus | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (v === 'none' || v === 'no' || v === 'n/a' || v === 'na') return 'none'
  if (v === 'pregnant' || v === 'pregnancy') return 'pregnant'
  if (v === 'postpartum' || v === 'post-partum' || v === 'post natal') {
    return 'postpartum'
  }
  return null
}

function nest(brief: Record<string, unknown>): Record<string, unknown> {
  const safety = brief.safety
  if (safety && typeof safety === 'object' && !Array.isArray(safety)) {
    return { ...brief, ...(safety as Record<string, unknown>) }
  }
  return brief
}

/**
 * Infer safety signals from free-text notes / adapt focus when structured
 * fields are missing. Deterministic keyword rules — not an LLM call.
 */
export function inferSafetyFromNotes(
  notes: string | null | undefined,
  focus?: string | null,
): Partial<SafetyIntake> {
  const text = `${focus ?? ''} ${notes ?? ''}`.toLowerCase()
  const out: Partial<SafetyIntake> = {}
  if (!text.trim()) return out

  if (/\b(fever|flu|covid|gastro|vomiting|sick|ill(ness)?)\b/.test(text)) {
    out.illness = /recover|better|post/.test(text) ? 'recovering' : 'active'
  }
  if (
    /\b(red-?s|low energy availability|underfuell?ing|amenorrh|disordered eating)\b/.test(
      text,
    )
  ) {
    out.redsRisk = /high|severe|diagnosed/.test(text) ? 'high' : 'elevated'
    out.energyAvailabilityConcern = true
  }
  if (/\b(pregnant|pregnancy|trimester)\b/.test(text)) {
    out.pregnancyStatus = 'pregnant'
    if (/\b(first|1st)\s*trimester\b/.test(text)) out.pregnancyTrimester = 1
    else if (/\b(second|2nd)\s*trimester\b/.test(text)) out.pregnancyTrimester = 2
    else if (/\b(third|3rd)\s*trimester\b/.test(text)) out.pregnancyTrimester = 3
  }
  if (/\b(postpartum|post-partum|postnatal|after birth)\b/.test(text)) {
    out.pregnancyStatus = 'postpartum'
  }
  if (
    /\b(injur(y|ed)|stress fracture|tendin|sprain|strain|niggle|tear)\b/.test(
      text,
    ) ||
    focus === 'injury'
  ) {
    out.injurySeverity =
      /\b(severe|fracture|torn|rupture|cannot walk)\b/.test(text)
        ? 'severe'
        : /\b(moderate|limping|swelling)\b/.test(text)
          ? 'moderate'
          : 'mild'
    const loc = text.match(
      /\b(achilles|knee|hip|shin|ankle|foot|hamstring|calf|back|shoulder|groin|itb|plantar)\b/,
    )
    if (loc) out.injuryLocation = loc[1]!
  }
  if (
    /\b(pain (is )?(getting )?worse|worsening pain|escalat(ing|ed) pain|pain increasing)\b/.test(
      text,
    )
  ) {
    out.painEscalating = true
  }
  if (
    /\b(beta.?blocker|medication.*(hr|heart)|on meds.*(heart|hr))\b/.test(text)
  ) {
    out.medicationsAffectingHr = true
  }
  if (
    /\b(elevated (resting )?hr|resting hr (high|up|elevated)|hrv crash)\b/.test(
      text,
    )
  ) {
    out.restingHrAnomaly = true
  }
  if (
    /\b(no (medical )?clearance|not cleared|awaiting clearance)\b/.test(text)
  ) {
    out.medicalClearance = false
  }
  if (/\b(cleared by (doctor|physio|md|ob)|medical clearance)\b/.test(text)) {
    out.medicalClearance = true
  }
  return out
}

/** Build a normalized SafetyIntake from wizard brief (+ optional athlete HR). */
export function parseSafetyIntake(args: {
  brief: Record<string, unknown>
  /** Profile resting HR for anomaly detection. */
  profileRestingHr?: number | null
}): SafetyIntake {
  const b = nest(args.brief)
  const notes =
    asString(b.notes) ??
    asString(b.safetyNotes) ??
    asString(args.brief.notes)
  const focus = asString(b.focus)
  const inferred = inferSafetyFromNotes(notes, focus)

  const injurySeverity =
    parseInjurySeverity(b.injurySeverity) ??
    inferred.injurySeverity ??
    (focus === 'injury' ? 'mild' : 'none')

  let restingHrAnomaly =
    asBool(b.restingHrAnomaly) ?? inferred.restingHrAnomaly ?? false
  // Heuristic: resting HR markedly above athlete's stated resting (if both present).
  const briefRhr = asNumber(b.hrResting) ?? asNumber(b.currentRestingHr)
  const profileRhr = args.profileRestingHr ?? null
  if (
    !restingHrAnomaly &&
    briefRhr != null &&
    profileRhr != null &&
    profileRhr > 0 &&
    briefRhr >= profileRhr + 8
  ) {
    restingHrAnomaly = true
  }

  const trimesterRaw = asNumber(b.pregnancyTrimester)
  const trimester =
    trimesterRaw === 1 || trimesterRaw === 2 || trimesterRaw === 3
      ? (trimesterRaw as 1 | 2 | 3)
      : inferred.pregnancyTrimester ?? null

  return {
    injuryLocation:
      asString(b.injuryLocation) ?? inferred.injuryLocation ?? null,
    injurySeverity,
    illness: parseIllness(b.illness) ?? inferred.illness ?? 'none',
    redsRisk: parseReds(b.redsRisk) ?? inferred.redsRisk ?? 'unknown',
    energyAvailabilityConcern:
      asBool(b.energyAvailabilityConcern) ??
      inferred.energyAvailabilityConcern ??
      false,
    pregnancyStatus:
      parsePregnancy(b.pregnancyStatus) ??
      inferred.pregnancyStatus ??
      'none',
    pregnancyTrimester: trimester,
    postpartumWeeks:
      asNumber(b.postpartumWeeks) ?? inferred.postpartumWeeks ?? null,
    medicalClearance:
      asBool(b.medicalClearance) ?? inferred.medicalClearance ?? null,
    painEscalating:
      asBool(b.painEscalating) ?? inferred.painEscalating ?? false,
    medicationsAffectingHr:
      asBool(b.medicationsAffectingHr) ??
      inferred.medicationsAffectingHr ??
      false,
    restingHrAnomaly,
    sourceNotes: notes,
  }
}

function uniqueConstraints(
  list: SafetyPlanningConstraint[],
): SafetyPlanningConstraint[] {
  return [...new Set(list)]
}

/**
 * Evaluate the safety intake gate.
 * Hard blocks refuse generation; softer flags constrain dose / require review.
 */
export function evaluateSafetyIntake(args: {
  brief: Record<string, unknown>
  state?: AthleteState | null
  profileRestingHr?: number | null
}): SafetyGateResult {
  const intake = parseSafetyIntake({
    brief: args.brief,
    profileRestingHr: args.profileRestingHr ?? null,
  })
  // Attach to state when provided (callers may also set explicitly).
  if (args.state) args.state.safetyIntake = intake

  const flags: SafetyFlag[] = []
  const constraints: SafetyPlanningConstraint[] = []
  let blocked = false
  let blockReason: string | null = null

  const block = (code: string, message: string) => {
    blocked = true
    blockReason = blockReason ?? message
    flags.push({ code, severity: 'block', message })
  }
  const warn = (code: string, message: string) => {
    flags.push({ code, severity: 'warn', message })
  }

  // ── Injury ─────────────────────────────────────────────────────
  if (intake.injurySeverity === 'severe') {
    if (intake.medicalClearance !== true) {
      block(
        'INJURY_SEVERE',
        `Severe injury${intake.injuryLocation ? ` (${intake.injuryLocation})` : ''} without medical clearance — do not generate a progressive plan.`,
      )
    } else {
      warn(
        'INJURY_SEVERE_CLEARED',
        'Severe injury with clearance — constrain to rehab-compatible load.',
      )
      constraints.push(
        'easy_intensity_only',
        'avoid_impact_running',
        'prefer_cross_train',
        'no_hard_sessions',
        'reduce_volume',
        'require_medical_followup',
      )
    }
  } else if (intake.injurySeverity === 'moderate') {
    warn(
      'INJURY_MODERATE',
      `Moderate injury${intake.injuryLocation ? ` (${intake.injuryLocation})` : ''} — reduce mechanical load.`,
    )
    constraints.push(
      'max_one_hard_session',
      'avoid_impact_running',
      'prefer_cross_train',
      'cap_long_run',
      'reduce_volume',
      'no_max_strength',
    )
    if (intake.medicalClearance === false) {
      constraints.push('require_medical_followup')
    }
  } else if (intake.injurySeverity === 'mild') {
    warn(
      'INJURY_MILD',
      `Mild niggle${intake.injuryLocation ? ` (${intake.injuryLocation})` : ''} — protect key sessions and avoid stacking impact.`,
    )
    constraints.push('max_one_hard_session', 'cap_long_run', 'prefer_cross_train')
  }

  // ── Pain escalation ────────────────────────────────────────────
  if (intake.painEscalating) {
    if (
      intake.injurySeverity === 'moderate' ||
      intake.injurySeverity === 'severe' ||
      intake.medicalClearance === false
    ) {
      block(
        'PAIN_ESCALATING',
        'Pain is escalating — stop progressive planning until assessed.',
      )
    } else {
      warn(
        'PAIN_ESCALATING',
        'Pain escalating — easy intensity only until stable.',
      )
      constraints.push(
        'easy_intensity_only',
        'no_hard_sessions',
        'reduce_volume',
        'require_medical_followup',
      )
    }
  }

  // ── Illness ────────────────────────────────────────────────────
  if (intake.illness === 'active') {
    block(
      'ILLNESS_ACTIVE',
      'Active illness — do not generate training until symptoms resolve.',
    )
  } else if (intake.illness === 'recovering') {
    warn('ILLNESS_RECOVERING', 'Recovering from illness — easy return only.')
    constraints.push(
      'easy_intensity_only',
      'no_hard_sessions',
      'reduce_volume',
      'cap_long_run',
    )
  }

  // ── RED-S / energy availability ────────────────────────────────
  if (intake.redsRisk === 'high' || intake.energyAvailabilityConcern) {
    if (intake.redsRisk === 'high' && intake.medicalClearance !== true) {
      block(
        'REDS_HIGH',
        'High RED-S / low energy availability risk without medical clearance — refuse progressive loading.',
      )
    } else {
      warn(
        'REDS_CONCERN',
        'Energy availability concern — reduce intensity and volume; medical follow-up recommended.',
      )
      constraints.push(
        'easy_intensity_only',
        'max_one_hard_session',
        'reduce_volume',
        'no_max_strength',
        'require_medical_followup',
      )
    }
  } else if (intake.redsRisk === 'elevated') {
    warn(
      'REDS_ELEVATED',
      'Elevated RED-S risk — cap intensity and prefer fueling-supportive volume.',
    )
    constraints.push('max_one_hard_session', 'reduce_volume', 'no_max_strength')
  }

  // ── Pregnancy / postpartum ─────────────────────────────────────
  if (intake.pregnancyStatus === 'pregnant') {
    if (intake.medicalClearance !== true) {
      block(
        'PREGNANCY_NO_CLEARANCE',
        'Pregnancy without confirmed medical clearance — do not auto-generate a plan.',
      )
    } else {
      warn(
        'PREGNANCY_CLEARED',
        'Pregnancy with clearance — conservative intensity and impact rules.',
      )
      constraints.push(
        'max_one_hard_session',
        'easy_intensity_only',
        'avoid_impact_running',
        'cap_long_run',
        'no_max_strength',
        'require_medical_followup',
      )
      if (intake.pregnancyTrimester === 3) {
        constraints.push('reduce_volume', 'prefer_cross_train')
      }
    }
  } else if (intake.pregnancyStatus === 'postpartum') {
    const weeks = intake.postpartumWeeks
    if (intake.medicalClearance !== true) {
      block(
        'POSTPARTUM_NO_CLEARANCE',
        'Postpartum without medical clearance — do not auto-generate return-to-run progression.',
      )
    } else if (weeks != null && weeks < 6) {
      warn(
        'POSTPARTUM_EARLY',
        'Early postpartum (<6 weeks) — rehab-only constraints even with clearance.',
      )
      constraints.push(
        'easy_intensity_only',
        'no_hard_sessions',
        'avoid_impact_running',
        'prefer_cross_train',
        'reduce_volume',
        'require_medical_followup',
      )
    } else {
      warn(
        'POSTPARTUM',
        'Postpartum return — gradual impact and strength progression.',
      )
      constraints.push(
        'max_one_hard_session',
        'cap_long_run',
        'reduce_volume',
        'require_medical_followup',
      )
    }
  }

  // ── HR / medication ────────────────────────────────────────────
  if (intake.medicationsAffectingHr) {
    warn(
      'HR_MEDICATION',
      'Medications may affect HR — avoid HR-target hard sessions; use RPE/pace.',
    )
    constraints.push('max_one_hard_session')
  }
  if (intake.restingHrAnomaly) {
    warn(
      'RHR_ANOMALY',
      'Resting HR anomaly — treat as elevated fatigue; reduce intensity.',
    )
    constraints.push('easy_intensity_only', 'reduce_volume', 'max_one_hard_session')
  }

  // ── Focus=injury without structured fields still constrains ────
  const focus = asString(nest(args.brief).focus)
  if (focus === 'injury' && intake.injurySeverity === 'none') {
    warn(
      'INJURY_FOCUS',
      'Adapt focus is injury — apply mechanical-load constraints.',
    )
    constraints.push(
      'max_one_hard_session',
      'avoid_impact_running',
      'prefer_cross_train',
      'cap_long_run',
    )
  }

  const uniq = uniqueConstraints(constraints)
  let decision: SafetyGateResult['decision'] = 'clear'
  if (blocked) decision = 'block'
  else if (uniq.includes('require_medical_followup') || uniq.includes('easy_intensity_only')) {
    decision = 'require_review'
  } else if (uniq.length > 0) decision = 'constrain'

  const summary = blocked
    ? blockReason!
    : uniq.length === 0
      ? 'Safety intake clear — no medical/injury constraints.'
      : `Safety constraints: ${uniq.join(', ')}.`

  return {
    decision,
    intake,
    flags,
    constraints: uniq,
    summary,
    blocked,
    blockReason,
  }
}

/** Apply safety constraints onto capacity caps (mutates a copy). */
export function applySafetyConstraintsToCapacity(
  capacity: CapacityProfile,
  gate: SafetyGateResult,
): CapacityProfile {
  if (gate.constraints.length === 0) return capacity
  const next = { ...capacity }
  if (
    gate.constraints.includes('no_hard_sessions') ||
    gate.constraints.includes('easy_intensity_only')
  ) {
    next.maxHardSessionsPerWeek = 0
  } else if (gate.constraints.includes('max_one_hard_session')) {
    next.maxHardSessionsPerWeek = Math.min(1, next.maxHardSessionsPerWeek)
  }
  if (gate.constraints.includes('reduce_volume')) {
    next.maxWeeklyKm = Math.round(next.maxWeeklyKm * 0.75 * 10) / 10
    next.maxWeeklyTss = Math.round(next.maxWeeklyTss * 0.75)
    if (next.envelope) {
      next.envelope = {
        ...next.envelope,
        maxPeakKm: Math.round(next.envelope.maxPeakKm * 0.85 * 10) / 10,
        maxPeakTss: Math.round(next.envelope.maxPeakTss * 0.85),
        weeks: next.envelope.weeks.map((w) => ({
          ...w,
          targetKm: Math.round(w.targetKm * 0.8 * 10) / 10,
          maxKm: Math.round(w.maxKm * 0.85 * 10) / 10,
          targetTss: Math.round(w.targetTss * 0.8),
          maxTss: Math.round(w.maxTss * 0.85),
        })),
      }
    }
  }
  return next
}

/** Soften dose curve under safety constraints. */
export function applySafetyConstraintsToDose(
  dose: DoseProfile,
  gate: SafetyGateResult,
): DoseProfile {
  if (gate.constraints.length === 0) return dose
  let scales = [...dose.volumeScaleByWeek]
  if (
    gate.constraints.includes('reduce_volume') ||
    gate.constraints.includes('easy_intensity_only')
  ) {
    scales = scales.map((s) => Math.min(s, 0.85))
  }
  if (gate.constraints.includes('no_hard_sessions')) {
    scales = scales.map((s) => Math.min(s, 0.75))
  }
  return {
    ...dose,
    volumeScaleByWeek: scales,
    targetWeeklyKm: gate.constraints.includes('reduce_volume')
      ? Math.round(dose.targetWeeklyKm * 0.8 * 10) / 10
      : dose.targetWeeklyKm,
    targetWeeklyTss: gate.constraints.includes('reduce_volume')
      ? Math.round(dose.targetWeeklyTss * 0.8)
      : dose.targetWeeklyTss,
    optTss: gate.constraints.includes('easy_intensity_only')
      ? Math.min(dose.optTss, dose.medTss)
      : dose.optTss,
    mrdTss: gate.constraints.includes('easy_intensity_only')
      ? Math.min(dose.mrdTss, dose.optTss)
      : dose.mrdTss,
  }
}

/** Shared brief field defs for wizard / admin intake (optional structured safety). */
export const SAFETY_BRIEF_FIELDS = [
  {
    key: 'injurySeverity',
    label: 'Current injury severity',
    kind: 'select' as const,
    options: [
      { value: 'none', label: 'None' },
      { value: 'mild', label: 'Mild niggle' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'severe', label: 'Severe / acute' },
    ],
    defaultValue: 'none',
    required: false,
  },
  {
    key: 'injuryLocation',
    label: 'Injury location (if any)',
    kind: 'text' as const,
    required: false,
  },
  {
    key: 'painEscalating',
    label: 'Pain getting worse?',
    kind: 'boolean' as const,
    defaultValue: false,
    required: false,
  },
  {
    key: 'illness',
    label: 'Illness status',
    kind: 'select' as const,
    options: [
      { value: 'none', label: 'Well' },
      { value: 'recovering', label: 'Recovering' },
      { value: 'active', label: 'Currently ill' },
    ],
    defaultValue: 'none',
    required: false,
  },
  {
    key: 'redsRisk',
    label: 'RED-S / energy availability risk',
    kind: 'select' as const,
    options: [
      { value: 'unknown', label: 'Unknown' },
      { value: 'low', label: 'Low' },
      { value: 'elevated', label: 'Elevated' },
      { value: 'high', label: 'High' },
    ],
    defaultValue: 'unknown',
    required: false,
  },
  {
    key: 'pregnancyStatus',
    label: 'Pregnancy / postpartum',
    kind: 'select' as const,
    options: [
      { value: 'none', label: 'N/A' },
      { value: 'pregnant', label: 'Pregnant' },
      { value: 'postpartum', label: 'Postpartum' },
    ],
    defaultValue: 'none',
    required: false,
  },
  {
    key: 'medicalClearance',
    label: 'Medical clearance for training?',
    kind: 'boolean' as const,
    required: false,
  },
] as const
