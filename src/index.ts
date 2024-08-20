import { swaggerUI } from "@hono/swagger-ui";
import { env } from "hono/adapter";
import { OpenAPIHono } from "@hono/zod-openapi";
import { bearerAuth } from "hono/bearer-auth";
import ping from "./ping";
import notificationsApi from "./notifications/route";
import initSupabase from "./utils/initSupabase";
import { appendTrailingSlash } from "hono/trailing-slash";
import { cors } from "hono/cors";
import profilesApi from "./profiles/route";

const app = new OpenAPIHono().basePath("/v1/notifications");
app.get("/", async (c) => {
  return c.text(
    "This is the notifications microservice to handle notifications for QuestKeeper"
  );
});
app.route("/ping", ping);
app.get(
  "/ui",
  swaggerUI({
    url: "/v1/notifications/doc",
  })
);

app.use(
  cors({
    origin: ["*"],
    allowMethods: ["POST", "GET"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-KEY",
      "X-CLIENT-INFO",
    ],
  })
);

app.use(appendTrailingSlash());
app.use(async (c, next) => {
  const routeEnv = env<{
    ENVIRONMENT: string | null;
  }>(c);

  const { API_KEY } = c.env as {
    API_KEY: string;
  };

  if (c.req.path === "/v1/notifications/doc") {
    if (routeEnv.ENVIRONMENT === "dev") {
      console.log("UI route");
      return next();
    }
  }

  if (
    c.req.path === "/v1/notifications/ping" ||
    c.req.path === "/v1/notifications/ping/"
  ) {
    return next();
  }

  const start = Date.now();

  const bearer = bearerAuth({
    headerName: "X-API-Key",
    prefix: "",
    token: API_KEY,
  });
  await initSupabase(c);
  await bearer(c, next);
  const end = Date.now();
  c.res.headers.set("X-Response-Time", `${end - start}`);
});

app.doc("/doc", {
  info: {
    title: "QuestKeeper Notifications Microservice API",
    version: "v1",
  },
  openapi: "3.1.0",
});

app.route("/", notificationsApi);
app.route("/profiles", profilesApi);

export default app;
