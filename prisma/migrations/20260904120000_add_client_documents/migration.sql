-- CreateEnum
CREATE TYPE "DocumentExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'NEEDS_REVIEW');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'GST_RETURN';
ALTER TYPE "DocumentType" ADD VALUE 'FORM_26AS';
ALTER TYPE "DocumentType" ADD VALUE 'ITR_ACKNOWLEDGMENT';
ALTER TYPE "DocumentType" ADD VALUE 'NOTICE';
ALTER TYPE "DocumentType" ADD VALUE 'LEDGER';
ALTER TYPE "DocumentType" ADD VALUE 'AADHAR_CARD';
ALTER TYPE "DocumentType" ADD VALUE 'PROFIT_LOSS_STATEMENT';
ALTER TYPE "DocumentType" ADD VALUE 'AUDIT_REPORT';

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "file_hash" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "document_period" TEXT,
    "extracted_document_date" TIMESTAMP(3),
    "extraction_status" "DocumentExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extraction_confidence" DOUBLE PRECISION,
    "extraction_failure_reason" TEXT,
    "extracted_metadata" JSONB,
    "is_latest_version" BOOLEAN NOT NULL DEFAULT false,
    "supersedes_document_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_documents_storage_path_key" ON "client_documents"("storage_path");
CREATE INDEX "client_documents_client_id_document_type_document_period_idx" ON "client_documents"("client_id", "document_type", "document_period");
CREATE INDEX "client_documents_client_id_extraction_status_idx" ON "client_documents"("client_id", "extraction_status");
CREATE UNIQUE INDEX "client_documents_client_id_file_hash_key" ON "client_documents"("client_id", "file_hash");

ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_supersedes_document_id_fkey" FOREIGN KEY ("supersedes_document_id") REFERENCES "client_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
