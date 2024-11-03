import { Context } from "hono";
import { env } from "hono/adapter";
import { supabase } from "../utils/initSupabase";
import generateAccessToken from "../utils/generateFirebaseAccessToken";

async function deleteFcmTokenFromGroup(
  c: Context<{}, any, {}>,
  user_device_group: { data: { user_id: string; device_group: string } | null },
  recordBody: {
    old_record: { user_id: string; token: string };
  }
): Promise<string> {
  if (user_device_group?.data?.device_group === null) {
    throw new Error("Device group is required");
  }

  if (recordBody.old_record.token === null) {
    throw new Error("Token is required");
  }

  const workersEnv = env<{
    FCM_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
  }>(c);
  const accessToken = await generateAccessToken(c);
  const PROJECT_ID = workersEnv.FCM_PROJECT_ID;

  // Create the device group
  const url = `https://fcm.googleapis.com/fcm/notification`;
  const body = {
    operation: "remove",
    notification_key_name: `appUser~${recordBody.old_record.user_id}`,
    notification_key: user_device_group.data!.device_group,
    registration_ids: [recordBody.old_record.token],
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
    throw new Error(`Error removing device group: ${await response.text()}`);
  }

  const result = (await response.json()) as { notification_key: string };
  return result.notification_key;
}

export async function deleteProfile(
  c: Context<{}, any, {}>,
  body: any
): Promise<any> {
  const userId = body.old_record.user_id;
  try {
    const user_device_group = await supabase
      ?.from("user_device_group")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    await deleteFcmTokenFromGroup(c, user_device_group as any, body);

    const allProfiles = await supabase
      ?.from("profiles")
      .select("*")
      .eq("user_id", userId);

    if (allProfiles?.data?.length === 0) {
      await supabase?.from("user_device_group").delete().eq("user_id", userId);
    }

    return c.json(
      {
        success: true,
        message: "Profile deleted successfully",
      },
      200
    );
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}
