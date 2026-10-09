# TrainTrack AI Coach Engine v0.2

## Scientific Planning, Model Selection & Safety Architecture

**Status:** Architecture proposal\
**Language:** English\
**Purpose:** Define a robust AI-assisted endurance coaching engine that
selects an appropriate training methodology, generates a scientifically
coherent plan, protects the athlete from excessive or conflicting load,
and continuously learns from training response.

------------------------------------------------------------------------

# 1. Product Principle

> **TrainTrack AI is a decision engine, not a workout generator.**

The system should not start with:

`"What workout should I give today?"`

It should start with:

`Goal → Demands → Athlete State → Capabilities → Gaps → Limiting Factors → Adaptation Priorities → Training Model → Dose → Workout → Expected Response → Actual Response → Learning`

The plan is therefore not a static document.

> **The plan is a continuously updated model of the athlete.**

------------------------------------------------------------------------

# 2. Scientific Planning Philosophy

TrainTrack should combine:

-   established endurance training science;
-   periodization principles;
-   individual athlete response;
-   sport-specific demands;
-   training history;
-   mechanical and physiological load;
-   recovery/readiness;
-   race specificity;
-   coach-style decision rules;
-   controlled experimentation.

The engine must explicitly avoid treating one methodology as universally
superior.

Current evidence suggests that pyramidal, polarized and
threshold-oriented distributions can all be effective in different
contexts. Reviews of elite endurance athletes show that pyramidal and
polarized distributions are both common, while more recent reviews
emphasize sport, phase, objective and individual variability when
selecting a model.

Therefore:

> **TrainTrack should select a methodology --- not assume one.**

------------------------------------------------------------------------

# 3. Supported Training Models

The engine should support at least these planning models.

## 3.1 Pyramidal

Typical structure:

-   large amount of low intensity;
-   moderate amount of threshold / sub-threshold work;
-   smaller amount of high intensity.

Best candidates:

-   general preparation;
-   aerobic development;
-   high-volume endurance athletes;
-   athletes who tolerate moderate threshold work well;
-   long-distance events;
-   periods where sustainable volume is the main objective.

Default status:

`DEFAULT_CANDIDATE`

Not a universal rule.

------------------------------------------------------------------------

## 3.2 Polarized

Typical structure:

-   very large low-intensity volume;
-   small amount of very high intensity;
-   limited threshold work.

Best candidates:

-   highly trained endurance athletes;
-   aerobic-power development;
-   selected build phases;
-   athletes responding well to high-intensity work;
-   situations where reducing moderate-intensity accumulation is useful.

Important:

The engine must not interpret "polarized" as simply "easy + hard every
day".

------------------------------------------------------------------------

## 3.3 Threshold-Oriented

Typical structure:

-   substantial controlled threshold / sub-threshold work;
-   large low-intensity base;
-   limited truly high-intensity work.

Best candidates:

-   specific phases;
-   athletes with strong recovery capacity;
-   sports/events where sustained threshold performance is highly
    relevant;
-   advanced athletes using controlled threshold methods.

The model should require stronger evidence of tolerance than a generic
recreational plan.

------------------------------------------------------------------------

## 3.4 Race-Specific / Specific Endurance

This is not primarily an intensity-distribution model.

It is a **specificity strategy**.

It becomes increasingly relevant as competition approaches.

Examples:

-   marathon pace blocks;
-   long race-specific intervals;
-   HYROX compromised running;
-   cycling race-power blocks;
-   swimming race-pace sets;
-   race fueling practice;
-   terrain/equipment/transition simulation.

Specificity should rise as race proximity increases, but only if the
athlete has sufficient general capacity.

------------------------------------------------------------------------

## 3.5 Block / Concentrated Emphasis

Used selectively.

The engine may temporarily emphasize one adaptation while maintaining
others.

Examples:

-   aerobic power block;
-   strength block;
-   threshold block;
-   running economy block;
-   race-specific block.

Block training must have an explicit reason and exit condition.

------------------------------------------------------------------------

# 4. Methodology Selection Engine

This is one of the most important components of TrainTrack.

The AI should NOT decide:

> "I like Norwegian training, so use Norwegian."

Instead:

> "Given the athlete, goal, phase, history and response, which
> methodology has the highest expected benefit at acceptable cost?"

## 4.1 Candidate Models

For every planning cycle:

``` text
Candidate Models
    ↓
Pyramidal
Polarized
Threshold-Oriented
Specific-Endurance
Block / Concentrated
Hybrid
    ↓
Evaluate
    ↓
Select
    ↓
Explain
```

------------------------------------------------------------------------

# 5. Method Selection Score

Each candidate model receives a score.

Conceptual model:

``` text
Model Score =
Goal Fit
× Athlete Fit
× Phase Fit
× Sport Fit
× Response Fit
× Recovery Fit
× Time Fit
× Data Confidence
-
Risk Penalty
-
Interference Penalty
-
Complexity Penalty
```

This should NOT be implemented as a simplistic single multiplication at
first.

A better implementation is a weighted decision matrix.

Example:

  Factor                           Weight
  ------------------------------ --------
  Goal fit                            20%
  Athlete level / training age        10%
  Phase fit                           15%
  Sport/event demands                 15%
  Historical response                 15%
  Recovery capacity                   10%
  Current load                         5%
  Time available                       5%
  Data confidence                      5%

The weights should eventually become sport- and phase-specific.

------------------------------------------------------------------------

# 6. Method Selection Output

The engine should produce:

``` json
{
  "selected_model": "PYRAMIDAL",
  "confidence": 0.82,
  "alternatives": [
    {
      "model": "POLARIZED",
      "score": 0.76
    },
    {
      "model": "THRESHOLD",
      "score": 0.58
    }
  ],
  "reason_codes": [
    "high_aerobic_volume_opportunity",
    "long_distance_goal",
    "moderate_recovery_capacity",
    "good_response_to_low_intensity_volume"
  ],
  "constraints": [
    "protect_key_quality_session",
    "limit_moderate_intensity_accumulation"
  ]
}
```

The athlete-facing explanation can then be generated by AI.

------------------------------------------------------------------------

# 7. Confidence Is Mandatory

TrainTrack must distinguish:

-   **decision**
-   **confidence in decision**

Example:

``` text
Selected model: Pyramidal
Confidence: High

Reason:
The athlete has strong aerobic history, good low-intensity consistency,
and limited evidence that additional threshold density produces better
performance without excessive fatigue.
```

If confidence is low:

``` text
Selected model: Pyramidal
Confidence: Moderate

Reason:
The athlete has insufficient recent performance data to distinguish
between pyramidal and polarized approaches.

Action:
Use a conservative 3-week experiment and evaluate response.
```

This makes the system scientifically honest.

------------------------------------------------------------------------

# 8. The Scientific Planning Pipeline

## Stage 1 --- Athlete State

Collect:

-   age;
-   sex;
-   body mass;
-   training age;
-   sports;
-   performance level;
-   weekly availability;
-   training history;
-   recent volume;
-   recent intensity;
-   performance;
-   recovery;
-   subjective fatigue;
-   soreness;
-   pain;
-   injuries;
-   motivation;
-   stress;
-   sleep;
-   HRV;
-   resting HR;
-   recent RPE;
-   workout completion;
-   historical response.

------------------------------------------------------------------------

# 9. Data Quality Layer

Every important metric should have:

``` text
value
source
timestamp
reliability
confidence
```

Example:

``` json
{
  "threshold_pace": {
    "value": "3:42/km",
    "source": "lab_test",
    "confidence": 0.95
  }
}
```

versus:

``` json
{
  "threshold_pace": {
    "value": "3:42/km",
    "source": "estimated_from_watch",
    "confidence": 0.61
  }
}
```

AI must not treat both as equally reliable.

------------------------------------------------------------------------

# 10. Goal Demand Model

Every race or performance goal receives a demand profile.

Example: marathon

``` text
Aerobic capacity
Threshold
Aerobic durability
Running economy
Long-run tolerance
Fuel utilization
Race-specific endurance
Pacing
Musculoskeletal durability
Psychological tolerance
```

