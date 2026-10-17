# TrainTrack AI Coach — kaip veikia sistema (detalus aprašymas)

**Status:** gyvas dokumentas peržiūrai / korekcijoms  
**Kalba:** LT (techniniai terminai EN, kaip kode)  
**Atnaujinta pagal kodą:** `src/lib/coach-engine/`, `src/lib/ai/`, `src/app/actions/ai-plans.ts`, `docs/ai-coach-engine/*`

---

## 1. Kas tai yra (ir kas nėra)

### 1.1 Produkto principas

> **TrainTrack AI yra decision engine su AI sluoksniu, o ne „LLM sugeneruoja planą“.**

Sistema **neprasideda** klausimu „kokią treniruotę duoti šiandien?“.  
Ji eina grandine:

**Šiandien (v1 runtime):**

```
Goal → Demands → Athlete State → Capabilities → Gaps → Limiting Factors
  → Adaptation Priorities → Training Model → Dose → Workout
  → Expected Response → Actual Response → Learning
```

**V2 Phase I–J (runtime — `physiology/` + store):**

```
State → (load latest AthletePhysiologySnapshot) → Physiology Model
  → Fingerprint (merge prior learning) → Response Prediction
  → Demands / Gaps / Priorities (biased) → Methodology → Dose → Plan
  → Persist snapshot (engine_draft)
  → Learning: completed workout → learning_week (1/day);
              adapt plan → learning_phase
  → UI: Stats → Fitness profile (`/progress#physiology`)
  → Stage K: Strava packed streams → HR drift / pace@HR → efficiency + late-run
