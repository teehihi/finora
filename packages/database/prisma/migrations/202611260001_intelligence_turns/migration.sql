CREATE TABLE "IntelligenceTurn" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "simulationId" TEXT,
  "blocks" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntelligenceTurn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntelligenceTurn_userId_requestId_key"
  ON "IntelligenceTurn"("userId", "requestId");
CREATE INDEX "IntelligenceTurn_userId_createdAt_idx"
  ON "IntelligenceTurn"("userId", "createdAt");
ALTER TABLE "IntelligenceTurn"
  ADD CONSTRAINT "IntelligenceTurn_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
