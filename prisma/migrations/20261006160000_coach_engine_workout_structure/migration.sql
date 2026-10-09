-- AlterTable
ALTER TABLE "CoachEngineWorkout" ADD COLUMN IF NOT EXISTS "structure" JSONB;
ALTER TABLE "CoachEngineWorkout" ADD COLUMN IF NOT EXISTS "swimStructure" JSONB;
