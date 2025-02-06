import { Context } from "hono";
import { env } from "hono/adapter";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";

interface UserDeviceGroup {
  data: {
    user_id: string;
    device_group: string;
  } | null;
}

interface RecordBody {
  record: {
    user_id: string;
    token: string;
  };
  old_record?: {
    user_id: string | null;
    token: string | null;
  } | null;
  type?: string;
}

async function retrieveExistingNotificationKey(
  projectId: string,
  accessToken: string,
  notificationKeyName: string
): Promise<string | null> {
  const url = `https://fcm.googleapis.com/fcm/notification?notification_key_name=${notificationKeyName}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        project_id: projectId,
        access_token_auth: "true",
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { notification_key: string };
      return data.notification_key;
    }
    return null;
  } catch (error) {
    console.log("Error retrieving existing notification key:", error);
    return null;
  }
}

async function createFcmDeviceGroup(
  c: Context<{}, any, {}>,
  userDeviceGroup: UserDeviceGroup,
  recordBody: RecordBody
): Promise<string> {
  if (!recordBody.record.token) {
    throw new Error("Token is required");
  }

  // Check if we can reuse existing token
  if (
    recordBody.old_record?.token === recordBody.record.token &&
    userDeviceGroup?.data?.device_group
  ) {
    return userDeviceGroup.data.device_group;
  }

  const workersEnv = env<{
    FCM_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
  }>(c);
  const accessToken = await generateAccessToken(c);
  const PROJECT_ID = workersEnv.FCM_PROJECT_ID;
  const notificationKeyName = `appUser~${recordBody.record.user_id}`;

  // First, try to retrieve an existing notification key
  const existingKey = await retrieveExistingNotificationKey(
    PROJECT_ID,
    accessToken,
    notificationKeyName
  );

  if (existingKey) {
    return existingKey;
  }

  // If no existing key, create or update device group
  const url = "https://fcm.googleapis.com/fcm/notification";
  const body = {
    notification_key_name: notificationKeyName,
    operation: userDeviceGroup.data?.device_group ? "add" : "create",
    notification_key: userDeviceGroup.data?.device_group,
    registration_ids: [recordBody.record.token],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        project_id: PROJECT_ID,
        access_token_auth: "true",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Check for notification_key already exists error
      console.log("ERROR TEXT is ", errorText);
      if (errorText.includes("notification_key already exists")) {
        const existingKey = await retrieveExistingNotificationKey(
          PROJECT_ID,
          accessToken,
          notificationKeyName
        );
        if (existingKey) {
          return existingKey;
        }
      }
      throw new Error(`Error creating device group: ${errorText}`);
    }

    const result = (await response.json()) as { notification_key: string };
    console.log("Created new device group with key:", result.notification_key);
    return result.notification_key;
  } catch (error) {
    console.error("Error in createFcmDeviceGroup:", error);
    throw error;
  }
}

export async function createProfile(
  c: Context<{}, any, {}>,
  body: RecordBody
): Promise<Response> {
  try {
    const userDeviceGroup = await supabase
      ?.from("user_device_group")
      .select("*")
      .eq("user_id", body.record.user_id)
      .maybeSingle();

    if (body.type !== "DELETE") {
      const deviceGroup = await createFcmDeviceGroup(
        c,
        userDeviceGroup as UserDeviceGroup,
        body
      );

      if (!userDeviceGroup?.data) {
        await supabase
          ?.from("user_device_group")
          .insert([
            { user_id: body.record.user_id, device_group: deviceGroup },
          ]);
      }

      return c.json(
        {
          success: true,
          message: "Profile created successfully",
          deviceGroup,
        },
        200
      );
    }

    return c.json(
      {
        success: true,
        message: "Profile deleted successfully",
      },
      200
    );
  } catch (error) {
    console.error("Error in createProfile:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      500
    );
  }
}
