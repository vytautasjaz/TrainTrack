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
**Related:** Season planner UX; Training season blackboard; Training plan library; Week intensity / load pattern  
**UI placement:** undecided — may live in **training plan creation**, **season planner**, or both (decide later)

Split the training year / season into named **phases / blocks**, e.g.:

- Base  
- Build  
- Race-specific / race prep  
- Recovery / deload  
- (custom types later)

Coach defines: name, phase type, purpose/intent, date range (or week count), optional notes/color.

- Workouts in that range belong to / are tagged with the block (or the block is a calendar overlay)
- Calendar / week / month / season views could show block chrome (label, tint, or header strip)

**Nested / stacked blocks (program + phase)**

Support **two levels at once**, not only a single active phase. Example: a **16-week marathon prep program** that contains inner phases (Build, Race-specific, Taper, …).

- Outer block = full assigned program (e.g. 16 weeks)
- Inner block = current phase inside that program (e.g. Build = weeks 3–8 → 6 weeks)
- Athlete can be in both at once: “week **3/16** of Marathon prep” and “week **3/6** of Build”
- Later: optional deeper nesting only if needed; v1 = program + one active child phase is enough

**Athlete visibility & progress (incl. Home)**

When a coach **assigns a block / program** to an athlete, the athlete should see where they are — ideally on **Home**, not only deep in the plan:

- Active program name + current phase name
- Progress as weeks: e.g. **3/16** overall, **3/6** in current phase
- Optional **% of program completed** (by weeks and/or by completed sessions vs planned — decide formula)
- Short purpose/intent of the current phase so context is clear without opening the full calendar
- Upcoming phase peek (“next: Race-specific”) later

Open questions when designing: create/edit surface (plan builder vs season board); assign flow (library plan → athlete calendar); how rescheduling interacts with block boundaries; whether % is week-based, session-based, or both; Home card vs eyebrow under Today.

### Week intensity / load pattern

**Status:** idea  
**Related:** Training block planning; Training plan library; Workout Progression; Weekly intensity breakdown

Mark or prescribe **week-level intensity / load**, not only session difficulty — e.g. a hard / high-load week followed by a recovery / deload week (or 3:1, 2:1 patterns).

- Coach can label weeks (or set a load level) within a block or plan: hard · moderate · recovery · race week · etc.
- Useful for planning stress/recovery rhythm at a glance (season board, plan library apply, week headers)
- Later: optional coupling to volume targets or progression rules; athlete-visible “this is a recovery week” context

Exact model and UI TBD — park the concept so it isn’t lost when building blocks / plans.

### Weekly intensity breakdown

**Status:** idea  
**Related:** Week intensity / load pattern; TSS; Workout builder / session structure; Training plan calendar

See **how much intensity is planned in a week**, split by intensity type — not only total volume or a single “hard week” label.

**Intensity buckets (examples)**

- Threshold  
- VO2max / speed  
- Tempo / steady  
- Easy / endurance  
- Recovery  
- (sport-specific zones later: Z1–Z5, power zones, etc.)

**Surfaces**

- Week view / plan header: stacked bar or chips — e.g. “42' threshold · 24' VO2 · 3h easy · 40' recovery”
- Optional planned vs actual once sessions are logged / Strava-synced
- Helps coaches balance hard days and keep easy/recovery volume visible, not only the quality sessions

Open when designing: derive from structured workout blocks vs coach tags vs pace/power targets; time vs distance vs TSS per bucket; multi-sport weeks (run vs bike swim separately or combined); athlete-visible summary.

### Season planner UX (Excel-style)

**Status:** idea  
**Related:** Training block planning; Training season blackboard  
**Reference:** coach Excel season grid (months × week columns; rows for run / 70.3 / LTT / federation / bike / other / swim; colored week spans; race cells; week-to-race countdown numbers)  
**Existing surface:** [`SeasonOverview`](src/components/races/season-overview.tsx) / season timeline — improve rather than invent a third calendar.

Clearer season view + ability to **paint / create training blocks by color** across weeks, like marking phases in Excel:

- Stronger visual hierarchy: month headers, week ticks, sport/event rows or lanes
- Select a week range → assign a **named + color-coded block** (base / build / taper / race week, custom)
- Race markers on the grid (distance/name chips) with optional countdown in phase cells
- Athlete-visible read-only version of the same season picture
- Ties into **Training block planning** data model (blocks drive the colored spans)

