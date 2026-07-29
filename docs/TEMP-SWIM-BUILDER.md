# TEMP: Swim workout builder — how it works

> Temporary notes for UI / process improvements. Safe to delete when done reviewing.

---

## 1. Big picture

Swim create/edit uses the **same shared card editor** as run/bike (`SharedWorkoutEditor`).

| Layer | What it is |
|--------|------------|
| Shell | Sport-colored card: title, subtitle, meters, minutes, workout type |
| Details | Collapsible **Workout Details**: pool/open water + set builder |
| Save | Swim-specific server actions (not the run/bike block `structure` JSON) |

Run/bike put **blocks** (warmup / intervals / cooldown) in details.  
Swim puts **sections → sets** (repeat × distance × stroke) in details.

```
Plan (+) / Library create-edit
        ↓
WorkoutEditorDialog  or  WorkoutEditorPage
        ↓
SharedWorkoutEditor  (sport = SWIM)
        ├─ EditableWorkoutCardShell   ← meters + min
        └─ SwimWorkoutDetailsFields   ← env + SwimWorkoutBuilder
                ↓
        create/updateSwimWorkoutFromModal
     or saveSwimTemplateFromModal
```

---

## 2. Entry points

### Plan (coach)
- Empty sport cell → `WorkoutEditorDialog` with `sport=SWIM`
- Day “+” menu → same dialog
- Tap existing swim card → same dialog in edit mode (`workout` loaded)

### Library
- New template: `/workouts/templates/builder/new?sport=SWIM`
- Edit template: `/workouts/templates/builder/[id]`
- Old `/workouts/swim/builder|*` and `/workouts/swim/templates|*` **redirect** to the shared routes

### Athlete
- Does **not** build. Opens workout → read-only detail card (metrics + planned content). Structure display for swim may still be thinner than run/bike block view.

---

## 3. Coach UI — step by step

### A. Card (always visible)
1. **Title** / **subtitle** (description) — optional Auto once workout type is chosen  
2. **Distance** — primary unit **meters** (not km)  
3. **Duration** — minutes  
4. **Workout type** — session-type dropdown (Easy, Intervals, …)  
5. **Coach notes** — separate field under details  

Blank start: no auto estimates until type is selected **or** details have structure content.

### B. Workout Details (collapsed by default)
Opening it:
1. Initializes default structure if missing: **Warm Up / Main Set / Cool Down**
2. Shows **Pool ↔ Open water** toggle (`swimEnvironment`)
3. Shows **SwimWorkoutBuilder** (sections + sets)

While details are open **and** structure has sets that compute meters:
- Card distance is **driven by structure** (`workoutDistanceMeters`)
- Treated as non-manual / locked-from-details (same idea as run/bike structure lock)

Closing details and saving **without** persisting structure clears `swimStructure` on save (`builderEnabled` / structure null if details closed).

### C. Inside the set builder

**Section panel**
- Collapse / expand  
- Editable title (click to rename)  
- Section distance chip (sum of complete sets)  
- Move ↑↓, duplicate, delete  
- Grip icon is visual only (no drag-and-drop yet)  
- “Add section” + presets from `SWIM_SECTION_PRESETS`

**Set row grid** (desktop-oriented columns)
| × | m | Stroke | Pace | Rest | 🗑 |
|---|---|--------|------|------|---|
| repeats | meters (step 25) | text + datalist options | free text | free text | delete |

Rules:
- A set **counts toward distance** only if **complete**: `repeatCount > 0` **and** `distanceM > 0` **and** stroke non-empty  
- Incomplete-but-started rows get a light amber highlight  
- After a complete/partial last row, an **empty trailing row** is auto-appended for fast entry  
- Stroke suggestions: Free, Back, Breast, Fly, IM, Kick, Pull, Drill, Choice, …

**Distance math**
```
set meters   = repeatCount × distanceM   (only if complete)
section      = sum(sets)
workout      = sum(sections)
```
Duration is **not** derived from sets — coach types minutes on the card.

---

## 4. Data model

### Form (`SwimWorkoutForm`)
| Field | Role |
|--------|------|
| `title`, `description` | Card title / subtitle |
| `swimEnvironment` | `POOL` \| open water enum |
| `plannedDistanceMeters` | Card meters (or from structure) |
| `plannedDuration` | Card minutes |
| `coachNotes` | Coach notes |
| `swimStructure` | `{ version: 1, sections[] }` |
| `builderEnabled` | Whether structure is “on” |

### Structure
```
SwimWorkoutStructure
  sections: SwimSection[]
    title, order
    sets: SwimSet[]
      repeatCount, distanceM, stroke
      targetPace?, rest?, notes?
```

### DB
- **Workout**: `type=SWIM`, `swimEnvironment`, `plannedDistanceMeters`, `plannedDuration`, `swimStructure` JSON, `description`, `coachNotes`  
- **Template**: same swim fields on `WorkoutTemplate`  
- Session type from UI is still largely saved as **`CUSTOM`** on swim modal/template actions (gap vs run/bike)

### Tags
Shared editor can attach approx / primary-metric / duration-unit tags via `buildTags()` (same system as other sports).

---

## 5. Key files

