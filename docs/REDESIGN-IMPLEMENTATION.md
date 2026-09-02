# Redesign — Locked screens & implementation order

Status after production pass (Sep 2026). Mock routes live under `/design-mockups/*`.  
Tokens: `docs/REDESIGN-TOKENS.md`. Briefs: `WEB-DESIGN-BRIEF.md`, `MOBILE-DESIGN-BRIEF.md`.

**Production drift note:** Coach **Home** in app (`/dashboard` coach view) is a **command center** (needs attention, activity feed, planning coverage). The mock **Coach Home · Athletes** roster table lives at `/athletes` — treat both as valid; update mocks when consolidating.

---

## 1. Screen lock status

Use this in review: **Locked** = direction approved for production; **Solid** = good enough to build from, small polish OK; **Open** = needs a decision before coding.

### Locked / solid (build from these)

| Screen | Mock | Status | Notes |
|--------|------|--------|-------|
| App shell (gradient sidebar) | `/design-mockups/shell` | Solid | Athlete vs coach nav; Settings in footer |
| Athlete Home | `/athlete-home`, `-mobile` | Solid | Editorial H1; today stack; **activity feed shipped** (see Phase 3) |
| Coach Home · Athletes | `/coach-home`, `-mobile` | Solid | Roster + expand Chat / Feedback / **Zones** — at `/athletes` |
| Coach Home · Command center | *(no dedicated mock)* | Solid | `/dashboard` coach: needs attention + activity feed + sidebar (requests / planning) |
| Training List | `/training-list`, `-mobile` | Solid | Prescription cards |
| Training Week | `/training-week`, `-mobile` | Solid | Matrix; weekend grey; today = red soft (no side rail) |
| Training Month | `/training-month` | Solid | Calendar density |
| Workout cards / detail | `/workout-detail` | Solid | Status + structure |
| Workout create/edit modal | `/workout-builder` | Solid | Closer to production card editor; fixed width |
| Inbox | `/inbox` | Solid | Three-pane + workout split; **coaching requests in thread list + Requests filter** |
| Season | `/season` | Solid | Near production planner |
| Stats (+ Results) | `/stats` | Solid | Trends + PBs + race results |
| Library | `/library` | Solid | Folders, list default, schedule day picker, structure graph; **athlete picker in schedule modal** |
| Settings | `/settings` | Solid | Coach = account only; athlete zones under Athletes |
| Tools · Calculators | `/tools` | **Locked UI** | Production calculators as-is in mock chrome |

### Still open (not blocking v1 shell, decide when touched)

| Topic | Why open |
|-------|----------|
| Empty states pack | Brief asks for empty week / inbox / library / no races — not mocked as a set |
| Auth / marketing landing | Separate surface; invite/onboarding flows hardened in prod but landing not redesigned |
| Full-page deep builder (studio) | Modal is the v1 create/edit path; studio later |
| Library docked panel polish | Exists on Training Week; drag/drop still mock-only |
| Coach zone proposals → athlete notification UX | Modeled in Athletes → Zones; product rules need API/product review |
| Mobile Settings / Library | Desktop-first mocks; mobile variants optional |
| Coach command center mock | Production `/dashboard` coach layout has no 1:1 mock yet |

---

## 2. Product rules captured in mocks (don’t lose these)

1. **Coach Settings ≠ athlete personal settings.** Coach edits own planning/builder prefs only. Athlete zones/weather/plan color stay with the athlete.
2. **Zone adjustments from coach** live under **Athletes → Zones**, require athlete permission; proposals notify the athlete; no silent overwrite.
3. **Library folders** are per-sport topic groups; Schedule opens a day picker with existing plan load visible; coach picks **which athlete** to schedule onto.
4. **Calculators** stay on the current production design; redesign = shell/nav only unless a calc bug is found.
5. **Week chrome:** weekend = cool light grey; today = brand red soft wash (+ red day head); no today side rail.
6. **Inbox coaching requests** appear as first-class inbox rows (red **Request** label), filterable via **Requests (n)**; approve/decline in detail pane — not a separate full-width banner.
7. **Coach invite flow:** `?invite=` persists cookie; after register + Start Training, athlete accepts coach on `/join/.../accept`; session profile flags read from DB (not stale JWT) before accept.

