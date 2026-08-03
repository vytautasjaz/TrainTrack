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

### Training block planning

**Status:** idea

Coach can plan a **training block** spanning a week, two weeks, three weeks, a month, or similar — a named period with a clear purpose (e.g. base, build, race prep, recovery).

- Coach defines: name, purpose/intent, date range (or week count), optional notes
- Workouts in that range belong to / are tagged with the block (or the block is a calendar overlay)
- Athlete can **see** the active (and upcoming) block — name, purpose, dates — so the plan context is visible, not only individual sessions
- Calendar / week / month views could show block chrome (label, tint, or header strip)
- **Season overview** should make these blocks first-class (see Season planner UX below)

Open questions when designing: one block at a time vs overlapping; whether blocks are templates that can be reused; how rescheduling workouts interacts with block boundaries.

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

### Training program library

**Status:** idea
Coach builds a reusable **training program** in the library (multi-week/mesocycle template with ordered workouts, optional blocks, purpose/name), then **adapts and assigns** it to a specific athlete (or several).

- Library: create / edit / duplicate programs independent of a live calendar
- Assign to athlete: pick start date, map program weeks onto their plan
- Adaptation: tweak distances, intensities, rest days, or drop sessions per athlete without breaking the source template
- Clear link between assigned plan and source program (for “update from template?” later)

Related to training blocks, but programs are the reusable template; blocks are the lived calendar periods (possibly created when a program is applied).

### Bulk & recurring workout creation

**Status:** idea

Create several workouts in one go, instead of adding them one by one.

**Recurring (same session):** e.g. Easy Run 10 km every Monday — N repeats, or until a date.

**Progressive series:** same “shape”, values step up each occurrence — e.g. Easy Run 10 → 11 → 12 km; or 3×2000 → 4×2000 → … (reps, distance, duration, intensity as step fields).

**Manual multi-create:** add 2 / 3 / 5 / 10 future workouts at once via a small table or calendar multi-select (dates + shared or per-row sport/type/metrics), then save as a batch.

UI could live as an “Add series” / “Add multiple” flow from the plan calendar, distinct from full program library apply.

### Sign-in with Google & Strava

**Status:** idea

Replace / complement email-password (or current auth) with social login:

- **Google** — Sign in / Sign up with Google (athlete and coach accounts)
- **Strava** — Sign in with Strava (athlete-first), then optionally reuse the same OAuth connection for activity sync

Today Strava OAuth already exists for **linking activities** in Preferences; this idea is **account authentication** (session identity), not only the sync link. Decide whether Strava login and Strava sync share one connection, and how coach accounts without Strava still sign in (Google / email).

### Re-enable Light / Dark theme toggle

**Status:** idea

Theme switching is implemented but currently **disabled** via `THEME_TOGGLE_ENABLED = false` in [`src/components/theme-provider.tsx`](src/components/theme-provider.tsx). UI: [`ThemeToggleButton`](src/components/theme-toggle-button.tsx). Set the flag to `true` (and restore system theme in root layout if desired) to bring Light / Dark back.

---

_Add new items below as they come up._
