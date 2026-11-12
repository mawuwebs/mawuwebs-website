-- AlterTable
ALTER TABLE "Service" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Software & Web';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "serviceArea" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "supportPromise" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "trustLogos" TEXT NOT NULL DEFAULT '[]';

-- Group existing services
UPDATE "Service" SET "category" = 'Infrastructure & Security' WHERE "slug" IN ('networking-infrastructure','cybersecurity','cloud-devops','hardware-equipment','backup-disaster-recovery');
UPDATE "Service" SET "category" = 'Support & Advisory' WHERE "slug" IN ('it-support-managed-services','it-consulting-training');
