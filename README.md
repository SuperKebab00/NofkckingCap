# No Cap Production Repository

This repository contains the production Next.js application in
`destinazione/next-prod`. Run all application commands from that directory.

## Requirements and commands

Use the Node.js version specified by `destinazione/next-prod/package.json` and
its lockfile.

```bash
cd destinazione/next-prod
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run build:cloudflare
npx wrangler deploy
```

## Cloudflare Workers

- Root directory: `/destinazione/next-prod`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Version command: `npx wrangler versions upload`
- Production branch: `definitivo`

## Environment variables

Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_CONTACT_FORM_MODE`.

Server-only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`,
`ADMIN_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `APP_ENV`.

Set production values in Cloudflare. Do not commit real `.env*` files or expose
server-only variables through `NEXT_PUBLIC_*`. Payments remain disabled.
