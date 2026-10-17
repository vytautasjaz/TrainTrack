# Athlete Physiology Model (APM) & Adaptive Response Engine

**Product:** TrainTrack AI Coach  
**Version:** v1.0 (Proposed architecture)  
**Status:** Phase I–K implemented — store + learning + Strava stream features + Stats “Fitness profile” dashboard (`/progress#physiology`).  
**Priority:** High  
**Owner:** AI Coach Platform  

**Related:**

- Current runtime: [HOW-IT-WORKS.md](./HOW-IT-WORKS.md)
- Scientific base: [architecture-v0.2-scientific.md](./architecture-v0.2-scientific.md)
- Roadmap: [ROADMAP.md](./ROADMAP.md)

---

## 1. Executive summary

TrainTrack šiandien modeliuoja:

```
Athlete State
→ Goal Demands
→ Capability / Gaps / Priorities
→ Methodology Selection
→ Dose / Blueprint / Plan
→ Learning / Replan (partial)
```

Šis dokumentas įveda **naują pirmą klasės sluoksnį** tarp state ir methodology:

```
Athlete State
→ Athlete Physiology Model (APM)
→ Athlete Fingerprint
→ Response Prediction
→ Capability / Gaps / Priorities
→ Methodology Selection
→ Dose / Blueprint / Plan
→ Learning Engine
→ Fingerprint Update
```

**Tikslas:** ne tik generuoti planus, bet ir:

1. Įvertinti esamą fiziologinę / treniruočių būklę  
2. Nustatyti stiprybes ir silpnybes  
3. Nustatyti tolerancijas (volume, frequency, intensity)  
4. Prognozuoti reakciją į stimulus  
5. Personalizuoti planų generavimą  
6. Rodyti progreso rodiklius UI  
7. Mokytis iš Workout results (+ Strava sync)

> **APM nėra medicininė diagnostika.**  
> Tai **treniruočių adaptacijos modelis** — coaching decisions, ne clinical advice.

---

## 2. Product goals

| Goal | Outcome |
|------|---------|
| **G1 — Better plans** | Planai pagal *šio* atleto adaptacijos istoriją, ne „panašūs atletai → panašūs planai“ |
| **G2 — Athlete dashboard** | Matoma: kas gerėja, kas stagnuoja, kur rizika, su confidence |
| **G3 — Learning foundation** | Expected vs Actual adaptation → fingerprint update → geresnis kitas planas |

### Out of scope

- Medical diagnostics / clinical recommendations  
- Blood biomarkers  
- Direct injury diagnosis  
- AI medical decisions  

---

## 3. Pipeline position (canonical V2)

### 3.1 Today (v1 runtime)

```
AthleteData → AthleteState → SafetyIntake
  → GoalDemand → Capability → Gaps → Priorities → LimitingFactors
  → Methodology → Dose → Blueprints → Weekly → Library/AI → Validate → Plan
  → Actual response → Learning / Replan (calendar-level)
```

### 3.2 Proposed (v2 with APM)

```
Workout / Strava / Manual / Race data
        ↓
Athlete State                    (already: state.ts)
        ↓
Athlete Physiology Model         (NEW: profiles + metric envelopes)
        ↓
Athlete Fingerprint              (NEW: compact personalization vector)
        ↓
Response Prediction              (NEW: which intervention helps THIS athlete)
        ↓
Capability / Gaps / Priorities   (extend existing capability.ts / priority.ts)
        ↓
Methodology Selection            (methodology.ts — consume fingerprint)
        ↓
Capacity + Dose                  (capacity.ts / dose.ts — consume tolerances)
        ↓
Blueprint → Weekly → Library/AI → Validate → Plan
        ↓
Learning Engine                  (extend learning.ts)
        ↓
Fingerprint + APM update
```

**Svarbu:** APM **nekeičia** golden rules (safety hard constraints lieka virš fingerprint preferencijų).

---

## 4. Mapping onto existing TrainTrack code

Kad APM nebūtų „antrasis engine greta“, map’iname į tai, kas jau yra:

