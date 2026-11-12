-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "bookingUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "featuredImage" TEXT,
    "gallery" TEXT NOT NULL DEFAULT '[]',
    "client" TEXT,
    "projectUrl" TEXT,
    "challenge" TEXT NOT NULL DEFAULT '',
    "solution" TEXT NOT NULL DEFAULT '',
    "results" TEXT NOT NULL DEFAULT '[]',
    "year" TEXT,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" TEXT,
    CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("categoryId", "client", "content", "createdAt", "description", "featured", "featuredImage", "gallery", "id", "metaDescription", "metaKeywords", "metaTitle", "order", "projectUrl", "publishedAt", "slug", "status", "title", "updatedAt") SELECT "categoryId", "client", "content", "createdAt", "description", "featured", "featuredImage", "gallery", "id", "metaDescription", "metaKeywords", "metaTitle", "order", "projectUrl", "publishedAt", "slug", "status", "title", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
