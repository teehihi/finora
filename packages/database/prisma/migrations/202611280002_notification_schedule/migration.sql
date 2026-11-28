ALTER TABLE "RepaymentNotification"
  ADD COLUMN "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'queued';
CREATE INDEX "RepaymentNotification_status_scheduledFor_idx"
  ON "RepaymentNotification" ("status", "scheduledFor");
