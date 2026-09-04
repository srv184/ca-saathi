import { QueueClient } from "@vercel/queue";

export const CLIENT_DOCUMENT_EXTRACTION_TOPIC = "client-document-extraction";

const queue = new QueueClient();

export async function enqueueClientDocument(documentId: string): Promise<void> {
  const secret = process.env.QUEUE_CONSUMER_SECRET;
  await queue.send(
    CLIENT_DOCUMENT_EXTRACTION_TOPIC,
    { documentId },
    {
      idempotencyKey: `client-document:${documentId}`,
      ...(secret ? { headers: { "x-queue-secret": secret } } : {}),
    },
  );
}
