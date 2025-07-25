import { createRoute } from "@hono/zod-openapi";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Context } from "hono";
import { env } from "hono/adapter";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";
import sendFcmMessage from "../utils/sendFcmMessage";
import { NotificationType } from "../utils/notificationTypes";

export class Notify extends WorkerEntrypoint {
  async fetch() {
    return new Response("Success!", { status: 200 });
  }

  async sendMessage({
    projectId,
    message,
    notificationType,
    notification,
    accessToken,
    deviceGroup,
  }: {
    projectId: string;
    message: any | null;
    notificationType: NotificationType;
    notification: { title: string; body: string } | null;
    accessToken: string;
    deviceGroup: string;
  }) {
    const response = await sendFcmMessage({
      PROJECT_ID: projectId,
      accessToken,
      deviceGroup: deviceGroup,
      isNotificationMessage: notification !== null,
      notification: notification,
      notificationType: notificationType,
      dataMessage: message,
    });

    return response;
  }
}

export const notifyRoute = createRoute({
  method: "post",
  path: "/notify",
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
            },
            message: {
              type: "object",
            },
            type: { type: "string" },
          },
          required: ["type", "message", "userId"],
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
          },
        },
      },
      description: "Returns a success message",
    },
  },
});

export async function notifyHandler(c: Context<{}, any, {}>): Promise<any> {
  const { userId, message: object, type } = await c.req.json();
  const workersEnv = env<{
    FIREBASE_PROJECT_ID: string;
  }>(c);
  const PROJECT_ID = workersEnv.FIREBASE_PROJECT_ID;

  if (supabase === null) {
    return c.json({ error: "Failed to initialize Supabase" }, 500);
  }

  const { data: user, error } = await supabase
    .from("user_device_group")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    return c.json({ error: "Failed to get user" }, 500);
  }

  const notificationType =
    NotificationType[type as keyof typeof NotificationType];

  const accessToken = await generateAccessToken(c);

  const notify = new Notify(c.executionCtx, c.env);

  // if message contains title and body, then set type to notification
  const message = object;
  let isNotificationMessage = false;
  if (message.title && message.body) {
    isNotificationMessage = true;
  }

  const response = (await notify.sendMessage({
    projectId: PROJECT_ID,
    message: isNotificationMessage ? null : message,
    notificationType,
    notification: isNotificationMessage ? message : null,
    accessToken,
    deviceGroup: user.device_group as string,
  })) as any;

  return c.json({ response: await response.json() }, response.status);
}
