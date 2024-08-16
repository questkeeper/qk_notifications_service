import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

const ping = new OpenAPIHono();

ping.openapi(
  createRoute({
    method: "get",
    path: "/",
    summary: "Ping the server",
    responses: {
      200: {
        description: "Pong",
        content: {
          "text/plain": {
            schema: {
              type: "string",
            },
          },
        },
      },
    },
  }),
  (c: any) => {
    return c.text("pong!", 200);
  }
);

export default ping;
