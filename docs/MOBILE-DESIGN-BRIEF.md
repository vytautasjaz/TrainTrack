# TrainTrack — Mobile Design Brief for Graphic Designer

**Audience:** Graphic / product designer  
**Platform focus:** Mobile-first (iPhone primary; Android secondary). Also consider tablet landscape and “Add to Home Screen” PWA.  
**Product:** Endurance training planner for **coaches** and **athletes** (run / bike / swim / triathlon / strength / HYROX / recovery / rest).  
**Goal of this brief:** Describe **what must exist and what must be felt**, not how the current app looks. Treat today’s UI as a prototype of *capability*, not a visual target. Invent stronger hierarchy, richer samples, and clearer accents while **preserving every capability below**.

---

## 1. Product promise (one sentence)

TrainTrack helps a coach build a clear weekly plan and an athlete execute it with almost no friction — calendar, workout detail, logging, races, and coach chat in one calm mobile home.

**Tone:** Confident coaching tool, not a social fitness feed. Closer to a serious planner / field notebook than a gamified tracker. Sports energy without neon clutter.

**Primary emotional jobs**
- Athlete: “I know what to do today; marking it done is one gesture.”
- Coach: “I can see the week, drop a session, and catch what needs a reply.”

---

## 2. Creative freedom vs non‑negotiables

### You may freely redesign
- Layout, typography, color system, icon style, card shape, motion, empty states, illustrations
- How sport identity is expressed (color, glyph, pattern, rail, chip)
- How week / list / month views are composed on phone
- How modals, sheets, and editors feel
- How dual-role switching and athlete picker are presented
- Splash / install / notification permission moments

### You must not remove or hide these capabilities
- Dual roles (athlete / coach / both) and switching between workspaces
- Training as the calendar hub (list + week + month)
- Full workout lifecycle (plan → structure → log → feedback)
- Season races + results + personal bests
- Inbox threads tied to workouts / races
- Coach-only library / templates
- Day notes, recovery days, private notes, Strava-linked sessions
- Weather on plan (when location set)
- Settings: zones, weather, Strava, calendar sync, coaching connection
- Tools / calculators
- Unread badge on Inbox (and home-screen badge when notifications allowed)

### Design principle: “samples, not clones”
For every major screen, propose **2–3 composition samples** (A/B/C) that all keep the same information architecture. Prefer stronger hierarchy and fewer competing chrome elements than a dense “dashboard of everything.”

---

## 3. Users, roles, and mental model

### Athlete
Sees **their** plan. Can log, skip, reschedule, ask coach, self-add workouts, manage races/results/stats, connect Strava.

### Coach
Works in context of a **selected athlete**. Plans weeks, owns library, reviews reschedules, replies in inbox, edits athlete zones/weather when selected. Does **not** mark athlete workouts done/skipped.

### Dual account
Same person can be both. Must have an obvious **Athlete | Coach** workspace switch. Switching resets context (home), then coach must pick an athlete to plan for.

### Coach–athlete link
Athlete enters coach code → pending request → coach accepts/rejects. Until linked, athlete still trains alone; show a clear “Connect to a coach” path without blocking the plan.

---

## 4. Visual system guidance (direction, not prescription)

### Brand signals to explore
TrainTrack already has a mark (chevron + accent diamond) and a strong red/coral accent in product DNA. Designer may evolve this — but keep:
- **One primary accent** for “action / today / important”
- **Sport palette** that is instantly scannable in a week grid (run / bike / swim / strength / hyrox / triathlon / recovery / rest)
- **Status language** separate from sport language (done / skipped / unread / private / Strava should not compete with sport colors)

### Suggested accent hierarchy (what to highlight)
| Priority | Accent job | Examples |
|----------|------------|----------|
| **1 — Primary** | Today, primary CTA, critical unread | Today column/header; Save; Mark done; Inbox badge |
| **2 — Sport** | Identity of session type | Card rail, icon chip, week cell tint |
| **3 — Status** | Outcome / attention | Completed check, skipped, needs coach reply, reschedule pending |
| **4 — Quiet meta** | Secondary facts | Distance, duration, weather, private lock, self-added |

### What should feel “loud” on mobile
- **Today**
- **Next action** (open today’s workout / mark done / reply)
- **Unread messages**
- **Race approaching** (A-priority)

### What should feel “quiet”
- Secondary nav
- Settings
- Exact meter values until the user opens detail
- Historical clutter (past weeks)

### Composition rules for first viewport (mobile)
- One job per screen region
- Brand or product context visible but not overpowering content
- Prefer full-bleed calendar / list as the hero of Training — not a collage of widgets
- Cards only when they group an interaction (workout, race, thread), not as decorative boxes
- Safe areas for home indicator; bottom nav must not cover primary actions

