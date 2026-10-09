# TrainTrack AI Coach Engine --- End-to-End Architecture Blueprint

**Status:** Draft v0.1\
**Purpose:** Define how TrainTrack collects athlete data, calculates
deterministic state, calls AI models, validates AI output, generates a
training plan, and continuously replans it.

------------------------------------------------------------------------

# 1. The Core Idea

TrainTrack should **not** work like:

``` text
Athlete data → ChatGPT → Training plan
```

That approach gives the AI too much responsibility and makes the output
difficult to validate.

Instead:

``` text
Athlete Data
    ↓
TrainTrack Data Layer
    ↓
Current Athlete State
    ↓
Goal & Race Demand Model
    ↓
Gap Analysis
    ↓
Training Priorities
    ↓
Training Capacity
    ↓
Plan Architecture
    ↓
Workout Selection
    ↓
AI Reasoning / Adaptation
    ↓
Validation
    ↓
Final Plan
    ↓
Athlete
    ↓
Workout Result
    ↓
Updated Athlete State
    ↓
Replanning
```

The key principle is:

> **TrainTrack is a decision engine with AI capabilities, not an AI
> workout generator.**

------------------------------------------------------------------------

# 2. High-Level System Architecture

``` mermaid
flowchart TD
    A[Athlete Data Sources] --> B[TrainTrack Data Layer]

    B --> C[Athlete State Engine]

    D[Goal / Race Selection] --> E[Goal Model]
    E --> F[Race Demand Profile]

    C --> G[Capability Engine]
    F --> H[Gap Analysis]
    G --> H

    H --> I[Priority Engine]
    C --> I

    I --> J[Training Capacity Engine]
    C --> J

    J --> K[Periodization Engine]
    I --> K

    K --> L[Weekly Planning Engine]
    L --> M[Workout Library]

    M --> N[Workout Selection / Adaptation]
    N --> O[AI Coach Call]

    O --> P[Plan Validation]
    P --> Q{Valid?}

    Q -->|No| R[Fix / Regenerate]
    R --> N

    Q -->|Yes| S[Final Training Plan]
    S --> T[TrainTrack UI]

    T --> U[Athlete Feedback]
    U --> B
```

------------------------------------------------------------------------

# 3. What Belongs to TrainTrack vs AI

This distinction is critical.

## 3.1 Deterministic TrainTrack Engine

TrainTrack code should own:

-   athlete data normalization;
-   training history;
-   current load;
-   mechanical load;
-   capability calculations;
-   goal demand profiles;
-   gap calculations;
-   hard constraints;
-   training capacity;
-   progression limits;
-   periodization boundaries;
-   schedule availability;
-   workout metadata;
-   plan validation.

These calculations should be reproducible.

If the same athlete state is supplied twice, the deterministic layer
should produce the same result.

------------------------------------------------------------------------

## 3.2 AI Model Responsibilities

AI should primarily handle:

-   reasoning over structured data;
-   selecting between valid options;
-   adapting a valid workout;
-   interpreting ambiguous athlete feedback;
-   explaining why a plan was selected;
-   identifying possible conflicts that should be sent back to
    deterministic validation;
-   generating human-readable coaching communication.

AI should **not** be the source of truth for:

-   injury restrictions;
-   hard limits;
-   load calculations;
-   progression limits;
-   maximum sessions;
-   safety constraints;
-   raw capability scores.

------------------------------------------------------------------------

# 4. End-to-End Planning Flow

The complete planning process can be thought of as 12 stages.

``` text
01. Collect Data
       ↓
02. Build Athlete State
       ↓
03. Define Goal
       ↓
04. Build Race Demand Profile
       ↓
05. Calculate Capabilities
       ↓
06. Run Gap Analysis
       ↓
07. Select Training Priorities
       ↓
08. Calculate Training Capacity
       ↓
09. Build Training Architecture
       ↓
10. Select & Adapt Workouts
       ↓
11. Validate Plan
       ↓
12. Explain & Deliver Plan
```

The plan then enters a feedback loop:

``` text
Plan
 ↓
Workout Completed
 ↓
Actual Data
 ↓
Updated Athlete State
 ↓
Recalculate
 ↓
Replan
```

