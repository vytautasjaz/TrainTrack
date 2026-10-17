-- CreateTable
CREATE TABLE "AthletePhysiologySnapshot" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "modelJson" JSONB NOT NULL,
    "fingerprintJson" JSONB NOT NULL,
    "predictionJson" JSONB,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthletePhysiologySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthletePhysiologySnapshot_athleteId_asOf_idx" ON "AthletePhysiologySnapshot"("athleteId", "asOf");

-- AddForeignKey
ALTER TABLE "AthletePhysiologySnapshot" ADD CONSTRAINT "AthletePhysiologySnapshot_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
