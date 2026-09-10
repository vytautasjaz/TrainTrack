-- Private season events: athlete-only. New rows default private.
-- Existing events were always visible to coaches — keep them shared.
ALTER TABLE "SeasonEvent" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN;
UPDATE "SeasonEvent" SET "isPrivate" = false WHERE "isPrivate" IS NULL;
ALTER TABLE "SeasonEvent" ALTER COLUMN "isPrivate" SET DEFAULT true;
ALTER TABLE "SeasonEvent" ALTER COLUMN "isPrivate" SET NOT NULL;
