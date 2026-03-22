import prisma from "@/lib/db/prisma";

interface CreateNotificationParams {
  firmId: string;
  userId?: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        firm_id: params.firmId,
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
        entity_type: params.entityType,
        entity_id: params.entityId,
      },
    });
  } catch (error) {
    console.error("[notifications] Failed to create notification:", error);
  }
}
