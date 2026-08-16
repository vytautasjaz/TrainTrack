-- Planned metric provenance (manual vs structure vs companion/pace).
CREATE TYPE "PlannedMetricSource" AS ENUM ('MANUAL', 'STRUCTURE', 'COMPANION');

ALTER TABLE "WorkoutTemplate"
  ADD COLUMN IF NOT EXISTS "durationSource" "PlannedMetricSource",
  ADD COLUMN IF NOT EXISTS "distanceSource" "PlannedMetricSource",
  ADD COLUMN IF NOT EXISTS "plannedDistanceMetersSource" "PlannedMetricSource";

ALTER TABLE "Workout"
  ADD COLUMN IF NOT EXISTS "plannedDistanceSource" "PlannedMetricSource",
  ADD COLUMN IF NOT EXISTS "plannedDurationSource" "PlannedMetricSource",
  ADD COLUMN IF NOT EXISTS "plannedDistanceMetersSource" "PlannedMetricSource";

-- Backfill workouts from legacy approx tags (approx → COMPANION; otherwise MANUAL when value set).
UPDATE "Workout"
SET "plannedDurationSource" = CASE
  WHEN "plannedDuration" IS NULL THEN NULL
  WHEN 'approx:duration' = ANY("tags") OR 'bikeApprox:duration' = ANY("tags") THEN 'COMPANION'::"PlannedMetricSource"
  ELSE 'MANUAL'::"PlannedMetricSource"
END
WHERE "plannedDurationSource" IS NULL;

UPDATE "Workout"
SET "plannedDistanceSource" = CASE
  WHEN "plannedDistance" IS NULL THEN NULL
  WHEN 'approx:distance' = ANY("tags") OR 'bikeApprox:distance' = ANY("tags") THEN 'COMPANION'::"PlannedMetricSource"
  ELSE 'MANUAL'::"PlannedMetricSource"
END
WHERE "plannedDistanceSource" IS NULL;

UPDATE "Workout"
SET "plannedDistanceMetersSource" = CASE
  WHEN "plannedDistanceMeters" IS NULL THEN NULL
  ELSE 'MANUAL'::"PlannedMetricSource"
END
WHERE "plannedDistanceMetersSource" IS NULL;

-- Structured workouts with approx tags are better labeled STRUCTURE.
UPDATE "Workout"
SET "plannedDurationSource" = 'STRUCTURE'::"PlannedMetricSource"
WHERE "structure" IS NOT NULL
  AND "plannedDuration" IS NOT NULL
  AND ("plannedDurationSource" = 'COMPANION'::"PlannedMetricSource");

UPDATE "Workout"
SET "plannedDistanceSource" = 'STRUCTURE'::"PlannedMetricSource"
WHERE "structure" IS NOT NULL
  AND "plannedDistance" IS NOT NULL
  AND ("plannedDistanceSource" = 'COMPANION'::"PlannedMetricSource");

UPDATE "WorkoutTemplate"
SET "durationSource" = CASE
  WHEN "durationMin" IS NULL THEN NULL
  WHEN 'approx:duration' = ANY("tags") OR 'bikeApprox:duration' = ANY("tags") THEN 'COMPANION'::"PlannedMetricSource"
  ELSE 'MANUAL'::"PlannedMetricSource"
END
WHERE "durationSource" IS NULL;

UPDATE "WorkoutTemplate"
SET "distanceSource" = CASE
  WHEN "distanceKm" IS NULL THEN NULL
  WHEN 'approx:distance' = ANY("tags") OR 'bikeApprox:distance' = ANY("tags") THEN 'COMPANION'::"PlannedMetricSource"
  ELSE 'MANUAL'::"PlannedMetricSource"
END
WHERE "distanceSource" IS NULL;

UPDATE "WorkoutTemplate"
SET "plannedDistanceMetersSource" = CASE
  WHEN "plannedDistanceMeters" IS NULL THEN NULL
  ELSE 'MANUAL'::"PlannedMetricSource"
END
WHERE "plannedDistanceMetersSource" IS NULL;

UPDATE "WorkoutTemplate"
SET "durationSource" = 'STRUCTURE'::"PlannedMetricSource"
WHERE "structure" IS NOT NULL
  AND "durationMin" IS NOT NULL
  AND ("durationSource" = 'COMPANION'::"PlannedMetricSource");

UPDATE "WorkoutTemplate"
SET "distanceSource" = 'STRUCTURE'::"PlannedMetricSource"
WHERE "structure" IS NOT NULL
  AND "distanceKm" IS NOT NULL
  AND ("distanceSource" = 'COMPANION'::"PlannedMetricSource");
