import { OpenAPIHono } from "@hono/zod-openapi";
import { createNotification, createNotificationRoute } from "./create";
import {
  getNotificationsFromTaskId,
  getNotificationsFromTaskIdRoute,
} from "./get";
import { sendNotification, sendNotificationRoute } from "./send";
import { notifyRoute, notifyHandler } from "./notify";

const notificationsApi = new OpenAPIHono()
  .openapi(createNotificationRoute, createNotification)
  .openapi(getNotificationsFromTaskIdRoute, getNotificationsFromTaskId)
  .openapi(sendNotificationRoute, sendNotification)
  .openapi(notifyRoute, notifyHandler);

export default notificationsApi;
