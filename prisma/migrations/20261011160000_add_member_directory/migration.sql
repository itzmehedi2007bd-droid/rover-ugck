ALTER TABLE "Admin" ADD COLUMN "canManageMembers" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "batch" TEXT,
    "memberNumber" TEXT,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Member_memberNumber_key" ON "Member"("memberNumber");
CREATE INDEX "Member_published_displayOrder_idx" ON "Member"("published", "displayOrder");
