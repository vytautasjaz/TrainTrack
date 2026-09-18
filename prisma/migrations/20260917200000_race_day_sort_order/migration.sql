-- Same-day order for races among workouts (warm-up / race / cool-down).
ALTER TABLE "Race" ADD COLUMN "daySortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: place each race after that day's workouts, then space multiple races.
WITH workout_max AS (
  SELECT w."athleteId", w."date", COALESCE(MAX(w."sortOrder"), -1) AS max_sort
  FROM "Workout" w
  WHERE w."isRescheduleGhost" = false
  GROUP BY w."athleteId", w."date"
),
ranked AS (
  SELECT
    r."id",
    (COALESCE(wm.max_sort, -1) + 1)
      + (ROW_NUMBER() OVER (
           PARTITION BY r."athleteId", r."date"
           ORDER BY r."name" ASC, r."id" ASC
         ) - 1) AS next_sort
  FROM "Race" r
  LEFT JOIN workout_max wm
    ON wm."athleteId" = r."athleteId" AND wm."date" = r."date"
)
UPDATE "Race" r
SET "daySortOrder" = ranked.next_sort
FROM ranked
WHERE r."id" = ranked."id";