```

Žr. detalų PRD: [athlete-physiology-model.md](./athlete-physiology-model.md).

Planas nėra statiškas PDF.  
> **Planas = nuolat atnaujinamas sportininko modelis.**

### 1.2 Kas yra „source of truth“

| Sluoksnis | Kas valdo | Ar gali LLM perrašyti? |
|-----------|-----------|-------------------------|
| Athlete state, capacity, hard safety, progression ceilings, validation | **Deterministinis engine** | **Ne** |
| Blueprint refine, workout pick+adapt, critic repairs, „why“ tekstas | **Optional OpenAI** | Taip, bet tik ribose + po validator |
| Workout library | DB (`CoachEngineWorkout`) + seed fallback | LLM renkasi iš kandidatų, ne inventuoja bet ką |

**Be `OPENAI_API_KEY` planas vis tiek generuojasi** — tik iš library + taisyklių. AI padaro geresnį, bet nėra privalomas.

Kanonas: `docs/ai-coach-engine/ROADMAP.md`, `architecture-v0.1.md`, `architecture-v0.2-scientific.md`,  
`athlete-physiology-model.md` (proposed V2 layer).

---

## 2. Filosofija (ką AI ir engine „tiki“)

Šaltinis promptams: `src/lib/ai/skills/philosophy.ts`  
(`SHARED_COACHING_PHILOSOPHY` + event-specific skill brief).

### 2.1 Auksinės taisyklės (santrauka)

1. Goal prieš workout.  
2. Demands prieš gaps.  
3. Gaps prieš priorities.  
4. Priorities prieš dose.  
5. Dose prieš workout.  
6. Easy reiškia easy.  
7. Praleistos treniruotės ≠ automatinis „atsidirbimas“.  
8. Saugoti key sessions.  
9. Hard constraints AI negali apeiti.  
10. Nėra vienos „geriausios“ metodologijos visiems.  
11. Prie kiekvieno svarbaus sprendimo dėti **confidence**.  
12. Preferuoti matomą adaptaciją, ne „įspūdingą“ treniruotę.  
13. Library = **pavyzdžiai / seed’ai**, ne uždaras meniu.  
14. Progressuoti paprastai **vieną (ar kelias) streso dimensijas**, ne viską ×1.10.

### 2.2 Metodologijos filosofija

Engine **parenka** modelį, o ne primeta vieną:

- **Pyramidal** — daug easy, prasmingas moderate/threshold, mažai VO2.  
- **Polarized** — daug easy + maža tikra aukšta intensyvumo dozė.  
- **Threshold / Norwegian-style** — kontroliuojamas threshold + stiprus easy base; double-threshold kai eligible.  
- **Race-specific** — MP / race sims arčiau starto, **tik jei uždirbta**.  
- **Block / Hybrid** — laikinas fokusas / mišinys.

Norwegian klausimas (kai eligible):  
> Ar sportininkas gali absorbuoti daugiau naudingų darbų — ar daugiau darbo tik sukurs daugiau nuovargio?

### 2.3 Dose (MED / OPT / MRD)

Prieš pasirenkant treniruotę galvojama apie dozę:

- **MED** — minimum effective dose  
- **OPT** — optimal recoverable  
- **MRD** — maximum recoverable (nepriartėti lengva ranka)

Dimensijos: volume, duration, intensity, density, frequency, complexity, specificity, mechanical demand.

### 2.4 Hierarchy (praktinė prioritetų tvarka)

Nors kode nėra 1:1 „injury → … → peak“ enum’o kaip kai kuriuose out-of-tree engine’uose, praktikoje saugumas ir recovery eina prieš intensyvumą:

1. Safety intake / injury / medical flags  
2. Readiness (keep / reduce / easy / cancel)  
3. Consistency & capacity envelope  
4. Aerobic volume  
5. Quality (threshold / race-specific / VO2 pagal phase)  
6. Race specificity artėjant prie starto  

---

## 3. Kaip vartotojas paleidžia AI planą

### 3.1 UI

| Kelias | Failas | Kam |
|--------|--------|-----|
| Athlete | `/training/ai-plan` | Savo planas |
| Coach | `/workouts/plans/ai` | Planas pasirinktam athlete |
| Wizard | `src/components/ai/ai-plan-wizard.tsx` | Skill, brief, schedule, safety, methodology lock |

Wizard surenka:

- **Skill** (pvz. `run-marathon`, `run-half-marathon`, `run-5k-build`, `hyrox-general`, `multi-sport-base`, `adapt-plan`)  
- **Week count**, level, goal time, notes  
- **Schedule**: days/week, available days, long-run day, current/first week km, race weekday  
- **Profile overrides**: paces, FTP, CSS, HR  
- **Safety intake**: trauma, liga, RED-S, nėštumas, skausmas, medikamentai…  
- **Methodology lock** (optional): pvz. priversti Norwegian  

### 3.2 Server actions

`src/app/actions/ai-plans.ts`:

1. Auth + coach owns athlete (jei coach)  
2. AI entitlement / quota (`src/lib/ai/entitlements.ts`)  
3. Skill resolve (`requireSkill`) — code catalog + optional DB overrides  
4. `runCoachEngineDraft(...)`  
5. `materializePlanDraft` → Prisma `TrainingPlan` + sessions  
6. `coachEngineAudit` ant plano (sprendimų pėdsakas)  
7. Revalidate paths  

---

## 4. Iš kur imama informacija

### 4.1 Iš DB (`collectAthleteData`)

Failas: `src/lib/coach-engine/collect.ts`

| Duomenys | Šaltinis |
|----------|----------|
| Paces (easy / tempo / threshold / VO2) | `Athlete` zonos/prefs |
| Bike FTP, Swim CSS | `Athlete` |
| HR max / resting | `Athlete` |
| Upcoming races | Race lentelė (data, tipas, prioritetas, goal) |
| Recent workouts (~4–12 sav.) | Calendar `Workout` + `result` (planned/actual distance, duration, status, RPE) |
| Rough TSS | Heuristika iš duration/distance × RPE (`estimateRoughSessionTss`) |

**Svarbu:** nėra atskiros „Strava engine“ šakos. Jei Strava sync įrašo rezultatus į `Workout.result`, jie patenka kaip bet kuris logged workout.

### 4.2 Empty / general athlete

Jei planas be konkretaus athlete (arba library mode) → `emptyCollectedAthleteData()`.  
Tada volume/level ateina beveik vien iš wizard brief.

### 4.3 Wizard brief (override’ai)

`src/lib/coach-engine/brief.ts` + skill `briefFields`:

- Perrašo paces / FTP / CSS / HR jei įvesta wizard’e  
- Schedule → availability + long day  
- Safety intake fields → gate prieš planą  
- Notes → keyword inference safety’je  

### 4.4 Skills katalogas

Code source of truth: `src/lib/ai/skills/registry-base.ts`

| Skill slug | Tipas | Fokusas |
|------------|-------|---------|
| `run-5k-build` | draft | 5K |
| `run-half-marathon` | draft | HM |
| `run-marathon` | draft | Marathon |
| `hyrox-general` | draft | HYROX |
| `multi-sport-base` | draft | Multi-sport base |
| `adapt-plan` | adapt | Esamo plano adaptacija (žr. §9) |

Kiekvienas draft skill turi:

- Zod brief schema  
- Event-specific coaching brief (tekstas)  
- `buildSkillSystemPrompt(eventBrief)` = shared philosophy + event brief  

Admin gali override’inti promptus DB per `skill-store` / admin AI skills UI.

### 4.5 Workout library

| Šaltinis | Failas |
|----------|--------|
| DB workouts | `CoachEngineWorkout` via `library-store.ts` |
| Seed / fallback | `library-seed.ts` |
| Matching + progression | `library-v2.ts` (`findCandidatesForSlotV2`, `pickProgressiveCandidateV2`) |

Library = **seed templates** su metadata (adaptation, intensity band, tags, progression family).  
AI / engine parenka kandidatą ir **adaptuoja dozę** (reps, duration, recovery, distance…).

---

## 5. Pipeline — žingsnis po žingsnio

Entry: `runCoachEngineDraft` / `buildDraftFromCollected`  
Failas: `src/lib/coach-engine/pipeline.ts`

Žemiau — loginė seka (supaprastinta, bet atitinka kodą).

### Step 0 — Paruošimas

- Refresh library + skill overrides iš DB  
- Collect athlete **arba** empty pack  
- Brief overrides → `buildAthleteState`

### Step 1 — Safety intake gate

`evaluateSafetyIntake` (`safety-intake.ts`)

- Gali **blokuoti** draftą (`CoachEngineSafetyError`)  
- Arba **apriboti** capacity/dose (injury, illness, RED-S, pregnancy, …)  
- Keyword inference iš notes + explicit checkbox fields  

### Step 2 — Goal profile

`resolveGoalProfile` (`goal.ts`)

- Demand id (pvz. `MARATHON_V1`, `HALF_V1`, `5K_V1`, HYROX/multi)  
- Level, weekCount, race date/weekday, target time  

### Step 3 — Demands → capabilities → gaps → priorities

| Modulis | Rolė |
|---------|------|
| `demand.ts` | Ko reikalauja goal (volume, long run, threshold, …) |
| `capability.ts` | Ką athlete gali dabar (+ confidence) |
| `priority.ts` | Kurias adaptacijas kelti pirmiausia |
| `limiting-factors.ts` | Kas riboja progresą |

### Step 4 — Capacity + training budget + dose

| Modulis | Rolė |
|---------|------|
| `capacity.ts` | Envelope: max/target km (ir pan.) per savaitę, atsižvelgiant į history + safety |
| `dose.ts` | MED/OPT/MRD stiliaus savaitės dozės, deload/taper indekso sąsajos |
| `deload.ts` | Deload volume ratio |
| `refreshCapacityEnvelope` | Po blueprint’ų — dar kartą sutvarkyti envelope |

### Step 5 — Methodology selection

`selectMethodology` (`methodology.ts`)

Kandidatai (pvz.): `PYRAMIDAL`, `POLARIZED`, `THRESHOLD`, `NORWEGIAN`, `RACE_SPECIFIC`, `BLOCK`, `HYBRID`, …

Scoring dimensijos (su svoriais): goal fit, athlete level, phase fit, sport fit, response fit, recovery fit, load, time, data confidence.

**Norwegian eligibility** (`evaluateNorwegianEligibility`):

- Ne beginner  
- Consistency ≥ 0.6  
- Recent volume ≥ ~35 km/sav (išskyrus kai kuriuos 5K case’us)  
- Readiness ≥ 0.55  
- `proxyMode` jei threshold pace confidence < 0.8  

Coach/wizard gali **lock**’inti modelį (`lockedModel`) — tada selection override’inamas (su beginner saugikliais).

### Step 6 — Week blueprints (periodizacija savaitėmis)

`buildWeekBlueprints` (`blueprint.ts`)

Kiekvienai planuojamai savaitei:

- Phase label (BASE / BUILD / PEAK / RECOVERY / RACE …)  
- `targetKm`, long-run target  
- `intensityBand` (adaptation → engine → specific → peak → taper …)  
- Quality session count, VO2 allow, race-specific flags  
- Threshold volume target (minutės) kai reikia  
- Deload savaitės pagal roadmap  

Tai jūsų „macro/meso“ praktikoje: **vienas TrainingPlan blokas**, o meso ≈ savaitiniai blueprint’ai + phase labels (ne atskiri multi-season makro objektai).

### Step 7 — AI Call A (optional): blueprint refine

`refineBlueprintWithAi` (`ai-multi.ts`)

- LLM gali **pataisyti** blueprint JSON ribose  
- Jei AI nėra / fail → lieka deterministic blueprint  

### Step 8 — Weekly architecture (dienų išdėstymas)

`buildWeeklyArchitecture` (`weekly.ts`)

- Kurios dienos treniruotės (pagal availability)  
- Kur quality day(s) (pvz. Tue/Thu ritmas)  
- Long-run diena  
- Norwegian: `applyNorwegianDoubleThreshold` (AM/PM threshold, recovery next day)  
- Sport mix (HYROX/multi)  

Tada ant slot’ų: `applyReadinessToSlot` / `decideReadinessAction` (`safety.ts`) → keep / reduce / easy / cancel.

### Step 9 — AI Call B (optional): materialize quality/long

`materializeWeekWithAi`

- Batch’ina kokybės / long / race / strength slot’us  
- Renka iš kandidatų + adaptations  

### Step 10 — Slot → workout (kiekvienai dienai)

Deterministinis kelias:

1. `findCandidatesForSlotV2` — filtras pagal adaptation, band, methodology, long profile, threshold dose, VO2 gates  
2. `pickProgressiveCandidateV2` — progresija šeimoje (pvz. 6→8→10)  
3. Optional `adaptWorkoutWithAi` — LLM parenka kandidatą + skaitines adaptacijas  
4. `validateWorkoutProposal`  
5. `clampThresholdAdaptations` — threshold minutės neperlipti budget’o  
6. `proposalToSession` — į TrainTrack session struktūrą  

Norwegian doubles: atskiri AM/PM pick’ai tam pačiam slot’ui.

Fallback: jei AI invalid → progressive/deterministic pick.

### Step 11 — Week-level enforcement

- `enforceWeekVolumeCap`  
- Long-run ratio repairs (`long-run-target.ts`)  
- Stress budget (`session-load.ts`)  
- `enforceWeekValidity` / plan score (`plan-score.ts`, `enforce-week.ts`)  

Hard validation fail → `CoachEngineValidationError` → planas **nesisaugo**.

### Step 12 — AI Call C (optional): critic + safe repairs

`critiquePlanWithAi` + `applyCriticSafeRepairs`

- Ieško perteklinio threshold, silpno recovery, missing peak long, ir pan.  
- Remontai **tik saugūs** (demote, ne „dar +20% intensity“)  
- Po repairs — dar kartą validacija  

### Step 13 — Marathon / long-run durability gates

`validateMarathonLongRunDurability`, `assessMarathonFeasibility`  
(ypač marathon skill / high-endurance goals)

### Step 14 — AI Call D (optional): explain

`explainPlanWithAi` → gairės / „why this plan“ tekstas UI panelei.

### Step 15 — Output

- `PlanDraftWithStructure`  
- `buildPlanPhases` UI fazėms  
- Decision trace markdown (`decision-trace.ts`)  
- Audit blob (`audit.ts` → `coachEngineAudit` ant `TrainingPlan`)  

Tada `materializePlanDraft` įrašo į DB.

---

## 6. Intensyvumas ir „zonos“ — kaip dabar modeliuojama

### 6.1 Kas YRA

- Athlete **paces** (easy/tempo/threshold/VO2) + optional HR max/rest  
- Session types / tags: easy, threshold, VO2, race-pace, Norwegian, …  
- Soft **threshold minute budgets** per savaitę  
- Intensity bands per phase (`intensity-ramp.ts`, `preparation-roadmap.ts`)  

### 6.2 Ko NĖRA (svarbu korekcijoms)

- Pilno LT1/LT2 / 5-zone %HRmax **prescription** engine’e kaip hard law  
- Savaitės „Z1 15% / Z2 65% / …“ distribution target kaip first-class blueprint field  
- Strava-derived auto threshold recalculation  

App-wide intensity zones (`src/lib/intensity-zones.ts`, settings) daugiau skirti **builder/chart**, ne coach-engine dozei.

---

## 7. Periodizacija — kaip galvoti apie „macro / meso / micro“

| Lygmuo | TrainTrack praktika |
|--------|---------------------|
| **Macro** | Vienas `TrainingPlan` su `weekCount` (tipiškai 4–24), goal + race |
| **Meso** | Savaitiniai `WeekBlueprint` + phase labels; deload savaitės roadmap’e |
| **Micro** | `WeeklySlot` dienos: easy / quality / long / rest / strength |

Nėra atskiros „yearly strategy“ objekto generatoriaus (keli A/B race blokai viename engine run).  
Jei reikia sezono iš kelių planų — tai keli draft’ai / rankinis chaining’as (kol kas).

---

## 8. Saugumas ir constraint’ai

### 8.1 Pre-plan (intake)

`safety-intake.ts` — block / constrain / require_review.

### 8.2 Runtime

`safety.ts`:

- Readiness actions  
- Key-session protection  
- Back-to-back hard  
- Sport interference (`sport-architecture.ts`)  

### 8.3 Volume / quality guards

`volume-guards.ts`, `enforce-week.ts`, `session-load.ts`:

- Max weekly increase / rebound after deload  
- Threshold minute caps  
- Demote stacked race-pace / hard long  
- Beginner VO2 / double-threshold ribojimai per methodology constraints  

### 8.4 AI forbidden (filosofija + kodas)

AI **negali**:

- apeiti hard safety  
- viršyti progression ceilings  
- ignoruoti recovery reikalavimus  
- „clear’inti“ injury be duomenų  
- išsaugoti planą, jei validator failina  

---

## 9. Po plano: adaptacija ir mokymasis

### 9.1 Calendar replan

`applyCalendarReplanAfterLog` (`adapt-existing-plan.ts` / `replan.ts`)  
Hook iš workout actions kai skip/complete.

Semantika (filosofija): SKIP / REPLACE / REDUCE / RESCHEDULE / MERGE — **ne** default „padaryk praleistą rytoj“.

### 9.2 Adapt existing plan action

`adaptExistingTrainingPlan` — deterministic focus: `recover | maintain | progress | injury`.  
**Šiuo metu `usedAi: false`** — skill `adapt-plan` promptas egzistuoja, bet LLM rewrite dar neprijungtas prie šio kelio.

### 9.3 Learning signals

`learning.ts` — expected vs actual, missed sessions.  
Signalai ateina iš calendar workout status/result (RPE, distance, duration), ne iš atskiros Strava analytics pipeline.

---

## 10. LLM kvietimų žemėlapis (kai AI įjungtas)

| Call | Funkcija | Ką daro | Failas |
|------|----------|---------|--------|
| A | `refineBlueprintWithAi` | Season/week blueprint pataisos | `ai-multi.ts` |
| B | `materializeWeekWithAi` | Quality/long session materializacija | `ai-multi.ts` |
| — | `adaptWorkoutWithAi` | Vieno slot’o pick + adaptations | `ai-adapt.ts` |
| C | `critiquePlanWithAi` | Plano kritika + safe repairs | `ai-multi.ts` |
| D | `explainPlanWithAi` | Žmogiškasis „why“ | `ai-multi.ts` |

OpenAI wrapper: `src/lib/ai/openai.ts` (`generateStructuredObject` + Zod).  
Jei AI nėra → visi optional call’ai skip, lieka deterministic.

---

## 11. Output į produktą

1. `PlanDraftWithStructure` (in-memory)  
2. `materializePlanDraft` → `TrainingPlan` + `TrainingPlanSession`  
3. Sessions patenka į athlete calendar / coach plan views  
4. UI: „Why this plan?“ (`why-this-plan-panel.tsx`) iš audit/trace  
5. Vėliau: replan kai keičiasi completion  

---

## 12. Entitlements / quota

`src/lib/ai/entitlements.ts`

- Ar user’is gali naudoti AI skills  
- Kokie skill slug’ai unlocked  
- Usage logging (`AiUsageKind`)  

Be entitlement — action mesta paywall klaida (priklausomai nuo produkto taisyklių).

---

## 13. Kas gerai veikia vs kur greičiausiai norėsi koreguoti

### Stiprybės

- Aiški decision grandinė (ne „vienas mega-promptas“)  
- Planas generuojasi be OpenAI  
- Validation + audit  
- Norwegian / threshold / multi-sport architecture  
- Library progression graph  
- Safety intake prieš dozę  

### Tipinės spragos / korekcijų vietos

| Tema | Dabar | Kur keisti |
|------|-------|------------|
| **Athlete Physiology Model / Fingerprint** | Phase I–K: store + learning + Strava streams + Stats UI | `physiology/` · `/progress#physiology` |
| 5-zone % distribution | Nėra first-class | `blueprint.ts`, `plan-score.ts`, philosophy |
| Mesocycle 3+1 kaip hard pattern | Soft per roadmap | `blueprint.ts`, `preparation-roadmap.ts` |
| Threshold/VO2 ladders kaip V1 generators | Dalinai library-v2 | `library-seed.ts`, `library-v2.ts`, `intensity-ramp.ts` |
| Strava-specific adaptation | Nėra | APM features + `learning` / `capability` |
| Adapt-plan LLM | Prompt yra, kodas deterministic | `adapt-existing-plan.ts` + `adapt-plan` skill |
| Multi-race yearly macro | Nėra | naujas orchestration virš kelių `TrainingPlan` |
| LT1/LT2 lab zones | Nėra | tik jei turėsite matavimus + mapping į dose |

