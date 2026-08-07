-- Preserve the uploaded notice metadata and expose processing failures to the UI.
ALTER TABLE "notices"
  ADD COLUMN "document_name" TEXT,
  ADD COLUMN "document_size" INTEGER,
  ADD COLUMN "document_mime_type" TEXT,
  ADD COLUMN "ai_error" TEXT;
