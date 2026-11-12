-- When the status last changed, so "won this period" reports on deals closed, not leads received.
-- Existing rows are backfilled with the best available date (reply date, else arrival date).
ALTER TABLE "ContactSubmission" ADD COLUMN "statusChangedAt" DATETIME;
UPDATE "ContactSubmission" SET "statusChangedAt" = COALESCE("repliedAt", "createdAt") WHERE "status" != 'NEW';
