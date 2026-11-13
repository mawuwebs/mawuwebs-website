-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL DEFAULT 'other',
    "vendor" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "method" TEXT NOT NULL DEFAULT 'bank',
    "reference" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "spentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Expense_category_spentAt_idx" ON "Expense"("category", "spentAt");
