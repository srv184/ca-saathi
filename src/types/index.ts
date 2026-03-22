export interface AuthUser {
  id: string;
  firmId: string;
  name: string;
  email: string;
  role: "OWNER" | "SENIOR_CA" | "JUNIOR_CA" | "ARTICLE";
}

export interface DashboardStats {
  totalClients: number;
  noticesUnread: number;
  gstReconsPending: number;
  invoicesOutstanding: number;
  outstandingAmount: number;
}

export interface ClientSummary {
  id: string;
  name: string;
  pan_encrypted?: string;
  gstin?: string;
  entity_type: string;
  email?: string;
  phone?: string;
  portal_enabled: boolean;
  status: string;
  services_engaged: string[];
  financial_year: string;
  assigned_ca?: { name: string };
}

export interface DocumentMeta {
  id: string;
  name: string;
  r2_key: string;
  file_size?: number;
  mime_type?: string;
  doc_type: string;
  source: string;
  ai_extracted: boolean;
  financial_year?: string;
  created_at: string;
  client?: { name: string };
}

export interface NoticeSummary {
  id: string;
  notice_type: string;
  portal: string;
  section?: string;
  assessment_year?: string;
  due_date?: string;
  ai_status: string;
  review_status: string;
  client?: { name: string; pan_encrypted?: string };
  reviewer?: { name: string };
}

export interface ReconSummary {
  id: string;
  period: string;
  gstin: string;
  status: string;
  matched_count?: number;
  mismatch_count?: number;
  missing_in_gstr2b?: number;
  missing_in_purchase?: number;
  created_at: string;
  client?: { name: string };
}

export interface InvoiceSummary {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  client?: { name: string; email?: string };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface ComplianceTaskItem {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  service_type: string;
  status: string;
  filed_at?: string;
  client?: { name: string };
}