---

## 14. Failų žemėlapis (greita navigacija)

```
src/lib/coach-engine/
  pipeline.ts          ← pagrindinis orchestration
  collect.ts           ← DB → CollectedAthleteData
  state.ts             ← AthleteState
  physiology/          ← APM: build + fingerprint + predict + store + learn + capacity/methodology hooks
  goal.ts / demand.ts / capability.ts / priority.ts / limiting-factors.ts
  methodology.ts       ← model selection + Norwegian eligibility
  capacity.ts / dose.ts / deload.ts
  blueprint.ts         ← week blueprints / phases
  weekly.ts            ← day architecture + Norwegian doubles
  library-v2.ts        ← candidates + progression
  safety-intake.ts / safety.ts
  volume-guards.ts / enforce-week.ts / plan-score.ts / session-load.ts
  long-run-target.ts
  ai-adapt.ts / ai-multi.ts
  adapt-existing-plan.ts / learning.ts / replan.ts
  decision-trace.ts / audit.ts
  types.ts

src/lib/ai/
  skills/philosophy.ts ← filosofija promptams
  skills/registry-base.ts / skills/skills/*.ts
  skills/skill-store.ts
  materialize-plan-draft.ts
  entitlements.ts
  openai.ts

src/app/actions/ai-plans.ts
src/components/ai/ai-plan-wizard.tsx

docs/ai-coach-engine/
  ROADMAP.md
  architecture-v0.1.md
  architecture-v0.2-scientific.md
  HOW-IT-WORKS.md          ← šis failas
```

