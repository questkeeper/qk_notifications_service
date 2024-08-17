import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import ping from "./ping";
import notificationsApi from "./notifications/route";

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

app.route("/", notificationsApi);
app.route("/ping", ping);

export default app;