Example: HYROX

``` text
Aerobic capacity
Running economy
Threshold
Compromised running
Lower-body strength
Strength endurance
Sled performance
Lunge tolerance
Wall-ball tolerance
Repeated high-intensity recovery
Transition efficiency
Race strategy
```

Each demand receives:

``` text
importance
phase relevance
trainability
current confidence
```

------------------------------------------------------------------------

# 11. Athlete Capability Engine

The engine estimates the athlete's current capabilities from actual
data.

Important:

> Capability scores should be calculated primarily from structured data
> and deterministic rules, not invented by an LLM.

Example:

``` text
Capability:
Threshold running = 82/100
Confidence = 0.89

Evidence:
- recent race performance
- threshold sessions
- pace/HR relationship
- RPE
- historical consistency
```

------------------------------------------------------------------------

# 12. Gap Analysis

Basic model:

``` text
Gap = Goal Demand - Athlete Capability
```

But TrainTrack should also calculate:

``` text
Gap Confidence
Gap Trainability
Gap Urgency
Gap Risk
```

A large gap is not automatically the highest priority.

------------------------------------------------------------------------

# 13. Limiting Factor Engine

Add a dedicated layer:

``` text
Goal Demands
      ↓
Athlete Capabilities
      ↓
Gaps
      ↓
LIMITING FACTORS
```

A limiting factor is a capability that meaningfully restricts
performance.

Example:

``` text
Marathon:
Aerobic capacity       sufficient
Threshold              sufficient
Running economy        moderate
Durability             low

Primary limiter:
Aerobic durability
```

The system should avoid wasting training budget improving capabilities
that are already sufficient.

------------------------------------------------------------------------

# 14. Adaptation Priority Engine

Each week should have:

-   1 primary adaptation;
-   maximum 2 secondary adaptations;
-   everything else maintenance.

Example:

``` text
PRIMARY:
Aerobic durability

SECONDARY:
Running economy
Threshold maintenance

MAINTENANCE:
VO2max
Strength
Speed
```

This prevents "everything workouts".

------------------------------------------------------------------------

# 15. Adaptation → Stimulus → Workout

This is a critical architecture change.

Do NOT:

``` text
Gap → Workout
```

Use:

``` text
Gap
 ↓
Limiting Factor
 ↓
Adaptation
 ↓
Required Stimulus
 ↓
Training Dose
 ↓
Training Method
 ↓
Workout
```

Example:

``` text
Gap:
Poor marathon durability

Adaptation:
Maintain pace under accumulated fatigue

Stimulus:
Long continuous aerobic work + controlled race-specific exposure

Dose:
90–140 min total
with controlled specific segment

Workout:
28 km including 3 × 4 km at marathon pace
```

------------------------------------------------------------------------

# 16. Training Dose Engine

Every adaptation needs a dose.

Dose dimensions:

-   frequency;
-   duration;
-   volume;
-   intensity;
-   density;
-   recovery;
-   mechanical demand;
-   specificity;
-   complexity.

Example:

``` json
{
  "adaptation": "threshold",
  "frequency": "1-2/week",
  "duration": "20-45 min quality",
  "intensity": "controlled LT range",
  "density": "moderate",
  "mechanical_cost": "medium"
}
```

------------------------------------------------------------------------

# 17. MED / OPT / MRD

For important adaptations define three conceptual zones:

``` text
MED = Minimum Effective Dose
OPT = Optimal Dose Range
MRD = Maximum Recoverable Dose
```

The engine should aim for:

``` text
MED
 ↓
OPT
```

and approach MRD only when justified.

Important:

These are not universal numbers.

They must be parameterized by:

-   sport;
-   athlete level;
-   training age;
-   phase;
-   history;
-   recovery capacity;
-   current load.

------------------------------------------------------------------------

# 18. Stimulus / Fatigue Optimization

Every workout should have:

``` text
Expected adaptation
Expected benefit
Cardiovascular cost
Muscular cost
Mechanical cost
Recovery cost
Opportunity cost
Interference cost
```

Conceptually:

``` text
Training Value =
Expected Adaptation / Total Cost
```

The goal is not maximum stress.

The goal is:

> **Maximum useful adaptation per unit of recoverable training cost.**

------------------------------------------------------------------------

# 19. Total Training Load

TrainTrack should NOT use running load alone.

Calculate:

``` text
Cardiovascular Load
Muscular Load
Mechanical Load
Neuromuscular Load
Metabolic Load
Psychological Load
Total Recovery Cost
```

Example:

  Session                 Cardio    Muscular   Mechanical    Recovery
  ------------------ ----------- ----------- ------------ -----------
  Easy bike                  Low         Low          Low         Low
  Long run                  High      Medium         High        High
  VO2 run                   High        High         High   Very High
  Strength                Medium        High       Medium        High
  HYROX simulation     Very High   Very High         High   Very High

This is more useful than treating all TSS-like scores as equivalent.

------------------------------------------------------------------------

# 20. Interference Engine

Concurrent training requires an explicit interference model.

Examples:

``` text
Running HI
    ↔
Heavy lower-body strength
```

Potential conflict:

`High`

------------------------------------------------------------------------

``` text
Easy cycling
    ↔
Running threshold
```

Potential conflict:

`Low`

------------------------------------------------------------------------

``` text
Heavy strength
    →
Long run next day
```

Potential conflict:

`Medium / High`

The engine considers:

-   modality;
-   intensity;
-   duration;
-   sequence;
-   proximity;
-   athlete level;
-   recovery;
-   mechanical overlap.

------------------------------------------------------------------------

# 21. Key Session Protection

The engine must identify:

``` text
A = Key
B = Important
C = Support
```

Key sessions receive protection.

Example:

``` text
Tuesday:
Key threshold

Wednesday:
Easy recovery

Thursday:
Strength moderate

Friday:
Easy

Saturday:
Key long run
```

The engine should never casually place a high-fatigue session before a
key session.

------------------------------------------------------------------------

# 22. Stress Classification

Each session gets multidimensional stress:

``` text
Cardiovascular:
LOW / MODERATE / HIGH / VERY_HIGH

Mechanical:
LOW / MODERATE / HIGH / VERY_HIGH

Neuromuscular:
LOW / MODERATE / HIGH / VERY_HIGH

Muscular:
LOW / MODERATE / HIGH / VERY_HIGH

Metabolic:
LOW / MODERATE / HIGH / VERY_HIGH

Psychological:
LOW / MODERATE / HIGH / VERY_HIGH
```

This allows two sessions with identical HR/TSS to be treated
differently.

------------------------------------------------------------------------

# 23. Progression Engine

Never use:

``` text
Next week = previous week × 1.10
```

as a hard rule.

Progression can occur through:

-   volume;
-   duration;
-   intensity;
-   density;
-   frequency;
-   complexity;
-   specificity;
-   mechanical demand.

Only one or a small number of dimensions should normally increase
simultaneously.

Example:

``` text
Week 1:
4 × 8 min threshold

Week 2:
4 × 9 min

Week 3:
3 × 12 min

Week 4:
Reduced volume
```

The stimulus progresses without blindly increasing all variables.

------------------------------------------------------------------------

# 24. Minimum Viable Week

When availability changes:

Do NOT compress missed workouts into the remaining days.

Instead:

``` text
Original Week
     ↓
Available Capacity
     ↓
Minimum Viable Week
     ↓
Preserve Highest-Value Stimuli
     ↓
Drop Low-Value Sessions
```

This is a major safety mechanism.

------------------------------------------------------------------------

# 25. Missed Workout Logic

A missed workout is not automatically moved.

The system asks:

1.  What adaptation was missed?
2.  Is that adaptation still important?
3.  Is there another session providing similar stimulus?
4.  Would adding it create excessive load?
5.  Is there enough time to recover?
6.  Is the missed workout still relevant to the current phase?

Possible outputs:

``` text
SKIP
REPLACE
REDUCE
RESCHEDULE
MERGE
```

