import { OpenAPIHono } from "@hono/zod-openapi";
import { createNotification, createNotificationRoute } from "./create";
import {
  getNotificationsFromTaskId,
  getNotificationsFromTaskIdRoute,
} from "./get";
import { sendNotification, sendNotificationRoute } from "./send";
import { notifyInApp, notifyInAppRoute } from "./notify";

const notificationsApi = new OpenAPIHono()
  .openapi(createNotificationRoute, createNotification)
  .openapi(getNotificationsFromTaskIdRoute, getNotificationsFromTaskId)
  .openapi(sendNotificationRoute, sendNotification)
  .openapi(notifyInAppRoute, notifyInApp);

export default notificationsApi;
