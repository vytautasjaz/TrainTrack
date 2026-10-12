-- AlterTable
ALTER TABLE "SeasonEvent" ADD COLUMN "createdByRole" "CoachingAuthorRole" NOT NULL DEFAULT 'ATHLETE';

-- Backfill: private events are athlete-authored; shared events are usually coach-created.
UPDATE "SeasonEvent" SET "createdByRole" = 'COACH' WHERE "isPrivate" = false;
