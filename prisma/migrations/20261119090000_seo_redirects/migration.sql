-- noindex toggle per content item
ALTER TABLE "Page" ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;

-- search engine verification codes
ALTER TABLE "SiteSettings" ADD COLUMN "googleVerification" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "bingVerification" TEXT;

-- redirect manager
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "permanent" BOOLEAN NOT NULL DEFAULT true,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Redirect_fromPath_key" ON "Redirect"("fromPath");
