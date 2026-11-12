-- Where each subscriber signed up (page path).
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "source" TEXT NOT NULL DEFAULT '';
