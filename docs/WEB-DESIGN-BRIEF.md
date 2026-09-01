# TrainTrack — Web / Desktop Layout Design Brief for Graphic Designer

**Audience:** Graphic / product designer  
**Platform focus:** Web app on desktop and large tablet (≈1024px+). Laptop 13–16″ primary; ultrawide and 11–13″ compact laptop secondary.  
**Companion doc:** See also `docs/MOBILE-DESIGN-BRIEF.md` — same product, different canvas. Keep **visual language consistent** across mobile and web; **layout patterns** may diverge.  
**Product:** Endurance training planner for **coaches** and **athletes** (run / bike / swim / triathlon / strength / HYROX / recovery / rest).  
**Goal of this brief:** Describe **web information architecture, regions, density, and accents** — not a clone of today’s UI. Preserve all capabilities; propose stronger, calmer desktop compositions with multiple samples.

---

## 1. Product promise on web

On web, TrainTrack is a **planning workstation**: a coach builds multi-week calendars with a library at hand; an athlete reviews the week, opens structure, and logs without fighting a phone-sized chrome.

**Tone:** Same as mobile — serious coaching tool — but web may feel more like a **studio / control room** (space to see the week, compare athletes, edit structure) than a pocket companion.

**Primary emotional jobs**
- Athlete: “I can see my week at a glance and drill into any session.”
- Coach: “I can plan this athlete’s week without losing context — library, calendar, and details in one workspace.”

---

## 2. Relationship to mobile brief

| Shared | Different on web |
|--------|------------------|
| Roles, permissions, entities, badges, sports | Persistent **sidebar** instead of bottom tabs |
| Accent hierarchy (today / sport / status / meta) | **Week grid as default Training view** |
| Same capabilities must remain | Multi-pane layouts, wider tables, hover + keyboard |
| Brand + sport + status systems | Library as **dockable side panel** while planning |
| Storyboard flows (same outcomes) | Less “one sheet at a time,” more “overview + detail” |

Designer should produce a **single design system** that scales; do not invent a second brand for desktop.

---

## 3. Creative freedom vs non‑negotiables

### You may freely redesign
- Shell (sidebar / top bar / content column widths)
- How expanded vs collapsed navigation feels
- Week / list / month compositions for wide screens
- Placement of athlete picker, role switcher, weather
- Modal vs split-view vs drawer for workout detail and editors
- Data tables for Results / PBs / roster
- Empty states, marketing-adjacent auth landing (if in scope)

### You must not remove
Everything listed in the mobile brief §2 (roles, Training hub, workout lifecycle, season, results, inbox, library, day notes, recovery, private notes, Strava, weather, settings, tools, unread badges).

### Design principle: “use the width”
On desktop, **waste is worse than density** — but density must stay scannable. Prefer one strong calendar plane over stacked mobile cards. Avoid filling edges with decorative panels that don’t carry product jobs.

---

## 4. Breakpoints & canvases (design for these)

Propose artboards at least at:

| Name | Width | Intent |
|------|-------|--------|
| Compact laptop | 1280×800 | Sidebar + main; week still usable |
| Standard laptop | 1440×900 | Primary design target |
| Wide | 1720×960 | Room for library drawer + week without crush |
| Narrow desktop | 1024×768 | Collapsed/icon sidebar; no mobile bottom nav |

Below ~1024px, mobile patterns from the mobile brief apply. Do not invent a third “tablet-only” product — bridge gracefully.

---

## 5. Global web shell

### Regions (must exist conceptually)

