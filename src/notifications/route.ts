import { OpenAPIHono } from "@hono/zod-openapi";
import { createNotification, createNotificationRoute } from "./create";
import {
  getNotificationsFromTaskId,
  getNotificationsFromTaskIdRoute,
} from "./get";
import { sendNotification, sendNotificationRoute } from "./send";

const notificationsApi = new OpenAPIHono();

notificationsApi.openapi(createNotificationRoute, createNotification);

notificationsApi.openapi(
  getNotificationsFromTaskIdRoute,
  getNotificationsFromTaskId
);

notificationsApi.openapi(sendNotificationRoute, sendNotification);

export default notificationsApi;
