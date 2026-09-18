-- Multi-week TrainingPlan library (Milestone C)

CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sportFocus" "WorkoutType",
    "weekCount" INTEGER NOT NULL,
    "level" TEXT,
    "target" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingPlanSession" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "WorkoutType" NOT NULL,
    "sessionType" "SessionType" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plannedDistance" DOUBLE PRECISION,
    "plannedDuration" INTEGER,
    "plannedDistanceSource" "PlannedMetricSource",
    "plannedDurationSource" "PlannedMetricSource",
    "coachNotes" TEXT,
    "coachNotesPrivate" BOOLEAN NOT NULL DEFAULT false,
    "structure" JSONB,
    "swimEnvironment" "SwimEnvironment",
    "swimStructure" JSONB,
    "plannedDistanceMeters" INTEGER,
    "plannedDistanceMetersSource" "PlannedMetricSource",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlanSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingPlanPhase" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "phase" "SeasonPhase" NOT NULL,
    "sport" "WorkoutType" NOT NULL,
    "label" TEXT,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,

    CONSTRAINT "TrainingPlanPhase_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Workout" ADD COLUMN "planId" TEXT;
ALTER TABLE "Workout" ADD COLUMN "planSessionId" TEXT;

CREATE INDEX "TrainingPlan_coachId_idx" ON "TrainingPlan"("coachId");
CREATE INDEX "TrainingPlanSession_planId_weekIndex_dayOfWeek_idx" ON "TrainingPlanSession"("planId", "weekIndex", "dayOfWeek");
CREATE INDEX "TrainingPlanPhase_planId_idx" ON "TrainingPlanPhase"("planId");
CREATE INDEX "Workout_planId_idx" ON "Workout"("planId");

ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingPlanSession" ADD CONSTRAINT "TrainingPlanSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingPlanPhase" ADD CONSTRAINT "TrainingPlanPhase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_planSessionId_fkey" FOREIGN KEY ("planSessionId") REFERENCES "TrainingPlanSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
