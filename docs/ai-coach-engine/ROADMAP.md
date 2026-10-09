# TrainTrack AI Coach Engine — Roadmap

**Status:** Active implementation  
**Sources:** [architecture-v0.1.md](./architecture-v0.1.md), [architecture-v0.2-scientific.md](./architecture-v0.2-scientific.md)

## Goal

A decision engine with an AI adaptation layer that produces quality `TrainingPlan` / `TrainingPlanSession` drafts compatible with TrainTrack. Plans must generate without OpenAI; AI makes them better, not required.

## Pipeline

```
AthleteData → AthleteState → SafetyIntake gate (injury/illness/RED-S/pregnancy/…)
  → GoalDemand → Capability/Gap/Priority
  → LimitingFactors → MethodologySelection → Dose/Budget/Periodization
  → Safety (interference, key session, readiness)
  → WorkoutLibrary → AI adapt → Validator → TrainingPlan
  → Actual response → Learning / Replanning
```

## Stages

| Stage | Name | Status |
|-------|------|--------|
| A | Foundation polish (limiting factors, per-week, confidence, demand) | done |
| B | Methodology selection | done |
| C | Dose / budget / deload / taper | done |
| D | Safety & plan score | done |
| E | Workout library productization | done (DB `CoachEngineWorkout` + Admin CRUD; file seed fallback) |
| F | Learning & replanning | done (calendar replan on skip/complete + plan adapt) |
| G | AI UX / Why-this-plan / adapt contracts | done (Why panel, methodology override, engine adapt) |
| H | Scenario tests + plan audit + capability outcomes | done (`coachEngineAudit` on TrainingPlan; outcome-calibrated capability; edge-case scenario suite) |

## Golden rules (summary)

1. Goal before workout; demands before gaps; priorities before dose; dose before workout.
2. Easy means easy. No blind compensation for missed sessions.
3. Protect key sessions. Hard constraints cannot be overridden by AI.
4. No methodology dogma. Always attach confidence to decisions.
5. Prefer measurable adaptation over impressive workouts.

## Code

Primary package: `src/lib/coach-engine/`  
Entry: `runCoachEngineDraft` / `buildDraftFromCollected`  
UI: `src/components/ai/ai-plan-wizard.tsx`, plan detail “Why this plan?”
