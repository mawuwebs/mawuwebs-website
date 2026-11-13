-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "taxBp" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "dueDays" INTEGER NOT NULL DEFAULT 14,
    "nextRunAt" DATETIME NOT NULL,
    "lastRunAt" DATETIME,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecurringInvoice_active_nextRunAt_idx" ON "RecurringInvoice"("active", "nextRunAt");
