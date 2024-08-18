import { swaggerUI } from "@hono/swagger-ui";
import { env } from "hono/adapter";
import { OpenAPIHono } from "@hono/zod-openapi";
import { bearerAuth } from "hono/bearer-auth";
import ping from "./ping";
import notificationsApi from "./notifications/route";
import initSupabase from "./utils/initSupabase";
import { appendTrailingSlash } from "hono/trailing-slash";
import { jwt } from "hono/jwt";

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
    withCredentials: true,
    url: "/v1/notifications/doc",
  })
);

app.use(appendTrailingSlash());
app.use(async (c, next) => {
  const routeEnv = env<{
    API_KEY: string;
    ENVIRONMENT: string | null;
  }>(c);
  if (c.req.path === "/v1/notifications/doc") {
    console.log(routeEnv);
    if (routeEnv.ENVIRONMENT === "dev") {
      console.log("UI route");
      return next();
    }
  }

  const start = Date.now();

  const bearer = bearerAuth({
    headerName: "X-API-Key",
    prefix: "",
    token: routeEnv.API_KEY,
  });
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

app.use(async (c, next) => {
  const routeEnv = env<{
    JWT_SECRET: string;
  }>(c);
  // Could check referrer to see if it's from the mobile app or the server
  // Based on that, select JWT_SECRET or SUPABASE_SECRET to authenticate user
  const jwtAuth = jwt({ secret: routeEnv.JWT_SECRET });
  await initSupabase(c);
  return await jwtAuth(c, next);
});

app.route("/", notificationsApi);

export default app;
