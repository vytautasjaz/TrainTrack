-- CreateTable
CREATE TABLE "CoachAttentionDismissal" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "contextAt" TEXT NOT NULL DEFAULT '',
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachAttentionDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachAttentionDismissal_coachUserId_idx" ON "CoachAttentionDismissal"("coachUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachAttentionDismissal_coachUserId_itemKey_key" ON "CoachAttentionDismissal"("coachUserId", "itemKey");

-- AddForeignKey
ALTER TABLE "CoachAttentionDismissal" ADD CONSTRAINT "CoachAttentionDismissal_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
