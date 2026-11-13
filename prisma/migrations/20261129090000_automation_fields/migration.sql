-- AlterTable
ALTER TABLE "ClientAsset" ADD COLUMN "renewalStage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientAsset" ADD COLUMN "monitorUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ClientAsset" ADD COLUMN "monitorDownSince" DATETIME;
ALTER TABLE "ClientAsset" ADD COLUMN "monitorCheckedAt" DATETIME;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "nudgedAt" DATETIME;

-- CreateIndex
CREATE INDEX "ClientAsset_monitorUrl_idx" ON "ClientAsset"("monitorUrl");
