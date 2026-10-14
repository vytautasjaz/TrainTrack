-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('TRAINTRACK', 'FREE_EXERCISE_DB', 'EXERCISE_DB', 'USER', 'OTHER');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "movementPattern" TEXT,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secondaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prescriptionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT,
    "instructions" TEXT,
    "variationType" TEXT,
    "canonicalExerciseId" TEXT,
    "source" "ExerciseSource" NOT NULL DEFAULT 'TRAINTRACK',
    "sourceId" TEXT,
    "sourceMetadata" JSONB,
    "coachId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_coachId_isActive_idx" ON "Exercise"("coachId", "isActive");

-- CreateIndex
CREATE INDEX "Exercise_source_idx" ON "Exercise"("source");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");

-- CreateIndex
CREATE INDEX "Exercise_canonicalExerciseId_idx" ON "Exercise"("canonicalExerciseId");

-- CreateIndex
CREATE INDEX "Exercise_canonicalName_idx" ON "Exercise"("canonicalName");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_canonicalExerciseId_fkey" FOREIGN KEY ("canonicalExerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