------------------------------------------------------------------------

# 5. Stage 01 --- Collect Athlete Data

## Purpose

Gather all information available to TrainTrack before making a planning
decision.

## Possible sources

``` text
Manual athlete profile
Strava
Garmin
Apple Health
Intervals.icu
TrainingPeaks
Workout completion data
Race results
Sleep data
HRV
Resting HR
Athlete questionnaire
Injury / restriction information
```

## Example input

``` json
{
  "profile": {},
  "training_history": [],
  "activities": [],
  "races": [],
  "recovery": {},
  "health": {},
  "availability": {}
}
```

## No AI call required

This stage should be deterministic.

------------------------------------------------------------------------

# 6. Stage 02 --- Build Current Athlete State

## Purpose

Transform raw data into a normalized snapshot.

``` text
Raw Data
   ↓
Normalization
   ↓
Current Athlete State
```

## Example

``` json
{
  "training_load": {
    "cardiovascular": 62,
    "muscular": 48,
    "mechanical": 55
  },
  "readiness": {
    "score": 0.78,
    "confidence": 0.86
  },
  "recent_volume": {
    "running_km": 52
  },
  "performance_trend": {
    "running": "stable"
  }
}
```

## AI call?

**No.**

This should be deterministic.

------------------------------------------------------------------------

# 7. Stage 03 --- Define the Goal

The goal can come from:

-   athlete input;
-   coach input;
-   existing season plan.

Example:

``` json
{
  "sport": "running",
  "type": "race",
  "race": {
    "name": "Marathon",
    "date": "2027-04-18",
    "priority": "A"
  },
  "target": {
    "type": "time",
    "value_seconds": 9600
  }
}
```

## AI call?

Usually **no**.

If the athlete enters an ambiguous natural-language goal such as:

> "I want to get much better at running and maybe race a marathon in
> spring."

then AI can be used to convert the request into a structured goal
candidate.

Example AI call:

``` text
SYSTEM:
Convert the athlete's natural-language goal into a structured goal.

USER:
"I want to improve my marathon performance next spring."

Return:
- sport
- goal type
- likely race distance
- missing information
- confidence
```

The result must then be confirmed or completed by the application.

------------------------------------------------------------------------

# 8. Stage 04 --- Build Race Demand Profile

TrainTrack needs a structured representation of what the goal requires.

Example:

``` json
{
  "goal": "marathon",
  "demands": {
    "aerobic_capacity": 0.90,
    "threshold": 0.85,
    "aerobic_durability": 0.95,
    "running_economy": 0.80,
    "long_run_tolerance": 0.95,
    "speed": 0.40,
    "max_strength": 0.30
  }
}
```

## Where does this data come from?

Preferably:

``` text
TrainTrack Goal Library
```

not an AI call every time.

The demand profile should be versioned and maintained by TrainTrack.

Example:

``` text
MARATHON_DEMAND_PROFILE_V1
HYROX_DEMAND_PROFILE_V1
10K_DEMAND_PROFILE_V1
TRIATHLON_OLYMPIC_DEMAND_PROFILE_V1
```

## AI call?

**No by default.**

AI may be used offline during development to help create or review new
demand profiles, but production planning should use the stored profile.

------------------------------------------------------------------------

# 9. Stage 05 --- Capability Engine

This converts athlete data into standardized capabilities.

Example:

``` json
{
  "capabilities": {
    "aerobic_capacity": 0.88,
    "threshold": 0.72,
    "aerobic_durability": 0.68,
    "running_economy": 0.76,
    "long_run_tolerance": 0.70,
    "speed": 0.82,
    "max_strength": 0.65
  }
}
```

## Important

These scores should not simply be generated by an LLM.

Each capability needs a calculation model.

Example:

``` text
Threshold Score
=
recent threshold performance
+
race performance
+
HR response
+
RPE response
+
training consistency
```

The exact formula will be defined separately.

## AI call?

**No by default.**

------------------------------------------------------------------------

# 10. Stage 06 --- Gap Analysis

Now TrainTrack can compare:

