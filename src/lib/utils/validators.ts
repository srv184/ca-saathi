import { z } from "zod";

// ─── AUTH ────────────────────────────────────────────────

export const RegisterSchema = z.object({
  firmName: z.string().min(2, "Firm name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  icaiNumber: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── CLIENT ──────────────────────────────────────────────

export const CreateClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  entityType: z.enum([
    "INDIVIDUAL",
    "PROPRIETORSHIP",
    "PARTNERSHIP",
    "LLP",
    "PRIVATE_LIMITED",
    "PUBLIC_LIMITED",
    "TRUST",
    "HUF",
  ]),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .or(z.literal("")),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GSTIN format",
    )
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+91|91)?[6-9][0-9]{9}$/, "Invalid Indian mobile number")
    .optional()
    .or(z.literal("")),
  whatsappNumber: z.string().optional(),
  portalEnabled: z.boolean().default(false),
  servicesEngaged: z.array(z.string()).default([]),
  financialYear: z.string().default("2024-25"),
  address: z.string().optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

// ─── DOCUMENT ────────────────────────────────────────────

export const RequestUploadUrlSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  filename: z.string().min(1, "Filename is required"),
  contentType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/json",
  ]),
  docType: z.string(),
});

export const ConfirmUploadSchema = z.object({
  clientId: z.string().uuid(),
  r2Key: z.string().min(1),
  filename: z.string().min(1),
  fileSize: z.number().positive(),
  contentType: z.string(),
  docType: z.string(),
  fileHash: z.string().min(1),
  financialYear: z.string().optional(),
});

// ─── NOTICE ──────────────────────────────────────────────

export const CreateNoticeSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  noticeType: z.enum([
    "SCRUTINY_143_2",
    "DEFECTIVE_RETURN",
    "DEMAND_156",
    "RECTIFICATION",
    "REFUND_QUERY",
    "HIGH_VALUE_TXN",
    "GST_ITC_MISMATCH",
    "GST_RETURN_DEFAULT",
    "GST_SCN",
    "TDS_DEFAULT",
    "OTHER",
  ]),
  portal: z.enum(["INCOME_TAX", "GST", "TRACES", "MCA"]).default("INCOME_TAX"),
  section: z.string().optional(),
  assessmentYear: z.string().optional(),
  referenceNumber: z.string().optional(),
  issuedDate: z.string().optional(),
  dueDate: z.string().optional(),
  r2Key: z.string().min(1, "Notice file is required"),
  filename: z.string().min(1, "Notice filename is required").max(200),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
});

export const ReviewNoticeSchema = z.object({
  editedReply: z.string().min(10, "Reply is too short"),
});

// ─── GST RECONCILIATION ──────────────────────────────────

export const StartReconSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  gstin: z.string().min(1, "GSTIN is required"),
  period: z.string().min(1, "Period is required"),
  gstr2bKey: z.string().optional(),
  purchaseKey: z.string().optional(),
  gstr2bData: z.string().optional(),
  purchaseData: z.string().optional(),
});

// ─── INVOICE ─────────────────────────────────────────────

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

// ─── PORTAL OTP ──────────────────────────────────────────

export const RequestOtpSchema = z.object({
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Invalid Indian mobile number"),
  inviteToken: z.string().min(1, "Invite token is required"),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9][0-9]{9}$/),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const SetPinSchema = z.object({
  pin: z
    .string()
    .length(6, "PIN must be exactly 6 digits")
    .regex(/^[0-9]+$/, "PIN must contain only numbers")
    .refine((pin) => !/^(.)\1{5}$/.test(pin), "PIN cannot be all same digits")
    .refine((pin) => pin !== "123456", "PIN too simple")
    .refine((pin) => pin !== "654321", "PIN too simple"),
});
