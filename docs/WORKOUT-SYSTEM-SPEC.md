# TrainTrack — Workout System & UI/UX Specification

**Scope:** Design mockups first (`/design-mockups/*`). Source of truth for workout creation, cards, completion, and athlete post-workout experience.

**Core direction:** minimal, editorial, structured, premium, spacious, serious training tool. Do not add UI just because data exists.

---

## 1. Core product principle

Separate **PRESCRIPTION** from **INTELLIGENCE**.

| | |
|---|---|
| **Prescription** | What was prescribed: `10 km · Z2`, `3 × 2 km @ Threshold · 2' recovery` |
| **Intelligence** | What TrainTrack calculates: estimated duration/distance, TSS, block totals |

**KEY RULE:** Cards show prescription. Workout details / modal show intelligence. Do not clutter cards with calculated values.

---

## 2. Workout creation philosophy

- Flow starts with **SPORT** (not Easy / Threshold / VO2 first).
- Example: Create workout → Run → type chosen inside the same interface.
- Avoid separate screens / unnecessary modal hops.
- Simple workouts: extremely fast. Complex: progressively expose power.

## 3. Simple workout creation

Example: Create → Run → Easy Run → Enter **10 km** → Done.

TrainTrack calculates the missing dimension (e.g. ~52 min). One value is prescribed; the other is calculated. UI must make that clear without visual noise.

## 4–8. Complex builder, blocks, intervals, INCLUDE

- Compact block-based builder; can start simple and add structure later.
- Intervals = one coherent structure (reps + work + recovery), not separate Work/Recovery blocks to repeat manually.
- **INCLUDE** = prescribed, position flexible (Anywhere / After warm-up / …). Subtitle under main prescription — **not** a separate card.

## 9. Naming

Concept names (`Threshold Intervals`, `Long Run`), not every parameter in the title.

## 10–12. Data model & completion

Planned workout and external activity stay separate (link, don’t overwrite). Completion % from main prescribed metric.

## 13–16. Cards

- Sport identity = **side rail** only (no colored icon boxes / gradients / intensity charts on cards).
- After completion: rail becomes **green**; fill height ≈ completion %.
- Hierarchy: title → primary prescription → recovery → main metric → INCLUDE line.
- Sizes **XS → XL**: one system, reduce information as size shrinks — don’t redesign.

## 17. Workout diagram on cards

- **Home / List / athlete primary cards:** no intensity charts — structure via typography.
- **Week matrix (coach planning):** compact structure sketch allowed on structured sessions (same silhouette as production week cards) for scan density.

## 18–19. Detail modal (before completion)

More detail than the card: prescribed + estimated, structure as text, INCLUDE, targets, notes, estimated load. Not a science dashboard.

## 20–24. Post-workout athlete experience

Answer: “Did I do what I was supposed to do?”

**Header** · title · ✓ Completed  
**Main result** · distance · time · pace  
**Route** · large clean map  
**Plan → Done** · compact  
**Not by default:** splits, HR/cadence graphs, TSS breakdowns  

Coach gets deeper analysis; athlete stays simple.

## 25–27. End-to-end examples

Easy Run / Threshold / Long Run + INCLUDE — see product brief history; cards stay prescription-first; completion green rail on main metric.

## 28. Implementation priority (product)

1. Data model → 2. Sport-first create → 3. Simple create → 4. Block builder → 5. Auto calc → 6. Cards XS–XL → 7. Planned→completed → 8. Strava match → 9. Athlete post-workout + map → 10. Coach analytics last.

## 29. Final hierarchy

| Surface | Answers |
|---|---|
| **Card** | What do I need to do? |
| **Workout modal** | How is it structured / how long? |
| **Completed athlete modal** | What did I actually do? |
| **Coach analysis** | How well was it executed? |
