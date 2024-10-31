import { Context } from "hono";
import { createRoute } from "@hono/zod-openapi";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";
import { env } from "hono/adapter";

export const notifyInAppRoute = createRoute({
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
          },
          required: ["message"],
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

export async function notifyInApp(c: Context<{}, any, {}>): Promise<any> {
  const { userId, message } = await c.req.json();
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

  const accessToken = await generateAccessToken(c);
  const response = await sendFcmMessage({
    PROJECT_ID,
    accessToken,
    deviceGroup: user.device_group as string,
    isNotificationMessage: false,
    notification: null,
    dataMessage: message,
  });

  if (!response.ok) {
    return c.json({ error: "Failed to send notification" }, 500);
  }

  return c.json({ message: "Notification sent" }, 200);
}