Never:

``` text
"Make up the missed workout"
```

by default.

------------------------------------------------------------------------

# 26. Failed / Modified Workout Logic

Workout status should include:

``` text
COMPLETED_AS_PLANNED
COMPLETED_HARDER_THAN_PLANNED
COMPLETED_EASIER_THAN_PLANNED
PARTIALLY_COMPLETED
MODIFIED
MISSED
ABORTED
```

Important:

> Modified ≠ Failed.

The engine first determines why performance differed.

Possible causes:

-   fatigue;
-   poor sleep;
-   environmental conditions;
-   incorrect zones;
-   pacing error;
-   fueling;
-   motivation;
-   illness;
-   mechanical issue;
-   unrealistic prescription.

------------------------------------------------------------------------

# 27. Expected Response Model

Before a workout:

``` text
Expected:
RPE 6/10
HR 155-162
Pace 4:05-4:10/km
```

After:

``` text
Actual:
RPE 8/10
HR 166
Pace 4:12/km
```

The system detects:

``` text
Higher internal cost than expected
```

This should influence future planning.

------------------------------------------------------------------------

# 28. Training Response Learning

The engine should learn from repeated observations.

Example:

``` text
Workout type:
Threshold intervals

Expected:
RPE 6.5

Actual:
RPE 7.5
HR higher than baseline
Recovery > expected
```

After repeated occurrences:

``` text
Threshold dose appears too aggressive.
Reduce:
- interval duration
OR
- density
OR
- frequency
```

Conversely:

``` text
Repeatedly easier than expected
+
good recovery
+
improving performance
```

may justify progression.

------------------------------------------------------------------------

# 29. Adaptive Zones

Zones should not be static forever.

Potential evidence:

-   race performance;
-   threshold tests;
-   lactate testing;
-   HR;
-   pace;
-   power;
-   RPE;
-   cardiac drift;
-   workout response.

The engine can update confidence and estimates.

Important:

One unusual workout should not automatically redefine zones.

Use rolling evidence.

------------------------------------------------------------------------

# 30. Readiness Engine

Readiness should combine:

``` text
HRV
Resting HR
Sleep
Subjective fatigue
Soreness
Motivation
Stress
Pain
Recent RPE
Recent performance
Training load
Recovery trend
```

Wearable data should NOT override meaningful athlete-reported pain or
symptoms.

------------------------------------------------------------------------

# 31. Readiness Decision Tree

``` text
Readiness
   ↓
GREEN ─────────→ Planned session
   ↓
YELLOW ────────→ Reduce / modify / substitute
   ↓
ORANGE ────────→ Replace with low-cost session
   ↓
RED ───────────→ Recovery / rest / clinical constraint
```

The exact thresholds must be configurable and athlete-specific.

------------------------------------------------------------------------

# 32. Hard Safety Constraints

Hard constraints cannot be overridden by AI.

Examples:

``` text
Medical restriction
Injury restriction
Maximum sessions/day
Unavailable day
Race date
Minimum recovery requirement
Equipment restriction
Coach lock
Athlete safety flag
```

AI can optimize within the safe space.

It cannot redefine the safe space.

------------------------------------------------------------------------

# 33. Injury / Pain Guardrails

The engine should distinguish:

``` text
performance discomfort
normal training fatigue
persistent pain
acute pain
worsening pain
mechanical compensation
medical restriction
```

If a hard restriction exists:

``` text
AI MUST NOT prescribe conflicting training.
```

The system should be conservative when uncertainty is high.

------------------------------------------------------------------------

# 34. Specificity Engine

Specificity should increase as the race approaches.

Conceptually:

``` text
General Preparation
    ↓
General + Specific
    ↓
Specific Preparation
    ↓
Race Specific
    ↓
Taper
```

But specificity has a cost.

Therefore:

``` text
Specificity Value
vs
Specificity Cost
```

must be optimized.

------------------------------------------------------------------------

# 35. Race Simulation Engine

Dedicated workout class:

``` text
Race Simulation
```

Parameters:

-   duration;
-   intensity;
-   pace/power;
-   fueling;
-   hydration;
-   terrain;
-   equipment;
-   transitions;
-   race order;
-   psychological demand;
-   accumulated fatigue;
-   target strategy.

This should not be treated as a normal workout.

------------------------------------------------------------------------

# 36. Strength Integration

Strength should be integrated based on goal.

Strength can target:

-   maximal strength;
-   strength endurance;
-   power;
-   robustness;
-   hypertrophy;
-   economy;
-   sport-specific force production.

Strength progression should not copy endurance progression.

For example:

``` text
Endurance progression:
duration / volume / intensity

Strength progression:
load / reps / sets / velocity / exercise complexity
```

------------------------------------------------------------------------

# 37. Maintenance Dose

Capabilities should not be represented as:

``` text
trained = true
```

Use:

``` text
current_capacity
maintenance_requirement
decay_rate
confidence
```

Example:

``` text
VO2max:
High capacity
Low maintenance requirement

Strength:
Moderate capacity
Moderate maintenance requirement
```

------------------------------------------------------------------------

# 38. Adaptation Decay

If a capability is ignored:

``` text
Capability
   ↓
Maintenance
   ↓
Slow decay
```

The engine should estimate decay rather than suddenly assuming the
capability disappeared.

------------------------------------------------------------------------

# 39. Training Budget

Each week has a finite budget.

Budget dimensions:

``` text
Time
Recovery
Mechanical tolerance
High-intensity tolerance
Mental bandwidth
Strength capacity
Sport-specific capacity
```

The planner allocates this budget to the highest-value adaptations.

------------------------------------------------------------------------

# 40. Marginal Gain Engine

Once a major physiological limiter is sufficiently addressed, the engine
searches for the next best return.

Potential interventions:

``` text
sleep
fueling
hydration
race strategy
technique
running economy
strength
mobility
equipment
recovery
training distribution
```

This prevents endlessly adding workouts.

------------------------------------------------------------------------

# 41. Periodization Engine

Hierarchy:

``` text
MACROCYCLE
    ↓
MESOCYCLE
    ↓
WEEK
    ↓
SESSION
```

For no-race periods:

``` text
ROLLING 4-WEEK BLOCK
```

The engine should support:

-   traditional periodization;
-   undulating periodization;
-   block emphasis;
-   race-specific progression;
-   hybrid models.

------------------------------------------------------------------------

# 42. Deload Engine

Default heuristic:

``` text
3 build : 1 recovery
```

but NOT a fixed rule.

Deload timing should respond to:

-   accumulated load;
-   fatigue;
-   performance;
-   soreness;
-   compliance;
-   athlete history;
-   phase;
-   race proximity.

A deload can occur earlier or later.

------------------------------------------------------------------------

# 43. Taper Engine

Taper should be individualized.

Variables:

-   race distance;
-   race priority;
-   accumulated load;
-   athlete level;
-   historical taper response;
-   fatigue;
-   injury risk;
-   recent performance.

The engine should optimize:

``` text
Fatigue ↓
Fitness retention ↑
Specificity retained
```

------------------------------------------------------------------------

# 44. Cross-Sport Substitution

Cross-training must not simply be:

``` text
Running too much → replace with cycling
```

Instead:

``` text
What adaptation is required?
What is the lowest-cost modality that can deliver it?
Does substitution preserve race specificity?
What mechanical cost is acceptable?
```

Example:

``` text
Aerobic development:
Easy bike may substitute effectively.

Running economy:
Easy bike cannot fully substitute.

Race-specific running:
Bike is not an equivalent substitute.
```

------------------------------------------------------------------------

# 45. AI Coach Layer

AI should be responsible for:

-   interpreting structured engine output;
-   explaining decisions;
-   adapting workout descriptions;
-   generating athlete-facing rationale;
-   identifying unusual patterns;
-   proposing hypotheses;
-   handling natural-language athlete feedback;
-   selecting among validated alternatives.

AI should NOT be responsible for:

