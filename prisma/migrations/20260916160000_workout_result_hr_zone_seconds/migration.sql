-- Persist Strava HR time-in-zone seconds for zone-based TSS.
ALTER TABLE "WorkoutResult" ADD COLUMN IF NOT EXISTS "hrZoneSeconds" JSONB;