``` text
Athlete Capability
        vs
Goal Demand
```

Basic formula:

``` text
Gap = Goal Demand - Athlete Capability
```

Example:

  Capability             Goal Demand   Athlete    Gap
  -------------------- ------------- --------- ------
  Aerobic Capacity              0.90      0.88   0.02
  Threshold                     0.85      0.72   0.13
  Aerobic Durability            0.95      0.68   0.27
  Running Economy               0.80      0.76   0.04
  Long Run Tolerance            0.95      0.70   0.25

## AI call?

**No.**

This is a deterministic calculation.

------------------------------------------------------------------------

# 11. Stage 07 --- Priority Engine

Gap alone is not enough.

A large gap does not automatically mean that the capability should be
trained immediately.

Proposed model:

``` text
Priority Score =
Gap
× Demand Importance
× Phase Relevance
× Trainability
× Time Relevance
× Readiness Compatibility
```

Example:

``` json
{
  "primary": {
    "adaptation": "aerobic_durability",
    "score": 0.84
  },
  "secondary": [
    {
      "adaptation": "long_run_tolerance",
      "score": 0.77
    },
    {
      "adaptation": "threshold",
      "score": 0.71
    }
  ]
}
```

Rules:

``` text
1 primary adaptation
maximum 2 secondary adaptations
everything else = maintenance
```

## AI call?

**Optional.**

The initial ranking should be deterministic.

AI can later be asked to review close or ambiguous priorities.

Example:

``` text
AI REVIEW CALL

Two adaptations have nearly identical priority scores.
Review:
- current phase
- athlete history
- recent performance
- training compatibility

Recommend which should receive primary emphasis.

Do not violate hard constraints.
```

The AI response is advisory and must be validated.

------------------------------------------------------------------------

# 12. Stage 08 --- Training Capacity Engine

Before selecting workouts, TrainTrack determines:

> How much additional training stress can this athlete reasonably
> absorb?

Inputs:

``` text
Current load
Recent load trend
Readiness
Recovery
Training consistency
Recent progression
Mechanical load
Available time
Recent hard sessions
Injury restrictions
```

Output:

``` json
{
  "weekly_capacity": {
    "overall": 100,
    "cardiovascular": 85,
    "muscular": 72,
    "mechanical": 60
  },
  "remaining_capacity": {
    "overall": 28,
    "mechanical": 18
  }
}
```

## AI call?

**No.**

------------------------------------------------------------------------

# 13. Stage 09 --- Periodization Engine

Inputs:

``` text
Goal
Race date
Current phase
Current athlete state
Primary priority
Secondary priorities
Training capacity
```

Output:

``` json
{
  "phase": "specific",
  "phase_goal": "race_specific_endurance",
  "weeks_to_race": 8,
  "current_week": 3,
  "week_objectives": [
    "increase race-specific endurance",
    "maintain threshold",
    "maintain strength"
  ]
}
```

## AI call?

Normally **no**.

The deterministic engine should establish the boundaries.

AI may later help choose the best expression of the phase.

------------------------------------------------------------------------

# 14. Stage 10 --- Weekly Planning Engine

Now TrainTrack decides:

``` text
How many sessions?
Which days?
Which primary stimuli?
Where are hard sessions?
Where is the long session?
Where are recovery days?
```

Example:

``` text
Monday    Easy
Tuesday   Threshold
Wednesday Recovery
Thursday  Strength
Friday    Easy
Saturday  Long Run
Sunday    Rest
```

This stage uses:

-   athlete availability;
-   hard-session rules;
-   training capacity;
-   phase;
-   priorities;
-   sport interference;
-   recovery requirements.

## AI call?

Not required.

The application can create valid weekly slots deterministically.

------------------------------------------------------------------------

# 15. Stage 11 --- Workout Selection

Now the system knows:

``` text
Tuesday:
Primary adaptation = threshold
Available time = 75 min
Mechanical capacity = medium
Current fatigue = low
```

It searches the Workout Library.

``` text
Candidate A
Candidate B
Candidate C
Candidate D
```

Each candidate has metadata:

