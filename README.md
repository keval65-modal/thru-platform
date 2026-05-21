# Thru Platform (monorepo)

Local workspace for Thru apps imported under `FirebaseImports/`.

## Projects

| App | Path | Notes |
|-----|------|--------|
| **Vendor dashboard** | `FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main` | Next.js merchant app; production: [merchant.kiptech.in](https://merchant.kiptech.in) |
| **User app** | `FirebaseImports/thru-user-app29082025-master/thru-user-app29082025-master` | Customer-facing app (canonical nested copy) |
| **Landing** | `FirebaseImports/thru-landing` | Marketing / landing site |

## Setup (any machine)

1. Clone this repo.
2. For each app you work on:
   ```bash
   cd <path-from-table-above>
   npm install
   ```
3. Copy env templates and fill in secrets (not in Git):
   - Vendor: `cp .env.local.example .env.local` (in vendor app folder)
   - Add Supabase, Firebase, Meta WhatsApp vars as documented in each app's `ADMIN_SETUP.md` / `WHATSAPP_SETUP.md`.

## Vendor app quick start

```bash
cd FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main
npm install
npm run dev
```

Default dev port: **9003** (`npm run dev`).

## Supabase SQL migrations (vendor)

Run in Supabase SQL editor, in order as needed:

- `src/lib/supabase/merchant-agreements-schema.sql`
- `src/lib/supabase/whatsapp-messages-schema.sql`
- `src/lib/supabase/onboarding-schema.sql`
- `src/lib/supabase/merchant-kyc-schema.sql`

## Git

- **Remote:** https://github.com/keval65-modal/thru-platform
- Secrets and `node_modules` are excluded via root `.gitignore`.

## Vercel (monorepo)

See [docs/VERCEL_MONOREPO.md](docs/VERCEL_MONOREPO.md) for per-project root directories and CLI deploy commands.