| APM concept | Closest existing | Gap |
|-------------|------------------|-----|
| Athlete State | `state.ts` (`AthleteState`, readiness, consistency, recent volume) | Keep as short-horizon operational state |
| Capability scores | `capability.ts` | Today mostly goal-demand capabilities; APM adds physiology/response layers |
| Confidence pattern | `MetricWithConfidence` in `types.ts` | Reuse `{ value, confidence }` + add `trend`, `lastUpdated` |
| Norwegian eligibility | `methodology.ts` `evaluateNorwegianEligibility` | Should later read Threshold + Fatigue + Recovery profiles |
| Volume ceilings | `capacity.ts`, `volume-guards.ts` | Should consume `volumeTolerance` |
| Fatigue / readiness | `safety.ts` readiness actions | Should align with `FatigueProfile` / `OverreachRisk` |
| Learning / replan | `learning.ts`, `adapt-existing-plan.ts`, `replan.ts` | Need expected-vs-actual → fingerprint updater |
| Workout actuals | `collect.ts` via `Workout.result` | Strava lands here indirectly; need richer pace/HR/cadence features |
| Long-run / marathon | `long-run-target.ts` | Natural home for Durability inputs/outputs |
| UI “why plan” | decision-trace / audit | Dashboard is new surface; can share explanations |

**Recommended package layout (future):**

```
src/lib/coach-engine/
  physiology/
    types.ts           # MetricEnvelope, profiles, fingerprint
    build-apm.ts       # State + history → AthletePhysiologyModel
    fingerprint.ts     # APM → AthleteFingerprint
    response.ts        # Response Prediction
    learn.ts           # Expected vs Actual updates
    features.ts        # HR-drift, pace-at-HR, threshold minutes, etc.
```

Pipeline hook (conceptual) in `pipeline.ts` after `buildAthleteState` / safety intake, before or intertwined with `calculateCapabilities`.

---

## 5. Data sources

### 5.1 Static / slow-changing (manual + settings)

Athlete may enter / edit:

```
age, sex, height, weight, bodyFat
maxHr, restingHr, thresholdHr
vo2max
thresholdPace, criticalSpeed
trainingAge / runningExperienceYears
injuryHistory
```

**Already partially available in TrainTrack:** paces, HR max/rest, FTP/CSS, races, wizard safety intake.  
**Likely new fields:** height/weight/bodyFat, threshold HR, VO2max estimate, critical speed, structured injury history (beyond safety intake flags).

### 5.2 Dynamic (auto)

```
completed workouts: distance, duration, pace, HR, elevation, cadence, RPE, status/compliance
race results
```

Sources:

| Source | How it enters today | APM need |
|--------|---------------------|----------|
| TrainTrack Workouts | `collect.ts` | Feature extraction (zones, drift, completion) |
| Strava Sync | → `Workout.result` (indirect) | Explicit activity features if streams available |
| Manual input | Wizard / settings | Overrides with lower automatic confidence |
| Race results | Race table in collect | Aerobic / readiness signals |

---

## 6. Core types

### 6.1 Metric envelope (shared)

Every APM metric:

```ts
type MetricTrend = 'improving' | 'stable' | 'declining'

type MetricEnvelope = {
  value: number // usually 0–100, unless noted
  confidence: number // 0–1
  trend: MetricTrend
  lastUpdated: string // ISO date
  previousValue?: number | null
}
```

Tolerance metrics use a range object:

```ts
type ToleranceRange = {
  current: number
  optimal: number
  upperLimit: number
  // optional envelopes for UI
  confidence: number
  trend: MetricTrend
  lastUpdated: string
}
```

### 6.2 AthletePhysiologyModel

```ts
type AthletePhysiologyModel = {
  athleteId: string
  asOf: string
  aerobic: AerobicProfile
  threshold: ThresholdProfile
  intensity: IntensityProfile
  fatigue: FatigueProfile
  recovery: RecoveryProfile
  durability: DurabilityProfile
}
```

### 6.3 AthleteFingerprint (compact personalization vector)

Fingerprint is the **stable, plan-facing summary** derived from APM (+ learning).  
It is what Methodology / Dose / Priorities should consume first.