```
┌─────────────┬──────────────────────────────────────────────┐
│  SIDEBAR    │  OPTIONAL CONTEXT BAR (coach athlete / week) │
│  brand      ├──────────────────────────────────────────────┤
│  role switch│                                              │
│  main nav   │              MAIN WORKSPACE                  │
│  inbox badge│         (Training / Season / …)              │
│  profile    │                                              │
│  collapse   │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**Sidebar must expose**
- Brand / logo → Home
- **Athlete | Coach** switch (when dual)
- Primary destinations (role-dependent — see nav)
- Inbox unread badge
- Profile / Preferences entry
- Sign out
- Collapse to icon rail (and expand)

**Coach context bar (when in coach workspace)** must expose
- Selected athlete (name, avatar, status)
- Athlete switcher
- Optional: compliance / next race / planning warning chip for that athlete

**Main workspace**
- Max readable width for prose/settings; **near-full width for Training week / Season / Library grids**
- Consistent page title + view controls (List / Week / Month) in a clear toolbar

### Navigation sets

**Athlete**
Home (logo) · Training · Inbox · Season · Results · Stats · Tools · Profile / Preferences  
(+ Connect coach if unlinked)

**Coach**
Home (Athletes) · Training · Inbox · Season · Results · Library · Tools · Profile / Preferences

### Samples for shell
- **A — Editorial rail:** Light sidebar, generous type, brand mark prominent, content on soft field
- **B — Instrument rail:** Dark or high-contrast narrow sidebar, content bright calendar
- **C — Top+side hybrid:** Slim top bar for athlete/role; left icons only; more horizontal space for week

---

## 6. Accent hierarchy on web (same system, larger canvas)

| Priority | Accent job | Web examples |
|----------|------------|--------------|
| **1 — Primary** | Today, primary CTA, critical unread | Today column in week; Save; Inbox badge |
| **2 — Sport** | Session identity across grid | Cell tint / rail / icon |
| **3 — Status** | Attention without painting whole UI | Reschedule pending, needs reply, under-planned warning |
| **4 — Quiet meta** | Secondary facts | Weather glyphs, private lock, self-added, approx ~ |

**Loud on web:** today column, planning warnings on coach home, unread inbox, A-races on season.  
**Quiet on web:** settings chrome, secondary metrics until hover/detail, decorative borders.

---

## 7. Screen inventory — web layouts

For each: **purpose**, **layout regions**, **must be visible**, **accent**, **samples**.

---

### 7.1 Auth / marketing landing (web)

**Purpose:** Trust + enter. Desktop can be more brand-led than mobile onboarding.

**Regions**
- Hero (brand dominant) + auth panel
- Optional: short “for coaches / for athletes” proof strip below fold

**Must be visible**
- Product name as hero-level signal
- Sign-in methods
- Path to register / choose role after auth

**Samples**
- A: Full-bleed training imagery + floating auth card
- B: Split screen — brand left, form right
- C: Minimal centered card on calm atmosphere field

*Keep first viewport clean: brand, one headline, one supporting line, auth CTAs — not feature grids.*

---

### 7.2 Athlete Home (web)

**Purpose:** Orientation + next actions; then deeper widgets.

**Suggested layout**
- **Left / main (60–70%):** Today + upcoming sessions (2–5 days)
- **Right rail (30–40%):** Next race, unread coach replies, week snapshot, weather

**Must be visible**
- Today’s workouts (primary)
- Entry to Training week
- Next race (priority + countdown)
- Unread replies teaser
- Week volume / completion (secondary)
- Race follow-up prompt when relevant

**Accent:** Today’s main session; unread; A-race.

**Samples**
- A: “Today” large list + sticky right insight rail
- B: Horizontal week strip (mini) under greeting + detail list
- C: Single-column max-width reading layout (narrower) for calm athlete home

**Avoid:** Recreating the entire Training calendar on Home — Home orients; Training plans.

---

### 7.3 Coach Home — Athletes roster (web)

**Purpose:** Multi-athlete command center.

**Suggested layout**
- Toolbar: search / filter status / Add athlete / coaching code
- **Primary:** Roster table or card grid
- **Attention stack:** Pending requests + planning warnings (top or left)

**Must be visible per athlete**
- Name, avatar, status (Active / Inactive / Archived)
- This-week compliance / planned signal
- Next race
- Click → select athlete and go to Training (or open athlete profile)

**Accent:** Pending requests and planning warnings first.

**Samples**
- A: Data table (sortable columns) + right detail peek
- B: Card grid 3–4 columns
- C: Split: “Needs attention” list | full roster

---

### 7.4 Training — Week view (DEFAULT on web)

**Purpose:** The product’s desktop centerpiece — plan the week by day × sport.

**Regions**
```
[ View: List | Week | Month ] [ Week nav ] [ Sport filter ] [ Weather toggle ]
[ Optional: Library drawer toggle — coach ]

