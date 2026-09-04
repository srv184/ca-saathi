import type { AiChatParams, AiMessage, NoticeReplyResult } from "./types";

export const CLIENT_DOCUMENT_TYPES = [
  "GST_RETURN",
  "INVOICE",
  "BANK_STATEMENT",
  "FORM_16",
  "FORM_26AS",
  "ITR_ACKNOWLEDGMENT",
  "TDS_CERTIFICATE",
  "NOTICE",
  "LEDGER",
  "PAN_CARD",
  "AADHAR_CARD",
  "BALANCE_SHEET",
  "PROFIT_LOSS_STATEMENT",
  "AUDIT_REPORT",
  "OTHER",
] as const;

export type ClientDocumentClassification = {
  documentType: (typeof CLIENT_DOCUMENT_TYPES)[number];
  documentPeriod: string | null;
  extractedDocumentDate: string | null;
  confidence: number;
  reasoning: string;
};

async function chat(params: AiChatParams): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      "AI not configured. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL in .env.local",
    );
  }

  // Environment values are commonly copied with a trailing slash. Normalize
  // here so the OpenAI-compatible endpoint is not requested as `//chat/...`.
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens,
      ...(params.reasoningEffort ? { reasoning_effort: params.reasoningEffort } : {}),
      messages: [
        { role: "system", content: params.system },
        ...params.messages
          .filter((m: AiMessage) => m.role !== "system")
          .map((m: AiMessage) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `AI request failed. Status: ${response.status}. Error: ${error}`,
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error(
      "AI response was truncated before completion. Please retry the notice draft.",
    );
  }
  const text = choice?.message?.content ?? "";

  if (!text) {
    throw new Error("AI returned empty response");
  }

  return text;
}

function sanitise(text: string): string {
  return (
    text
      // Remove prompt injection attempts
      .replace(/ignore (previous|above|all) instructions?/gi, "[REDACTED]")
      .replace(/system prompt/gi, "[REDACTED]")
      .replace(/you are now/gi, "[REDACTED]")
      .replace(/disregard (all|any|previous)/gi, "[REDACTED]")
      .replace(/forget (all|any|previous|your)/gi, "[REDACTED]")
      .replace(/new instruction/gi, "[REDACTED]")
      .replace(/act as (a|an)/gi, "[REDACTED]")
      .replace(/pretend (to be|you are)/gi, "[REDACTED]")
      .replace(/jailbreak/gi, "[REDACTED]")
      .replace(/DAN mode/gi, "[REDACTED]")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "[REDACTED]")
      .replace(/\{\{.*?\}\}/g, "[REDACTED]")
      // Limit length
      .slice(0, 12000)
      .trim()
  );
}

async function parseJson<T>(text: string): Promise<T> {
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new Error(
      `AI returned invalid JSON. Preview: ${clean.slice(0, 200)}`,
    );
  }
}

export async function generateNoticeReply(params: {
  noticeText: string;
  noticeType: string;
  clientName: string;
  assessmentYear?: string;
  firmName: string;
}): Promise<NoticeReplyResult> {
  const text = await chat({
    system: `You are a senior Indian Chartered Accountant with 20 years of experience in income tax and GST litigation. You draft precise, legally sound replies to notices from Indian tax authorities. Always cite exact sections of the Income Tax Act 1961 or GST Act 2017. Every reply must be professional, factual, and defensible. Output must be valid JSON only. Never include markdown.`,
    messages: [
      {
        role: "user",
        content: `Draft a reply to this Indian tax notice. The extracted notice text is the primary source of truth. Use the metadata only to supplement it; do not invent facts that are absent from the notice text.

Client name: ${params.clientName}
CA firm: ${params.firmName}
Notice type: ${params.noticeType}
Assessment year: ${params.assessmentYear ?? "Not specified"}

        <notice_text_primary_source>
${sanitise(params.noticeText)}
        </notice_text_primary_source>

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence plain English summary of what this notice is asking",
  "draft": "Complete professional reply letter ready to be filed. Include proper salutation, DIN reference, legal arguments citing specific sections, and professional closing.",
  "citations": [
    {
      "section": "Section number e.g. 143(2)",
      "description": "What this section says in simple terms",
      "source": "Income Tax Act 1961 or GST Act 2017"
    }
  ]
}

Return only the JSON. No markdown. No explanation.`,
      },
    ],
    // Legal drafts regularly exceed the old 2,000-token cap. `chat` detects
    // any future truncation before attempting to parse partial JSON.
    maxTokens: 6000,
  });

  return parseJson<NoticeReplyResult>(text);
}

