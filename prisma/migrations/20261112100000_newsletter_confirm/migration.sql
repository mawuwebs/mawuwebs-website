-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "confirmedAt" DATETIME;
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "token" TEXT;

-- Existing subscribers predate double opt-in: treat them as confirmed and give them an unsubscribe token.
UPDATE "NewsletterSubscriber" SET "confirmedAt" = "createdAt", "token" = lower(hex(randomblob(16)));

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_token_key" ON "NewsletterSubscriber"("token");