┌──────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Sport    │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
├──────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ Run      │     │     │     │     │     │     │     │
│ Bike     │     │     │     │     │     │     │     │
│ …        │     │     │     │     │     │     │     │
└──────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
[+ Library side panel when open]
```

**Must be visible**
- Week navigation (prev / next / today / optional multi-week span)
- Day headers with today emphasis
- Configurable sport rows
- Workout cells: sport identity, title, hero metric, status marks
- Race markers on days
- Day notes / unavailable / recovery affordances
- Weather overlays when enabled
- Coach: drag between days; drop templates; reorder within day; add/edit/copy/delete
- Athlete: open detail; limited reschedule; quick done/skip where eligible

**Library side panel (coach)**
- Opens without leaving the week
- Template list by sport; drag onto day cells
- Must not permanently hide the calendar (collapsible)

**Accent:** Today column; drag ghost + drop target; race days; warnings.

**Samples**
- A: Classic matrix (sports × days), dense chips, library right drawer
- B: Day-first columns with stacked sessions (better when few sports)
- C: Multi-week horizontal band (2–4 weeks) for macro planning, drill into single week

**Density**
- Cells must remain readable at 1280px with sidebar expanded
- Prefer truncation + tooltip/hover for long titles over wrapping that blows row height

---

### 7.5 Training — List view (web)

**Purpose:** Chronological agenda; good for athletes and review of past→future.

**Layout**
- Centered or left-aligned stream (max width ~720–900px for reading) **or** wider two-column (list + peek detail)
- Sticky day headers; infinite scroll acceptable

**Must be visible**
Same card content as mobile list: date, weather, notes, recovery, workout cards, status, badges, athlete quick actions.

**Samples**
- A: Single stream
- B: Master–detail: list left, selected workout detail right (no modal)
- C: Grouped by week sections with week totals

---

### 7.6 Training — Month view (web)

**Purpose:** Load and race placement at a glance.

**Layout**
- Full-width calendar (1–3 months)
- Day cells: density marks, sport dots, race flags
- Click day → list filter or week jump

**Accent:** Today + race days.

**Samples**
- A: Classic month grid
- B: 3-month strip for season context
- C: Heatmap-style load intensity + race pins

---

### 7.7 Workout detail (web)

**Purpose:** Full session understanding + role actions — desktop can avoid tiny sheets.

**Preferred patterns (pick samples)**
- **A — Modal dialog** centered, wide (≈720–900px), sticky footer actions
- **B — Right drawer** over calendar (keeps week visible)
- **C — Full page** `/workouts/[id]` style for deep edit / share

**Must be visible**
Sport, session type, title, date, planned metrics, structure/blocks/swim, coach notes (privacy rules), athlete notes, status, Strava, reschedule lineage, role actions (done/skip/ask/reschedule vs edit/delete/accept-reject).

**Accent:** Structure visualization as centerpiece; primary CTA in sticky footer.

**Special cases:** Race, Recovery, Reschedule ghost — same rules as mobile brief.

---

### 7.8 Workout editor / builder (web)

**Purpose:** Serious editing surface — desktop’s strength.

**Suggested layout**
```
[ Basics: sport, type, title, date, metrics ]
[ Structure canvas — majority of width ]
[ Notes / privacy / tags — side or below ]
[ Sticky Save / Cancel / Preview ]
```

**Must support**
All builder capabilities from mobile brief (blocks, swim builder, include items, metric sources, private notes, template pick, preview).

**Samples**
- A: Two-column — structure left (2/3), details/notes right (1/3)
- B: Top basics bar + full-width structure + bottom notes
- C: Preview mode toggle (athlete-facing card preview beside editor) — coach sample

Athlete self-add remains a **lighter** form (can be modal).

---

### 7.9 Day notes & recovery (web)

**Purpose:** Same as mobile; can be compact modal from day header.

**Must be visible:** date, body, private toggle, unavailable (athlete), read-only rules.

Recovery day: dedicated create/edit for coach; visible marker on week/list.

---

### 7.10 Season plan (web)

**Purpose:** Macro season — phases + races with room to breathe.

**Suggested layout**
- Top: filters (Planned / Watching / sport) + Add race / Add event / Add phase
- **Main:** Timeline or sport-lane Gantt (phases as bands, races as pins)
- **Side or below:** Upcoming races table

**Must be visible**
Races (name, date, sport, A/B/C, Planned vs Watching, location, goal, prep weeks), phase blocks, non-race events, CRUD.

**Accent:** A-goal races; next race; phases as soft bands.

**Samples**
- A: Full-width Gantt lanes
- B: Timeline vertical + race detail drawer
- C: Table-primary with mini timeline header

---

### 7.11 Results (web)

**Purpose:** Historical results + PBs — tabular comfort.

**Layout**
- Toolbar filters (year, sport, outcome)
- Primary **data table** (sortable)
- PB cards or secondary table
- Add result CTA

**Must be visible:** outcome, time, sport/distance, links to races, manual entry, PB metrics.

**Accent:** PRs / best times.

**Samples**
- A: Dense table + PB strip above
- B: Split results | PBs columns
- C: Year sections with inline sparklines (optional enrichment)

---

### 7.12 Stats (web)

**Purpose:** Trends with real chart space.

**Layout**
- Filter bar (sport, range)
- 1 primary chart full width
- Secondary metric cards in a row
- Avoid dumping 6 charts above the fold

**Accent:** Trend direction; this week vs last.

---

### 7.13 Inbox (web)

**Purpose:** Continuous coaching conversation between athlete and coach.

**Model (locked for redesign)**
- **One main chat per athlete ↔ coach pair** (not a separate thread per workout ask).
- Messages started from a **workout modal** (“Ask coach”) land in that **same main chat**, with the **workout attached** (title, date, distance/duration, sport) as context on the message.
- Workout **feedback** similarly surfaces in the relationship stream with workout details; coaching home expand / inbox show the attachment on the bubble.
- Optional filters (All / Unread / Has workout context) — not separate Ask/Feedback inboxes as primary navigation.

**Preferred layout (desktop)**
```
[ Filters: All / Unread / with workout ]
┌─────────────┬────────────────────────────┐
│ People list │ Main chat + composer       │
│ (~320–400px)│ (bubbles; workout chips)   │
└─────────────┴────────────────────────────┘
```
Coach home may also embed the same chat when an athlete row is expanded.

**Must be visible**
Conversation bubbles, unread, workout context chip when present, composer, coach pending requests, notifications settings entry.

**Accent:** Unread; needs-reply; workout-linked messages.

**Samples**
- A: People list | continuous chat (preferred)
- B: Three-pane only if many athletes need a filter column first
- C: List full-width + chat as right drawer

---

### 7.14 Library (coach, web)

**Purpose:** Browse and schedule templates; pair with Training.

**Layouts to sample**
- **A — Standalone page:** sport tabs + card/table grid + builders
- **B — Docked while Training:** right panel (~280–360px) over week
- **C — Split page:** template list | template preview/structure

**Must be visible**
Sport hubs, template summary metrics, structured vs text, schedule / edit / duplicate / delete, create paths (block / swim / text).

**Accent:** Sport identity; Schedule as primary card action.

---

### 7.15 Tools / Calculators (web)

**Purpose:** Utility; use horizontal space for inputs | results.

**Layout**
- Left/top tabs: Running, Interval, Triathlon, HYROX, Splits
- Two-column: inputs | emphasized results (+ optional schematic)

**Accent:** Result numbers.

---

### 7.16 Profile & Preferences (web)

**Purpose:** Long forms that benefit from sectioned layout.

**Layout**
- Left subnav (Profile | Preferences sections) or vertical section anchors
- Content column ~640–720px for forms; wider for zone tables

**Must include**
Profile identity, roles, coaching code / connect coach, sign-in methods; zones; weather; plan color mode; coach planning lead + builder prefs; Strava; calendar sync.

**Accent:** Save; destructive unlink secondary.

**Samples**
- A: Settings with sticky left subnav
- B: Single page with clear H2 sections
- C: Card sections in 2-column grid for related prefs

---

### 7.17 Deep builders / library routes (web)

Full pages for `/workouts/builder/...`, swim builders, template builders should feel like **focused studio mode**:
- Optional collapse of main app sidebar distraction
- Clear exit back to Library or Training
- Sticky save

---

## 8. Cross-screen patterns unique to web

### Hover
- Week cell hover: show full title / quick actions
- Table row hover: reveal edit/delete
- Do not make hover the **only** path to critical actions (keyboard + click menus required)

### Keyboard
- Esc closes dialogs/drawers
- Enter saves focused forms where natural
- Arrow navigation in week grid is a plus (sample, not mandatory v1)

### Drag and drop
- Visible grab affordance on coach workout chips
- Clear drop targets (day cells highlight)
- Library → calendar drag must feel first-class

### Dialogs vs drawers vs pages
| Content | Prefer |
|---------|--------|
| Confirm delete | Small modal |
| Day note | Small modal |
| Workout detail | Modal or drawer |
| Heavy builder | Full page |
| Inbox thread on narrow | Full page; on wide two-pane |

### Empty states (web-scale)
Use wider illustrations carefully — still one message + one CTA. Cover: empty week, no athletes, empty inbox, empty library, no races, Strava disconnected.

---

## 9. Critical web flows (storyboard)

Same outcomes as mobile; show **desktop frames**.

### Flow W1 — Coach plans Tuesday in context
1. Coach Home → select athlete  
2. Training Week loads  
3. Open Library drawer  
4. Drag “Tempo 8k” onto Tuesday Run  
5. Open detail drawer → tweak notes → Save  
6. Week cell updates; drawer closes  

### Flow W2 — Athlete reviews week on laptop
1. Home → see today  
2. Training Week — scan Mon–Sun  
3. Click Thursday intervals → detail  
4. After training: Mark done + feeling  
5. Optional Ask coach from detail  

### Flow W3 — Inbox on desktop
1. Badge on sidebar Inbox  
2. Two-pane: select unread Ask  
3. Reply + Resolve  
4. Badge updates  

### Flow W4 — Season + Training together
1. Season: place A-race  
2. Jump to Training week of race  
3. Race visible on calendar day  
4. Post-race: Results entry from Home prompt or Results page  

### Flow W5 — Multi-athlete morning (coach)
1. Roster shows 2 planning warnings  
2. Open athlete A → fill week  
3. Switch athlete B via context bar (stay on Training)  
4. Warnings clear as plans fill  

---

## 10. States & badges

Reuse the full catalog from `MOBILE-DESIGN-BRIEF.md` §8. On web:
- Badges can be slightly more labeled (not icon-only) in tables
- Week cells may use compact marks; hover reveals full badge text
- Unread badge on sidebar must remain visible when sidebar is collapsed (dot or count on icon)

---

## 11. Sport identity & tables

- Same 8 sport IDs as mobile  
- Colorblind-safe: icon + color  
- Data tables (Results, roster, PBs): consistent header, sortable columns, numeric alignment, comfortable row height for click  

---

## 12. Density guidelines (web)

| Surface | Density |
|---------|---------|
| Athlete Home | Low–medium |
| Coach roster | Medium–high |
| Training Week | High (scannable) |
| Training List | Medium |
| Workout detail | Medium |
| Builder | High, sectioned |
| Inbox two-pane | Medium |
| Season Gantt | Medium |
| Settings forms | Low–medium |

---

## 13. Motion (web)

1. Sidebar collapse width transition  
2. Library drawer slide  
3. Drag lift/drop on week cells  
4. Dialog present/dismiss  

Keep motion short; no ambient particle backgrounds.

---

## 14. Accessibility & desktop UX

- Focus rings on all interactive controls  
- Skip-to-content for keyboard users  
- Contrast for sport tints on white/light fields  
- Do not rely on color alone for completed vs skipped  
- Click targets in week grid: chips large enough to grab (≥24px height; prefer ≥32px)  
- Collapsed sidebar: tooltips on icon nav  

---

## 15. Deliverables requested (web)

1. **Shell explorations** (3): sidebar treatments + coach context bar  
2. **Training Week hi-fi** at 1440px — with and without Library drawer  
3. **Training List + Month** one frame each  
4. **Coach Home roster** + **Athlete Home**  
5. **Inbox two-pane**  
6. **Season** (Gantt or timeline sample)  
7. **Results table** + PB treatment  
8. **Workout detail** (modal and drawer variants)  
9. **Builder** two-column sample  
10. **Settings** sectioned layout  
11. **Flow storyboards** W1, W2, W5  
12. **Component sheet:** week cell (3 densities), nav item, athlete switcher, warning chip, table row  

Align tokens with mobile UI kit (shared colors, type, badges).

---

## 16. Success criteria (web)

- Coach can plan a week **without opening a separate “library site”** (drawer or dock)  
- Athlete can understand the week in **one screenful** at 1440px  
- Switching athletes does not lose the sense of “where I am” (Training stays Training)  
- Sport / status / unread remain distinct at grid density  
- No capability from the product inventory is desktop-only-hidden or mobile-only-trapped  

---

## 17. Out of scope

- Changing permissions or data model  
- Removing PWA (mobile) concerns from the shared system  
- Designing print layouts unless requested  
- Replacing Training with separate Plan + History products  

---

*End of web layout brief. Pair with `docs/MOBILE-DESIGN-BRIEF.md`. Both describe product behavior and design intent — not a pixel specification of the current implementation.*
