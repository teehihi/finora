-- Reviewed user documents are private, not entries in the shared product catalog.
ALTER TABLE "LoanSimulation" ALTER COLUMN "productId" DROP NOT NULL;

CREATE TABLE "DocumentAnalysis" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "synthetic" BOOLEAN NOT NULL DEFAULT false,
  "mode" TEXT NOT NULL,
  "extraction" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentAnalysis_media_check" CHECK ("mime" IN ('application/pdf', 'image/jpeg', 'image/png')),
  CONSTRAINT "DocumentAnalysis_size_check" CHECK ("size" BETWEEN 1 AND 5242880 AND "size" = octet_length("content")),
  CONSTRAINT "DocumentAnalysis_mode_check" CHECK ("mode" IN ('pdf-text', 'local-ocr', 'manual'))
);

CREATE INDEX "DocumentAnalysis_userId_createdAt_idx" ON "DocumentAnalysis"("userId", "createdAt");

ALTER TABLE "DocumentAnalysis" ADD CONSTRAINT "DocumentAnalysis_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
