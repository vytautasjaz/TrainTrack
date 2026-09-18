-- Relative race day markers inside a training plan (materialized on apply).
CREATE TABLE "TrainingPlanRacePlaceholder" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "type" "RaceType" NOT NULL,
    "sport" "WorkoutType" NOT NULL DEFAULT 'RUN',
    "priority" "RacePriority" NOT NULL DEFAULT 'C',
    "location" TEXT,
    "goal" TEXT,
    "courseType" "RaceCourseType",
    "triathlonDistance" "TriathlonDistance",
    "hyroxDivision" "HyroxDivision",
    "customDistanceKm" DOUBLE PRECISION,
    "preparationWeeks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlanRacePlaceholder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrainingPlanRacePlaceholder_planId_weekIndex_dayOfWeek_idx" ON "TrainingPlanRacePlaceholder"("planId", "weekIndex", "dayOfWeek");

ALTER TABLE "TrainingPlanRacePlaceholder" ADD CONSTRAINT "TrainingPlanRacePlaceholder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
