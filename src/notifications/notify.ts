import { createRoute } from "@hono/zod-openapi";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Context } from "hono";
import { env } from "hono/adapter";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";
import sendFcmMessage from "../utils/sendFcmMessage";

export class Notify extends WorkerEntrypoint {
  async fetch() {
    return new Response("Success!", { status: 200 });
  }

  async sendMessage(
    PROJECT_ID: string,
    message: any,
    accessToken: string,
    deviceGroup: string
  ) {
    const response = await sendFcmMessage({
      PROJECT_ID,
      accessToken,
      deviceGroup: deviceGroup,
      isNotificationMessage: false,
      notification: null,
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
          },
          required: ["message", "userId"],
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

  const notify = new Notify(c.executionCtx, c.env);

  const response = (await notify.sendMessage(
    PROJECT_ID,
    message,
    accessToken,
    user.device_group as string
  )) as any;

  return c.json({ response: response }, response.status);
}
