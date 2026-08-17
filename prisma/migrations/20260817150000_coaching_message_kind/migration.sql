-- CreateEnum
CREATE TYPE "CoachingMessageKind" AS ENUM ('CHAT', 'FEEDBACK');

-- AlterTable
ALTER TABLE "CoachingMessage" ADD COLUMN "kind" "CoachingMessageKind" NOT NULL DEFAULT 'CHAT';

-- Backfill public workout notes that were synced into the thread as chat.
UPDATE "CoachingMessage" AS m
SET "kind" = 'FEEDBACK'
FROM "CoachingThread" AS t
JOIN "WorkoutResult" AS r ON r."workoutId" = t."workoutId"
WHERE m."threadId" = t."id"
  AND m."authorRole" = 'ATHLETE'
  AND r."athleteNotes" IS NOT NULL
  AND r."athleteNotesPrivate" = false
  AND m."body" = r."athleteNotes";
