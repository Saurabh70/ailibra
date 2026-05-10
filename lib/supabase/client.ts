"use client";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Client-side Supabase client using the anon key.
 * Most of the app routes through API endpoints, but this is here for
 * any read-only browser-side queries we want to add later.
 */
export function supabaseBrowser() {
  if (cached) return cached;
  cached = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return cached;
}