```ts
type AthleteFingerprint = {
  athleteId: string
  asOf: string

  // Response tendencies (0–1)
  volumeResponder: MetricEnvelope
  frequencyResponder: MetricEnvelope
  thresholdResponder: MetricEnvelope
  vo2Responder: MetricEnvelope
  longRunResponder: MetricEnvelope

  // Risk / capacity summaries
  fatigueResistance: MetricEnvelope
  recoverySpeed: MetricEnvelope
  injuryRiskVolumeKm: MetricEnvelope // value = km/week risk threshold, not 0–100
}
```

> **Note on naming:** ankstyvoje specifikacijoje `AthleteFingerprint` ir `ResponseModel` overlap’ino.  
> Čia **Fingerprint = vienas objektas** (response + key risk/capacity).  
> APM profiles lieka detalesni UI + feature skaičiavimui.

---

## 7. Profiles (definitions)

### 7.1 AerobicProfile

```ts
type AerobicProfile = {
  aerobicStrength: MetricEnvelope // 0–100
  aerobicEfficiency: MetricEnvelope // 0–100 (pace at same HR)
  volumeTolerance: ToleranceRange // km/week
  frequencyTolerance: ToleranceRange // days/week
}
```

| Metric | Inputs (v1 heuristics) | Used by |
|--------|------------------------|---------|
| **Aerobic strength** | weekly volume, training age, race results, threshold pace, long-run history | Capability, methodology score |
| **Aerobic efficiency** | pace @ matched HR bands over time | Progress UI, intensity dosing |
| **Volume tolerance** | recent peak weeks, completion, fatigue after high volume | `capacity.ts`, volume guards |
| **Frequency tolerance** | days/week completed without drop in next-day quality | `weekly.ts` architecture |

**Aerobic strength bands (interpretation, not hard gates):**

| Score | Label |
|------:|-------|
| 0–40 | Weak |
| 41–60 | Average |
| 61–80 | Strong |
| 81–100 | Elite-relative |

### 7.2 ThresholdProfile (Norwegian / threshold core)

```ts
type ThresholdProfile = {
  thresholdStrength: MetricEnvelope
  thresholdDurability: MetricEnvelope
  thresholdResponse: MetricEnvelope // updated by learning
}
```

| Metric | Inputs | Used by |
|--------|--------|---------|
| **Strength** | threshold pace/HR, recent threshold workouts | Norwegian eligibility, dose |
| **Durability** | total threshold minutes, continuous threshold duration, pace stability | Threshold minute budgets, session structure |
| **Response** | expected vs actual gain after threshold blocks | Fingerprint `thresholdResponder` |

### 7.3 IntensityProfile

```ts
type IntensityProfile = {
  vo2Tolerance: MetricEnvelope
  vo2Response: MetricEnvelope
  speedResponse: MetricEnvelope
}
```

| Metric | Inputs | Used by |
|--------|--------|---------|
| **VO2 tolerance** | completion rate, fatigue after VO2, recovery time | intensity-ramp VO2 allow |
| **VO2 response** | before/after VO2 blocks | Fingerprint `vo2Responder` |
| **Speed response** | short intervals payoff | late-phase sharpening |

### 7.4 FatigueProfile

```ts
type FatigueProfile = {
  fatigueResistance: MetricEnvelope
  fatigueAccumulationRate: MetricEnvelope // higher = fatigues faster
  overreachRisk: MetricEnvelope // 0–100
}
```

Feeds: Safety readiness, Dose, Methodology (avoid Norwegian doubles if overreach high).

### 7.5 RecoveryProfile

```ts
type RecoveryProfile = {
  recoverySpeed: MetricEnvelope
  recoveryReliability: MetricEnvelope
}
```

Recovery speed estimated from time-to-normalize after threshold / long / VO2 / race proxies (next easy session quality, RPE, HR).

### 7.6 DurabilityProfile

```ts
type DurabilityProfile = {
  longRunTolerance: MetricEnvelope // value ≈ km (or min) effective max
  fatigueResistanceLateRun: MetricEnvelope // 0–100
  marathonReadiness: MetricEnvelope // 0–100
}
```

Natural integration with `long-run-target.ts` and marathon feasibility gates.

---

## 8. Response Prediction Engine

**Position:** after Gaps (+ Fingerprint), before / into Priorities & Methodology.

**Job:** same gap ≠ same intervention.

Example — all have “threshold deficit”:

