import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { createProfile } from "./create";
import { Context } from "hono";
import { deleteProfile } from "./delete";

const profilesApi = new OpenAPIHono();
const manageProfileRoute = createRoute({
  method: "post",
  path: "/",
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
              // Properties are the profile,
              nullable: true,
            },
            schema: { type: "string", enum: ["public"] },
            old_record: {
              type: "object",
              // Properties are the old profile or null
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

async function manageProfiles(c: Context<{}, any, {}>): Promise<any> {
  const body = await c.req.json();
  switch (body.type) {
    case "INSERT":
    case "UPDATE":
      return createProfile(c, body);
    case "DELETE":
      return deleteProfile(c, body);
    default:
      return c.json({ success: false, error: "Invalid type" }, 400);
  }
}

profilesApi.openapi(manageProfileRoute, manageProfiles);

export default profilesApi;