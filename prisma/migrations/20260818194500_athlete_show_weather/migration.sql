-- Show weather above workouts by default; athletes can turn it off in preferences.
ALTER TABLE "Athlete"
ADD COLUMN IF NOT EXISTS "showWeather" BOOLEAN NOT NULL DEFAULT true;
