# TrainTrack — future backlog

Product ideas and deferred work. Not committed for the current sprint unless pulled into an active plan.

## Deferred

### Workout chat (athlete ↔ coach)

**Status:** deferred  
**Plan draft:** `.cursor/plans/workout_chat_thread_1737cf09.plan.md`

Replace single `athleteNotes` / `coachReply` on `WorkoutResult` with a real message thread on each **workout**, so:

- Athlete can ask about a session **before** training
- Coach can reply; athlete can follow up (multi-turn)
- Same thread visible in workout detail for both roles
- Dashboard inbox shows unread threads (instead of one-shot feedback)

**Suggested model:** `WorkoutMessage` (`workoutId`, `authorRole` ATHLETE|COACH, `body`, `createdAt`, `readAt`), migrate existing notes/replies into the first messages.

**Out of scope for v1:** realtime/websockets, push, global DMs outside a workout.

---

## Ideas (unprioritized)

### Training block planning (season phases)

**Status:** idea  
**Related:** Season planner UX; Training plan library  
**UI placement:** undecided — may live in **training plan creation**, **season planner**, or both (decide later)

Split the training year / season into named **phases / blocks**, e.g.:

- Base  
- Build  
- Race-specific / race prep  
- Recovery / deload  
- (custom types later)

Coach defines: name, phase type, purpose/intent, date range (or week count), optional notes/color.

- Workouts in that range belong to / are tagged with the block (or the block is a calendar overlay)
- Athlete can **see** the active (and upcoming) block — name, purpose, dates — so plan context is visible, not only individual sessions
- Calendar / week / month / season views could show block chrome (label, tint, or header strip)

Open questions when designing: create/edit surface (plan builder vs season board); one block at a time vs overlapping; reusable block templates; how rescheduling interacts with block boundaries.

### Week intensity / load pattern

**Status:** idea  
**Related:** Training block planning; Training plan library; Workout Progression

Mark or prescribe **week-level intensity / load**, not only session difficulty — e.g. a hard / high-load week followed by a recovery / deload week (or 3:1, 2:1 patterns).

- Coach can label weeks (or set a load level) within a block or plan: hard · moderate · recovery · race week · etc.
- Useful for planning stress/recovery rhythm at a glance (season board, plan library apply, week headers)
- Later: optional coupling to volume targets or progression rules; athlete-visible “this is a recovery week” context

Exact model and UI TBD — park the concept so it isn’t lost when building blocks / plans.

### Season planner UX (Excel-style)

**Status:** idea  
**Reference:** coach Excel season grid (months × week columns; rows for run / 70.3 / LTT / federation / bike / other / swim; colored week spans; race cells; week-to-race countdown numbers)  
**Existing surface:** [`SeasonOverview`](src/components/races/season-overview.tsx) / season timeline — improve rather than invent a third calendar.

Clearer season view + ability to **paint / create training blocks by color** across weeks, like marking phases in Excel:

- Stronger visual hierarchy: month headers, week ticks, sport/event rows or lanes
- Select a week range → assign a **named + color-coded block** (base / build / taper / race week, custom)
- Race markers on the grid (distance/name chips) with optional countdown in phase cells
- Athlete-visible read-only version of the same season picture
- Ties into **Training block planning** data model (blocks drive the colored spans)

Goal: replace the Excel screenshot workflow with an in-app season board that is scannable at a glance.

### Training plan library

**Status:** idea · **high priority** (core future goal)  
**Related:** Workout Templates; Workout Progression; Training block planning

Reusable **multi-week training plans** (mesocycles / programs) in the library — not just single workouts — that coaches build once, then **adapt and assign** to different athletes.

- Library: create / edit / duplicate full plans independent of a live calendar (ordered weeks, sessions per day, optional named blocks / purpose)
- Assign to athlete(s): pick start date, map plan weeks onto their calendar
- Adaptation per athlete: tweak volume, intensity, rest days, drop or swap sessions — **without changing the source plan**
- Clear link assigned plan → source (for “update from template?” later)
- Can compose **parameterized workouts**, **progressions**, and **blocks** from the related backlog items

**Goal:** coaches maintain a library of proven training plans and roll them out customized per runner, instead of rebuilding each athlete’s calendar from scratch.

