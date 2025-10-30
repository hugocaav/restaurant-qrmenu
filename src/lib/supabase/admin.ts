import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getEnv } from "@/lib/env";

export const supabaseAdmin = createClient<Database>(
  getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
