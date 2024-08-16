import initSupabase from "./utils/initSupabase";
import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import ping from "./ping";
import notificationsFetchApi from "./notifications/get";

const app = new OpenAPIHono();
app.get(
  "/ui",
  swaggerUI({
    url: "/doc",
  })
);

app.doc("/doc", {
  info: {
    title: "QuestKeeper Notifications Microservice API",
    version: "v1",
  },
  openapi: "3.1.0",
});

app.openapi(
  createRoute({
    method: "get",
    path: "/",
    summary: "Get all users",
    responses: {
      200: {
        description: "All users",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                type: "object",
              },
            },
          },
        },
      },
    },
  }),
  async (c: any) => {
    // Get from env request
    const supabase = await initSupabase(c);
    if (supabase === null) {
      return c.text("Supabase client is not initialized", 500);
    }

    const allUsers = await supabase.from("profiles").select("*");
    return c.text(JSON.stringify(allUsers), 200, {
      "Content-Type": "application/json",
    });
  }
);

app.route("/ping", ping);
app.route("/notifications", notificationsFetchApi);

export default app;
