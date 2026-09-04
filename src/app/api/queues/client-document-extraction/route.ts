import crypto from "crypto";
import { handleCallback } from "@vercel/queue";
import { processClientDocument } from "@/lib/client-documents/process";

export const runtime = "nodejs";
export const maxDuration = 300;

const callback = handleCallback<{ documentId: string }>(
  async (message) => {
    if (!message?.documentId) throw new Error("Queue message is missing documentId");
    await processClientDocument(message.documentId);
  },
  {
    visibilityTimeoutSeconds: 300,
    retry: (_error, metadata) =>
      metadata.deliveryCount >= 10
        ? { acknowledge: true }
        : { afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5) },
  },
);

function isSecretValid(headerSecret: string | null, expectedSecret: string | undefined): boolean {
  if (!headerSecret || !expectedSecret) return false;
  const headerBuffer = Buffer.from(headerSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  if (headerBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const incomingSecret = request.headers.get("x-queue-secret");
  const expectedSecret = process.env.QUEUE_CONSUMER_SECRET;

  if (!isSecretValid(incomingSecret, expectedSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return callback(request);
}
