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
npm run deploy
```

## Cloudflare Workers

- Root directory: `/destinazione/next-prod`
- Build command: `npm run build:cloudflare`
- Deploy command: `npm run deploy`
- Version command: `npm run versions:upload`
- Production branch: `definitivo`

## Environment variables

Public build-time: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_CONTACT_FORM_MODE`.

Runtime Worker: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `TURNSTILE_SECRET_KEY`,
`APP_ENV`.

Set production values in Cloudflare. Do not commit real `.env*` files or expose
server-only variables through `NEXT_PUBLIC_*`. `npm run deploy` and
`npm run versions:upload` preserve dashboard-managed vars with `--keep-vars`.
Payments remain disabled.
