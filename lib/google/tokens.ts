import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { newOAuthClient, type OAuth2Client } from "@/lib/google/client";

/**
 * Sentinel email that flags the row as demo-mode (no real OAuth).
 * Sync/send routes branch on this and use mocked behavior.
 */
export const DEMO_EMAIL = "demo@ailibra.local";

/**
 * Single-user app: google_tokens has at most one row.
 * We pick the most recent row to support the "reconnect" flow.
 */

export type TokenRow = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: string | null;
  email: string | null;
  scope: string | null;
};

export async function readTokenRow(): Promise<TokenRow | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("google_tokens")
    .select("id, access_token, refresh_token, expiry_date, email, scope")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("readTokenRow error:", error.message);
    return null;
  }
  const row = ((data ?? []) as TokenRow[])[0] ?? null;
  return row;
}

export async function isGoogleConnected(): Promise<boolean> {
  const row = await readTokenRow();
  return Boolean(row?.refresh_token);
}

export async function isDemoMode(): Promise<boolean> {
  const row = await readTokenRow();
  return row?.email === DEMO_EMAIL;
}

export async function saveTokenRow(args: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  email?: string | null;
  scope?: string | null;
}): Promise<void> {
  const sb = supabaseAdmin();
  // Upsert: keep one row. We delete previous rows on save for simplicity.
  const existing = await readTokenRow();
  const expiryIso = args.expiry_date ? new Date(args.expiry_date).toISOString() : null;

  if (existing) {
    const update: Record<string, unknown> = {};
    if (args.access_token) update.access_token = args.access_token;
    if (args.refresh_token) update.refresh_token = args.refresh_token;
    if (expiryIso) update.expiry_date = expiryIso;
    if (args.email) update.email = args.email;
    if (args.scope) update.scope = args.scope;
    if (Object.keys(update).length === 0) return;
    const { error } = await sb.from("google_tokens").update(update as never).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const insert: Record<string, unknown> = {
      access_token: args.access_token ?? null,
      refresh_token: args.refresh_token ?? null,
      expiry_date: expiryIso,
      email: args.email ?? null,
      scope: args.scope ?? null,
    };
    const { error } = await sb.from("google_tokens").insert(insert as never);
    if (error) throw new Error(error.message);
  }
}

export async function disconnectGoogle(): Promise<void> {
  const sb = supabaseAdmin();
  // PostgREST requires a filter on DELETE. Use `not is null` which matches all rows.
  const { error } = await sb.from("google_tokens").delete().not("id", "is", null);
  if (error) {
    console.error("disconnectGoogle error:", error.message);
    throw new Error(error.message);
  }
}

/**
 * Returns an authenticated OAuth2Client, refreshing tokens proactively.
 * Throws if not connected.
 */
export async function getAuthedClient(): Promise<OAuth2Client> {
  const row = await readTokenRow();
  if (!row || !row.refresh_token) {
    throw new Error("Google not connected");
  }
  const client = newOAuthClient();
  client.setCredentials({
    access_token: row.access_token ?? undefined,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date ? new Date(row.expiry_date).getTime() : undefined,
    scope: row.scope ?? undefined,
  });

  // Persist new tokens emitted by the library (silent refresh).
  client.on("tokens", (t: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null; scope?: string | null }) => {
    void saveTokenRow({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expiry_date: t.expiry_date,
      scope: t.scope,
    });
  });

  // Proactive refresh if access_token expires within 60s.
  const now = Date.now();
  const expiry = row.expiry_date ? new Date(row.expiry_date).getTime() : 0;
  if (!row.access_token || expiry <= now + 60_000) {
    try {
      const r = await client.refreshAccessToken();
      const creds = r.credentials;
      await saveTokenRow({
        access_token: creds.access_token,
        refresh_token: creds.refresh_token,
        expiry_date: creds.expiry_date,
        scope: creds.scope,
      });
      client.setCredentials(creds);
    } catch (err) {
      console.error("token refresh failed:", err);
      throw new Error("Token refresh failed — reconnect Gmail.");
    }
  }

  return client;
}
