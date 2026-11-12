-- AlterTable: internal notes on enquiries (SubmissionStatus is stored as TEXT, so the new enum values need no DDL).
ALTER TABLE "ContactSubmission" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
