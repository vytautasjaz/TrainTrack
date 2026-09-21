-- Optional phase breakdown of Race.preparationWeeks (Base / Build / … / Taper).
ALTER TABLE "Race" ADD COLUMN "preparationBlocks" JSONB;
