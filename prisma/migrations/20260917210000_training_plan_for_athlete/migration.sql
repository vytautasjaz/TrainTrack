-- AlterTable
ALTER TABLE "TrainingPlan" ADD COLUMN "forAthleteId" TEXT;

-- CreateIndex
CREATE INDEX "TrainingPlan_forAthleteId_idx" ON "TrainingPlan"("forAthleteId");

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_forAthleteId_fkey" FOREIGN KEY ("forAthleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;