---

## 3. Implementation order (production)

Ship in layers so mockups don’t drift and shared chrome lands once.

### Phase 0 — Foundation · done

- [x] Promote mock tokens (`--tt-*`) into app globals / theme (or map existing tokens → redesign values).
- [x] Fonts: Inter + Bebas Neue as in mock layout.
- [x] App shell: gradient sidebar + role nav parity with mock (athlete / coach).
- [x] Shared table / sort header chrome (`DataSortHeader` + `tt-data-table`) aligned with Season/Stats mocks.

**Exit:** New shell + tokens on quiet pages without rewriting calculators.

### Phase 1 — Training workstation · done

1. Training Week (default web) — matrix, weekend/today, layers, library drawer hook.
   - [x] Weekend wash + today red soft column / red day head (no side rail)
   - [x] Page header (overline + Bebas H1 + subtitle) + labeled Filter / Layers / View / Rows / Cards toolbar
   - [x] Workout cards S/M/L (prescription density, completed/skipped chrome matching mock)
2. Training List — prescription cards + status.
   - [x] Day agenda groups (rounded card, today wash + Today divider)
   - [x] Prescription rows (sport rail, Done/Skipped/Planned, completed green tint)
   - [x] Day weather beside title (Today strip / other days mini; respects showWeather)
3. Training Month — calendar.
   - [x] Weekend wash (`--tt-weekend`) + today wash/ring + date badge
   - [x] Filter / Layers / View / Layout toolbar (1–3m + expand)
   - [x] S/M/L prescription cards (month size preference separate from week)
4. Workout detail modal / drawer.
   - [x] Hybrid: keep intensity graph + stage rows + Message coach; completed metrics with planned under units; token polish
5. Workout create/edit modal (match mock → production editor shape).
   - [x] Hybrid chrome: soft sport hero wash, `--tt-line` card/footer, mock shadow; keep production editor IA
   - [x] Library “New template” opens modal (dark header) instead of full page

**Exit:** Coach can plan a week; athlete can review week/list.

### Phase 2 — Library & scheduling · done

1. Library standalone (sport hubs, folders, list/cards, preview, schedule modal).
   - [x] Unified `/workouts` browser: sport tabs, list (default) / cards, preview pane
   - [x] Schedule day picker modal with month load markers + “already on day”
   - [x] Folders (schema + CRUD + rail UI)
   - [x] Demo seed `scripts/seed-library-demo.ts` (Vytautas Test samples)
   - [x] Home demo seed `scripts/seed-athlete-home-demo.ts` (Vytautas Test: last/this/next week + 5 races)
   - [x] Schedule modal: **athlete picker** + persist selected athlete cookie after schedule
2. Docked library on week (drag later if needed).
   - [x] Dock from calendar edge (float into spare margin / push when tight)
   - [x] Real data + DnD; soft right border when floating
3. Wire schedule → plan day with real data.
   - [x] Schedule modal → `createWorkoutFromTemplate` / `scheduleSwimFromTemplate`

**Exit:** Template → day path works end-to-end.

### Phase 3 — Homes & attention · in progress

1. Athlete Home — visual alignment with `/design-mockups/athlete-home` (real `getAthleteDashboard` data).
   - [x] Soft caption greeting (Log workout quiet)
   - [x] Today: unique Home prescription card (Bebas L, prescription + metric/zone, completion rail) — not week card
   - [x] Upcoming: calendar date + sport + title/prescription rows (mock list card)
   - [x] Right rail: next-races carousel, week stats chrome, training load chart (volume stand-in)
   - [x] **Activity feed** below upcoming: coach-style day groups, sport rail, map/metrics; inline feedback + 1–10 feeling picker on completed/skipped workouts
   - [ ] Real TSS on training load when metric exists