Goal: replace the Excel screenshot workflow with an in-app season board that is scannable at a glance.

### Training season blackboard

**Status:** idea  
**Related:** Season planner UX (Excel-style); Training block planning; Training plan library; athlete Events / races

A **spatial, multi-track season planning surface** that lets coaches see and shape an athlete’s entire season at a glance. It should feel closer to a modern planning canvas or timeline tool than a spreadsheet or traditional calendar — while remaining fully grounded in structured training data.

The goal is to let a coach **sketch the season visually first, then turn that sketch into real training-plan data**.

#### Core concept

The season is represented as a shared horizontal time axis with multiple independent **tracks**. Each track represents a different planning dimension, while all tracks remain aligned to the same calendar.

Example tracks:

- Running
- Cycling
- Swimming
- Strength
- Skills
- Competitions
- Testing
- Camps / Travel
- Notes

Tracks should be configurable so different sports and coaching workflows can use different combinations.

#### Training blocks

Coaches can create structured blocks directly on a track by selecting a date range or dragging across the timeline.

A block is a real data object, not just visual decoration:

- Name / type
- Start and end dates
- Description / intent
- Key focus
- Volume or intensity notes
- Assigned athlete(s)
- Optional relationship to an event or race

For example:

**Build — Mar 17 → May 11**

> Increase threshold volume and race-specific intensity.  
> Longer sessions, progressive load, 2 quality sessions/week.

Blocks can be moved, resized, extended, split, duplicated, or reordered through direct manipulation.

#### Events as anchors

Competitions, races, tests, camps, travel and other important dates live on the same shared timeline.

Events should act as **planning anchors** around which training blocks can be positioned.

Example:

`BASE → BUILD → PEAK → TAPER → 🏆 A-RACE → RECOVERY`

A race can therefore visually explain *why* the surrounding blocks exist.

#### Notes and planning ideas

The canvas can also contain lightweight planning notes, but these should remain visually clean and secondary to structured data.

Examples:

- “Increase long-run volume here”
- “Test 5K before Build”
- “Athlete travelling”
- “Possible second race”
- “Need more strength work”

Notes can later be converted into structured objects where appropriate.

#### Direct manipulation

The main interaction should be **drag-and-compose**, rather than form-first data entry.

Possible interactions:

- Drag across dates → create a block
- Drag block edges → resize
- Drag block → move
- Multi-select dates / blocks
- Split or extend blocks
- Duplicate blocks
- Drag events onto the timeline
- Add notes directly to the canvas
- Reorder tracks
- Show / hide tracks

The interface should feel inspired by tools such as Miro, Figma or modern timeline/roadmap applications, but **without becoming a freeform drawing tool**.

The canvas should remain structured, aligned and data-driven.

#### Timeline views

The same season data should support multiple visualizations:

**Timeline / Canvas** — continuous horizontal time axis optimized for big-picture season planning.

**Calendar** — conventional month/week calendar for more precise date-based planning.

Both views should operate on the **same underlying data model**.

#### Track management

Coaches should be able to:

- Add custom tracks
- Rename tracks
- Reorder tracks
- Hide / show tracks
- Define track type and appearance
- Potentially save commonly used track configurations

This allows the same planner to work for running, cycling, triathlon, HYROX, team sports, etc.

#### From sketch to plan

The most important concept is that the canvas is not just a visualization.

A coach should be able to build something like:

`BASE → BUILD → PEAK → TAPER → 🏆 RACE → RECOVERY`

and then use those blocks as the foundation for actual training-plan generation.

**Sketch → Structure → Training Plan → Execution**

The season canvas becomes the high-level planning layer on top of TrainTrack’s existing training data.

#### Product principles

- **Spatial, not spreadsheet-like**
- **Structured, not freeform**
- **Visual, but data-driven**
- **Direct manipulation over forms**
- **One shared data model across planner and calendar**
- **Events provide context for training blocks**
- **Simple enough to understand in seconds**
- **Powerful enough to plan an entire season**

The visual language should stay **minimal and professional** — clean grids, subtle colors, restrained UI, clear typography and structured timelines. Avoid a literal “whiteboard” aesthetic with excessive sticky notes, hand-drawn arrows or comic-like annotations.

The intended feeling is:

> **“I can see the entire season, understand the strategy, and change it with my hands.”**

**Open when designing:** shared data model with Excel-style season planner (one backend, two UIs?); undo/history; touch vs desktop; athlete read-only board vs coach-only edit; how blocks feed Training plan library / assign flow.

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

