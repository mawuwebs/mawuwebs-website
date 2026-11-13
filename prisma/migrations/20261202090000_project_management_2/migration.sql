-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATETIME,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "billAmount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "approvalRequestedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "invoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "fromClient" BOOLEAN NOT NULL DEFAULT false,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clientVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- AlterTable (plain column adds: no table rebuilds, so existing rows are untouched)
ALTER TABLE "ClientProject" ADD COLUMN "budgetMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientProject" ADD COLUMN "fixedPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "milestoneId" TEXT REFERENCES "Milestone" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD COLUMN "fromClient" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "ticketId" TEXT REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD COLUMN "projectId" TEXT REFERENCES "ClientProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD COLUMN "calendarToken" TEXT;

-- Move the old text milestones (JSON on ClientProject.milestones) into real rows. The old column is kept, unused.
INSERT INTO "Milestone" ("id", "projectId", "title", "position", "completedAt", "createdAt")
SELECT lower(hex(randomblob(12))), p."id",
       substr(trim(CASE WHEN j."type" = 'object' THEN coalesce(json_extract(j."value", '$.title'), '') ELSE '' END), 1, 140),
       CAST(j."key" AS INTEGER),
       CASE WHEN j."type" = 'object' AND json_extract(j."value", '$.done') IN (1, 'true') THEN CURRENT_TIMESTAMP END,
       CURRENT_TIMESTAMP
FROM "ClientProject" p, json_each(CASE WHEN json_valid(p."milestones") THEN CASE WHEN json_type(p."milestones") = 'array' THEN p."milestones" ELSE '[]' END ELSE '[]' END) j
WHERE trim(CASE WHEN j."type" = 'object' THEN coalesce(json_extract(j."value", '$.title'), '') ELSE '' END) <> '';

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");
CREATE INDEX "Task_ticketId_idx" ON "Task"("ticketId");
CREATE INDEX "Ticket_projectId_idx" ON "Ticket"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_position_idx" ON "Milestone"("projectId", "position");

-- CreateIndex
CREATE INDEX "ProjectComment_projectId_createdAt_idx" ON "ProjectComment"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_createdAt_idx" ON "ProjectFile"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_name_key" ON "ProjectTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");