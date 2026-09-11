-- CreateEnum
CREATE TYPE "HyroxDivision" AS ENUM (
  'MEN',
  'WOMEN',
  'PRO_MEN',
  'PRO_WOMEN',
  'ADAPTIVE_MEN',
  'ADAPTIVE_WOMEN',
  'DOUBLES_MEN',
  'DOUBLES_WOMEN',
  'DOUBLES_MIXED',
  'PRO_DOUBLES_MEN',
  'PRO_DOUBLES_WOMEN',
  'RELAY_MEN',
  'RELAY_WOMEN',
  'RELAY_MIXED'
);

-- AlterTable
ALTER TABLE "Race" ADD COLUMN "hyroxDivision" "HyroxDivision";
