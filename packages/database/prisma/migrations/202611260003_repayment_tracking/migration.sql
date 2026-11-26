-- Retain existing simulations and require the same owner on both tracked record and snapshot.
CREATE UNIQUE INDEX "LoanSimulation_id_userId_key" ON "LoanSimulation" ("id", "userId");

CREATE TABLE "TrackedRepayment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "simulationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrackedRepayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrackedRepayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrackedRepayment_simulationId_userId_fkey" FOREIGN KEY ("simulationId", "userId")
    REFERENCES "LoanSimulation" ("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TrackedRepayment_userId_simulationId_key"
  ON "TrackedRepayment" ("userId", "simulationId");
CREATE INDEX "TrackedRepayment_userId_createdAt_idx" ON "TrackedRepayment" ("userId", "createdAt");

CREATE TABLE "RepaymentPayment" (
  "repaymentId" TEXT NOT NULL,
  "period" INTEGER NOT NULL CHECK ("period" BETWEEN 1 AND 360),
  "paid" BOOLEAN NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepaymentPayment_pkey" PRIMARY KEY ("repaymentId", "period"),
  CONSTRAINT "RepaymentPayment_repaymentId_fkey" FOREIGN KEY ("repaymentId")
    REFERENCES "TrackedRepayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