### Orientation
- **Portrait:** default for athletes — list / day stack is king
- **Landscape:** week planning grid should become excellent (especially for coaches)
- Do not require landscape for basic athlete use

---

## 5. Global mobile chrome

### Bottom navigation (portrait)
Persistent primary destinations. Keep labels short.

**Athlete tabs (recommended set)**
1. **Home** (dashboard)
2. **Training**
3. **Inbox** (badge when unread > 0)
4. **Season** (or “Races”)
5. **More** → Stats, Results, Tools, Profile, Preferences, Connect coach

**Coach tabs (coach workspace)**
1. **Home** (athletes roster)
2. **Training**
3. **Inbox** (badge = unread + pending requests)
4. **Season**
5. **More** → Library, Results, Tools, Profile, Preferences

*Designer note:* Library is coach-critical — if “More” feels buried, propose an alternate sample with Library as a primary tab and Results under More.

### Top chrome
Always communicate:
- Who am I acting as? (**Athlete** or **Coach**)
- If coach: **which athlete** is selected (name + avatar + status Active/Inactive/Archived)
- Optional: weather location name when plan shows weather

### Home-screen / PWA moments
- Install prompt (iOS: “Add to Home Screen” instructions; Android: install)
- Splash while launching standalone
- Notification permission tied to Inbox (icon badge only works with permission on iOS)

---

## 6. Screen inventory (must design)

For each screen: **purpose**, **must be visible**, **accent**, **key states**, **sample ideas**.

---

### 6.1 Auth / onboarding

**Purpose:** Get in fast; pick role without ceremony.

**Must be visible**
- Sign-in methods (Google / Strava / email-password as available)
- After signup: Start training / Become a coach / Skip

**Accent:** Product brand + one clear CTA.

**Samples to explore**
- A: Full-bleed sport photography with brand wordmark dominant, CTA bottom sheet
- B: Calm light field, large logo, minimal form
- C: Split coach vs athlete illustration as role choice

---

### 6.2 Athlete Home (Dashboard)

**Purpose:** “What do I do next?” — not a settings dump.

**Must be visible (above the fold if possible)**
- Greeting / athlete identity
- **Today’s workouts** (or “Rest / Recovery” if none)
- Quick path into Training week
- Unread coach replies teaser (if any)
- Next race (name, date, priority, countdown weeks)
- Optional weather strip (morning / day / evening) when enabled

**Secondary (scroll)**
- This week volume / completion snapshot
- Race follow-up prompt after race weekend (“Log result?”)
- Recent activity

**Accent:** Today’s primary session; next A-race; unread reply.

**Samples**
- A: Timeline of today → upcoming 48h, race chip pinned top-right
- B: Large “Today” hero card with sport mark; week strip below
- C: Checklist of today + one “Coach said” preview card

**Do not put on first viewport:** full stats charts, calculator links, long settings.

---

### 6.3 Coach Home (Athletes)

**Purpose:** Roster command center — who needs planning / reply / attention.

**Must be visible**
- Athlete cards: name, avatar, status, compliance/this-week signal, next race
- Planning warnings (athlete under-planned within lead days)
- Pending connection requests (accept / reject)
- Teaser of inbox needing reply
- Add athlete / invite code display

**Accent:** Warnings and pending requests louder than calm “all good” athletes.

**Samples**
- A: Dense list with left sport/compliance rail
- B: Card grid (2-col on large phone) with status pill
- C: “Needs attention” stack first, then alphabetical roster

---

### 6.4 Training — List view (default mobile athlete)

**Purpose:** Chronological plan: past → today → future. Infinite feel OK.

**Must be visible per day**
- Date header (Today clearly marked)
- Weather snippet for day (if enabled)
- Day note indicator (athlete / coach / unavailable)
- Recovery marker if recovery day
- Workout cards in order

**Per workout card (compact)**
- Sport identity
- Title
- Primary metric (distance **or** duration — whatever is the hero for that sport)
- Secondary metric if useful
- Status (planned / completed / skipped)
- Badges when relevant: self-added, reschedule, Strava-synced, race
- Athlete: one-tap done / skip for eligible sessions

**Accent:** Today header + incomplete today’s sessions.

**Samples**
- A: Sticky “Today” band; cards with left sport rail
- B: Day blocks as soft sections; metrics oversized, titles quieter
- C: Agenda style (time-less), race days with stronger flag treatment

---

### 6.5 Training — Week view (coach primary; landscape phone)

**Purpose:** See the whole week structure by sport rows / days.