export async function explainGstMismatches(params: {
  mismatches: unknown[];
  period: string;
  gstin: string;
}): Promise<unknown[]> {
  const top50 = params.mismatches.slice(0, 50);
  if (top50.length === 0) return [];

  const text = await chat({
    system: `You are a GST expert in India. Explain GST reconciliation mismatches in plain English. Always suggest a practical action. Output must be valid JSON only. Never include markdown.`,
    messages: [
      {
        role: "user",
        content: `Explain these GST reconciliation mismatches.

GSTIN: ${params.gstin}
Period: ${params.period}

<mismatches>
${JSON.stringify(top50, null, 2)}
</mismatches>

For each mismatch add:
- "explanation": plain English reason (1-2 sentences)
- "action": what CA should do (1 sentence)

Return the same array with these fields added. Return only JSON.`,
      },
    ],
    maxTokens: 2000,
  });

  return parseJson<unknown[]>(text);
}

export async function extractDocumentData(params: {
  ocrText: string;
  docType: string;
  clientName: string;
}): Promise<Record<string, unknown>> {
  const text = await chat({
    system: `You are an expert at extracting structured data from Indian financial documents. Output must be valid JSON only. Never include markdown.`,
    messages: [
      {
        role: "user",
        content: `Extract all structured data from this ${params.docType} document for client ${params.clientName}.

<document_text>
${sanitise(params.ocrText)}
</document_text>

Return a JSON object with all fields you can extract. Return only JSON.`,
      },
    ],
    maxTokens: 1000,
  });

  return parseJson<Record<string, unknown>>(text);
}

export async function classifyClientDocument(
  extractedText: string,
): Promise<ClientDocumentClassification> {
  const text = await chat({
    system: `You are a document classification engine for a Chartered Accountant's client management system. You will be given raw extracted text from a scanned or digital document. Your job is to identify what the document is and when it is dated, using ONLY evidence present in the text.

Respond with STRICT JSON only, no markdown, no preamble, no explanation outside the JSON object. Use exactly this shape:

{
  "documentType": "<one of: GST_RETURN, INVOICE, BANK_STATEMENT, FORM_16, FORM_26AS, ITR_ACKNOWLEDGMENT, TDS_CERTIFICATE, NOTICE, LEDGER, PAN_CARD, AADHAR_CARD, BALANCE_SHEET, PROFIT_LOSS_STATEMENT, AUDIT_REPORT, OTHER>",
  "documentPeriod": "<string or null, e.g. 'FY2024-25', '2025-06', 'Q1-2025'>",
  "extractedDocumentDate": "<ISO 8601 date string or null — the single most authoritative date the document refers to, e.g. invoice date, return filing period end date, statement date. NOT the OCR processing date.>",
  "confidence": <float between 0 and 1, your confidence in documentType AND date extraction combined>,
  "reasoning": "<one sentence, max 30 words, citing what evidence in the text led to this classification and date>"
}

Rules:
- If the text is too garbled, incomplete, or ambiguous to confidently determine documentType, set documentType to "OTHER" and confidence below 0.5.
- If no reliable date/period is present in the text, set documentPeriod and extractedDocumentDate to null rather than guessing.
- Never fabricate a date not evidenced in the text.
- confidence below 0.6 will trigger manual review — be honest, not optimistic.`,
    messages: [
      {
        role: "user",
        content: `<document_text_primary_source>\n${sanitise(extractedText)}\n</document_text_primary_source>`,
      },
    ],
    maxTokens: 2000,
    reasoningEffort: "none",
  });

  const result = await parseJson<ClientDocumentClassification>(text);
  if (!CLIENT_DOCUMENT_TYPES.includes(result.documentType)) {
    throw new Error(`AI returned unsupported document type: ${String(result.documentType)}`);
  }
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    throw new Error("AI returned an invalid classification confidence");
  }
  if (typeof result.reasoning !== "string" || result.reasoning.length > 500) {
    throw new Error("AI returned invalid classification reasoning");
  }
  if (result.documentPeriod !== null && typeof result.documentPeriod !== "string") {
    throw new Error("AI returned an invalid document period");
  }
  if (result.extractedDocumentDate !== null && Number.isNaN(Date.parse(result.extractedDocumentDate))) {
    throw new Error("AI returned an invalid document date");
  }

  return result;
}