-   inventing physiological facts;
-   bypassing hard constraints;
-   arbitrarily changing safety thresholds;
-   creating unsupported training-load formulas;
-   pretending low-confidence data is precise;
-   replacing deterministic validation.

------------------------------------------------------------------------

# 46. AI Freedom Levels

## Level 1 --- Explanation

AI explains an existing plan.

## Level 2 --- Adaptive Workout

AI selects and modifies a validated workout template.

## Level 3 --- Session Adaptation

AI can modify session parameters based on readiness.

## Level 4 --- Coach

AI can change:

-   weekly structure;
-   priorities;
-   periodization;
-   workout selection;
-   remaining plan.

Only inside deterministic constraints.

## Level 5 --- Experimental

AI proposes a novel strategy.

Requires explicit coach approval and stronger validation.

Default:

`LEVEL 4`

------------------------------------------------------------------------

# 47. Workout Library Architecture

Workout library should be tagged by:

``` text
sport
adaptation
intensity
duration
mechanical cost
cardiovascular cost
muscular cost
specificity
athlete level
phase
equipment
complexity
risk
progression family
regression family
```

This makes workout selection intelligent.

------------------------------------------------------------------------

# 48. Workout Families

Instead of thousands of unrelated workouts:

``` text
Threshold Family
VO2 Family
Long Run Family
Aerobic Endurance Family
Race Pace Family
Economy Family
Strength Family
HYROX Compromised Running Family
Recovery Family
```

Each family contains progression paths.

------------------------------------------------------------------------

# 49. Workout Progression Graph

Example:

``` text
4 × 6 min
   ↓
4 × 7 min
   ↓
4 × 8 min
   ↓
3 × 10 min
   ↓
3 × 12 min
   ↓
2 × 15 min
```

The engine chooses the next node based on actual response.

Not merely calendar progression.

------------------------------------------------------------------------

# 50. Guardrail: One Primary Adaptation

Every workout must declare:

``` text
primary_adaptation
```

Optional:

``` text
secondary_adaptations[]
```

Example:

``` json
{
  "primary_adaptation": "threshold",
  "secondary_adaptations": [
    "running_economy"
  ]
}
```

If a workout tries to train five major things, the planner should flag
it.

------------------------------------------------------------------------

# 51. Guardrail: Easy Means Easy

An easy workout should not silently contain:

-   marathon pace;
-   threshold;
-   fast finish;
-   hidden progression;
-   unplanned strides;

unless explicitly classified.

This is important for training distribution integrity.

------------------------------------------------------------------------

# 52. Guardrail: No Automatic Compensation

Never:

``` text
Missed Tuesday
+
Missed Thursday
=
Huge Saturday
```

Instead:

``` text
Recalculate remaining week
↓
Protect key adaptations
↓
Discard low-value sessions
↓
Avoid overload
```

------------------------------------------------------------------------

# 53. Guardrail: No Blind Load Progression

The system must reject:

``` text
Previous volume × fixed percentage
```

when:

-   fatigue is elevated;
-   readiness is poor;
-   compliance is unstable;
-   performance is declining;
-   mechanical load is high;
-   injury risk is elevated;
-   recovery capacity is low.

------------------------------------------------------------------------

# 54. Guardrail: No Methodology Dogma

The engine should never output:

> "Norwegian is the best model."

or:

> "Polarized is always superior."

Instead:

> "This model is currently the best fit for this athlete, goal and
> phase."

Scientific reviews show that multiple TID approaches are used
effectively, with context and individual variability influencing the
appropriate choice.

------------------------------------------------------------------------

# 55. Guardrail: No False Precision

Avoid:

``` text
MRD = exactly 72 minutes
```

unless supported by sufficient athlete-specific data.

Prefer:

``` text
estimated MRD range:
60–75 min
confidence:
moderate
```

------------------------------------------------------------------------

# 56. Guardrail: Data Confidence

Every major decision should have:

``` text
confidence:
HIGH
MEDIUM
LOW
```

Low confidence should cause conservative planning and/or a testing
phase.

------------------------------------------------------------------------

# 57. Experimental Coaching Loop

When the engine is uncertain:

``` text
Hypothesis
    ↓
Small controlled intervention
    ↓
Measure response
    ↓
Compare expected vs actual
    ↓
Update athlete model
```

This turns uncertainty into learning.

------------------------------------------------------------------------

# 58. Example: Choosing Between Pyramidal and Polarized

Athlete:

``` text
Advanced endurance athlete
High weekly volume
Good recovery
Strong aerobic base
Recent stagnation
Good tolerance of VO2 sessions
Poor response to frequent threshold sessions
Race = 10 km
Phase = general/build
```

Candidate evaluation:

  Model         Goal Fit   Response Fit   Recovery Fit     Risk   Result
  ----------- ---------- -------------- -------------- -------- --------
  Pyramidal         High         Medium           High      Low     0.78
  Polarized         High           High           High   Medium     0.87
  Threshold         High            Low         Medium     High     0.54
  Specific        Medium         Medium         Medium   Medium     0.63

Decision:

``` text
POLARIZED
Confidence: High
```

Reason:

``` text
The athlete responds poorly to repeated threshold accumulation,
while maintaining good tolerance of low-volume high-intensity work.
```

------------------------------------------------------------------------

# 59. Example: Choosing Norwegian-Style Threshold

Athlete:

``` text
Advanced runner
High training age
Stable high mileage
Excellent recovery
Reliable lactate data
Strong threshold history
Goal = marathon
Phase = specific preparation
```

Candidate evaluation may favor:

``` text
PYRAMIDAL / THRESHOLD-ORIENTED HYBRID
```

with:

``` text
controlled threshold sessions
+
large easy volume
+
increasing marathon specificity
```

The system may use Norwegian-style principles without declaring the
whole plan "Norwegian".

------------------------------------------------------------------------

# 60. Example: Choosing Specific Endurance

Athlete:

``` text
Marathon in 7 weeks
Aerobic capacity already sufficient
Threshold sufficient
Durability is limiting
Good recovery
```

Decision:

``` text
Increase race-specific stimulus
```

rather than:

``` text
Add more VO2max intervals
```

This is the key distinction between capability development and race
preparation.

------------------------------------------------------------------------

# 61. Validation Engine

Before publishing a plan, validate:

### Safety

-   no hard constraint violation;
-   no medical restriction violation;
-   acceptable recovery.

### Load

-   progression reasonable;
-   high-intensity density acceptable;
-   mechanical load acceptable.

### Coherence

-   sessions support weekly adaptation;
-   weekly adaptation supports mesocycle;
-   mesocycle supports race demands.

### Distribution

-   actual intensity distribution matches selected model;
-   easy sessions remain easy.

### Specificity

-   specificity appropriate for phase.

### Interference

-   conflicting sessions separated appropriately.

### Practicality

-   fits athlete availability.

------------------------------------------------------------------------

# 62. Plan Score

Every generated week should receive a validation score:

``` text
Safety Score
Load Score
Goal Alignment Score
Stimulus Score
Recovery Score
Specificity Score
Distribution Score
Practicality Score
Confidence Score
```

Example:

``` text
Overall Plan Quality: 91/100
Safety: 98
Goal Alignment: 94
Load: 87
Recovery: 90
Specificity: 91
Confidence: 84
```

The exact scoring system should be calibrated later.

------------------------------------------------------------------------

# 63. Retry / Fallback

If plan fails validation:

``` text
Generate
   ↓
Validate
   ↓
FAIL
   ↓
Identify failure reason
   ↓
Modify only affected variables
   ↓
Validate again
```

Maximum retry count should be deterministic.

If repeated failure:

``` text
Fallback to conservative template
```

AI should not endlessly rewrite the plan.

------------------------------------------------------------------------

# 64. Dynamic Replanning

Triggers:

-   missed workout;
-   unusually hard workout;
-   unusually easy workout;
-   low readiness;
-   pain;
-   illness;
-   unexpected race;
-   schedule change;
-   performance breakthrough;
-   repeated underperformance.

Flow:

