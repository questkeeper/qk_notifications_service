import { supabase } from "./initSupabase";
import { NotificationType } from "./notificationTypes";

export default async function sendFcmMessage({
  PROJECT_ID,
  accessToken,
  deviceGroup,
  isNotificationMessage,
  notification,
  dataMessage,
  notificationType,
}: {
  PROJECT_ID: string;
  accessToken: string;
  deviceGroup: string;
  isNotificationMessage: boolean;
  notification: {
    title: string;
    body: string;
  } | null;
  dataMessage: {
    [key: string]: string;
  } | null;
  notificationType: NotificationType;
}) {
  if (isNotificationMessage === true && notification === null) {
    throw new Error("Notification message is required");
  }

  if (isNotificationMessage === false && dataMessage === null) {
    throw new Error("Data message is required");
  }

  if (dataMessage === null && notification === null) {
    throw new Error("Notification or data message is required");
  }

  const message = {
    token: deviceGroup,
  } as any;

  if (!isNotificationMessage) {
    message.data = dataMessage;
    message.apns = {
      payload: {
        aps: {
          "content-available": 1,
        },
      },
      headers: {
        "apns-push-type": "background",
        "apns-priority": "5",
      },
    };
  } else {
    message.notification = notification;
  }

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            ...message,
          },
        }),
      }
    );
    
    return response;
  } catch (error) {
    console.error("Error", error);
    return error;
  }
}
