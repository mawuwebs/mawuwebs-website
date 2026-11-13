-- CreateTable
CREATE TABLE "BillingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "legalName" TEXT NOT NULL DEFAULT '',
    "taxId" TEXT NOT NULL DEFAULT '',
    "paymentInstructions" TEXT NOT NULL DEFAULT '',
    "quoteTerms" TEXT NOT NULL DEFAULT '',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'GHS',
    "defaultTaxBp" INTEGER NOT NULL DEFAULT 0,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 14,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "quoteId" TEXT,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "taxBp" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "token" TEXT NOT NULL,
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "kind" TEXT NOT NULL DEFAULT 'full',
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "currency", "dueDate", "id", "issueDate", "notes", "number", "paidAt", "projectId", "quoteId", "sentAt", "status", "taxBp", "title", "token", "updatedAt", "userId") SELECT "createdAt", "currency", "dueDate", "id", "issueDate", "notes", "number", "paidAt", "projectId", "quoteId", "sentAt", "status", "taxBp", "title", "token", "updatedAt", "userId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX "Invoice_token_key" ON "Invoice"("token");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "submissionId" TEXT,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "taxBp" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "validUntil" DATETIME,
    "depositPct" INTEGER NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "sentAt" DATETIME,
    "acceptedAt" DATETIME,
    "acceptedBy" TEXT,
    "declinedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ContactSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("acceptedAt", "acceptedBy", "createdAt", "currency", "declinedAt", "id", "notes", "number", "projectId", "sentAt", "status", "submissionId", "taxBp", "title", "token", "updatedAt", "userId", "validUntil") SELECT "acceptedAt", "acceptedBy", "createdAt", "currency", "declinedAt", "id", "notes", "number", "projectId", "sentAt", "status", "submissionId", "taxBp", "title", "token", "updatedAt", "userId", "validUntil" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");
CREATE UNIQUE INDEX "Quote_token_key" ON "Quote"("token");
CREATE INDEX "Quote_userId_createdAt_idx" ON "Quote"("userId", "createdAt");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
