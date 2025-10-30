import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

declare global {
  interface Window {
    __SUPABASE_CONFIG__?: {
      url: string;
      anonKey: string;
    };
  }
}

export function createSupabaseBrowserClient() {
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    (typeof window !== "undefined" ? window.__SUPABASE_CONFIG__?.url : undefined);
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
    (typeof window !== "undefined" ? window.__SUPABASE_CONFIG__?.anonKey : undefined);

  if (!url || !anonKey) {
    throw new Error("Missing Supabase browser configuration");
  }

  return createBrowserClient<Database>(url, anonKey);
}
