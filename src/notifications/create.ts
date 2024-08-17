import { createRoute } from "@hono/zod-openapi";
import { Context } from "hono";
import { env } from "hono/adapter";
import { Novu } from "@novu/node";
import initSupabase from "../utils/initSupabase";

interface Notification {
  id: number;
  user_id: string;
  taskId: number;
  dueDate: string;
  delivered: boolean;
  message: string;
  title: string;
}

interface NotificationTransaction {
  id: number;
  notificationId: number;
  transactionId: number;
  scheduledAt: Date;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Notification;
  schema: "public";
  old_record: Notification | null;
}

export const createNotificationRoute = createRoute({
  method: "post",
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: { type: "string" },
            table: { type: "string" },
            record: {
              type: "object",
              properties: {
                id: { type: "number" },
                user_id: { type: "string" },
                taskId: { type: "number" },
                dueDate: { type: "string" },
                delivered: { type: "boolean" },
                message: { type: "string" },
                title: { type: "string" },
              },
            },
            schema: { type: "string" },
            old_record: {
              type: "object",
              properties: {
                id: { type: "number" },
                user_id: { type: "string" },
                taskId: { type: "number" },
                dueDate: { type: "string" },
                delivered: { type: "boolean" },
                message: { type: "string" },
                title: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      description: "Returns a success message",
    },
  },
  path: "/",
});

export async function createNotification(
  c: Context<{}, any, {}>
): Promise<any> {
  const webhookPayload: WebhookPayload = await c.req.json();
  console.info("Received payload", webhookPayload);
  const payload = webhookPayload.record;

  const { NOVU_API_KEY } = env<{
    NOVU_API_KEY: string;
  }>(c);

  const novu = new Novu(NOVU_API_KEY);
  const supabase = await initSupabase(c);

  if (supabase === null) {
    return c.json({ error: "Failed to initialize Supabase" }, 500);
  }

  // TODO: Get the user's preferences for notification times
  // Current setup is temporary
  const times = [12, 24, 48];
  const sendAtArray = [];
  const transactionIds: string[] = [];

  let resData = {
    success: true,
    error: null,
    message: "Notification scheduled successfully",
  };

  const dueAt = new Date(payload.dueDate);

  try {
    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const sendAt = new Date(dueAt.getTime() - time * 60 * 60 * 1000);

      // Skip if the sendAt time is in the past
      if (sendAt < new Date()) {
        continue;
      }

      sendAtArray.push(sendAt);
      const transaction = await novu.trigger("schedulepush", {
        payload: {
          sendAt: sendAt.toISOString(),
          payload: {
            title: payload.title,
            message: payload.message,
          },
        },
        to: {
          subscriberId: payload.user_id,
        },
      });

      transactionIds.push(transaction.data.data.transactionId);
    }

    await supabase.from("notification_transactions").insert(
      sendAtArray.map((sendAt) => ({
        notificationId: payload.id,
        scheduledAt: sendAt,
        transactionId: transactionIds.shift(),
      }))
    );
  } catch (error: any) {
    console.error(error);
    resData = {
      success: false,
      error: error,
      message: "Failed to schedule notification",
    };
  }

  return c.json(resData, 200, {
    "Content-Type": "application/json",
  });
}
