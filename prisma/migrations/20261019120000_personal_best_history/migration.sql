-- CreateTable
CREATE TABLE "PersonalBestHistory" (
    "id" TEXT NOT NULL,
    "personalBestId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metric" "PersonalBestMetric" NOT NULL,
    "dateText" TEXT,
    "event" TEXT,
    "raceId" TEXT,
    "supersededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalBestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalBestHistory_personalBestId_supersededAt_idx" ON "PersonalBestHistory"("personalBestId", "supersededAt");

-- CreateIndex
CREATE INDEX "PersonalBestHistory_athleteId_personalBestId_idx" ON "PersonalBestHistory"("athleteId", "personalBestId");

-- AddForeignKey
ALTER TABLE "PersonalBestHistory" ADD CONSTRAINT "PersonalBestHistory_personalBestId_fkey" FOREIGN KEY ("personalBestId") REFERENCES "PersonalBest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBestHistory" ADD CONSTRAINT "PersonalBestHistory_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
