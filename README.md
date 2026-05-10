# ailibra

AI-native CRM for B2B sales teams. Talk to it; it captures, prioritises, drafts, and prepares so you can focus on selling.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Framer Motion · Supabase · Anthropic Claude · googleapis · Resend · Apollo.

## Run locally

```bash
pnpm install
cp .env.example .env.local   # fill in REQUIRED keys
pnpm seed                    # populates demo data into your Supabase
pnpm dev                     # http://localhost:3000
```

The dev script (`scripts/dev.mjs`) loads `.env.local` with `override: true`, so values in the file beat anything in your shell environment.

## Required environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Database |
| `ANTHROPIC_API_KEY` | Every AI feature |
| `MASTER_PASSWORD` | Basic-auth gate on deployed app (skipped on localhost) |
| `SEED_TOKEN` | Token check on `POST /api/seed` (skip if unset) |
| `NEXT_PUBLIC_APP_URL` | Used to build OAuth redirect URLs |

## Optional integrations (Demo Mode if absent)

Each of these has a Demo Mode toggle in Settings — when the real key isn't configured, the integration runs end-to-end against the local DB with simulated behaviour.

- **Google (Gmail + Calendar)**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Apollo enrichment**: `APOLLO_API_KEY`
- **Resend tracked sends**: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`

## Database setup

Apply [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) once via the Supabase SQL Editor. Then:

```bash
pnpm seed
```

The seed creates 5 companies, 15 contacts (realistic Indian names), 8 deals across stages, ~34 activities, and 10 tasks.

## Architecture cheatsheet

- `app/page.tsx` — **Flow** (home): AI-ranked Right Now, Coming Up, Actions Ready, Stats
- `app/explore/` — Pipeline list, People list, Deal detail (with AI summary, timeline, health bars), Contact detail (with relationship summary)
- `app/ask/` — Chat interface with tool-use over the CRM (`get_deals`, `get_activities`, `get_contact`, `get_pipeline_summary`, `search_notes`)
- `components/command-bar/` — Always-visible top bar; routes through `POST /api/command` which runs a Claude tool-use loop to create/update entities from free text
- `lib/anthropic/{client,prompts,ask-tools,command-tools}.ts` — All AI orchestration
- `lib/google/{client,tokens,gmail,calendar,demo-emails}.ts` — Google integration with demo fallback
- `lib/client-cache.ts` — sessionStorage TTL cache for slow AI fetches across navigation
- `middleware.ts` — `MASTER_PASSWORD` Basic-auth gate (skipped on localhost)

## Deploy to Vercel

1. Push the repo to GitHub
2. Create Vercel project, connect the repo
3. Add the **REQUIRED** env vars from `.env.example` (set `NEXT_PUBLIC_APP_URL` to your `https://*.vercel.app` domain)
4. Add optional integration vars only if you have keys — otherwise Demo Mode runs in production too
5. **If you set Google vars:** add the production callback URL to your OAuth client:
   ```
   https://your-app.vercel.app/api/google/callback
   ```
   and re-set `GOOGLE_REDIRECT_URI` to that URL in Vercel
6. Deploy. The `middleware.ts` gate kicks in — every request needs Basic auth (any username, password = `MASTER_PASSWORD`)

## Notes

- AI calls default to `claude-sonnet-4-6`. Override per-feature in `lib/anthropic/client.ts` (`MODELS.default`, `.fast`, `.best`).
- `pnpm seed` is idempotent — it wipes the demo dataset and reinserts. Don't run on data you care about.
- `POST /api/seed` (the in-app re-seed button) is gated by `SEED_TOKEN` if set in env.
- Token usage is logged into `ai_conversations` for cost auditing.
