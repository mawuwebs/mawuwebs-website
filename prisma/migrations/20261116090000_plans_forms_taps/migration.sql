-- Managed plans move from code into the database so they can be edited in the admin.
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "forWho" TEXT NOT NULL DEFAULT '',
    "features" TEXT NOT NULL DEFAULT '[]',
    "price" TEXT,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "scheduledAt" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

INSERT INTO "Plan" ("id","slug","name","tagline","forWho","features","highlight","order","status","publishedAt","createdAt","updatedAt") VALUES ('plan_essential','essential','Essential','A safety net for small teams','Small offices that mostly need someone to call when things go wrong.','["Remote help desk for staff", "Email and account support", "Antivirus and update management", "Phone and WhatsApp support during business hours", "Pay-as-you-go on-site visits"]',0,0,'PUBLISHED',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT INTO "Plan" ("id","slug","name","tagline","forWho","features","highlight","order","status","publishedAt","createdAt","updatedAt") VALUES ('plan_standard','standard','Standard','Proactive care, fewer surprises','Growing businesses that want problems caught before they stop work.','["Everything in Essential", "Monitoring of computers, network and servers", "Scheduled on-site visits", "Backup management with restore checks", "Security reviews and staff guidance", "Priority response"]',1,1,'PUBLISHED',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT INTO "Plan" ("id","slug","name","tagline","forWho","features","highlight","order","status","publishedAt","createdAt","updatedAt") VALUES ('plan_premium','premium','Premium','IT handled end to end','Businesses where downtime is costly and IT needs a dedicated owner.','["Everything in Standard", "Named technician and account contact", "Extended-hours and emergency support", "IT planning, budgeting and vendor management", "New staff and equipment onboarding", "Regular reporting"]',0,2,'PUBLISHED',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

CREATE TABLE "FormConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ContactClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ContactClick_createdAt_idx" ON "ContactClick"("createdAt");

-- Urgent support requests become a real column instead of text inside the message.
ALTER TABLE "ContactSubmission" ADD COLUMN "urgent" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ContactSubmission" SET "urgent" = 1 WHERE "kind" = 'support' AND "message" LIKE '%Urgency: Urgent%';

-- Unsubscribes are kept (as a suppression record) instead of deleted.
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "unsubscribedAt" DATETIME;
