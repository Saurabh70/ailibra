import "server-only";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { serverEnv_ } from "@/lib/env";

/**
 * Scopes we request on connect:
 * - gmail.readonly: list/read messages for sync
 * - gmail.send: send emails via Gmail API
 * - calendar: list + create events (Phase 7)
 * - userinfo.email: display the connected account
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type { OAuth2Client };

export function newOAuthClient(): OAuth2Client {
  const env = serverEnv_();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env not configured");
  }
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}
