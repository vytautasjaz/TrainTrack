-- Split DayNote.notes into athlete/coach notes with privacy flags.
ALTER TABLE "DayNote" ADD COLUMN IF NOT EXISTS "athleteNotes" TEXT;
ALTER TABLE "DayNote" ADD COLUMN IF NOT EXISTS "athleteNotesPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DayNote" ADD COLUMN IF NOT EXISTS "coachNotes" TEXT;
ALTER TABLE "DayNote" ADD COLUMN IF NOT EXISTS "coachNotesPrivate" BOOLEAN NOT NULL DEFAULT false;

UPDATE "DayNote" SET "athleteNotes" = "notes" WHERE "notes" IS NOT NULL AND "athleteNotes" IS NULL;

ALTER TABLE "DayNote" DROP COLUMN IF EXISTS "notes";
