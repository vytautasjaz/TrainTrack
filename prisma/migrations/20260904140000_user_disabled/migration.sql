-- Soft-disable accounts for admin panel (cannot sign in while set).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledReason" TEXT;