``` text
New Data
   ↓
Update Athlete State
   ↓
Update Load
   ↓
Update Readiness
   ↓
Update Capability Confidence
   ↓
Recalculate Priorities
   ↓
Recalculate Remaining Plan
   ↓
Validate
   ↓
Publish
```

------------------------------------------------------------------------

# 65. Architecture

``` text
                    ┌─────────────────────┐
                    │    Athlete State    │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │   Goal Demand       │
                    │      Model          │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Capability Engine   │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │    Gap Analysis     │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Limiting Factors    │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Adaptation Priority │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Methodology         │
                    │ Selection Engine    │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Training Dose       │
                    └──────────┬──────────┘
                               ↓
              ┌────────────────┴────────────────┐
              ↓                                 ↓
    ┌────────────────────┐           ┌────────────────────┐
    │ Interference       │           │ Stimulus / Fatigue │
    │ Engine             │           │ Optimizer          │
    └──────────┬─────────┘           └──────────┬─────────┘
               └────────────────┬───────────────┘
                                ↓
                    ┌─────────────────────┐
                    │ Periodization       │
                    │ Engine              │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Workout Selection   │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ AI Coach Layer      │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Validation Engine   │
                    └──────────┬──────────┘
                               ↓
                         FINAL PLAN
```

------------------------------------------------------------------------

# 66. Runtime Coaching Loop

``` text
PLAN
 ↓
TRAIN
 ↓
MEASURE
 ↓
COMPARE EXPECTED VS ACTUAL
 ↓
UPDATE ATHLETE MODEL
 ↓
REASSESS LIMITING FACTORS
 ↓
RESELECT PRIORITIES
 ↓
ADJUST DOSE
 ↓
REPLAN
```

This is the core TrainTrack intelligence loop.

------------------------------------------------------------------------

# 67. Core Data Objects

## AthleteState

``` json
{
  "profile": {},
  "sports": {},
  "fitness": {},
  "training_load": {},
  "readiness": {},
  "health_constraints": {},
  "availability": {},
  "data_quality": {}
}
```

## GoalProfile

``` json
{
  "sport": "running",
  "event": "marathon",
  "race_date": "YYYY-MM-DD",
  "priority": "A",
  "target": {},
  "constraints": {}
}
```

## Capability

``` json
{
  "name": "aerobic_durability",
  "score": 0.72,
  "confidence": 0.86,
  "evidence": []
}
```

## AdaptationPriority

``` json
{
  "name": "aerobic_durability",
  "priority": 0.91,
  "role": "primary",
  "target_dose": {},
  "risk": "moderate"
}
```

## Workout

``` json
{
  "primary_adaptation": "threshold",
  "secondary_adaptations": [],
  "dose": {},
  "expected_response": {},
  "stress_profile": {},
  "specificity": {},
  "constraints": []
}
```

------------------------------------------------------------------------

# 68. AI Decision Contract

The AI should receive structured context:

``` text
ATHLETE_STATE
GOAL_PROFILE
RACE_DEMAND_PROFILE
CAPABILITY_PROFILE
GAP_ANALYSIS
LIMITING_FACTORS
ADAPTATION_PRIORITIES
TRAINING_BUDGET
CURRENT_LOAD
READINESS
CONSTRAINTS
CANDIDATE_MODELS
VALIDATED_WORKOUT_LIBRARY
```

It should return:

``` text
SELECTED_MODEL
CONFIDENCE
RATIONALE
WEEK_STRUCTURE
WORKOUT_SELECTION
EXPECTED_RESPONSE
RISKS
VALIDATION_REQUEST
```

The AI must not directly mutate protected fields.

------------------------------------------------------------------------

# 69. Protected Fields

The following must be controlled by deterministic code:

``` text
hard safety constraints
medical restrictions
race dates
availability
maximum sessions
load ceilings
validation thresholds
athlete permissions
coach locks
```

AI can propose changes, but deterministic code decides whether they are
legal.

------------------------------------------------------------------------

# 70. Explainability

Every important decision should be explainable:

``` text
Why this model?
Why this adaptation?
Why this workout?
Why this volume?
Why not another workout?
What is the risk?
What should improve?
What signal would cause the plan to change?
```

This creates trust.

------------------------------------------------------------------------

# 71. Coach Override

A human coach can override:

-   methodology;
-   workout;
-   priority;
-   load;
-   schedule;
-   progression;
-   taper.

But the system should record:

``` text
override
reason
timestamp
coach
result
```

This creates a future learning dataset.

------------------------------------------------------------------------

# 72. Long-Term Learning

TrainTrack should eventually learn:

``` text
Athlete
+
Training Method
+
Dose
+
Context
→
Response
```

For example:

``` text
Athlete A
Threshold 2×/week
Moderate dose
→ positive response

Athlete A
Threshold 3×/week
High dose
→ fatigue / stagnation
```

Future planning can become increasingly individualized.

------------------------------------------------------------------------

# 73. Methodology Selection Is an Experiment

When multiple models are plausible:

``` text
Model A
vs
Model B
```

TrainTrack can use a controlled block.

Example:

``` text
4 weeks Pyramidal
→ evaluate

vs

4 weeks Polarized
→ evaluate
```

Do not change methodology every few days.

The experiment needs:

-   stable enough conditions;
-   measurable outcomes;
-   predefined success criteria;
-   enough time to observe response.

------------------------------------------------------------------------

# 74. Scientific Evidence Hierarchy

When making methodology decisions, prioritize:

1.  systematic reviews / meta-analyses;
2.  randomized controlled trials;
3.  well-designed longitudinal studies;
4.  elite athlete observational data;
5.  established coaching methodologies;
6.  expert opinion;
7.  anecdotal evidence.

World-class coaching methods can inform hypotheses, but should not
automatically override stronger evidence.

------------------------------------------------------------------------

# 75. Coaching Methodology Knowledge Base

TrainTrack can encode principles inspired by:

-   Seiler --- intensity distribution and endurance training;
-   Norwegian lactate-controlled approaches --- precise, repeatable
    threshold work;
-   Canova-style specific endurance --- race-specific progression and
    specificity;
-   traditional periodization;
-   modern undulating periodization;
-   strength and concurrent-training research;
-   sport-specific coaching literature.

Important:

> TrainTrack should learn principles, not copy personalities.

------------------------------------------------------------------------

# 76. The "System Chooser" UX

This should become a visible feature.

Example:

``` text
TRAINING APPROACH

Recommended:
PYRAMIDAL

Confidence:
HIGH

Why:
- Strong aerobic base
- High volume tolerance
- Marathon-specific goal
- Moderate recovery capacity
- Threshold already well developed

Alternative:
POLARIZED

Why not selected:
Expected benefit is slightly lower in the current phase.

Next review:
After 3 weeks of response data.
```

This is much more powerful than a hidden algorithm.

------------------------------------------------------------------------

# 77. Athlete-Facing "Why This Plan?" Screen

Display:

``` text
PRIMARY GOAL
Aerobic durability

CURRENT LIMITER
Durability under fatigue

TRAINING APPROACH
Pyramidal

THIS WEEK
1 key threshold
1 long endurance
3 easy/recovery
2 strength/support sessions

WHY
Your aerobic capacity is sufficient.
The largest performance opportunity is sustaining output
after accumulated fatigue.

WHAT WE ARE PROTECTING
Recovery and key sessions.

WHAT WOULD CHANGE THE PLAN
Unexpected fatigue, pain, repeated underperformance,
or faster-than-expected adaptation.
```

------------------------------------------------------------------------

# 78. Development Priorities

## Phase 1 --- Foundation

Implement:

-   AthleteState;
-   GoalProfile;
-   RaceDemandProfile;
-   Capability Engine;
-   Gap Analysis;
-   Limiting Factors;
-   Adaptation Priorities;
-   deterministic constraints.

## Phase 2 --- Planning Intelligence

Implement:

-   Training Dose;
-   Training Budget;
-   Periodization;
-   Methodology Selection;
-   Workout Library;
-   Workout Progression Graph.

