ALTER TABLE "Admin" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN "canManageNotices" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN "canManageEvents" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN "canManageGallery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN "canManageResources" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the original administrator as the sole super administrator.
UPDATE "Admin"
SET "isSuperAdmin" = true
WHERE "id" = (
  SELECT "id" FROM "Admin"
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
);