| Athlete | Fingerprint skew | Preferred intervention |
|---------|------------------|------------------------|
| A | high volumeResponder | more aerobic volume first |
| B | high thresholdResponder | more controlled threshold |
| C | high frequencyResponder | add easy day, not denser quality |
| D | low recovery / high overreach | more recovery, delay quality |

```ts
type ResponsePrediction = {
  primaryIntervention:
    | 'volume'
    | 'frequency'
    | 'threshold'
    | 'vo2'
    | 'long_run'
    | 'recovery'
    | 'maintain'
  secondaryIntervention?: ResponsePrediction['primaryIntervention']
  rationale: string[]
  confidence: number
}
```

This should **bias** `selectPriorities` and `selectMethodology` scores — not bypass safety.

---

## 9. Learning Engine (fingerprint updates)

### 9.1 Core loop

After a block (weekly / monthly / mesocycle):

```
Expected Adaptation (from plan / dose intent)
vs
Actual Adaptation (from workouts / races / efficiency)
→ update responders + profiles
```

Examples:

| Expected | Actual | Update |
|----------|--------|--------|
| Threshold +2% | +5% | `thresholdResponder` ↑, `thresholdResponse` ↑ |
| Threshold +3% | 0% | `thresholdResponder` ↓ |
| Volume block | completion high, efficiency ↑ | `volumeResponder` ↑ |
| VO2 block | chronic fatigue, poor completion | `vo2Tolerance` ↓, overreach ↑ |

### 9.2 Update cadence

| Cadence | What updates |
|---------|----------------|
| **Per completed quality/long** | acute fatigue/recovery features (light) |
| **Weekly** | compliance, load, short trends |
| **Mesocycle / plan phase** | responders, durability, marathon readiness |

### 9.3 Relation to current learning

Keep calendar replan (`SKIP/REPLACE/REDUCE…`) for **near-term schedule**.  
APM learning is **slower personalization** — does not replace hard safety.

---

## 10. Plan generator integration (concrete hooks)

### 10.1 Target call order in `pipeline.ts` (future)

1. `collectAthleteData` / empty  
2. `buildAthleteState`  
3. `evaluateSafetyIntake`  
4. **`buildAthletePhysiologyModel`** ← NEW  
5. **`buildAthleteFingerprint`** ← NEW  
6. `resolveGoalProfile` → demands  
7. `calculateCapabilities` / gaps (**APM-aware**)  
8. **`predictResponse`** ← NEW  
9. `selectPriorities` / limiting factors (**biased by prediction**)  
10. `selectMethodology` (**fingerprint + overreach**)  
11. capacity / dose (**volumeTolerance / frequencyTolerance**)  
12. blueprints → weekly → library/AI → validate  
13. materialize + audit (**include fingerprint snapshot**)  
14. later: learning updates APM store  

### 10.2 Cold start

Jei trūksta istorijos:

- Low confidence envelopes  
- Fall back to level + brief (current behavior)  
- UI shows “building your fingerprint”  

Never block plan generation solely because APM is sparse (unless safety intake blocks).

---

## 11. Persistence (implemented)

Prisma model: `AthletePhysiologySnapshot` (append-only; current = latest by `asOf`).

| Source | When |
|--------|------|
| `engine_draft` | `materializePlanDraft` with `forAthleteId` + physiology bundle |
| `learning_week` | `applyCalendarReplanAfterLog` on completed (≤1 / athlete / UTC day) |
| `learning_phase` | `adaptExistingTrainingPlan` (batch last ~28 days) |
| `recompute` | reserved |

Helpers: `physiology/store.ts`, merge on next draft via `mergeFingerprintWithPrior`.  
Audit still embeds compact `physiology` on `coachEngineAudit` (`schemaVersion: 2`).

---

## 12. Athlete Dashboard (UI)

### 12.1 Metrics to show

```
Aerobic Strength / Efficiency
Volume Tolerance / Frequency Tolerance
Threshold Strength / Durability
VO2 Response
Fatigue Resistance / Overreach Risk
Recovery Speed
Long Run Tolerance / Marathon Readiness
```

Each card:

```
Current value
Previous value
Trend (↑ → ↓)
Confidence
Short explanation (coach language)
```

Example:

```
Threshold Durability  74 ↑ (+6 / 8 weeks)
Confidence 84%
“Able to absorb more controlled threshold work with stable pace quality.”
```