**Must be visible**
- Week navigation (prev / next / jump)
- Day columns Mon–Sun (or athlete locale week start)
- Sport rows (configurable; show/hide)
- Sessions as cells/chips inside day×sport
- Drop targets for coach drag from library
- Race markers on days
- Day notes / unavailable / recovery affordances
- Sport filter / plan color mode control (if product keeps it)

**Accent:** Today column; race day; dragged item while moving.

**Samples**
- A: Classic matrix (sports × days), compact chips
- B: Day-first columns with stacked sport cards (better portrait)
- C: Swimlane week with library drawer from right edge (coach)

**Coach interactions to design for**
- Drag workout between days
- Drag template from library onto day
- Long-press / menu: edit, copy, delete, save to library
- Inline edit of title / distance / duration on card (optional sample)
- Reorder workouts within a day

**Athlete interactions**
- Tap to open detail
- Limited drag for reschedule (propose move), not freeform coach editing

---

### 6.6 Training — Month / calendar view

**Purpose:** Zoom out for load and race placement.

**Must be visible**
- Month grid (1–3 months span if product supports)
- Density dots / counts / sport marks per day
- Race markers
- Jump into day / list

**Accent:** Race days and today.

---

### 6.7 Workout detail (modal / full screen sheet)

**Purpose:** Understand the session completely; act (log / ask / edit).

**Must be visible**
- Sport + session type + title
- Date
- Planned distance / duration (and approx indicators if estimated)
- Structure / blocks / include items / swim sets (athlete-readable)
- Coach notes (unless private from athlete)
- Athlete notes after log
- Status + Strava link if synced
- Reschedule lineage (“moved from / to”)
- Actions depending on role:
  - **Athlete:** Mark done / skip / unlog, edit actuals, feeling, private notes toggle, Ask coach, Reschedule
  - **Coach:** Edit, delete, accept/reject reschedule, private coach notes toggle, reply to feedback

**Accent:** Primary action for role (Done for athlete; Edit/Save for coach). Structure chart/blocks as visual centerpiece when present.

**Samples**
- A: Full-screen sheet with sticky action bar
- B: Two-step: summary → “Open structure”
- C: Split: left summary metrics, right structure (tablet)

**Special cases**
- **Race workout:** race fields, priority, not quick-done like normal training
- **Recovery day:** comment-focused, not completable training card
- **Reschedule ghost:** clearly “placeholder / moved”, not a real session to train

---

### 6.8 Workout editor / builder (coach; athlete self-add simpler)

**Purpose:** Create or edit planned work.

**Must support (information, not layout)**
- Sport selection
- Session type / title
- Date
- Description
- Structure builder (blocks: warmup / main / cooldown; intervals; progressive; targets pace/power/RPE/HR)
- Swim-specific builder when sport is swim
- Include items (extras)
- Planned distance / duration with source (manual vs estimated)
- Coach notes + private flag
- Tags / approx flags
- Save / cancel / preview (coach)
- Library template pick

**Accent:** Save CTA; section headers for Warmup / Main / Cooldown.

**Samples**
- A: Single scrolling form with sticky Save
- B: Stepper: Basics → Structure → Notes
- C: Preview-first with “Edit details” (athlete-facing preview sample for coach)

Athlete self-log can be a **lighter** editor (sport, title, metrics, notes) marked **self-added**.

---

### 6.9 Day notes

**Purpose:** Soft constraints on a day (“concert tonight”, “keep easy”).

**Must be visible**
- Date
- Note body
- Private toggle (hide from other party)
- Athlete-only: mark day **Unavailable / Busy**
- Read-only mode when viewing the other party’s non-private note

**Accent:** Unavailable state should read as a warning tint on the day in Training.

---

### 6.10 Season plan

**Purpose:** Future races and season shape — not a workout editor.

**Must be visible**
- Upcoming races list / timeline
- Race: name, date, sport, priority A/B/C, intent Planned vs Watching, location, goal, prep weeks
- Season phase blocks on sport lanes (Base / Build / Peak / Race / Recovery / Transition / Maintenance)
- Non-race events (vacation, camp)
- Add race / add to watchlist
- Edit / delete

**Accent:** A-goal races; next race; phase color bands as soft background (not louder than races).

**Samples**
- A: Vertical timeline of races with phase bands behind
- B: Sport-lane Gantt for phases + race pins
- C: List-first with filters Planned / Watching / Past

---

### 6.11 Results

**Purpose:** History of race outcomes + personal bests.

**Must be visible**
- Results table/list: race, date, outcome (Finished / DNS / DNF / Dismissed), time, sport/distance
- Filters (year, sport, outcome)
- Manual add result
- Personal bests section (metric cards: time / weight / reps / watts)
- Link result ↔ race when relevant

