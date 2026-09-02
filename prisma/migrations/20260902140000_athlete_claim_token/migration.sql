-- Add personal claim link for coach-managed athlete profiles (no linked User yet).
ALTER TABLE "Athlete" ADD COLUMN "claimToken" TEXT;

CREATE UNIQUE INDEX "Athlete_claimToken_key" ON "Athlete"("claimToken");
