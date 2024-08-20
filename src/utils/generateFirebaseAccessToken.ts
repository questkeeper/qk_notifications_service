import { Context } from "hono";
import { env } from "hono/adapter";

export default async function generateAccessToken(
  c: Context<{}, any, {}>
): Promise<string> {
  const workersEnv = env<{
    FIREBASE_CLIENT_EMAIL: string;
  }>(c);

  const SERVICE_ACCOUNT_EMAIL = workersEnv.FIREBASE_CLIENT_EMAIL;
  let { FIREBASE_PRIVATE_KEY } = c.env as {
    FIREBASE_PRIVATE_KEY: string;
  };

  FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

  // Generate a JWT token
  const now = Math.floor(Date.now() / 1000);
  const expTime = now + 600; // Token expires in 10 minutes

  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaimSet = btoa(
    JSON.stringify({
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: expTime,
      iat: now,
    })
  );

  const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureInput);

  function base64urlDecode(str: string) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return atob(str);
  }

  // Import the private key and sign the data
  // Remove the header and footer from the private key
  const privateKeyBase64 = FIREBASE_PRIVATE_KEY.replace(
    /-----BEGIN PRIVATE KEY-----/,
    ""
  )
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = base64urlDecode(privateKeyBase64);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array([...binaryDer].map((char) => char.charCodeAt(0))),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    data
  );

  const jwtSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${jwtHeader}.${jwtClaimSet}.${jwtSignature}`;

  // Get an access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to get access token: ${await tokenResponse.text()}`
    );
  }

  const { access_token } = (await tokenResponse.json()) as {
    access_token: string;
  };

  return access_token;
}
