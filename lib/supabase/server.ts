import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv_ } from "@/lib/env";

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Server-side Supabase client using the service role key.
 * NEVER import this from a client component.
 *
 * Important: pass cache: "no-store" on every fetch. Without this, Next.js
 * caches Supabase responses by URL+method, leading to stale reads (e.g.
 * a delete is invisible to a subsequent select on the same path).
 */
export function supabaseAdmin() {
  if (cached) return cached;
  const env = serverEnv_();
  cached = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
