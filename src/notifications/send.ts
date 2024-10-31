import { Context } from "hono";
import { createRoute } from "@hono/zod-openapi";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";
import { env } from "hono/adapter";
import sendFcmMessage from "../utils/sendFcmMessage";

export const sendNotificationRoute = createRoute({
  method: "post",
  path: "/send",
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            notification: {
              type: "object",
              properties: {
                id: { type: "number" },
                title: { type: "string" },
                message: { type: "string" },
                task_id: { type: "number" },
                dueDate: { type: "string" },
                scheduled_at: { type: "string" },
                user_id: { type: "string" },
              },
            },
          },
          required: ["notification"],
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

export async function sendNotification(c: Context<{}, any, {}>): Promise<any> {
  const { notification } = await c.req.json();
  const { user_id } = notification;
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
    .eq("user_id", user_id)
    .single();

  if (error) {
    return c.json({ error: "Failed to get user" }, 500);
  }

  const accessToken = await generateAccessToken(c);
  const response = await sendFcmMessage({
    PROJECT_ID,
    accessToken,
    deviceGroup: user.device_group as string,
    isNotificationMessage: true,
    notification: {
      title: notification.title,
      body: notification.message,
    },
    dataMessage: null,
  }) as Response;

  await supabase
    .from("notification_schedule")
    .update({ sent: true })
    .eq("id", notification.id);

  if (!response.ok) {
    return c.json({ error: "Failed to send notification" }, 500);
  }

  return c.json({});
}