---

## 15. Kaip naudoti šį dokumentą korekcijoms

Siūloma tvarka, kai nori ką nors pakeisti:

1. **Filosofija** — ar keičiasi principas? → `philosophy.ts` + šio doc §2.  
2. **Duomenys** — ar trūksta input’o? → `collect.ts` / wizard brief / safety intake.  
3. **Taisyklė** — ar tai hard law? → deterministic modulis (`capacity`, `volume-guards`, `methodology`…).  
4. **AI elgesys** — ar tai soft preferencija? → skill brief / `ai-multi` prompt / critic rules.  
5. **Validacija** — ar privaloma praeiti testą? → `enforce-week` / `plan-score` / tests `coach-engine.test.ts`.  
6. Atnaujink šį `HOW-IT-WORKS.md`, kad liktų synce su kodu.

---

## 16. Vienos pastraipos santrauka

TrainTrack AI paima sportininko profilį + istoriją iš DB ir wizard brief’ą, praleidžia per safety gate, skaičiuoja goal demands ir gaps, parenka metodologiją, sudaro savaitinius blueprint’us ir dienos architektūrą, parenka/adaptuoja treniruotes iš library (su optional LLM A–D sluoksniais), validuoja ir tik tada įrašo `TrainingPlan`. Po to planas gali keistis pagal logged completion per deterministic replan — o ne per laisvą LLM perrašymą.

---

*Jei ką nors šiame aprašyme nori pataisyti (pvz. „Norwegian eligibility turėtų būti X“, „deload visada 3+1“) — geriausia rašyti komentarus tiesiai prie § numerio; tada galima paversti į konkretų kodo PR.*
