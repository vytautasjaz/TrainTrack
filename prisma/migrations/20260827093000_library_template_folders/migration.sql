-- Library topic folders (per sport) + optional folder on templates
CREATE TABLE "WorkoutTemplateFolder" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "sport" "WorkoutType" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplateFolder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutTemplateFolder_coachId_sport_idx" ON "WorkoutTemplateFolder"("coachId", "sport");

CREATE UNIQUE INDEX "WorkoutTemplateFolder_coachId_sport_name_key" ON "WorkoutTemplateFolder"("coachId", "sport", "name");

ALTER TABLE "WorkoutTemplateFolder" ADD CONSTRAINT "WorkoutTemplateFolder_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutTemplate" ADD COLUMN "folderId" TEXT;

CREATE INDEX "WorkoutTemplate_folderId_idx" ON "WorkoutTemplate"("folderId");

ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WorkoutTemplateFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
