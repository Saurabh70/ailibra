import "server-only";
import { google, gmail_v1 } from "googleapis";
import { getAuthedClient } from "@/lib/google/tokens";

export async function gmailClient(): Promise<gmail_v1.Gmail> {
  const auth = await getAuthedClient();
  return google.gmail({ version: "v1", auth });
}

// ─── header helper ───────────────────────────────────────
export function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  if (!headers) return null;
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

// ─── parse a Gmail message into a flat shape ─────────────
export type ParsedMessage = {
  id: string;
  threadId: string;
  messageIdHeader: string | null;
  from: string;
  fromEmail: string | null;
  to: string;
  cc: string | null;
  subject: string;
  snippet: string;
  body: string;
  date: string; // ISO
  isInbound: boolean; // true if not sent by us
  labels: string[];
};

export function parseGmailMessage(
  msg: gmail_v1.Schema$Message,
  ourEmail: string | null
): ParsedMessage | null {
  if (!msg.id) return null;
  const headers = msg.payload?.headers;
  const fromRaw = header(headers, "From") ?? "";
  const toRaw = header(headers, "To") ?? "";
  const subject = header(headers, "Subject") ?? "(no subject)";
  const messageIdHeader = header(headers, "Message-ID") ?? null;
  const dateRaw = header(headers, "Date");
  const date = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();

  const fromEmail = extractEmail(fromRaw);
  const isInbound = ourEmail && fromEmail ? fromEmail.toLowerCase() !== ourEmail.toLowerCase() : true;

  const body = extractBody(msg.payload);
  const snippet = (msg.snippet ?? "").trim();

  return {
    id: msg.id,
    threadId: msg.threadId ?? msg.id,
    messageIdHeader,
    from: fromRaw,
    fromEmail,
    to: toRaw,
    cc: header(headers, "Cc"),
    subject,
    snippet,
    body: body.slice(0, 4000), // cap
    date,
    isInbound,
    labels: msg.labelIds ?? [],
  };
}

function extractEmail(raw: string): string | null {
  if (!raw) return null;
  const m = raw.match(/<([^>]+)>/);
  if (m) return m[1].toLowerCase().trim();
  if (raw.includes("@")) return raw.toLowerCase().trim();
  return null;
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  // Prefer text/plain, fall back to text/html stripped to plaintext.
  const plain = findPart(payload, "text/plain");
  if (plain) return decodeBase64Url(plain.body?.data ?? "");
  const htmlPart = findPart(payload, "text/html");
  if (htmlPart) {
    const html = decodeBase64Url(htmlPart.body?.data ?? "");
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function findPart(part: gmail_v1.Schema$MessagePart, mime: string): gmail_v1.Schema$MessagePart | null {
  if (part.mimeType === mime && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mime);
    if (found) return found;
  }
  return null;
}

function decodeBase64Url(b64: string): string {
  if (!b64) return "";
  try {
    const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(norm, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

// ─── send helper: build RFC2822 + send ───────────────────
export async function sendGmail(args: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const gmail = await gmailClient();
  const lines = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    args.body,
  ];
  const raw = Buffer.from(lines.join("\r\n"), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  return { id: res.data.id ?? "", threadId: res.data.threadId ?? "" };
}
