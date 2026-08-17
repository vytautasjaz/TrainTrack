-- CreateEnum
CREATE TYPE "CoachingThreadKind" AS ENUM ('ASK', 'FEEDBACK', 'RACE_REPORT');

-- CreateEnum
CREATE TYPE "CoachingThreadStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CoachingAuthorRole" AS ENUM ('ATHLETE', 'COACH');

-- CreateTable
CREATE TABLE "CoachingThread" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "kind" "CoachingThreadKind" NOT NULL,
    "status" "CoachingThreadStatus" NOT NULL DEFAULT 'OPEN',
    "workoutId" TEXT,
    "raceId" TEXT,
    "coachLastReadAt" TIMESTAMP(3),
    "athleteLastReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorRole" "CoachingAuthorRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachingThread_workoutId_key" ON "CoachingThread"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingThread_raceId_key" ON "CoachingThread"("raceId");

-- CreateIndex
CREATE INDEX "CoachingThread_athleteId_lastMessageAt_idx" ON "CoachingThread"("athleteId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "CoachingThread_athleteId_status_lastMessageAt_idx" ON "CoachingThread"("athleteId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "CoachingThread_kind_lastMessageAt_idx" ON "CoachingThread"("kind", "lastMessageAt");

-- CreateIndex
CREATE INDEX "CoachingMessage_threadId_createdAt_idx" ON "CoachingMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachingThread" ADD CONSTRAINT "CoachingThread_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingThread" ADD CONSTRAINT "CoachingThread_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingThread" ADD CONSTRAINT "CoachingThread_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingMessage" ADD CONSTRAINT "CoachingMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CoachingThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
