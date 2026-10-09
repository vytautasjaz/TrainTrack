-- CreateTable
CREATE TABLE "AiSkillConfig" (
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "systemPrompt" TEXT,
    "audience" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSkillConfig_pkey" PRIMARY KEY ("slug")
);
