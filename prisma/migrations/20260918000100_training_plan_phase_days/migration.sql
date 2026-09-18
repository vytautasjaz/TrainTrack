-- Day-indexed plan phases (Mon W1 = 0). Backfill full weeks from legacy week spans.
ALTER TABLE "TrainingPlanPhase" ADD COLUMN IF NOT EXISTS "startDay" INTEGER;
ALTER TABLE "TrainingPlanPhase" ADD COLUMN IF NOT EXISTS "endDay" INTEGER;

UPDATE "TrainingPlanPhase"
SET
  "startDay" = "startWeek" * 7,
  "endDay" = "endWeek" * 7 + 6
WHERE "startDay" IS NULL OR "endDay" IS NULL;

ALTER TABLE "TrainingPlanPhase" ALTER COLUMN "startDay" SET NOT NULL;
ALTER TABLE "TrainingPlanPhase" ALTER COLUMN "endDay" SET NOT NULL;

ALTER TABLE "TrainingPlanPhase" DROP COLUMN IF EXISTS "startWeek";
ALTER TABLE "TrainingPlanPhase" DROP COLUMN IF EXISTS "endWeek";
