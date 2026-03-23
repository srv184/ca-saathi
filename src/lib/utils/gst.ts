export interface GstrLine {
  gstin: string;
  invoice_no: string;
  invoice_date: string;
  amount: number;
  tax_amount: number;
}

export interface MismatchResult {
  type: "VALUE_MISMATCH" | "MISSING_IN_PURCHASE" | "MISSING_IN_GSTR2B";
  invoice_no: string;
  gstin: string;
  gstr2b_amt?: number;
  purchase_amt?: number;
  difference?: number;
}

export interface ReconResult {
  matched_count: number;
  mismatch_count: number;
  missing_in_gstr2b: number;
  missing_in_purchase: number;
  total_invoices_gstr2b: number;
  total_invoices_purchase: number;
  mismatches: MismatchResult[];
  normalisation_log: { issue: string; fix: string; count: number }[];
}

// Normalise invoice number — removes prefixes, special chars
export function normaliseInvoiceNo(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^(INV|PUR|BILL|TAX|GST|RCM)/i, "")
    .trim();
}

// Parse CSV lines into key-value objects
export function parseCsvLines(csv: string): Record<string, string>[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_"),
  );

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return obj;
  });
}

// Detect and normalise common column name variations
function detectColumn(
  row: Record<string, string>,
  candidates: string[],
): string {
  for (const key of Object.keys(row)) {
    for (const candidate of candidates) {
      if (key.includes(candidate)) return row[key] ?? "";
    }
  }
  return "";
}

// Convert CSV rows to GstrLine format
export function rowsToGstrLines(
  rows: Record<string, string>[],
  log: { issue: string; fix: string; count: number }[],
): GstrLine[] {
  let fixCount = 0;

  const lines = rows
    .map((row) => {
      const gstin = detectColumn(row, ["gstin", "gst_no", "supplier_gstin"]);
      const invoiceRaw = detectColumn(row, [
        "invoice_no",
        "bill_no",
        "inv_no",
        "voucher",
      ]);
      const dateRaw = detectColumn(row, ["invoice_date", "bill_date", "date"]);
      const amountRaw = detectColumn(row, [
        "taxable_value",
        "amount",
        "value",
        "total",
      ]);
      const taxRaw = detectColumn(row, [
        "tax_amount",
        "igst",
        "cgst",
        "sgst",
        "tax",
      ]);

      if (!gstin || !invoiceRaw) return null;

      const normalised = normaliseInvoiceNo(invoiceRaw);
      if (normalised !== invoiceRaw.toUpperCase().replace(/[^A-Z0-9]/g, "")) {
        fixCount++;
      }

      return {
        gstin,
        invoice_no: normalised,
        invoice_date: dateRaw,
        amount: parseFloat(amountRaw.replace(/,/g, "")) || 0,
        tax_amount: parseFloat(taxRaw.replace(/,/g, "")) || 0,
      } as GstrLine;
    })
    .filter(Boolean) as GstrLine[];

  if (fixCount > 0) {
    log.push({
      issue: "Invoice numbers had special characters or prefixes",
      fix: "Normalised to alphanumeric format",
      count: fixCount,
    });
  }

  return lines;
}

// Main reconciliation function
export function reconcile(
  gstr2bLines: GstrLine[],
  purchaseLines: GstrLine[],
): ReconResult {
  const log: { issue: string; fix: string; count: number }[] = [];
  const mismatches: MismatchResult[] = [];

  // Build maps keyed by GSTIN_INVOICENO
  const gstr2bMap = new Map<string, GstrLine>();
  const purchaseMap = new Map<string, GstrLine>();

  for (const line of gstr2bLines) {
    const key = `${line.gstin}_${line.invoice_no}`;
    gstr2bMap.set(key, line);
  }

  for (const line of purchaseLines) {
    const key = `${line.gstin}_${line.invoice_no}`;
    purchaseMap.set(key, line);
  }

  let matchedCount = 0;

  // Check every GSTR-2B line against purchase register
  for (const [key, gstr2bLine] of gstr2bMap) {
    const purchaseLine = purchaseMap.get(key);

    if (!purchaseLine) {
      mismatches.push({
        type: "MISSING_IN_PURCHASE",
        invoice_no: gstr2bLine.invoice_no,
        gstin: gstr2bLine.gstin,
        gstr2b_amt: gstr2bLine.amount,
      });
      continue;
    }

    // Allow Rs. 1 tolerance for rounding differences
    const diff = Math.abs(gstr2bLine.amount - purchaseLine.amount);
    if (diff > 1) {
      mismatches.push({
        type: "VALUE_MISMATCH",
        invoice_no: gstr2bLine.invoice_no,
        gstin: gstr2bLine.gstin,
        gstr2b_amt: gstr2bLine.amount,
        purchase_amt: purchaseLine.amount,
        difference: gstr2bLine.amount - purchaseLine.amount,
      });
    } else {
      matchedCount++;
    }
  }

  // Check purchase lines not in GSTR-2B
  let missingInGstr2b = 0;
  for (const [key, purchaseLine] of purchaseMap) {
    if (!gstr2bMap.has(key)) {
      missingInGstr2b++;
      mismatches.push({
        type: "MISSING_IN_GSTR2B",
        invoice_no: purchaseLine.invoice_no,
        gstin: purchaseLine.gstin,
        purchase_amt: purchaseLine.amount,
      });
    }
  }

  return {
    matched_count: matchedCount,
    mismatch_count: mismatches.filter((m) => m.type === "VALUE_MISMATCH")
      .length,
    missing_in_gstr2b: missingInGstr2b,
    missing_in_purchase: mismatches.filter(
      (m) => m.type === "MISSING_IN_PURCHASE",
    ).length,
    total_invoices_gstr2b: gstr2bLines.length,
    total_invoices_purchase: purchaseLines.length,
    mismatches,
    normalisation_log: log,
  };
}
