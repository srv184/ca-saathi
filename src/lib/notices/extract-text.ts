import { PDFParse } from "pdf-parse";

export class NoticeTextExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoticeTextExtractionError";
  }
}

/**
 * Extract text that is embedded in a PDF. Image OCR is deliberately not
 * faked: a vision/OCR service must be configured before scanned notices can
 * be drafted safely.
 */
export async function extractNoticeText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType !== "application/pdf") {
    throw new NoticeTextExtractionError(
      "OCR is not configured for scanned image notices. Upload a text-based PDF or configure an OCR provider before generating a reply.",
    );
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text.replace(/\s+/g, " ").trim();

    if (text.length < 20) {
      throw new NoticeTextExtractionError(
        "This PDF appears to be scanned or contains no extractable text. Configure OCR before generating an AI reply.",
      );
    }

    return text;
  } catch (error) {
    if (error instanceof NoticeTextExtractionError) throw error;
    throw new NoticeTextExtractionError(
      "We could not extract text from this PDF. Please upload a readable PDF or configure OCR for scanned notices.",
    );
  } finally {
    await parser.destroy();
  }
}
