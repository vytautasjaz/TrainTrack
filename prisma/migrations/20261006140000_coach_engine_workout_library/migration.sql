-- CreateTable
CREATE TABLE "CoachEngineWorkout" (
    "id" TEXT NOT NULL,
    "primaryAdaptation" TEXT NOT NULL,
    "sport" "WorkoutType" NOT NULL,
    "sessionType" "SessionType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "distanceKm" DOUBLE PRECISION,
    "cardiovascularLoad" TEXT NOT NULL DEFAULT 'low',
    "muscularLoad" TEXT NOT NULL DEFAULT 'low',
    "mechanicalLoad" TEXT NOT NULL DEFAULT 'low',
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intervalCount" INTEGER,
    "intervalDurationMin" DOUBLE PRECISION,
    "recoveryMin" DOUBLE PRECISION,
    "methodologyTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progressionTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "family" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachEngineWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachEngineWorkout_isActive_sport_idx" ON "CoachEngineWorkout"("isActive", "sport");

-- CreateIndex
CREATE INDEX "CoachEngineWorkout_primaryAdaptation_idx" ON "CoachEngineWorkout"("primaryAdaptation");