**Accent:** PRs / best times; finished outcomes positive, DNS/DNF quieter or caution.

---

### 6.12 Stats (athlete)

**Purpose:** Volume and consistency over time.

**Must be visible**
- Volume (distance / duration / count)
- Completion rate
- Weekly trends
- Sport filter
- Clear treatment that self-added may be excluded from coach compliance math (if shown)

**Accent:** Trend direction; this week vs previous.

Keep charts readable on phone: one primary chart per viewport section.

---

### 6.13 Inbox

**Purpose:** Continuous coaching conversation between athlete and coach.

**Model (locked for redesign)**
- **One main chat per athlete ↔ coach pair**.
- “Ask coach” from a **workout modal** posts into that **same chat**, with **workout details attached** (title, date, distance/duration, sport) — not a separate Ask thread per session.
- Feedback / race follow-ups can attach context the same way; primary navigation is the relationship chat, not type-siloed mailboxes.

**Must be visible**
- Chat list (coach: athletes with unread; athlete: coach thread)
- Bubbles + composer; workout context chip on messages that came from a session
- Coach: pending connection requests somewhere adjacent
- Enable notifications toggle (PWA)

**Accent:** Unread; needs-reply; workout-linked messages.

**Samples**
- A: List + full-screen chat
- B: Two-pane on tablet; list-only on phone
- C: Coach list grouped with unread counts; tap opens main chat

From Training/Race: “Ask coach” / follow-up after logging → main chat + attached context.

---

### 6.14 Library (coach only)

**Purpose:** Reusable session templates by sport.

**Must be visible**
- Sport hubs
- Template cards: title, sport, session type, metrics summary, structured vs text
- Actions: open builder, schedule onto date, duplicate, delete, edit
- Create new template paths (block / swim / text depending on sport)

**Accent:** Sport identity; “Schedule” as primary action from card.

**Samples**
- A: Sport tabs + dense cards
- B: Cover-flow / large cards with structure thumbnail
- C: Search + filters first (name, session type)

---

### 6.15 Tools / Calculators

**Purpose:** Utility calculators that can read athlete zones.

Tabs: Running, Interval, Triathlon, HYROX, Splits.

**Must be visible**
- Clear inputs / outputs
- Result emphasis (time, pace, splits)
- Optional schematic visuals (track, etc.) when helpful

**Accent:** Result numbers, not chrome.

---

### 6.16 Profile & Preferences

**Profile**
- Name, avatar
- Roles (add coach / athlete later)
- Coaching code (coach)
- Connect to coach (athlete)
- Sign-in methods / password

**Preferences**
- Training zones (pace, FTP/speeds, CSS, HR) — athlete own or coach editing selected athlete
- Weather location + show/hide weather on plan
- Plan card color mode
- Coach: planning lead days, workout builder / type presets
- Strava connect + sync controls
- Calendar ICS / sync

**Accent:** Save success; dangerous actions (unlink) secondary/destructive.

Keep as grouped sections with strong section titles — avoid one endless form.

---

## 7. Critical user flows (storyboard these)

Design each as a sequence of 4–8 frames. Preserve steps; invent presentation.

### Flow A — Athlete morning (happy path)
1. Launch PWA (splash) → Home  
2. See today’s workouts + weather  
3. Open main session → read structure  
4. Train offline/outside app  
5. Return → Mark done (optional feeling + notes)  
6. Optional Ask coach  
7. Home / Training updates status  

### Flow B — Athlete reschedule
1. Open planned session  
2. Reschedule → pick new date  
3. Original day shows ghost / “moved to…”  
4. New day shows session  
5. Coach later accepts or rejects (coach frames)  

### Flow C — Coach builds a week
1. Switch to Coach → select athlete  
2. Open Training Week (landscape sample)  
3. Open Library drawer → drop template on Tuesday  
4. Edit session structure / notes  
5. Add day note on Friday (private optional)  
6. See planning warning clear as week fills  

### Flow D — Race weekend
1. Season shows A-race this weekend  
2. Race appears on Training  
3. After race: Home follow-up “Log result?”  
4. Outcome + time (+ Strava optional)  
5. Results list updates; optional PB prompt  

### Flow E — Inbox reply
1. Badge on Inbox  
2. Open unread Ask/Feedback  
3. Reply  
4. Badge decrements; athlete sees reply on Home  

### Flow F — Strava sync
1. Preferences → Connect Strava  
2. Auto/manual sync  
3. Activity matches planned workout  
4. Card shows Strava-synced; quick done/skip disabled  
5. Detail opens Strava link  