2. Coach Home command center (`/dashboard` coach view).
   - [x] **Needs attention** table (filters, mark handled, action panel)
   - [x] Sidebar: **coaching requests** + planning coverage (or attention action panel when row selected)
   - [x] **Activity feed** (shared card chrome with coach home table rows); grid layout so feed sits under attention (no gap when attention empty but requests exist)
   - [x] Athlete + time range filters
3. Coach Athletes roster (`/athletes`) + **Needs attention** stack (legacy mock path).
   - [x] Unify join signals into attention stack (existing queries)
   - [x] Roster table with attention chips; Open plan
   - [x] Row expand Chat / Feedback where prod already supports it
   - [x] Zones expand: **stub or defer to Phase 5** (permission + notify — no silent overwrite)
4. Attention / underplanned chips tied to real queries.
   - [x] Roster attention chips from needs-reply, under-planned, low compliance

**Exit:** Athlete and coach land on homes that match mock hierarchy; attention is scannable from one place.

### Phase 4 — Season, Stats, Inbox polish · in progress

1. Season shell/tokens pass (structure already production-like).
2. Stats unification (Results folded as in mock).
3. Inbox polish.
   - [x] Three-pane layout + thread list/detail + workout-attached split panel
   - [x] Unread / All / **Requests** filters; coaching requests mixed into thread list with approve/decline detail
   - [ ] Mock parity pass on mobile accordion + empty states
   - [ ] Thread list row polish vs `/design-mockups/inbox`

### Phase 5 — Settings & permissions

1. Athlete Settings (zones, weather, plan display, integrations).
2. Coach Settings (account + planning + builder only).
3. Athlete permission + notification for coach zone proposals.

### Phase 6 — Later / optional

- Empty states.
- Mobile-specific Settings/Library.
- Full-page builder studio.
- Auth / marketing landing redesign.
- Dedicated mock for coach command center home.

**Reliability (shipped, not visual redesign):**

- [x] Coach invite cookie via middleware + join route; register redirect to accept flow
- [x] `getSession()` reads athlete/coach profiles from DB (fixes post–Start Training invite accept)
- [x] Service worker v3: don’t cache `/_next/`; live nav for invite shell; PWA auto-update + stale Server Action reload

**Tools:** Phase 0 shell only — do not redesign calculator internals.

---

## 4. Suggested next production PRs

| Priority | Title idea | Scope |
|----------|------------|--------|
| 1 | `redesign: athlete home activity feed polish` | TSS on training load; feed empty state; mock alignment pass |
| 2 | `redesign: coach command center mock` | Add `/design-mockups/coach-command-center` matching prod `/dashboard` coach |
| 3 | `redesign: inbox empty states` | No threads / no requests / filter-empty copy + mobile polish |
| 4 | `redesign: season + stats token pass` | Shell/tokens only; keep data logic |

**Out of scope until Phase 5:** Zone proposal permission API, calculator internals, full-page builder studio.

---

## 5. How to use mocks while building

- Treat `/design-mockups/<screen>` as the visual contract for that phase.
- If production must diverge, update the mock in the same PR so the studio stays truthful.
- Calculators: compare to `/tools` and `/design-mockups/tools` — only shell differences expected.
- **Coach home:** `/design-mockups/coach-home` = roster at `/athletes`; `/dashboard` coach = command center (document or mock separately).

---

## 6. Review checklist

- [x] Confirm week today/weekend treatment
- [x] Confirm Library list-default + folders + schedule day picker + athlete on schedule
- [ ] Confirm coach Settings scope + Athletes Zones permission story
- [x] Confirm calculators locked (no visual rewrite)
- [x] Phase 0 shell shipped (tokens + sidebar)
- [ ] Agree coach command center vs roster mock naming in docs/studio
- [x] Inbox coaching requests: list rows + Requests filter (not orphan banner)
