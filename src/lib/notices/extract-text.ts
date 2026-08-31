import { extractText } from "unpdf";
import { recognize } from "tesseract.js";

async function ocrImage(image: Buffer | Uint8Array): Promise<string> {
  const result = await recognize(Buffer.from(image), "eng");
  return result.data.text.trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  return text.trim();
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
