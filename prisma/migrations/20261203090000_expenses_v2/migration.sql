-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN "receiptFile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN "receiptName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN "receiptMime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Expense" ADD COLUMN "invoiceId" TEXT REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Expense" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL DEFAULT 'software',
    "vendor" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "method" TEXT NOT NULL DEFAULT 'card',
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "nextRunAt" DATETIME NOT NULL,
    "lastRunAt" DATETIME,
    "autoRecord" BOOLEAN NOT NULL DEFAULT true,
    "remindedFor" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_externalId_key" ON "Expense"("externalId");
CREATE INDEX "Expense_projectId_billable_invoiceId_idx" ON "Expense"("projectId", "billable", "invoiceId");
CREATE INDEX "RecurringExpense_active_nextRunAt_idx" ON "RecurringExpense"("active", "nextRunAt");