Distinct from today’s workout Library (single fixed templates) and from **Training block planning** (blocks = lived calendar periods; plans = reusable definitions that often *create* those blocks when applied).

### Workout Templates (parameterized)

**Status:** idea  
**Related:** Training plan library; Workout Progression; today’s Library (`WorkoutTemplate`) is fixed-value only

Save individual workouts as reusable templates whose **structure and logic** can be parameterized, then filled when assigning to an athlete.

Example:

```
Interval Session
Warm-up: 2 km
Main set: {REPS} × {DISTANCE}
Pace: {PACE}
Recovery: {RECOVERY}
Cool-down: 2 km
```

- Beyond today’s fixed-value library templates
- Coach adjusts parameters to fitness level without rebuilding the session
- Source template stays intact
- Feeds into **Training plan library** (plans reuse these workout templates) and **Workout Progression**

### Bulk & recurring workout creation

**Status:** idea

Create several workouts in one go, instead of adding them one by one.

**Recurring (same session):** e.g. Easy Run 10 km every Monday — N repeats, or until a date.

**Progressive series:** same “shape”, values step up each occurrence — e.g. Easy Run 10 → 11 → 12 km; or 3×2000 → 4×2000 → … (reps, distance, duration, intensity as step fields). Prefer the fuller **Workout Progression** item below when designing this.

**Manual multi-create:** add 2 / 3 / 5 / 10 future workouts at once via a small table or calendar multi-select (dates + shared or per-row sport/type/metrics), then save as a batch.

UI could live as an “Add series” / “Add multiple” flow from the plan calendar, distinct from **Training plan library** apply.

### Workout Progression

**Status:** idea  
**Related:** Bulk & recurring workout creation; Training plan library; Workout Templates (parameterized)

Create a workout progression across multiple weeks **without manually duplicating** the workout.

Selected parameters should be able to change progressively over time, for example:

- **Volume:** 10 km → 12 km → 14 km → 16 km  
- **Repetitions:** 4 × 1000 → 5 × 1000 → 6 × 1000 → 8 × 1000  
- **Distance (per rep):** 6 × 600 m → 6 × 800 m → 6 × 1000 m  
- **Intensity:** 4:15/km → 4:10/km → 4:05/km  
- **Recovery:** 2:00 → 1:45 → 1:30  
- **Combined:** change multiple parameters at once  

Coach defines a **progression rule** (e.g. +1 rep/week, +2 km/week, −5 sec/km/week) **or** manually adjusts each week’s values.

The system generates the resulting workouts while keeping them **connected as one progression / template**, so the same progression can later be adapted to different athletes instead of rebuilding each session from scratch.

**Later consideration:** show the progression visually as a week-by-week preview directly in the workout builder.

### TSS (Training Stress Score)

**Status:** idea  
**Related:** Week intensity / load pattern; Stats; Athlete Home training-load (deferred)

Calculate **TSS** (or sport-equivalent load) so coaches and athletes can see session stress and aggregate load — not only distance/duration.

**Per workout**

- Compute planned TSS from prescription (duration × intensity factor / IF², pace/power/HR zones, or structure blocks)
- Compute actual TSS from logged / Strava-synced results when available
- Show on workout card / detail (planned vs actual)

**Aggregates & surfaces**

- Week / month totals (plan vs completed)
- Stats / trends charts (rolling load, CTL/ATL/TSB later if desired)
- Athlete Home “training load” stand-in (replace mock chart with real series)
- Coach roster / attention: optional load flags (spike, undertrained)

**Open when designing:** which formula per sport (run pace vs bike power vs swim); thresholds / FTP/CSS inputs already in zones; store computed values vs compute on read.

### Sign-in with Google & Strava

**Status:** idea

Replace / complement email-password (or current auth) with social login:

- **Google** — Sign in / Sign up with Google (athlete and coach accounts)
- **Strava** — Sign in with Strava (athlete-first), then optionally reuse the same OAuth connection for activity sync

Today Strava OAuth already exists for **linking activities** in Preferences; this idea is **account authentication** (session identity), not only the sync link. Decide whether Strava login and Strava sync share one connection, and how coach accounts without Strava still sign in (Google / email).

