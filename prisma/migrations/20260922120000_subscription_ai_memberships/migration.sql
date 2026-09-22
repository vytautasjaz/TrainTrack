-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "AiUsageKind" AS ENUM ('DRAFT', 'ADAPT');

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "aiDraftsPerMonth" INTEGER NOT NULL DEFAULT 0,
    "aiAdaptsPerMonth" INTEGER NOT NULL DEFAULT 0,
    "maxPlanWeeks" INTEGER NOT NULL DEFAULT 16,
    "enabledSkillSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "kind" "AiUsageKind" NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "athleteId" TEXT,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");

-- CreateIndex
CREATE INDEX "UserMembership_userId_status_idx" ON "UserMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "UserMembership_planId_idx" ON "UserMembership"("planId");

-- CreateIndex
CREATE INDEX "UserMembership_stripeCustomerId_idx" ON "UserMembership"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "UserMembership_stripeSubscriptionId_idx" ON "UserMembership"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_userId_kind_createdAt_idx" ON "AiUsageEvent"("userId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default plans
INSERT INTO "SubscriptionPlan" ("id", "slug", "name", "description", "priceCents", "interval", "aiDraftsPerMonth", "aiAdaptsPerMonth", "maxPlanWeeks", "enabledSkillSlugs", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('plan_free', 'free', 'Free', 'Core training tools without AI drafts.', 0, 'month', 0, 0, 12, ARRAY[]::TEXT[], true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_coach_ai', 'coach-ai', 'Coach AI', 'AI draft and adapt skills for coaches.', 2900, 'month', 20, 10, 24, ARRAY['run-5k-build','run-half-marathon','run-marathon','hyrox-general','multi-sport-base','adapt-plan'], true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_athlete_ai', 'athlete-ai', 'Athlete AI', 'Self-coaching AI drafts from your training history.', 1500, 'month', 8, 4, 16, ARRAY['run-5k-build','run-half-marathon','run-marathon','hyrox-general','multi-sport-base','adapt-plan'], true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
