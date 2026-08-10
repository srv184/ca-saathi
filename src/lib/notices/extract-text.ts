import { PDFParse } from "pdf-parse";
import { recognize } from "tesseract.js";

const MAX_OCR_PAGES = 10;
const MIN_PDF_TEXT_LENGTH = 40;

async function ocrImage(image: Buffer | Uint8Array): Promise<string> {
  const result = await recognize(Buffer.from(image), "eng");
  return result.data.text.trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const text = (await parser.getText()).text.trim();
    if (text.length >= MIN_PDF_TEXT_LENGTH) return text;

    const screenshots = await parser.getScreenshot({
      first: MAX_OCR_PAGES,
      desiredWidth: 1800,
      imageDataUrl: false,
      imageBuffer: true,
    });
    const pages = await Promise.all(
      screenshots.pages.map((page) => ocrImage(page.data)),
    );
    return pages.filter(Boolean).join("\n\n").trim();
  } finally {
    await parser.destroy();
  }
}

export async function extractNoticeText(params: {
  buffer: Buffer;
  contentType: "application/pdf" | "image/jpeg" | "image/png";
}): Promise<string> {
  if (params.contentType === "application/pdf") {
    return extractPdfText(params.buffer);
  }

  return ocrImage(params.buffer);
}