| Path | Role |
|------|------|
| `src/components/workout-editor/shared-workout-editor.tsx` | Orchestration, save, details open |
| `src/components/workout-editor/editable-workout-card-shell.tsx` | Card UI |
| `src/components/swim-workout/swim-workout-details-fields.tsx` | Env + builder slot |
| `src/components/swim-workout/swim-workout-builder.tsx` | Sections / sets grid |
| `src/components/swim-workout/swim-environment-toggle.tsx` | Pool / OW |
| `src/lib/swim-workout/types.ts` | Types |
| `src/lib/swim-workout/calculations.ts` | Complete sets, distances, trailing empty row |
| `src/lib/swim-workout/defaults.ts` | Default form + 3 sections |
| `src/lib/swim-workout/strokes.ts` | Stroke list + section presets |
| `src/lib/swim-workout/form-mappers.ts` | DB ↔ form |
| `src/app/actions/swim-workout.ts` | Create/update workout + template |

Deprecated / redirect-only:
- `src/components/swim-workout/swim-workout-editor.tsx` (empty stub)
- `/workouts/swim/builder/*`, `/workouts/swim/templates/*` → shared builder URLs

---

## 6. Save behavior (coach)

**Plan / scheduled workout**
- `createSwimWorkoutFromModal` / `updateSwimWorkoutFromModal`
- Payload includes env, meters, duration, structure (or null if details off), description, coach notes, optional `templateId`

**Library template**
- `saveSwimTemplateFromModal` (no redirect; page/dialog navigates via `onSaved`)
- Legacy `saveSwimTemplate` wraps it and redirects new templates to `/workouts/templates/builder/[id]`

**Library picker inside editor**
- Swim templates loaded via `getSwimTemplatesForCoach` and mapped into the shared library picker shape

---

## 7. How this differs from run/bike

| | Run / bike | Swim |
|--|------------|------|
| Details content | Block builder (time/distance segments, targets) | Sections of swim sets |
| Distance unit | km | m |
| Structure → metrics | Estimates duration + distance from prefs | **Only distance** from sets |
| Intensity | Pace/power/RPE targets on blocks | Free-text pace + rest on sets |
| Athlete view | Rich phase cards | Weaker / less swim-specific presentation |
| Session type | Persisted | Often forced `CUSTOM` on save |

---

## 8. Process gaps (good places to improve)

### UX / UI
1. **Set grid is desktop-first** — columns squeeze hard on mobile; need stacked or “one set = card” layout  
2. **No real drag-and-drop** for sections (grip is decorative; only ↑↓)  
3. **Pace / rest are free text** — no units, presets (“20s”, “:20”, “easy”), or validation  
4. **Stroke is free text + datalist** — easy typos; no required picklist  
5. **Incomplete sets** — amber hint helps, but easy to leave incomplete rows and under-count meters  
6. **Details optional** — easy to save “2000 m” with no structure; opposite of structured coaching intent  
7. **Duration never auto** — coach must guess time; no pace→time estimate from sets  
8. **Open water vs pool** — only a tag/toggle; no length/course implications in builder  
9. **Section presets** — add section exists, but less guided than run/bike smart blocks / quick start  
10. **Athlete read view** — may not mirror set grid clearly (harder to execute the workout)

### Process / product
11. **Session type UI vs save** — dropdown shown but swim save path often ignores it (`CUSTOM`)  
12. **Two mental modes** — “simple meters swim” vs “full set list” not explicitly chosen  
13. **Template → plan** — scheduling from library should always recompute meters for athlete (confirm end-to-end)  
14. **No set notes in the grid UI** — `notes` exists on type but not edited in the row  
15. **Closing details clears structure on save** — surprising if coach toggles details closed before Save  

### Technical / consistency
16. Shared shell + swim details are good; swim builder chrome still feels like a **spreadsheet**, not the same “block cards” language as run/bike  
17. Old swim routes are redirects only — fine, but bookmarks/docs may still say `/workouts/swim/...`

---

## 9. Suggested improvement themes (for later)

**A. Mobile-first set cards**  
One set per card: repeats, distance, stroke chips, pace, rest — instead of 6-column grid.

**B. Guided build**  
“Simple swim” (distance + duration only) vs “Structured” (forces details open). Or always start with structure for coach library templates.

**C. Smarter metrics**  
Optional: estimate duration from set paces; keep meters auto from structure.

**D. Match run/bike visual language**  
Warm-up / main / cool-down as accented phase rows (like athlete detail cards), sets nested inside.

**E. Persist session type**  
Wire dropdown → `sessionType` on create/update swim workout + template.

**F. Athlete execution view**  
Read-only section/set list with clear “8×100 Free @ … rest 20s” lines.

---

## 10. Quick smoke checklist

- [ ] Plan: add swim → card meters + details sets → save → reopen  
- [ ] Edit: change sets → meters update → save  
- [ ] Save with details closed → structure cleared? (confirm intended)  
- [ ] Library: new swim template → edit → schedule to plan  
- [ ] Mobile width: can you enter a set without horizontal misery?  
- [ ] Athlete: open swim → understand the session without coach help  

---

*End of temp doc.*
