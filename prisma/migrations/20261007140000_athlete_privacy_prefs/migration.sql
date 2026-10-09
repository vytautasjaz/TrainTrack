-- Athlete-controlled privacy (Strava visibility, coach visibility of logs).
ALTER TABLE "Athlete" ADD COLUMN "privacyPrefs" JSONB;