### Flow G — New athlete connects coach
1. Athlete enters code  
2. Coach Home shows pending request  
3. Accept → athlete appears in roster  
4. Coach selects athlete → plans Training  

---

## 8. States & badges catalog (must be distinct)

Design a coherent badge / status system. Each must be recognizable at small size.

| State | User meaning | Design note |
|-------|--------------|-------------|
| Planned | Not done yet | Default |
| Completed | Done | Positive, quiet after glance |
| Skipped | Intentionally skipped | Caution / muted |
| Self-added | Athlete created; not coach compliance | Distinct chip |
| Reschedule ghost | Placeholder on old day | Ghosted / dashed |
| Reschedule pending review | Coach must accept/reject | Attention accent |
| Strava-synced | Linked activity | Brand-neutral sync mark + disables manual done |
| Private note | Hidden from other role | Lock |
| Unavailable day | Athlete busy | Day-level warning |
| Unread | Needs attention | Badge count |
| Needs reply | Last message from other | Dot or bold preview |
| Race A/B/C | Priority | Strong hierarchy A > B > C |
| Watching | Not committed race | Softer than Planned |
| Outcome Finished/DNS/DNF/Dismissed | Result | Separate from training status |
| Athlete Active/Inactive/Archived | Roster | Soft for archived |

---

## 9. Sport identity

Sports that need unique visual IDs (icons + color tokens):  
**Run, Bike, Swim, Triathlon, Strength, HYROX, Recovery, Rest.**

Guidance:
- Recovery / Rest should feel restorative, not “empty gray dead”
- Triathlon may combine cues without becoming noisy
- Colorblind-safe: never rely on color alone — always pair with icon/label

---

## 10. Content density guidelines

| Context | Density |
|---------|---------|
| Athlete Home | Low — few decisive items |
| Training List | Medium |
| Training Week (landscape) | High — still scannable |
| Workout detail | Medium body, clear CTAs |
| Builder | High but sectioned |
| Inbox list | Medium |
| Season | Medium; phases quieter than races |
| Stats | One insight per block |

---

## 11. Motion (presence, not noise)

Propose 2–3 intentional motions:
1. Today / status change confirmation (done → completed)
2. Sheet present/dismiss for workout detail
3. Week drag feedback (lift + drop target)

Avoid constant parallax, glow pulses, confetti for every save.

---

## 12. Accessibility & platform

- Touch targets ≥ 44×44 pt for primary actions  
- Contrast for sport colors on light/dark if dark mode is in scope (product may stay light-first — call out recommendation)  
- Dynamic type: titles and metrics should not break cards  
- iOS PWA: no reliance on hover; long-press menus need visible alternatives  
- Bottom nav + sticky CTAs must respect safe-area insets  
- Icon badge (home screen) is system-drawn; in-app badge must match unread semantics  

---

## 13. Deliverables requested from designer

1. **Moodboards** (2 directions): e.g. “field notebook / coaching” vs “precision sports instrument”  
2. **Mobile UI kit:** type scale, color tokens (brand + sports + status), icon set, badge set, button/input/sheet patterns  
3. **Key screens** (hi-fi) for Athlete and Coach: Home, Training List, Training Week landscape, Workout detail, Editor (1 sample), Season, Inbox list+thread, Library, Results, Profile/Preferences overview  
4. **Flow storyboards** for Flows A, C, D, E above  
5. **Empty states** for: no workouts this week, no coach linked, empty inbox, empty library, no races  
6. **Component samples (multiple):** workout card (3 variants), race chip (3), thread row (2), athlete roster card (2)  
7. **PWA:** splash, install instruction screen (iOS), notification opt-in moment  

---

## 14. Copy tone (for placeholders)

- Short, coaching-clear: “Easy aerobic”, “Move to Thursday?”, “Coach replied”  
- Avoid slang clutter and emoji-dependent UI  
- Errors: plain language near the action (“Could not save workout”)  

---

## 15. Success criteria for the redesign

A designer succeeds when:
- An athlete can find **today’s main session in under 3 seconds** on Home or Training  
- A coach can **scan a week and spot holes** in landscape week view  
- Sport, status, and unread never collide visually  
- All capabilities in this brief remain reachable without hunting  
- The app feels like a **serious training companion**, not a generic SaaS dashboard  

---

## 16. Out of scope for visual redesign (unless requested)

- Changing data model or permission rules  
- Removing Strava / weather / push  
- Replacing Training hub with separate Plan + History apps  
- Making Library available to athletes as a planning tool  

---

*End of brief. This document describes product behavior and design intent for mobile. It is not a screenshot specification of the current implementation.*
