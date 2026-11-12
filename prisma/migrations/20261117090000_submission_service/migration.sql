-- Which service a project brief was requested for (slug, empty if none).
ALTER TABLE "ContactSubmission" ADD COLUMN "serviceSlug" TEXT NOT NULL DEFAULT '';
CREATE INDEX "ContactSubmission_serviceSlug_idx" ON "ContactSubmission"("serviceSlug");
