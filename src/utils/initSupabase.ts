import { createClient } from "@supabase/supabase-js";
import { Context } from "hono";
import { env } from "hono/adapter";

async function initSupabase(c: Context<{}, any, {}>) {
  const { SUPABASE_URL, SUPABASE_KEY } = env<{
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
  }>(c);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  if (supabase === null) {
    return null;
  }

  return supabase;
}

export default initSupabase;
