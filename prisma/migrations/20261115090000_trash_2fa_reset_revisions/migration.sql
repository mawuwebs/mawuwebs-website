-- Trash + scheduled publishing for pages, projects and services.
ALTER TABLE "Page" ADD COLUMN "scheduledAt" DATETIME;
ALTER TABLE "Page" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "scheduledAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Service" ADD COLUMN "scheduledAt" DATETIME;
ALTER TABLE "Service" ADD COLUMN "deletedAt" DATETIME;

-- Two-factor authentication and password changes.
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "totpLastStep" INTEGER;
ALTER TABLE "User" ADD COLUMN "recoveryCodes" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" DATETIME;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "authorName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Revision_entityType_entityId_createdAt_idx" ON "Revision"("entityType", "entityId", "createdAt");