## Phase 3 --- Safety & Optimization

Implement:

-   Stress Model;
-   Interference Engine;
-   Key Session Protection;
-   Readiness;
-   MED/OPT/MRD;
-   validation engine.

## Phase 4 --- Learning

Implement:

-   Expected Response;
-   Actual Response;
-   Capability updates;
-   adaptation decay;
-   methodology experiments;
-   athlete-specific learning.

## Phase 5 --- AI Coach

Implement:

-   AI decision contracts;
-   natural-language adaptation;
-   explanation;
-   hypothesis generation;
-   coach interaction;
-   dynamic replanning.

------------------------------------------------------------------------

# 79. Golden Rules

1.  **Goal before workout.**
2.  **Demands before gaps.**
3.  **Gaps before priorities.**
4.  **Priorities before dose.**
5.  **Dose before workout.**
6.  **Workout before explanation.**
7.  **Expected response before actual response.**
8.  **Actual response updates the model.**
9.  **Easy means easy unless explicitly designed otherwise.**
10. **Never compensate missed training blindly.**
11. **Protect key sessions.**
12. **Do not increase multiple stress dimensions unnecessarily.**
13. **Hard constraints cannot be overridden by AI.**
14. **No methodology is universally best.**
15. **Use confidence with every important decision.**
16. **Prefer measurable adaptation over impressive-looking workouts.**
17. **Optimize adaptation per recovery cost, not fatigue itself.**
18. **Specificity increases with race proximity, but only when earned.**
19. **Cross-training is a tool, not an automatic replacement.**
20. **The athlete's response is part of the training prescription.**

------------------------------------------------------------------------

# 80. Final Architecture Principle

The ultimate TrainTrack model is:

``` text
             WHAT DOES THE ATHLETE NEED?
                         ↓
             WHAT CAN THE ATHLETE DO?
                         ↓
                WHAT LIMITS THEM?
                         ↓
             WHAT SHOULD WE ADAPT?
                         ↓
            HOW MUCH STIMULUS IS NEEDED?
                         ↓
       WHICH TRAINING SYSTEM FITS BEST?
                         ↓
            WHICH WEEK STRUCTURE FITS?
                         ↓
              WHICH WORKOUT FITS?
                         ↓
              WHAT DO WE EXPECT?
                         ↓
                WHAT HAPPENED?
                         ↓
             WHAT DID WE LEARN?
                         ↓
              WHAT CHANGES NEXT?
```

This is the foundation for a serious AI coaching product.

> **TrainTrack should not imitate a coach's workout library. It should
> model the coach's decision process.**

------------------------------------------------------------------------

# 81. Scientific References

Selected references used to inform the architecture:

-   Kenneally M, Casado A, Santos-Concejero J. *The Effect of
    Periodization and Training Intensity Distribution on Middle- and
    Long-Distance Running Performance: A Systematic Review.*
    International Journal of Sports Physiology and Performance, 2018.
-   Seiler S. *The training intensity distribution among well-trained
    and elite endurance athletes.* Frontiers in Physiology, 2015.
-   Bourgois JG et al. *Perspectives and Determinants for
    Training-Intensity Distribution in Elite Endurance Athletes.* IJSPP,
    2019.
-   Silva Oliveira P et al. *Comparison of Polarized Versus Other Types
    of Endurance Training Intensity Distribution on Athletes' Endurance
    Performance: A Systematic Review with Meta-analysis.* Sports
    Medicine, 2024.
-   Rivera-Köfler T et al. *Effects of Polarized Training vs. Other
    Training Intensity Distribution Models on Physiological Variables
    and Endurance Performance in Different-Level Endurance Athletes: A
    Scoping Review.* Journal of Strength and Conditioning Research,
    2025.
-   Recent review: *Recent advances in training intensity distribution
    theory for cyclic endurance sports: theoretical foundations, model
    comparisons, and periodization characteristics.*
-   Marius Bakken --- Norwegian lactate-controlled training methodology
    and related coaching principles.


---

# 82. Norwegian Lactate-Controlled Model — Marius Bakken

TrainTrack should include a dedicated **Norwegian Lactate-Controlled Training Strategy** inspired by the framework described by Marius Bakken.

Important architectural principle:

> **Norwegian is a selectable strategy, not the default training model.**

Bakken himself emphasizes that the label is not the method. The underlying principles are more important than calling a plan "Norwegian". His framework centers on precise intensity control, threshold development, repeatability, load management and the ability to accumulate quality without excessive muscular cost. citeturn0search0turn0search1

This distinction is important for TrainTrack because the system should be able to use Norwegian principles when appropriate without forcing every athlete into the same structure.

---

# 83. Norwegian Model: Core Principles

The TrainTrack implementation should represent the following principles:

```text
High aerobic volume
        +
Precisely controlled threshold work
        +
Low-intensity running
        +
Repeatability
        +
Careful load control
        +
Strategic clustering
        +
Individualized progression
```

The central idea is not:

```text
Train harder
```

but:

```text
Accumulate the maximum useful quality
that the athlete can repeatedly absorb.
```

Bakken's description places particular emphasis on finding an individual "sweet spot" for threshold work rather than automatically using a generic 4 mmol/L definition. His historical approach used lactate measurements to keep threshold work controlled and repeatable. citeturn0search1

---

# 84. Norwegian Model in the TrainTrack Methodology Selector

Add a new methodology:

```text
NORWEGIAN_LACTATE_CONTROLLED
```

Candidate list becomes:

```text
PYRAMIDAL
POLARIZED
THRESHOLD_ORIENTED
NORWEGIAN_LACTATE_CONTROLLED
SPECIFIC_ENDURANCE
BLOCK
HYBRID
```

The selector evaluates Norwegian methodology using:

```text
Athlete Level
Training Age
Threshold Development Need
Recovery Capacity
Running Volume
Historical Threshold Response
Lactate Data Availability
Intensity Control Reliability
Musculoskeletal Tolerance
Race Demand
Phase
Time Available
Coach Expertise
Data Confidence
```

---

# 85. Norwegian Eligibility Gate

TrainTrack must NOT automatically prescribe advanced Norwegian-style training.

Before selecting the model, run:

```text
Norwegian Eligibility Check
```

### Required conditions

Potential positive signals:

- advanced or sufficiently experienced athlete;
- stable training history;
- established aerobic base;
- consistent weekly volume;
- good tolerance of threshold work;
- reliable intensity control;
- adequate recovery;
- no unresolved high-risk mechanical issue;
- enough weekly training time;
- ability to perform easy training genuinely easy;
- sufficient data to evaluate response.

### Negative signals

The model should be downgraded when:

- athlete is inexperienced;
- training history is inconsistent;
- threshold work repeatedly causes excessive fatigue;
- recovery is poor;
- mechanical tolerance is low;
- intensity control is unreliable;
- athlete habitually turns easy runs into moderate runs;
- recent load is unstable;
- data quality is poor;
- race specificity is currently more important than general threshold development.

---

# 86. Norwegian Model Selection Score

Conceptually:

```text
Norwegian Fit =
Athlete Maturity
× Threshold Need
× Recovery Capacity
× Intensity Control
× Historical Response
× Training Capacity
× Data Confidence
× Phase Fit
-
Risk Penalty
-
Mechanical Cost
-
Complexity Penalty
```

Example:

```text
Norwegian Fit: 0.86
Confidence: High
```

versus:

```text
Norwegian Fit: 0.48
Confidence: Moderate
```

In the second case, TrainTrack should select another methodology.

---

# 87. Threshold Control Is the Core

TrainTrack should not define Norwegian threshold solely by pace.

Use a hierarchy:

```text
Lactate
   ↓
Heart Rate
   ↓
RPE
   ↓
Pace / Power
```

depending on available data.

If lactate is available:

```text
Lactate = primary internal control
```

If lactate is unavailable:

```text
HR + RPE + pace/power
```

can be combined.

Important:

> Pace is an output of the athlete's physiological state, not necessarily the correct intensity prescription.