``` json
{
  "id": "RUN_THRESHOLD_01",
  "primary_adaptation": "threshold",
  "duration": 70,
  "cardiovascular_load": "high",
  "muscular_load": "medium",
  "mechanical_load": "medium",
  "difficulty": "medium_high"
}
```

------------------------------------------------------------------------

# 16. Stage 12 --- AI Workout Adaptation Call

This is where an AI call becomes highly useful.

Instead of asking:

> "Create a workout."

TrainTrack asks:

> "Adapt one of these validated workouts to this athlete."

## AI input

``` json
{
  "athlete_state": {},
  "goal": {},
  "phase": {},
  "priority": {
    "primary": "threshold"
  },
  "constraints": {},
  "candidate_workouts": [
    {},
    {},
    {}
  ]
}
```

## Prompt concept

``` text
You are the TrainTrack coaching reasoning layer.

Select and adapt the best candidate workout.

You MUST:
- preserve the primary adaptation;
- respect all hard constraints;
- remain within the available training capacity;
- not invent unsupported physiological claims;
- not create a fundamentally different workout unless explicitly allowed.

Return structured JSON.
```

## AI output

``` json
{
  "selected_workout": "RUN_THRESHOLD_01",
  "adaptations": {
    "interval_count": 4,
    "interval_duration_min": 8,
    "recovery_min": 2
  },
  "reason": "..."
}
```

------------------------------------------------------------------------

# 17. Stage 13 --- Plan Validation

The AI response is **not trusted automatically**.

It goes through validation.

``` text
AI Output
   ↓
Constraint Validator
   ↓
Load Validator
   ↓
Progression Validator
   ↓
Schedule Validator
   ↓
Goal Alignment Validator
```

Example:

``` json
{
  "valid": false,
  "errors": [
    {
      "type": "MECHANICAL_LOAD",
      "message": "Selected workout exceeds current mechanical capacity."
    }
  ]
}
```

------------------------------------------------------------------------

# 18. What Happens if Validation Fails?

Never simply show the athlete the invalid plan.

Flow:

``` text
AI Output
    ↓
Validation
    ↓
INVALID
    ↓
Identify exact failure
    ↓
Return failure + valid alternatives to AI
    ↓
AI adapts
    ↓
Validation again
```

Example:

``` text
Attempt 1:
5 × 10 min threshold

Validation:
FAIL — mechanical load too high

Attempt 2:
4 × 8 min threshold

Validation:
PASS
```

Maximum regeneration attempts should be limited.

For example:

``` text
MAX_AI_RETRIES = 2
```

If all attempts fail:

``` text
Fallback:
Use deterministic safe workout from library.
```

------------------------------------------------------------------------

# 19. Stage 14 --- Final Plan

Only after validation does TrainTrack create the athlete-facing plan.

Example:

``` json
{
  "date": "2027-02-09",
  "workout": {
    "type": "run",
    "name": "Threshold Intervals",
    "duration_min": 65,
    "structure": []
  },
  "primary_adaptation": "threshold",
  "load": {
    "cardiovascular": 24,
    "muscular": 15,
    "mechanical": 13
  },
  "why": "Build threshold durability while keeping weekly mechanical load within the current tolerance.",
  "expected_adaptation": "Improved ability to sustain high aerobic output."
}
```

------------------------------------------------------------------------

# 20. Athlete-Facing Explanation

The UI should not expose the entire internal reasoning chain.

Instead show:

### This week's focus

**Aerobic durability**

### Why

Your current marathon demand profile shows a larger durability gap than
your aerobic capacity or speed.

### Key sessions

-   Tuesday --- Threshold
-   Saturday --- Long Run

### Load

**82 / 100 planned capacity**

### Risk

**Moderate mechanical load**

### Expected adaptation

**Improved ability to maintain pace under accumulated fatigue.**

------------------------------------------------------------------------

# 21. Post-Workout Flow

After the athlete completes a workout, TrainTrack receives:

``` text
Planned Workout
+
Actual Workout
+
Athlete Feedback
```

Example:

