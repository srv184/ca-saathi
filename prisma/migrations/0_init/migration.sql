-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AiStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "public"."ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."DocumentSource" AS ENUM ('CA_UPLOAD', 'CLIENT_PORTAL', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('FORM_16', 'FORM_16A', 'BANK_STATEMENT', 'GSTR_2B', 'GSTR_1', 'PURCHASE_REGISTER', 'BALANCE_SHEET', 'PL_STATEMENT', 'ITR_COPY', 'PAN_CARD', 'AADHAAR', 'IT_NOTICE', 'GST_NOTICE', 'TDS_CERTIFICATE', 'INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'TRUST', 'HUF');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NoticePortal" AS ENUM ('INCOME_TAX', 'GST', 'TRACES', 'MCA');

-- CreateEnum
CREATE TYPE "public"."NoticeType" AS ENUM ('SCRUTINY_143_2', 'DEFECTIVE_RETURN', 'DEMAND_156', 'RECTIFICATION', 'REFUND_QUERY', 'HIGH_VALUE_TXN', 'GST_ITC_MISMATCH', 'GST_RETURN_DEFAULT', 'GST_SCN', 'TDS_DEFAULT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('STUDENT', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'BETA');

-- CreateEnum
CREATE TYPE "public"."ReconStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('DRAFT', 'REVIEWED', 'FILED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'SENIOR_CA', 'JUNIOR_CA', 'ARTICLE');

-- CreateTable
CREATE TABLE "public"."account_deletion_requests" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduled_deletion_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."changelog_entries" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "changelog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_portal_sessions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "pin_hash" TEXT,
    "pin_attempt_count" INTEGER NOT NULL DEFAULT 0,
    "pin_locked_until" TIMESTAMP(3),
    "total_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "pin_history" TEXT[],
    "pin_reset_token_hash" TEXT,
    "pin_reset_expires_at" TIMESTAMP(3),
    "change_pin_token_hash" TEXT,
    "change_pin_expires_at" TIMESTAMP(3),
    "device_trust_token_hash" TEXT,
    "device_fingerprint" TEXT,
    "webauthn_credential_id" TEXT,
    "webauthn_public_key" TEXT,
    "webauthn_counter" INTEGER NOT NULL DEFAULT 0,
    "push_subscription" JSONB,
    "biometric_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "trusted_at" TIMESTAMP(3),
    "trust_expires_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "assigned_to" TEXT,
    "name" TEXT NOT NULL,
    "pan_encrypted" TEXT,
    "gstin" TEXT,
    "entity_type" "public"."EntityType" NOT NULL DEFAULT 'INDIVIDUAL',
    "email" TEXT,
    "phone" TEXT,
    "whatsapp_number" TEXT,
    "portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "services_engaged" TEXT[],
    "financial_year" TEXT NOT NULL DEFAULT '2024-25',
    "address" TEXT,
    "status" "public"."ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."compliance_tasks" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "service_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "filed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_export_requests" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "r2_key" TEXT,
    "download_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_requests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "document_type" "public"."DocumentType" NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fulfilled_document_id" TEXT,
    "push_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "name" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "file_hash" TEXT,
    "doc_type" "public"."DocumentType" NOT NULL DEFAULT 'OTHER',
    "source" "public"."DocumentSource" NOT NULL DEFAULT 'CA_UPLOAD',
    "ai_extracted" BOOLEAN NOT NULL DEFAULT false,
    "ai_data" JSONB,
    "ocr_text" TEXT,
    "financial_year" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."firm_changelog_reads" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firm_changelog_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."firms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icai_number" TEXT,
    "pan" TEXT,
    "gstin" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "logo_url" TEXT,
    "address" TEXT,
    "website" TEXT,
    "plan_type" "public"."PlanType" NOT NULL DEFAULT 'BETA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gst_reconciliations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "gstr2b_r2_key" TEXT,
    "purchase_r2_key" TEXT,
    "job_id" TEXT,
    "status" "public"."ReconStatus" NOT NULL DEFAULT 'PENDING',
    "normalisation_log" JSONB,
    "total_invoices_gstr2b" INTEGER,
    "total_invoices_purchase" INTEGER,
    "matched_count" INTEGER,
    "mismatch_count" INTEGER,
    "missing_in_gstr2b" INTEGER,
    "missing_in_purchase" INTEGER,
    "mismatches" JSONB,
    "vendor_risk_data" JSONB,
    "report_excel_key" TEXT,
    "report_pdf_key" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "gst_amount" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "due_date" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payment_link" TEXT,
    "razorpay_payment_id" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notices" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "notice_type" "public"."NoticeType" NOT NULL,
    "portal" "public"."NoticePortal" NOT NULL DEFAULT 'INCOME_TAX',
    "reference_number" TEXT,
    "section" TEXT,
    "assessment_year" TEXT,
    "issued_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "document_r2_key" TEXT,
    "ocr_text" TEXT,
    "ai_job_id" TEXT,
    "ai_status" "public"."AiStatus" NOT NULL DEFAULT 'PENDING',
    "ai_draft" TEXT,
    "ai_citations" JSONB,
    "ai_summary" TEXT,
    "review_status" "public"."ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "ca_edited_reply" TEXT,
    "reply_pdf_r2_key" TEXT,
    "filed_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_states" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "step_add_client" BOOLEAN NOT NULL DEFAULT false,
    "step_upload_document" BOOLEAN NOT NULL DEFAULT false,
    "step_run_gst_recon" BOOLEAN NOT NULL DEFAULT false,
    "step_upload_notice" BOOLEAN NOT NULL DEFAULT false,
    "step_invite_client" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portal_invites" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portal_otps" (
    "id" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."referrals" (
    "id" TEXT NOT NULL,
    "referrer_firm_id" TEXT NOT NULL,
    "referred_firm_id" TEXT,
    "referral_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reward_months" INTEGER NOT NULL DEFAULT 1,
    "reward_applied_at" TIMESTAMP(3),
    "signed_up_at" TIMESTAMP(3),
    "subscribed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "gst_amount" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdf_r2_key" TEXT,
    "razorpay_payment_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "plan_type" "public"."PlanType" NOT NULL,
    "billing_cycle" "public"."BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "grace_period_ends_at" TIMESTAMP(3),
    "cancel_at" TIMESTAMP(3),
    "razorpay_sub_id" TEXT,
    "razorpay_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screenshot_r2_key" TEXT,
    "browser_info" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "device_name" TEXT,
    "browser" TEXT,
    "ip_address" TEXT,
    "city" TEXT,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "firm_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'JUNIOR_CA',
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_deletion_requests_firm_id_key" ON "public"."account_deletion_requests"("firm_id" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_firm_id_created_at_idx" ON "public"."audit_logs"("firm_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "client_portal_sessions_phone_hash_idx" ON "public"."client_portal_sessions"("phone_hash" ASC);

-- CreateIndex
CREATE INDEX "clients_firm_id_deleted_at_idx" ON "public"."clients"("firm_id" ASC, "deleted_at" ASC);

-- CreateIndex
CREATE INDEX "clients_firm_id_status_idx" ON "public"."clients"("firm_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "compliance_tasks_client_id_due_date_idx" ON "public"."compliance_tasks"("client_id" ASC, "due_date" ASC);

-- CreateIndex
CREATE INDEX "compliance_tasks_client_id_status_due_date_idx" ON "public"."compliance_tasks"("client_id" ASC, "status" ASC, "due_date" ASC);

-- CreateIndex
CREATE INDEX "document_requests_client_id_status_idx" ON "public"."document_requests"("client_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "documents_client_id_created_at_idx" ON "public"."documents"("client_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "documents_client_id_doc_type_idx" ON "public"."documents"("client_id" ASC, "doc_type" ASC);

-- CreateIndex
CREATE INDEX "documents_file_hash_idx" ON "public"."documents"("file_hash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "firm_changelog_reads_firm_id_key" ON "public"."firm_changelog_reads"("firm_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "firms_email_key" ON "public"."firms"("email" ASC);

-- CreateIndex
CREATE INDEX "gst_reconciliations_client_id_idx" ON "public"."gst_reconciliations"("client_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_client_id_due_date_idx" ON "public"."invoices"("client_id" ASC, "due_date" ASC);

-- CreateIndex
CREATE INDEX "invoices_client_id_status_idx" ON "public"."invoices"("client_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "public"."invoices"("invoice_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "job_logs_job_id_key" ON "public"."job_logs"("job_id" ASC);

-- CreateIndex
CREATE INDEX "notices_client_id_ai_status_idx" ON "public"."notices"("client_id" ASC, "ai_status" ASC);

-- CreateIndex
CREATE INDEX "notices_client_id_due_date_idx" ON "public"."notices"("client_id" ASC, "due_date" ASC);

-- CreateIndex
CREATE INDEX "notices_client_id_review_status_idx" ON "public"."notices"("client_id" ASC, "review_status" ASC);

-- CreateIndex
CREATE INDEX "notifications_firm_id_created_at_idx" ON "public"."notifications"("firm_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "notifications_firm_id_read_created_at_idx" ON "public"."notifications"("firm_id" ASC, "read" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_states_firm_id_key" ON "public"."onboarding_states"("firm_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_key" ON "public"."referrals"("referral_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_firm_id_key" ON "public"."referrals"("referred_firm_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_invoice_number_key" ON "public"."subscription_invoices"("invoice_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_firm_id_key" ON "public"."subscriptions"("firm_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_razorpay_sub_id_key" ON "public"."subscriptions"("razorpay_sub_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_jti_key" ON "public"."user_sessions"("jti" ASC);

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "public"."user_sessions"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_firm_id_idx" ON "public"."users"("firm_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_portal_sessions" ADD CONSTRAINT "client_portal_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_tasks" ADD CONSTRAINT "compliance_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_export_requests" ADD CONSTRAINT "data_export_requests_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_requests" ADD CONSTRAINT "document_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_requests" ADD CONSTRAINT "document_requests_fulfilled_document_id_fkey" FOREIGN KEY ("fulfilled_document_id") REFERENCES "public"."documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_requests" ADD CONSTRAINT "document_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."firm_changelog_reads" ADD CONSTRAINT "firm_changelog_reads_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gst_reconciliations" ADD CONSTRAINT "gst_reconciliations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notices" ADD CONSTRAINT "notices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notices" ADD CONSTRAINT "notices_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onboarding_states" ADD CONSTRAINT "onboarding_states_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portal_invites" ADD CONSTRAINT "portal_invites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_referred_firm_id_fkey" FOREIGN KEY ("referred_firm_id") REFERENCES "public"."firms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_referrer_firm_id_fkey" FOREIGN KEY ("referrer_firm_id") REFERENCES "public"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
