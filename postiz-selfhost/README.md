# Self-hosted Postiz for GrowthHunt

Open-source Postiz on **your own infra**, DB on **your own Supabase**, wired into
GrowthHunt's Scheduler. This is the path to a real X send.

## Why a cloud host (not your laptop)
Postiz must reach `api.x.com` to run the X OAuth "Connect" flow. On a
network that blocks X (e.g. mainland China direct), the container can't do
that. Run Postiz on a host with clean egress.

## What you need
- A small Linux VPS with Docker (1 vCPU / 1–2 GB RAM is enough), e.g.
  Hetzner / DigitalOcean / Vultr / Fly.io / Railway. Open egress to X + Supabase.
- A domain or the host's IP (for `PUBLIC_URL`). HTTPS recommended (Caddy/nginx).
- A **dedicated Supabase project** (separate from GrowthHunt) to hold Postiz's tables.
- An X developer app (developer.x.com) for `X_API_KEY` / `X_API_SECRET`.

## Steps

1. **Supabase (DB)**
   - Create a new Supabase project.
   - Project Settings → Database → Connection string → **Direct connection**
     (host `db.<ref>.supabase.co`, port `5432`). Append `?sslmode=require`.
   - This becomes `DATABASE_URL`.

2. **X developer app**
   - developer.x.com → create app → copy API Key + Secret.
   - Set the OAuth callback to `${PUBLIC_URL}/integrations/social/x`.

3. **On the cloud host**
   ```bash
   git clone <this repo> && cd postiz-selfhost
   cp .env.example .env      # fill PUBLIC_URL, JWT_SECRET, DATABASE_URL, X_API_KEY, X_API_SECRET
   docker compose up -d
   docker compose logs -f postiz   # wait for migrations + "ready"
   ```

4. **Connect X inside Postiz**
   - Open `PUBLIC_URL`, register the first account.
   - Add Channel → X → authorize. Your X account now shows as a channel.

5. **Get the API key**
   - Postiz → Settings → Developers → Public API → copy the key.

6. **Wire into GrowthHunt**
   - GrowthHunt → `/agents/scheduler` → Connect Postiz:
     - API base URL: `${PUBLIC_URL}/api/public/v1`  *(self-host puts the public
       API under `/api`; Cloud uses `https://api.postiz.com/public/v1`)*
     - API key: the one from step 5 → **Connect & verify**.
   - Compose a post → select X → Schedule / Post now. Done — real send.

## Notes
- Pinned to `v2.11.3` (no Temporal). To go newer you must add Temporal.
- Lock signups after creating your account: `DISABLE_REGISTRATION=true`.
- GrowthHunt only ever talks to this instance over its REST API — no Postiz
  code is imported (keeps GrowthHunt clear of AGPL).
