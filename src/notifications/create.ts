import { createRoute } from "@hono/zod-openapi";
import { Context } from "hono";
import { supabase } from "../utils/initSupabase";

interface Task {
  id: number;
  title: string;
  dueDate: string;
  spaceId: number | null;
  starred: boolean;
  user_id: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: number | null;
  description: string;
}

interface Notification {
  title: string;
  message: string;
  user_id: string;
  scheduled_at: string;
  dueDate: string;
  taskId: number;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Task;
  schema: "public";
  old_record: Task | null;
}

export const createNotificationRoute = createRoute({
  method: "post",
  path: "/create",
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["INSERT", "UPDATE", "DELETE"] },
            table: { type: "string" },
            record: {
              type: "object",
              // Properties are the task
              required: ["id", "title", "dueDate", "user_id"],
            },
            schema: { type: "string", enum: ["public"] },
            old_record: {
              type: "object",
              // Properties are the task or null
              nullable: true,
            },
          },
          required: ["type", "table", "record", "schema"],
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
              error: { type: "string", nullable: true },
              message: { type: "string" },
              notifications: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      description: "Returns a success message",
    },
  },
});

export async function createNotification(
  c: Context<{}, any, {}>
): Promise<any> {
  let resData = {
    success: true,
    error: null,
    data: null as unknown | null,
    message: "Notification scheduled successfully",
  };

  try {
    const webhookPayload: WebhookPayload = await c.req.json();
    const payload = webhookPayload.record;
    const oldRecord = webhookPayload.old_record;

    if (supabase === null) {
      throw new Error("Failed to initialize Supabase");
    }

    if (
      oldRecord &&
      (webhookPayload.type === "UPDATE" || webhookPayload.type === "DELETE")
    ) {
      // Delete existing notifications if the task was updated or deleted
      if (
        payload.dueDate !== oldRecord.dueDate ||
        payload.starred !== oldRecord.starred ||
        payload.completed ||
        webhookPayload.type === "DELETE" ||
        payload.title !== oldRecord.title ||
        payload.description !== oldRecord.description
      ) {
        await supabase
          .from("notification_schedule")
          .delete()
          .eq("taskId", payload.id);
      } else {
        resData.message = "Notification does not need to be updated";
        return c.json(resData, 200);
      }

      if (webhookPayload.type === "DELETE" || payload.completed) {
        resData.message = "Notification deleted successfully";
        return c.json(resData, 200);
      }
    }

    // TODO: Temporary setup for notification times
    const times = [12, 24];
    if (payload.starred) {
      times.push(48);
    }
    const notifications = Array<Notification>();
    const dueAt = new Date(payload.dueDate).toISOString();

    times.forEach((time) => {
      const sendAt = new Date(
        new Date(dueAt).getTime() - time * 60 * 60 * 1000
      );
      if (sendAt > new Date()) {
        notifications.push({
          title: payload.title,
          message: payload.description
            ? payload.description.substring(
                0,
                Math.min(75, payload.description.length)
              )
            : "",
          user_id: payload.user_id,
          scheduled_at: sendAt.toISOString(),
          dueDate: dueAt,
          taskId: payload.id,
        });
      }
    });

    // Send when the task is due
    notifications.push({
      title: payload.title,
      message: payload.description
        ? payload.description.substring(
            0,
            Math.min(75, payload.description.length)
          )
        : "",
      user_id: payload.user_id,
      scheduled_at: new Date(dueAt).toISOString(),
      dueDate: dueAt,
      taskId: payload.id,
    });

    const { data, error } = await supabase
      .from("notification_schedule")
      .upsert(notifications as any)
      .select();

    if (error) {
      throw error;
    }

    resData.data = data;
  } catch (error: any) {
    console.error(error);
    resData.success = false;
    resData.error = error.message;
    resData.message = "Failed to schedule notification";
  }

  return c.json(resData, resData.success ? 200 : 500, {
    "Content-Type": "application/json",
  });
}
