-- Enquiry pipeline: explicit kind, quote value, follow-up date, reply timestamp.
ALTER TABLE "ContactSubmission" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'message';
ALTER TABLE "ContactSubmission" ADD COLUMN "quoteAmount" INTEGER;
ALTER TABLE "ContactSubmission" ADD COLUMN "followUpAt" DATETIME;
ALTER TABLE "ContactSubmission" ADD COLUMN "repliedAt" DATETIME;

UPDATE "ContactSubmission" SET "kind" = CASE
  WHEN "subject" = 'Project brief' THEN 'brief'
  WHEN "subject" = 'Project estimate' THEN 'estimate'
  WHEN "subject" = 'Support request' THEN 'support'
  WHEN "subject" LIKE 'Plan enquiry:%' THEN 'plan'
  ELSE 'message'
END;

CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");
CREATE INDEX "ContactSubmission_kind_idx" ON "ContactSubmission"("kind");

-- Posts: scheduled publishing and soft delete (trash).
ALTER TABLE "Post" ADD COLUMN "scheduledAt" DATETIME;
ALTER TABLE "Post" ADD COLUMN "deletedAt" DATETIME;
