import { extractText, renderPageAsImage } from "unpdf";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

async function ocrImage(image: Buffer | Uint8Array): Promise<string> {
  const result = await Tesseract.recognize(Buffer.from(image), "eng");
  return result.data.text.trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  return text.trim();
}

async function ocrPdfPreview(buffer: Buffer): Promise<string> {
  const png = await renderPageAsImage(new Uint8Array(buffer), 1, {
    scale: 1.5,
    canvasImport: () => import("@napi-rs/canvas"),
  });
  return ocrImage(Buffer.from(png));
}

function extractSpreadsheetText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer", cellText: true });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
  })
    .join("\n\n")
    .trim();
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractDocumentText(params: {
  buffer: Buffer;
  contentType: string;
  filename?: string;
}): Promise<string> {
  const mimeType = params.contentType.toLowerCase();
  const extension = params.filename?.split(".").pop()?.toLowerCase();

  if (mimeType === "application/pdf" || extension === "pdf") {
    const text = await extractPdfText(params.buffer);
    return text || ocrPdfPreview(params.buffer);
  }

  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(extension ?? "")) {
    return ocrImage(params.buffer);
  }

  if (
    mimeType === "text/csv" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ["csv", "xls", "xlsx"].includes(extension ?? "")
  ) {
    return extractSpreadsheetText(params.buffer);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return extractDocxText(params.buffer);
  }

  throw new Error(
    `Unsupported file type for serverless preview/OCR: ${params.contentType || extension || "unknown"}`,
  );
}

export async function extractNoticeText(params: {
  buffer: Buffer;
  contentType: "application/pdf" | "image/jpeg" | "image/png";
}): Promise<string> {
  return extractDocumentText(params);
}