``` json
{
  "planned": {
    "duration": 65,
    "target_rpe": 7
  },
  "actual": {
    "duration": 67,
    "rpe": 8.5,
    "pace": "...",
    "hr": "...",
    "completion": 1.0
  },
  "feedback": {
    "fatigue": 0.7,
    "pain": 0.0
  }
}
```

------------------------------------------------------------------------

# 22. Post-Workout AI Call

Not every completed workout needs an AI call.

Most post-workout calculations should be deterministic.

AI should be called when interpretation is useful.

Examples:

-   workout significantly underperformed;
-   athlete reports unusual fatigue;
-   athlete reports pain;
-   performance differs substantially from expected;
-   athlete provides free-text feedback;
-   multiple signals conflict.

Example:

``` text
Athlete:
"Legs felt completely dead today. Pace was fine but RPE was much higher than normal."
```

AI can classify:

``` json
{
  "interpretation": "possible muscular fatigue",
  "confidence": 0.81,
  "recommended_action": "reduce next hard lower-body stimulus"
}
```

This recommendation then goes through TrainTrack rules.

------------------------------------------------------------------------

# 23. Dynamic Replanning

After each meaningful update:

``` text
Actual Workout
      ↓
Updated Athlete State
      ↓
Updated Load
      ↓
Updated Readiness
      ↓
Updated Capability Evidence
      ↓
Remaining Weekly Capacity
      ↓
Recalculate Priorities
      ↓
Recalculate Remaining Week
```

The system does **not** simply move missed workouts.

------------------------------------------------------------------------

# 24. Example: Missed Workout

Planned:

``` text
Tuesday — Threshold
Thursday — Strength
Saturday — Long Run
```

Tuesday is missed.

Bad system:

``` text
Move threshold to Wednesday.
```

TrainTrack:

``` text
Why was it missed?
Current fatigue?
Remaining capacity?
Importance of threshold?
Distance to long run?
Current phase?
```

Possible result:

``` text
Wednesday — Easy
Thursday — Strength
Saturday — Long Run
```

Threshold stimulus may be recovered next week.

Or:

``` text
Wednesday — Threshold, reduced volume
Thursday — Recovery
Saturday — Long Run
```

The decision depends on the athlete state.

------------------------------------------------------------------------

# 25. Example: Athlete Overperforms

Plan:

``` text
50 km running
```

Actual:

``` text
63 km
```

TrainTrack should not automatically say:

> Great! Increase to 69 km.

It evaluates:

``` text
Why did volume increase?
Was it intentional?
RPE?
Pain?
Mechanical load?
Performance?
Fatigue?
```

Possible result:

``` text
Keep next week's running volume stable.
Do not reward uncontrolled extra volume with further progression.
```

------------------------------------------------------------------------

# 26. Example: Athlete Has Low Readiness

Planned:

``` text
VO2max intervals
```

Current:

``` text
Sleep poor
HRV down
RHR elevated
Fatigue high
```

TrainTrack evaluates alternatives:

``` text
Option A: Cancel
Option B: Reduce volume
Option C: Easy aerobic
Option D: Recovery
```

The system selects based on:

-   goal;
-   phase;
-   recent load;
-   remaining stimulus;
-   severity of readiness decline;
-   injury status.

------------------------------------------------------------------------

# 27. Where AI Calls Exist

The production system should deliberately use **fewer AI calls than a
naive architecture**.

### Call 1 --- Goal Interpretation

Only when athlete goal is ambiguous.

``` text
Natural language goal
→ Structured goal candidate
```

### Call 2 --- Priority Review

Only when deterministic priority scores are close or ambiguous.

``` text
Gap Analysis
→ AI reviews competing priorities
```

### Call 3 --- Workout Adaptation

Main recurring planning AI call.

``` text
Valid candidate workouts
→ AI selects/adapts best option
```

### Call 4 --- Explanation

Can be combined with Call 3.

``` text
Final validated plan
→ Human-readable coaching explanation
```

### Call 5 --- Feedback Interpretation

Only when athlete free-text or conflicting data needs interpretation.

``` text
Workout data + athlete feedback
→ AI interpretation
```

### Call 6 --- Replanning Review

Optional for complex cases.

``` text
Updated athlete state
→ AI reviews major changes
```