### Plan vs Execution view modes

**Status:** idea  
**Related:** Strava sync of unplanned activities; Off-day planned-workout matching; Training calendar / week views

Add calendar (and related plan surfaces) **view modes**:

- **Plan** — show only the **original coach plan** as prescribed (what was scheduled), without overlaying execution noise
- **Execution** — show **all completed workouts** (logged / Strava-synced), whether or not they matched a planned session that day

Open when designing: default mode per role (coach vs athlete); how reschedules / skipped sessions appear in Plan; whether Execution replaces planned slots or sits as a parallel layer; week vs month consistency.

### Strava sync of unplanned activities

**Status:** idea · **high priority** (completeness of plan + stats)  
**Related:** Plan vs Execution view modes; Off-day planned-workout matching; Cross-day Strava link & complete; Stats / TSS; Activity feed

Sync **all** relevant Strava activities into TrainTrack — not only those that map onto an existing planned workout.

- If the athlete trains on a day with **nothing planned**, still create / attach an activity in TrainTrack as **athlete self-added** (`selfLogged`)
- Unplanned synced sessions must appear on the **plan/calendar** and count in **overall stats** (volume, load, compliance denominators TBD)
- Keep clear distinction: coach-planned vs athlete-executed-but-unplanned
- Later / together with matching: if an unplanned Strava activity **looks like** a skipped / unfinished planned session, offer to **associate** instead of leaving both (self-added + skipped)

Open when designing: auto-create `Workout` vs attach-only result; sport/type mapping from Strava; duplicate detection with manual logs; which activities to exclude (commutes, very short); coach visibility and edit rights.

### Cross-day Strava link & complete (rescheduled)

**Status:** idea · **high priority** (athlete completion friction)  
**Related:** Off-day planned-workout matching; Strava sync of unplanned activities; existing reschedule / ghost workout model

Today an athlete can only link a Strava activity from **the same calendar day** as the planned workout. Reality: e.g. strength planned **yesterday**, completed **today** — they still need to mark it done and attach Strava.

**Desired athlete flow**

1. Open the planned workout (even if its plan date has passed)
2. Choose **Link Strava activity** and pick from activities on **other days** (not only that plan date)
3. Confirm → workout is marked **completed** and treated as **rescheduled** to the activity’s day (reuse / align with existing reschedule semantics: original slot + completed-on-new-date)
4. Stats, activity feed, and coach views should show it as completed (with reschedule context), not stuck as missed/unlinked

Open when designing: UI for multi-day Strava picker (date filter / recent list); whether linking auto-moves the plan card vs keeps ghost + completed copy; conflict if that day already has another session; coach notification.

### Off-day planned-workout matching

**Status:** idea  
**Related:** Strava sync of unplanned activities; Cross-day Strava link & complete; Plan vs Execution view modes

Detect when the athlete completed a workout **similar to a planned session**, but on a **different day** than scheduled — including matching a **self-added / synced** Strava activity to a **skipped or unfinished** planned slot.

- Suggest / auto-link: “this Strava run looks like Tuesday’s planned intervals”
- Manual path covered by **Cross-day Strava link & complete**; this item is the smarter suggest/match layer
- Surfaces: Plan mode still shows original date; Execution / linking UI shows the match and optional reschedule or “done as X”
- Helps compliance and coach review when athletes shift days without manually moving the plan

Open when designing: similarity signals (sport, distance, duration, structure, TSS); confidence threshold vs manual confirm; interaction with explicit reschedule flow; what happens to the original planned slot (completed-elsewhere vs still due).

### Past unfinished workouts as muted / skipped-style

**Status:** idea  
**Related:** Plan vs Execution view modes; Strava sync of unplanned activities; Off-day planned-workout matching

In training plan / calendar views, sessions that are **in the past** and were **never completed** (not Strava-synced, not manually marked done) should render **greyer / muted**, same visual language as **skipped**.

- Past + no completion → skipped-style (dimmed card, muted sport rail, etc.)
- Still distinguishable from an explicit “Skipped” mark if needed (label vs mute-only), but look should match
- Future / today planned sessions stay full color until done or skipped
- Ties into Execution view: unfinished past slots stay visible but de-emphasized next to completed work

Open when designing: cutoff (end of day vs athlete timezone); auto-skip vs visual-only; whether coach must confirm; interaction with off-day matching (don’t mute if linked as done elsewhere).

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
