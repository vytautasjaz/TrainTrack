-- General athlete–coach chat (not tied to a workout or race)
ALTER TYPE "CoachingThreadKind" ADD VALUE 'GENERAL';

CREATE UNIQUE INDEX "CoachingThread_athleteId_general_key"
  ON "CoachingThread" ("athleteId")
  WHERE "kind" = 'GENERAL';
