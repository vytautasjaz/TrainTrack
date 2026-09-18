# TrainTrack — future backlog

Product ideas and deferred work. Not committed for the current sprint unless pulled into an active plan.

## Done

### Workout chat (athlete ↔ coach)

**Status:** done (shipped)  
Athlete ↔ coach messaging lives on workouts / inbox; no longer deferred.

---

## Deferred

*(empty — moved completed items to Done)*

---

## Ideas (unprioritized)

### Training block planning (season phases)

**Status:** done (Milestone A–B shipped; calendar drag-paint deferred)  
**Related:** Season planner UX; Training plan library  
**Principle:** **Phase = strategy/context.** Not a reusable plan and not a workout.

Split the training year / season into named **phases / blocks**, e.g.:

- Base  
- Build  
- Race-specific / race prep  
- Recovery / deload  

Coach defines: name, phase type, purpose/intent, date range, optional notes/color.

- Visible as subtle chrome on Training month/week (labels + transition; no full-cell wash)
- Editable on season board (paint / move / resize) and Training (Add phase + click label → shared modal)
- Current-phase header e.g. `BUILD · 3 / 6`

**Nested / stacked blocks (program + phase)** — **wanted** (Home progress / multi-layer season chrome).
**Follow-up:** quieter drag-edit on Training calendar if needed.
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

**Status:** done for phases (A–B); blackboard wanted  
**Related:** Training block planning; Training plan library  
**Existing surface:** `/season` + Training month/week phase chrome  

Phases on the season board and Training calendar share one `SeasonPhaseBlock` model. Season board: paint/move/resize. Training: modal create/edit. Full blackboard tracks/notes remain a wanted follow-on.

### Training season blackboard

**Status:** wanted (product priority — after A–C)  
**Related:** Season planner UX; Training block planning; Training plan library

A spatial multi-track season canvas (custom tracks, notes, sketch→plan). Season board today stays strategy-level (phases, races, events); blackboard is the fuller canvas.

### Training plan library

**Status:** done (Milestone C v1)  
**Related:** Training block planning; Season planner UX  
**Principle:** **Plan = reusable week-based template.** Calendar workouts are independent copies.

Reusable **multi-week training plans** in the library — coaches build once, then apply to athletes by **start week**.

- Unit = week (Mon–Sun); sessions keyed by weekIndex + dayOfWeek
- Save week range from calendar (workouts ± optional relative phase structure) — **Save plan** in Training toolbar
- Apply with preview, workout conflict skip/replace; race days always skipped — **Apply plan**
- Library nav: **Workouts** + **Training plans** (`/workouts`, `/workouts/plans`); dock also has Plans tab
- **Plan canvas editor** (`/workouts/plans/[id]`): create from scratch (week count presets) or open to edit — Week 1…N × Mon–Sun grid, library drag-drop, weekly planned stats, relative phases; same surface for create + edit
- Metadata: title, description, sportFocus, weekCount, target, level, …
- Plan source on applied workouts (`planId` / `planSessionId`) on detail

Distinct from today’s single-workout Library (`WorkoutTemplate`).

**Follow-up:** richer plan browser, level/target UI; phase paint/resize on canvas.  
**Wanted — live-link / update-from-template:** push library plan changes into previously applied calendar copies (opt-in; not default apply behavior).

### Plan intelligence (Milestone D)

**Status:** wanted (not started — depends on A–C model)  
**Related:** Training plan library; Training block planning; Week intensity / load pattern; Workout Progression

Adapt library plans using athlete context — fitness, races, load, current phase — so apply is not a flat drop.

Examples:

- Shift volume/intensity in recovery vs build
- Soften or skip sessions around race week
- Suggest progression (reps/distance/week) instead of a flat template

A→B→C establishes the Phase / Plan / Workout model this layer consumes.
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
