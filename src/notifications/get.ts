import { z, createRoute } from "@hono/zod-openapi";
import { Context } from "hono";
import initSupabase from "../utils/initSupabase";

export const getNotificationsFromTaskIdRoute = createRoute({
  method: "get",
  path: "/tasks/{taskId}",
  request: {
    params: z.object({
      taskId: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            title: z.string(),
            message: z.string(),
            dueDate: z.string(),
            delivered: z.boolean(),
          }),
        },
      },
      description: "Returns a list of notifications for a given task",
    },
  },
});

export async function getNotificationsFromTaskId(
  c: Context<{}, any, {}>
): Promise<any> {
  const { taskId } = c.req.valid("param" as never);
  const supabase = await initSupabase(c);
  if (supabase === null) {
    return c.json({ error: "Failed to initialize Supabase" }, 500);
  }

  const scheduledNotifications = await supabase
    .from("notification_schedule")
    .select("*")
    .eq("taskId", taskId);

  return c.json(scheduledNotifications);
}
