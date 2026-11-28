ALTER TABLE "TrackedRepayment"
  ADD COLUMN "state" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "preparation" JSONB;

ALTER TABLE "RepaymentPayment"
  ADD COLUMN "amount" DECIMAL(15,0),
  ADD COLUMN "paidOn" DATE;

CREATE TABLE "RepaymentPaymentAudit" (
  "id" TEXT NOT NULL,
  "repaymentId" TEXT NOT NULL,
  "period" INTEGER NOT NULL CHECK ("period" BETWEEN 1 AND 360),
  "requestId" TEXT NOT NULL,
  "previousAmount" DECIMAL(15,0) NOT NULL,
  "newAmount" DECIMAL(15,0) NOT NULL,
  "paidOn" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepaymentPaymentAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepaymentPaymentAudit_repaymentId_fkey" FOREIGN KEY ("repaymentId")
    REFERENCES "TrackedRepayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RepaymentPaymentAudit_repaymentId_requestId_key"
  ON "RepaymentPaymentAudit" ("repaymentId", "requestId");
CREATE INDEX "RepaymentPaymentAudit_repaymentId_period_createdAt_idx"
  ON "RepaymentPaymentAudit" ("repaymentId", "period", "createdAt");

CREATE TABLE "NotificationPreference" (
  "userId" TEXT NOT NULL,
  "timeZone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  "quietStart" INTEGER NOT NULL DEFAULT 22 CHECK ("quietStart" BETWEEN 0 AND 23),
  "quietEnd" INTEGER NOT NULL DEFAULT 8 CHECK ("quietEnd" BETWEEN 0 AND 23),
  "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "shortfallEnabled" BOOLEAN NOT NULL DEFAULT true,
  "profileReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RepaymentNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "repaymentId" TEXT,
  "period" INTEGER,
  "kind" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "triggerDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "emailStatus" TEXT NOT NULL DEFAULT 'disabled',
  "emailAttempts" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "emailedAt" TIMESTAMP(3),
  CONSTRAINT "RepaymentNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepaymentNotification_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RepaymentNotification_repaymentId_fkey" FOREIGN KEY ("repaymentId")
    REFERENCES "TrackedRepayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RepaymentNotification_userId_dedupKey_key"
  ON "RepaymentNotification" ("userId", "dedupKey");
CREATE INDEX "RepaymentNotification_userId_createdAt_idx"
  ON "RepaymentNotification" ("userId", "createdAt");
CREATE INDEX "RepaymentNotification_emailStatus_nextRetryAt_idx"
  ON "RepaymentNotification" ("emailStatus", "nextRetryAt");
