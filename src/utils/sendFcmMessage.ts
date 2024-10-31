export default async function sendFcmMessage({
  PROJECT_ID,
  accessToken,
  deviceGroup,
  isNotificationMessage,
  notification,
  dataMessage,
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
            data: dataMessage ?? dataMessage,
            notification: notification ?? { notification },
            token: deviceGroup,
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