Most simple replanning can remain deterministic.

------------------------------------------------------------------------

# 28. Recommended AI Call Architecture

``` mermaid
flowchart LR
    A[TrainTrack State] --> B{Does AI add value?}

    B -->|No| C[Deterministic Engine]
    B -->|Yes| D[AI Call]

    D --> E[Structured JSON]
    E --> F[Validator]

    C --> F

    F --> G{Valid?}
    G -->|Yes| H[Continue]
    G -->|No| I[Repair / Retry]
    I --> D
```

The key principle:

> **Never call AI just because AI can do something. Call AI when
> interpretation or flexible reasoning adds value.**

------------------------------------------------------------------------

# 29. Complete Planning Sequence

``` mermaid
sequenceDiagram
    participant UI as TrainTrack UI
    participant API as TrainTrack API
    participant STATE as Athlete State Engine
    participant GOAL as Goal Engine
    participant GAP as Gap/Capability Engine
    participant CAP as Capacity Engine
    participant PLAN as Planning Engine
    participant LIB as Workout Library
    participant AI as AI Coach
    participant VAL as Validator

    UI->>API: Generate training plan
    API->>STATE: Build current athlete state
    STATE-->>API: AthleteState

    API->>GOAL: Resolve goal
    GOAL-->>API: GoalProfile + RaceDemandProfile

    API->>GAP: Calculate capabilities and gaps
    GAP-->>API: CapabilityProfile + GapAnalysis

    API->>CAP: Calculate training capacity
    CAP-->>API: CapacityProfile

    API->>PLAN: Build weekly architecture
    PLAN-->>API: Training slots + priorities

    API->>LIB: Find valid workout candidates
    LIB-->>API: Candidate workouts

    API->>AI: Select/adapt candidate workouts
    AI-->>API: Structured workout proposal

    API->>VAL: Validate proposal
    VAL-->>API: Validation result

    alt Invalid
        API->>AI: Fix proposal using validation errors
        AI-->>API: Revised proposal
        API->>VAL: Validate again
    end

    VAL-->>API: Valid plan
    API-->>UI: Final training plan
```

------------------------------------------------------------------------

# 30. Post-Workout Sequence

``` mermaid
sequenceDiagram
    participant ATH as Athlete
    participant UI as TrainTrack UI
    participant API as TrainTrack API
    participant STATE as State Engine
    participant LOAD as Load Engine
    participant AI as AI Coach
    participant PLAN as Replanning Engine
    participant VAL as Validator

    ATH->>UI: Complete workout
    UI->>API: Workout + metrics + feedback

    API->>LOAD: Calculate actual load
    LOAD-->>API: Load result

    API->>STATE: Update athlete state
    STATE-->>API: Updated AthleteState

    alt Ambiguous / unusual feedback
        API->>AI: Interpret athlete feedback
        AI-->>API: Structured interpretation
    end

    API->>PLAN: Recalculate remaining plan
    PLAN-->>API: Updated plan

    API->>VAL: Validate updated plan
    VAL-->>API: Validation result

    API-->>UI: Updated training plan
```

------------------------------------------------------------------------

# 31. Data Flow Summary

  ------------------------------------------------------------------------------------
  Stage           Input             Processing     Output               AI?
  --------------- ----------------- -------------- -------------------- --------------
  Data Collection Activities,       Normalize      Raw normalized data  No
                  profile, recovery                                     

  Athlete State   Raw data          Calculate      AthleteState         No
                                    current state                       

  Goal            Athlete goal      Structure      GoalProfile          Sometimes

  Race Demand     Goal              Lookup profile DemandProfile        No

  Capability      AthleteState      Calculate      CapabilityProfile    No
                                    capabilities                        

  Gap Analysis    Capability +      Calculate gaps GapAnalysis          No
                  Demand                                                

  Priorities      Gaps + phase +    Score          PriorityProfile      Optional
                  readiness         priorities                          

  Capacity        Load +            Calculate      CapacityProfile      No
                  readiness +       capacity                            
                  history                                               

  Periodization   Goal + race       Select phase   PhaseProfile         No
                  date + state                                          

  Weekly Planning Priorities +      Schedule       WeeklyArchitecture   No
                  capacity          stimuli                             

  Workout         Architecture +    Filter         CandidateWorkouts    No
  Selection       library           candidates                          

  Workout         Candidates +      Select/adapt   WorkoutProposal      Yes
  Adaptation      athlete state                                         

  Validation      WorkoutProposal   Check rules    Valid/Invalid        No

  Explanation     Valid plan        Explain        Athlete-facing copy  Yes / combined

  Post-workout    Actual data       Update state   UpdatedState         Sometimes

  Replanning      UpdatedState      Recalculate    UpdatedPlan          Optional
  ------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 32. The Golden Rule

