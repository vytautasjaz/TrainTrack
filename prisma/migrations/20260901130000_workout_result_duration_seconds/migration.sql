-- AlterTable: keep second precision from Strava (e.g. 26:03 → 26.05 minutes)
ALTER TABLE "WorkoutResult" ALTER COLUMN "actualDuration" TYPE DOUBLE PRECISION;
