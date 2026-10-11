-- Add the resource category required by the PDF management UI.
ALTER TABLE "Resource" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'অন্যান্য';
