-- Add athlete default weather location fields
ALTER TABLE "Athlete"
ADD COLUMN "weatherLocationName" TEXT,
ADD COLUMN "weatherLat" DOUBLE PRECISION,
ADD COLUMN "weatherLon" DOUBLE PRECISION;