### Re-enable Light / Dark theme toggle

**Status:** idea

Theme switching is implemented but currently **disabled** via `THEME_TOGGLE_ENABLED = false` in [`src/components/theme-provider.tsx`](src/components/theme-provider.tsx). UI: [`ThemeToggleButton`](src/components/theme-toggle-button.tsx). Set the flag to `true` (and restore system theme in root layout if desired) to bring Light / Dark back.

### Admin panel & platform administration

**Status:** idea · **high priority** (platform ops)  
**Related:** `UserRole.ADMIN` in schema ([`prisma/schema.prisma`](../prisma/schema.prisma)); `isAdmin()` in [`src/lib/session.ts`](../src/lib/session.ts) — role exists today but is not self-assigned and has no admin UI

Introduce an **admin** user type and a protected **admin panel** for platform operators (not coach/athlete self-service).

**v1 — user administration**

- Admin-only route(s) / shell (e.g. `/admin`) gated by `ADMIN` role
- User list: search, filter, paginate (email, name, roles, created, last sign-in if tracked)
- View / edit user profile fields (name, email, roles where allowed)
- **Password management:** set or reset password for a user (secure server action; no plaintext storage; optional force reset on next login later)
- Impersonation **out of scope** for v1 unless explicitly needed — prefer edit/support actions only
- Audit log **optional** for v1; at minimum log admin password resets server-side

**Later — billing & platform**

- Subscription / payment status per account (when payments ship)
- Plan tier, trial, cancellation, refunds (provider TBD: Stripe etc.)
- Feature flags or entitlements tied to plan
- Usage or quota views if product adds limits

**Open when designing:** who can grant `ADMIN` (DB seed / super-admin only); coach+admin vs admin-only accounts; whether admin can see athlete health/training data or only account metadata; GDPR/support workflow for account deletion.

### Privacy, cookies & EU compliance (go-live)

**Status:** idea · **required before public launch** (EU / EEA users)  
**Related:** Auth cookies (`tt_user`, session), `tt_athlete`, `tt_view_mode`, coach invite (`tt_coach_invite`), Strava OAuth state cookies, PWA/service worker; Google sign-in if enabled

Before going live with real users in the EU, add **privacy & consent** surfaces and document what the app stores — not only a banner, but settings users can revisit.

**Legal pages (static, linked from footer + signup)**

- Privacy Policy (controller identity, what data, why, retention, subprocessors, contact)
- Terms of Service / acceptable use
- Cookie Policy (list cookies: name, purpose, duration, essential vs optional)

**Cookie consent (ePrivacy + GDPR)**

- First-visit **cookie consent** UI: Accept all · Reject non-essential · Customize
- **Strictly necessary** (no consent required): auth/session, security, coach-invite flow, athlete/view-mode preferences required for app function
- **Optional** (consent-gated): analytics, marketing, third-party embeds — only load after opt-in; respect choice on subsequent visits (stored preference cookie)
- Do not block sign-in on “Reject non-essential” if only essential cookies are set pre-consent
- Re-open preferences from Settings → **Privacy** (or footer “Cookie settings”)

**In-app privacy settings (user-facing)**

- Link to policies; cookie preference center (toggle optional categories)
- **Export my data** (GDPR Art. 15 / portability) — profile, workouts, races, messages scope TBD
- **Delete my account** — self-service or request flow; cascade rules (athlete data, coach links, inbox); cooling-off period optional
- Marketing email opt-in/out if newsletters added later

**Product & engineering checklist**

- Data Processing Agreement template if B2B coaches process athlete data
- Subprocessor list (hosting, email, Strava, Google, payment provider later)
- Retention defaults (deleted accounts, logs, backups)
- Privacy-by-design review: coach–athlete notes visibility rules already in product brief — document in policy
- DPIA **if** processing health/fitness data at scale (training logs may qualify as health-related in some interpretations — legal review)

**Open when designing:** jurisdiction (LT/EU entity), whether under-16 requires parental consent, analytics provider (Plausible vs GA4 vs none), i18n for legal copy (EN only vs LT).

---

_Add new items below as they come up._
