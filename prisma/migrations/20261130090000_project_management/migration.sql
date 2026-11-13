-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "assigneeId" TEXT,
    "dueDate" DATETIME,
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "overdueNotifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "userId" TEXT,
    "minutes" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "workedOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "rateMinor" INTEGER NOT NULL DEFAULT 0,
    "invoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "ClientProject" ADD COLUMN "hourlyRate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientProject" ADD COLUMN "lastClientUpdateAt" DATETIME;

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_status_dueDate_idx" ON "Task"("status", "dueDate");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_workedOn_idx" ON "TimeEntry"("projectId", "workedOn");

-- CreateIndex
CREATE INDEX "TimeEntry_invoiceId_idx" ON "TimeEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_workedOn_idx" ON "TimeEntry"("userId", "workedOn");

