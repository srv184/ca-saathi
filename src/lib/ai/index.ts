import type { AiChatParams, AiMessage, NoticeReplyResult } from "./types";

async function chat(params: AiChatParams): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      "AI not configured. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL in .env.local",
    );
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens,
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
  const text = data.choices?.[0]?.message?.content ?? "";

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
    maxTokens: 2000,
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
