import { OpenAPIHono } from "@hono/zod-openapi";
import { createNotification, createNotificationRoute } from "./create";
import {
  getNotificationsFromTaskId,
  getNotificationsFromTaskIdRoute,
} from "./get";

const notificationsApi = new OpenAPIHono();

notificationsApi.openapi(createNotificationRoute, createNotification);

notificationsApi.openapi(
  getNotificationsFromTaskIdRoute,
  getNotificationsFromTaskId
);

export default notificationsApi;
