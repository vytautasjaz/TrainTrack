-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "coachActivityFeedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "athleteActivityFeedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppSettings" ("id", "coachActivityFeedEnabled", "athleteActivityFeedEnabled", "updatedAt")
VALUES (1, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