### 12.2 Placement

- **Shipped:** Athlete (+ coach athlete context) Stats page — `#physiology` fitness profile  
  ([`PhysiologyDashboard`](../../src/components/physiology/physiology-dashboard.tsx), `getPhysiologyDashboard`)
- Coach: same `/progress` when viewing an athlete  
- Stream depth: `physiology/stream-features.ts` from `WorkoutResult.stravaStreamsCache`  

---

## 13. Success metrics

### Product

- Plan completion rate  
- Retention / engagement  
- Dashboard views  

### AI / model

- Adaptation prediction accuracy (expected vs actual)  
- Methodology selection quality (proxy: completion + progress)  
- Fatigue / overreach prediction accuracy  

### Training outcomes (lagging)

- Injury / DNFs proxy (missed weeks, medical flags)  
- Workout completion  
- Performance improvement rate (races / threshold pace)

---

## 14. Phased delivery (recommended)

Kad neišsprogtų į big-bang rewrite:

### Phase I — Foundations (ship value early)

1. Types + `MetricEnvelope`  
2. Compute **v0 heuristics** from existing `collect` + `state` (no new wearable streams required):  
   - aerobicStrength (volume + consistency + threshold pace confidence)  
   - volumeTolerance / frequencyTolerance  
   - thresholdStrength (from paces + recent threshold-tagged sessions)  
   - overreachRisk / fatigueResistance (from readiness + missed + RPE)  
3. Persist snapshot  
4. Feed **volumeTolerance → capacity** and **overreach → methodology Norwegian gate**  
5. Minimal dashboard (4–6 cards)

### Phase II — Response + learning

1. Fingerprint responders  
2. Response Prediction → priority bias  
3. Expected vs actual after plan phases  
4. Richer threshold durability / long-run late-run features  

### Phase III — Streams / Strava depth

1. HR drift, pace-at-HR efficiency, cadence drop  
2. Wearable integrations  
3. Higher-confidence efficiency & recovery metrics  

---

## 15. Risks & design rules

1. **Low confidence → soft influence only.** Never let a 0.2-confidence VO2 responder ban VO2 if methodology/phase needs a small dose.  
2. **Safety > Fingerprint.** Injury / RED-S / pregnancy intake still wins.  
3. **No medical claims in UI copy.** “Training tolerance / adaptation”, not diagnosis.  
4. **Deterministic first.** APM formulas are code; LLM may explain, not invent scores.  
5. **Avoid dual systems.** Do not maintain a parallel “shadow coach”; APM must plug into `pipeline.ts`.  

---

## 16. Final vision

```
Workout Data
↓
Athlete State
↓
Athlete Physiology Model
↓
Athlete Fingerprint
↓
Response Prediction
↓
Methodology + Dose Optimization
↓
Plan Generation
↓
Learning Engine
↓
Fingerprint Update
```

Rezultatas:

> AI ne tik žino, **ką** atletas daro.  
> AI pradeda modeliuoti, **ką** jis toleruoja, **į ką** geriausiai reaguoja, **kur** silpnos vietos, **kaip greitai** atsistato — ir kiekvieną naują planą padaro tikslesnį už ankstesnį.

TrainTrack evoliucionuoja iš planų generatoriaus į **Athlete Operating System** sluoksnį — vis dar kaip **decision engine**, ne kaip laisvas LLM fiziologas.

---

## 17. Open questions (for product / coaching review)

Pažymėk atsakymus čia, prieš implementation kickoff:

1. Ar `injuryRiskVolumeKm` rodomas atletui tiesiogiai, ar tik coach/engine?  
2. Ar fingerprint matomas coach’ui editable, ar read-only computed?  
3. Ar Phase I dashboard — Home widget ar atskiras `/fitness` / settings route?  
4. Ar marathonReadiness skaičiuojamas tik marathon skill / race goal, ar visada?  
5. Kokį minimalų history langą laikome pakankamu confidence ≥ 0.6 (pvz. 6 vs 10 sav.)?  

---

*Šis dokumentas yra architektūros PRD. Įgyvendinimas prasideda Phase I tipų + heuristic builder + capacity/methodology hooks, ne nuo pilno dashboard + Strava streams.*