This is especially important in heat, altitude, fatigue, hills, wind and accumulated training stress.

---

# 88. Lactate as a Control Signal

TrainTrack should store:

```json
{
  "lactate": {
    "value": 2.6,
    "unit": "mmol/L",
    "context": "threshold_interval_3",
    "measurement_method": "field_meter",
    "confidence": 0.88
  }
}
```

Do not hard-code:

```text
4.0 mmol/L = threshold for everyone
```

Bakken's own historical approach describes working below and around 3 mmol/L and finding an individual range through repeated testing. This is an empirical coaching framework, not a universal physiological law. citeturn0search1

TrainTrack should therefore represent:

```text
Athlete-specific lactate-response range
```

rather than one universal threshold number.

---

# 89. Norwegian Threshold "Sweet Spot"

The engine should model a threshold range:

```text
LOW THRESHOLD
        ↓
SWEET SPOT
        ↓
UPPER CONTROLLED THRESHOLD
        ↓
ABOVE THRESHOLD
```

The objective is not always to push the athlete to the highest possible lactate.

Instead:

```text
Find the highest repeatable quality
with acceptable physiological and muscular cost.
```

This principle is central to the TrainTrack interpretation of the Norwegian model.

---

# 90. Floating Threshold

Add a special workout intensity mode:

```text
FLOATING_THRESHOLD
```

Purpose:

- lower muscular cost;
- maintain threshold stimulus;
- support recovery;
- accumulate controlled volume;
- use during fatigue or high-load periods.

Bakken describes sessions performed below the higher threshold level as a way of adjusting load and maintaining quality. citeturn0search1

TrainTrack should treat this as a tool, not a permanent zone.

---

# 91. Double Threshold

Add:

```text
DOUBLE_THRESHOLD
```

as an advanced workout structure.

Conceptually:

```text
Morning:
Threshold session

Several hours recovery

Evening:
Threshold session
```

Bakken describes double threshold as a strategy for clustering threshold work into specific parts of the training week, with sessions controlled sufficiently to make the total load repeatable. citeturn0search1turn0search3

The important TrainTrack interpretation is:

> Double threshold is not "two hard workouts".

It is:

> **Two controlled threshold exposures organized as one high-quality training block.**

---

# 92. Double Threshold Safety Gate

Double threshold can only be selected if:

```text
Athlete Level >= ADVANCED
AND
Training Consistency >= required level
AND
Threshold Tolerance = GOOD
AND
Recovery Capacity = GOOD
AND
Mechanical Risk = LOW
AND
Data Confidence >= threshold
AND
Recent Response = STABLE
```

Otherwise:

```text
DOUBLE_THRESHOLD = NOT_ELIGIBLE
```

The system should automatically fall back to:

```text
SINGLE_THRESHOLD
```

or:

```text
PYRAMIDAL
```

---

# 93. Double Threshold Progression

Never jump directly from:

```text
1 threshold session/week
```

to:

```text
2 double-threshold days/week
```

TrainTrack should use a progression graph:

```text
Level 0
No structured threshold

        ↓

Level 1
1 controlled threshold session

        ↓

Level 2
2 threshold sessions/week

        ↓

Level 3
Occasional double day

        ↓

Level 4
1 double-threshold day/week

        ↓

Level 5
2 double-threshold days/week
```

The exact progression depends on athlete response.

---

# 94. Double Threshold Is a Load-Management Strategy

The planner should evaluate:

```text
Total threshold minutes
+
Total mechanical load
+
Session density
+
Recovery between sessions
```

rather than counting:

```text
Number of hard workouts
```

A double-threshold day should therefore be represented as a **training block**.

Example:

```json
{
  "block_type": "DOUBLE_THRESHOLD",
  "sessions": [
    {
      "time": "AM",
      "adaptation": "threshold",
      "stress": "moderate"
    },
    {
      "time": "PM",
      "adaptation": "threshold",
      "stress": "moderate"
    }
  ],
  "following_day": "LOW_LOAD"
}
```

---

# 95. Post-Double Recovery Rule

A double-threshold block creates a specific recovery requirement.

Default:

```text
DOUBLE THRESHOLD
       ↓
LOW LOAD / EASY DAY
```

The planner must evaluate:

- muscular state;
- RPE;
- HR response;
- sleep;
- soreness;
- next-session quality;
- accumulated load.

Do not schedule another major stressor simply because the athlete's cardiovascular metrics look normal.

---

# 96. Intervals vs Continuous Threshold

The Norwegian strategy should include a preference model for intervals.

Bakken's recent explanation emphasizes the importance of considering the **cost of a session**, not just its isolated physiological effect, and describes intervals as potentially useful for accumulating threshold work with lower muscular cost. citeturn0search2

TrainTrack should therefore calculate:

```text
Stimulus
vs
Muscular Cost
vs
Total Recovery Cost
```

For example:

```text
Continuous 40 min threshold
```

may have:

```text
High stimulus
High muscular cost
```

while:

```text
5 × 8 min controlled threshold
```

may provide:

```text
Similar target adaptation
Potentially lower accumulated muscular cost
```

This must be treated as a context-dependent hypothesis, not a universal rule.

---

# 97. Norwegian Micro-Intervals

Add:

```text
MICRO_INTERVAL_THRESHOLD
```

Example family:

```text
45 sec / 15 sec
```

The exact structure is configurable.

TrainTrack should classify micro-intervals as:

```text
threshold-control tool
```

rather than automatically as VO2max work.

Bakken's current framework explicitly includes 45/15 micro-intervals as part of the broader Norwegian methodology. citeturn0search0turn0search6

---

# 98. Norwegian X-Element

The model should allow one additional stimulus:

```text
X_ELEMENT
```

Purpose:

- recruit higher-force fibers;
- maintain speed;
- provide controlled anaerobic stimulus;
- prepare for race-specific intensity.

Possible examples:

```text
short fast intervals
strides
hill sprints
race-specific faster work
```

The X-element must not automatically become a second full high-intensity session.

---

# 99. Norwegian Weekly Structure

TrainTrack should NOT hard-code one weekly schedule.

Instead it can construct a pattern such as:

```text
MON
Easy / recovery

TUE
Threshold block

WED
Easy aerobic

THU
Threshold block

FRI
Easy / recovery

SAT
X-element / specific work

SUN
Easy / rest
```

For advanced athletes:

```text
TUE
AM threshold
PM threshold

THU
AM threshold
PM threshold

SAT
X-element

Remaining days:
Easy / recovery
```

The actual schedule is generated from the athlete's load budget and response.

---

# 100. Norwegian Model and Intensity Distribution

Important:

Norwegian methodology should NOT automatically map to:

```text
THRESHOLD-HEAVY
```

TrainTrack should separately track:

```text
Methodology
```

and:

```text
Actual Intensity Distribution
```

For example:

```text
Methodology:
Norwegian Lactate-Controlled

Actual distribution:
Pyramidal
```

This is entirely possible.

The methodology describes **how training intensity is controlled and organized**.

The distribution describes **how much time is spent at different intensities**.

These are different dimensions.

---

# 101. Norwegian Model vs Pyramidal

TrainTrack should allow:

```text
Methodology:
Norwegian Lactate-Controlled

Distribution:
Pyramidal
```

This may be an excellent combination for an endurance athlete.

The engine should not confuse:

```text
Norwegian
```

with:

```text
Polarized
```

or:

```text
Threshold-only
```

---

# 102. Norwegian Model vs Race Specificity

As race approaches:

```text
Threshold development
        ↓
Maintain threshold
        ↓
Increase race-specific stimulus
        ↓
Reduce double threshold
        ↓
Increase race-specific intensity
        ↓
Taper
```

Bakken's recent discussion also describes transitioning from base-oriented threshold work toward shorter, faster and more race-specific work as competition approaches. citeturn0search2

TrainTrack should therefore automatically reduce the relative importance of double-threshold work when the marginal benefit becomes lower than race-specific preparation.

---

# 103. Norwegian Model — Traffic Light Session Control

