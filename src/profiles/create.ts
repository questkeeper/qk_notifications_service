import { Context } from "hono";
import { env } from "hono/adapter";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";

async function createFcmDeviceGroup(
  c: Context<{}, any, {}>,
  user_device_group: { data: { user_id: string; device_group: string } | null },
  recordBody: {
    record: { user_id: string; token: string };
    old_record:
      | { user_id: string | null; token: string | null }
      | null
      | undefined;
  }
): Promise<string> {
  if (recordBody.record.token === null) {
    throw new Error("Token is required");
  }

  if (
    recordBody.old_record &&
    recordBody.record.token === recordBody.old_record.token
  ) {
    return user_device_group?.data?.device_group || "";
  }

  const workersEnv = env<{
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
  }>(c);
  const accessToken = await generateAccessToken(c);
  const PROJECT_ID = workersEnv.FIREBASE_PROJECT_ID;

  // Create the device group
  const url = `https://fcm.googleapis.com/fcm/notification`;
  const body = {
    notification_key_name: `appUser~${recordBody.record.user_id}`,
    operation: user_device_group.data?.device_group ? "add" : "create",
    notification_key: user_device_group.data?.device_group,
    registration_ids: [recordBody.record.token],
  };

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
    throw new Error(`Error creating device group: ${await response.text()}`);
  }

  const result = (await response.json()) as { notification_key: string };
  return result.notification_key;
}

export async function createProfile(
  c: Context<{}, any, {}>,
  body: any
): Promise<any> {
  try {
    const user_device_group = await supabase
      ?.from("user_device_group")
      .select("*")
      .eq("user_id", body.record.user_id)
      .maybeSingle();

    if (body.type !== "DELETE") {
      const deviceGroup = await createFcmDeviceGroup(
        c,
        user_device_group as any,
        body
      );

      if (user_device_group?.data === null) {
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
    } else {
      return c.json(
        {
          success: true,
          message: "Profile deleted successfully",
        },
        200
      );
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}
