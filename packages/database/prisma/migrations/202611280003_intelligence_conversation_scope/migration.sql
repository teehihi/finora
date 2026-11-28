ALTER TABLE "IntelligenceTurn" ADD COLUMN "conversationId" TEXT;

CREATE INDEX "IntelligenceTurn_userId_conversationId_createdAt_idx"
ON "IntelligenceTurn"("userId", "conversationId", "createdAt");
