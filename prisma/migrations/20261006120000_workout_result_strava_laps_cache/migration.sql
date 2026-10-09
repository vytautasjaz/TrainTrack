-- AlterTable
ALTER TABLE "WorkoutResult" ADD COLUMN IF NOT EXISTS "stravaLapsCache" JSONB;
