-- CreateEnum
CREATE TYPE "SwimDistanceUnit" AS ENUM ('METERS', 'YARDS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "swimDistanceUnit" "SwimDistanceUnit" NOT NULL DEFAULT 'METERS';
