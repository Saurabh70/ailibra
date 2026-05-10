import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  MASTER_PASSWORD: z.string().min(8).optional(),
  SEED_TOKEN: z.string().min(8).optional(),

  LOGIN_EMAIL: z.string().email().default("saurabh@gmail.com"),
  LOGIN_PASSWORD: z.string().min(4).default("workwithlibraai"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  APOLLO_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const isServer = typeof window === "undefined";

let serverEnv: z.infer<typeof serverSchema> | null = null;
function loadServerEnv() {
  if (!isServer) {
    throw new Error("serverEnv accessed on the client. This is a bug.");
  }
  if (serverEnv) return serverEnv;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid server env:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  serverEnv = parsed.data;
  return serverEnv;
}

const publicParsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
if (!publicParsed.success) {
  console.error("❌ Invalid public env:", publicParsed.error.flatten().fieldErrors);
  throw new Error("Invalid public environment variables");
}

export const publicEnv = publicParsed.data;
export const serverEnv_ = () => loadServerEnv();

export function hasGoogle() {
  if (!isServer) return false;
  const e = loadServerEnv();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET && e.GOOGLE_REDIRECT_URI);
}
export function hasApollo() {
  if (!isServer) return false;
  return Boolean(loadServerEnv().APOLLO_API_KEY);
}
export function hasResend() {
  if (!isServer) return false;
  return Boolean(loadServerEnv().RESEND_API_KEY);
}
