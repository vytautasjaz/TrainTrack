-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "unitSystem" "UnitSystem" NOT NULL DEFAULT 'METRIC';