The complete architecture can be summarized as:

``` text
                    DATA
                      ↓
              DETERMINISTIC STATE
                      ↓
                 GOAL DEMANDS
                      ↓
              CAPABILITY ANALYSIS
                      ↓
                 GAP ANALYSIS
                      ↓
               PRIORITY ENGINE
                      ↓
             CAPACITY / LOAD
                      ↓
              PLAN ARCHITECTURE
                      ↓
              WORKOUT LIBRARY
                      ↓
                    AI
                      ↓
                 VALIDATOR
                      ↓
                FINAL PLAN
                      ↓
                  ATHLETE
                      ↓
               ACTUAL DATA
                      ↓
                REPLANNING
```

And the most important boundary is:

``` text
┌──────────────────────────────────────────┐
│          DETERMINISTIC TRAINTRACK        │
│                                          │
│ State • Load • Capacity • Constraints    │
│ Gaps • Priorities • Validation           │
│                                          │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│                AI COACH                  │
│                                          │
│ Reason • Select • Adapt • Explain        │
│ Interpret ambiguous feedback             │
│                                          │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│             VALIDATION LAYER             │
│                                          │
│ AI output is never trusted automatically │
└──────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 33. Recommended Development Order

Do not build the AI calls first.

Build in this order:

``` text
Phase 1
AthleteState
        ↓
GoalProfile
        ↓
RaceDemandProfile

Phase 2
Capability Engine
        ↓
Gap Analysis
        ↓
Priority Engine

Phase 3
Load Engine
        ↓
Capacity Engine
        ↓
Constraint Engine

Phase 4
Workout Library
        ↓
Weekly Planner
        ↓
Workout Selection

Phase 5
AI Coach Call
        ↓
AI Adaptation
        ↓
Validation

Phase 6
Dynamic Replanning

Phase 7
Athlete-facing explanations
```

This means TrainTrack should be able to produce a **valid plan even if
the AI service is temporarily unavailable**.

The AI makes the system smarter and more flexible; it should not make
the entire coaching engine collapse.

------------------------------------------------------------------------

# 34. Next Technical Documents

After this architecture blueprint, the next documents/modules should be:

1.  `athlete-state-schema.md`
2.  `goal-profile-schema.md`
3.  `race-demand-taxonomy.md`
4.  `capability-taxonomy.md`
5.  `capability-scoring-engine.md`
6.  `gap-analysis-engine.md`
7.  `priority-engine.md`
8.  `training-load-engine.md`
9.  `training-capacity-engine.md`
10. `constraint-engine.md`
11. `workout-library-schema.md`
12. `weekly-planning-engine.md`
13. `ai-coach-contract.md`
14. `plan-validation-engine.md`
15. `dynamic-replanning-engine.md`
16. `example-planning-scenarios.md`

These documents together would become the actual **TrainTrack AI
Coaching Specification**.

------------------------------------------------------------------------

# 35. Product-Level Principle

TrainTrack should never ask:

> **"What workout should I give this athlete?"**

It should ask, in order:

> **"What is the athlete trying to achieve?"**

> **"What does that goal require?"**

> **"What can the athlete currently do?"**

> **"What is limiting performance?"**

> **"What adaptation matters most right now?"**

> **"How much training can the athlete absorb?"**

> **"What is the safest and most effective way to provide that
> stimulus?"**

> **"Did the athlete respond as expected?"**

> **"What should change next?"**

That sequence is the core of the TrainTrack coaching engine.