Add:

```text
SESSION_TRAFFIC_LIGHT
```

Inspired by Bakken's current traffic-light concept.

Inputs can include:

```text
Heart rate at target effort
RPE / perceived feel
Lactate, if available
Pace / power
Previous interval response
Muscular state
```

Output:

```text
GREEN
YELLOW
RED
```

Bakken's current implementation uses the combination of heart rate, subjective feel and optional lactate to determine whether to continue, maintain or stop/reduce a threshold session. citeturn0search4

---

# 104. Traffic Light Logic

## GREEN

Indicators:

- expected HR;
- controlled RPE;
- lactate within target range;
- pace/power appropriate;
- muscular state good.

Action:

```text
Continue as planned.
```

Potentially:

```text
small controlled extension
```

only if the training budget allows it.

---

## YELLOW

Indicators:

- slightly elevated HR;
- normal but heavier RPE;
- lactate slightly above target;
- pace slightly reduced.

Action:

```text
Complete planned session.
Do NOT add load.
```

---

## RED

Indicators:

- unusually high HR;
- heavy RPE;
- clearly elevated lactate;
- deteriorating pace;
- poor muscular response;
- pain / concerning symptoms.

Action:

```text
Stop quality work
→ easy running OR recovery
```

or:

```text
session cancelled
```

Bakken's current traffic-light framework similarly describes green as continuation, yellow as completing without extra load, and red as stopping or switching to easy work. citeturn0search4

---

# 105. Norwegian Model — Session-Level Adaptation

The AI should be able to modify:

```text
interval duration
number of repetitions
recovery duration
pace
power
lactate target
total threshold volume
```

but only within deterministic safety boundaries.

Example:

```text
Planned:
6 × 6 min

After rep 3:
Yellow

Decision:
Continue 6 × 6
Do not extend
```

Another example:

```text
Planned:
6 × 6 min

After rep 2:
Red

Decision:
Stop threshold work
20–30 min easy
```

---

# 106. Norwegian Model — Athlete State Signals

For advanced implementation, add:

```text
threshold_readiness
muscular_readiness
lactate_response
cardiovascular_response
pace_response
RPE_response
```

This allows TrainTrack to distinguish:

```text
Cardiovascularly ready
but
muscularly not ready
```

This is particularly important in running.

---

# 107. Norwegian Model — Muscle Cost

TrainTrack should explicitly model:

```text
MUSCULAR_COST
```

because the Norwegian framework places significant emphasis on the muscular system as a practical limiter of training load.

However:

> This should be treated as a coaching model/hypothesis rather than as an established universal physiological law.

Therefore the system should measure its practical usefulness through athlete response.

---

# 108. Norwegian Model — Flat vs Wave-Like Weeks

The engine should support both:

```text
STRUCTURALLY FLAT
```

and:

```text
LOAD-WAVE
```

weeks.

Bakken's later reflections describe a shift toward more structurally consistent weeks, with adaptation occurring across the broader training cycle rather than relying solely on repeated hard/easy week oscillations. citeturn0search2

TrainTrack should therefore select:

```text
Flat
or
Wave
```

based on:

- athlete response;
- recovery;
- phase;
- competition schedule;
- training age.

---

# 109. Norwegian Model — Data Requirements

### Basic implementation

Can operate with:

```text
RPE
HR
pace
training history
```

### Advanced implementation

Add:

```text
field lactate
lactate curve
standardized threshold sessions
```

### Elite implementation

Potentially:

```text
repeated lactate profiles
standardized test sessions
altitude context
muscular readiness
longitudinal response data
```

The system should degrade gracefully when data is missing.

---

# 110. Norwegian Model — No Lactate Meter Mode

TrainTrack must NOT require lactate testing to use the principles.

If lactate is unavailable:

```text
HR
+
RPE
+
Pace
+
Session Response
```

can be used.

But confidence should be lower:

```text
Lactate-controlled confidence: HIGH
HR/RPE controlled confidence: MODERATE
Pace-only confidence: LOW
```

---

# 111. Norwegian Model — Advanced Eligibility Example

Example athlete:

```text
Training age: 8+ years
Weekly running: stable
Threshold response: strong
Recovery: high
Data quality: high
Lactate testing: available
Mechanical tolerance: high
Goal: 5K / 10K
Phase: base / build
```

Possible output:

```text
Norwegian Lactate-Controlled:
ELIGIBLE

Double Threshold:
CONDITIONALLY ELIGIBLE

Confidence:
HIGH
```

---

# 112. Norwegian Model — Ineligible Example

```text
Training age: 1 year
Weekly volume: unstable
Threshold sessions: frequently failed
Recovery: poor
Sleep: inconsistent
Data quality: low
Mechanical tolerance: uncertain
```

Output:

```text
Norwegian:
NOT RECOMMENDED

Selected:
Pyramidal Foundation

Reason:
The athlete needs greater aerobic consistency and training tolerance
before increasing threshold density.
```

---

# 113. Key Architecture Addition

The methodology selector now becomes:

```text
                    GOAL
                      ↓
                RACE DEMANDS
                      ↓
              ATHLETE CAPABILITIES
                      ↓
                    GAPS
                      ↓
              LIMITING FACTORS
                      ↓
             ADAPTATION PRIORITIES
                      ↓
             ┌────────────────────┐
             │ METHODOLOGY        │
             │ SELECTION ENGINE   │
             └─────────┬──────────┘
                       ↓
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   PYRAMIDAL      POLARIZED      NORWEGIAN
                                    ↓
                              Eligibility Gate
                                    ↓
                              Lactate Control
                                    ↓
                              Threshold Dose
                                    ↓
                           Double Threshold?
                                    ↓
                                X Element
```

---

# 114. Final Norwegian Decision Logic

TrainTrack should effectively ask:

```text
1. Does this athlete need more threshold development?

2. Can this athlete tolerate additional threshold work?

3. Can the athlete control intensity accurately?

4. Is there enough recovery capacity?

5. Is there enough training volume to make the methodology useful?

6. Is the current phase appropriate?

7. Is lactate data available and reliable?

8. Has the athlete historically responded well?

9. Does the expected benefit exceed the additional fatigue and complexity?

10. Would another methodology produce a better adaptation-to-cost ratio?
```

Only if the answers support it:

```text
→ SELECT NORWEGIAN
```

And only if the athlete passes the advanced gate:

```text
→ CONSIDER DOUBLE THRESHOLD
```

---

# 115. Norwegian Model — Product Positioning

TrainTrack should never say:

> "Your plan is Norwegian."

Instead:

> **Training approach: Norwegian lactate-controlled**

And explain:

```text
Why:
High threshold development need
+
Strong training history
+
Good recovery capacity
+
Reliable intensity control
+
Positive historical response

How:
Controlled threshold work
+
large low-intensity volume
+
strategic clustering
+
careful recovery

Review:
After 3–4 weeks of response data
```

This keeps the methodology transparent and avoids turning a coaching framework into a marketing label.

---

# 116. Important Scientific Boundary

TrainTrack documentation should clearly distinguish:

### Evidence-supported principles

- training intensity distribution should be individualized;
- training load and recovery must be managed;
- threshold training is an important endurance stimulus;
- intensity distribution should reflect sport and phase;
- concurrent training creates interaction/interference considerations.

### Bakken's coaching framework / empirical principles

- individual lactate "sweet spot";
- specific lactate ranges used for threshold control;
- clustering threshold sessions;
- double-threshold structure;
- muscular-system interpretation of training cost;
- traffic-light session control;
- specific practical progression strategies.

These should be encoded as **coaching hypotheses and strategies**, not presented as universally proven physiological laws.

---

# 117. TrainTrack's Final Norwegian Philosophy

The TrainTrack implementation should summarize the model as:

> **Train precisely enough to accumulate quality, frequently enough to create adaptation, and conservatively enough to remain repeatable.**

And the system should always ask:

> **Can this athlete absorb more useful work — or would more work simply create more fatigue?**

That question should be more important than the label "Norwegian".
