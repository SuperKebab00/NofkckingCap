# No Cap Next Production Deployment

This app is deployed from `next-prod` with OpenNext for Cloudflare Workers.

## Cloudflare Workers Builds

Use this configuration in Cloudflare:

- Git repository: `SuperKebab00/NofkckingCap`
- Root directory: `next-prod`
- Production branch: `codex/next-prod-only`
- Build command: `npm run build:cloudflare`
- Deploy command: `npm run deploy`
- Version command: `npm run versions:upload`
- Non-production builds: enabled
- Build watch paths: `*`
- Variables/secrets: see below
- Build cache: disabled

`npm run build:cloudflare` runs `opennextjs-cloudflare build` and generates
`.open-next/worker.js` plus `.open-next/assets`. `npm run deploy` runs
`opennextjs-cloudflare deploy`, which deploys the already-built OpenNext worker
through Wrangler.

`npx wrangler deploy` also works after the OpenNext build, but the adapter
deploy command is preferred because it is the package-level deployment entrypoint
for OpenNext Cloudflare and can apply adapter-specific deployment behavior.

## Local Next checks

Run these from `next-prod`:

```bash
npm install
npm run lint
npm run build
npm test
```

For local Next development:

```bash
npm run dev -- --port 3100
```

Open `http://localhost:3100`.

## Local Cloudflare checks

Run these from `next-prod`:

```bash
npm run build:cloudflare
npx wrangler deploy --dry-run
```

For local Cloudflare Worker preview:

```bash
npm run build:cloudflare
npx wrangler dev
```

`next dev` serves the Next development server. `wrangler dev` serves the
OpenNext-built Cloudflare Worker and requires `.open-next/worker.js` to exist.

## Wrangler config

`wrangler.jsonc` must stay inside `next-prod`. It uses relative paths:

- `main`: `.open-next/worker.js`
- `assets.directory`: `.open-next/assets`
- `compatibility_flags`: `nodejs_compat`

No KV, D1, R2, Queues, Durable Objects, or Analytics Engine bindings are
required by the current code.

## Variabili e secrets Cloudflare

### Obbligatorie

Nessuna variabile applicativa e obbligatoria per build, deploy o runtime base.
The app builds and renders with static fallback content when Supabase/admin/live
contact configuration is absent.

Cloudflare Workers Builds still needs repository access and a Cloudflare deploy
token at the platform level, but that token is not a Worker variable and must
not be added to this app as an environment variable.

### Opzionali

- `NEXT_PUBLIC_SUPABASE_URL`
  - Used in: `lib/supabase-public.ts`, `lib/admin-login.ts`
  - Type: plain variable
  - Example: `https://your-project.supabase.co`
  - Create in dashboard: Workers & Pages project settings, Variables, Add variable
  - CLI: not a secret; set as a plain environment variable in Cloudflare

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Used in: `lib/supabase-public.ts`, `lib/admin-login.ts`
  - Type: plain variable
  - Example: `your-public-anon-key`
  - Create in dashboard: Workers & Pages project settings, Variables, Add variable
  - CLI: not a secret; set as a plain environment variable in Cloudflare

- `NEXT_PUBLIC_CONTACT_FORM_MODE`
  - Used in: `components/contact-form.tsx`, `lib/public-flow.ts`
  - Type: plain variable
  - Example: `preview`, `disabled`, or `live`
  - Create in dashboard: Workers & Pages project settings, Variables, Add variable
  - Use `preview` if Supabase server secrets are not configured.

- `SUPABASE_URL`
  - Used in: `lib/server/api-core.ts`, `lib/server/contact-create.ts`,
    `lib/server/admin-auth.ts`, `lib/server/admin-status.ts`,
    `lib/server/admin-products-summary.ts`
  - Type: plain variable
  - Example: `https://your-project.supabase.co`
  - Create in dashboard: Workers & Pages project settings, Variables, Add variable
  - Required only for live contact persistence and admin server features.

- `SUPABASE_SERVICE_ROLE_KEY`
  - Used in: `lib/server/api-core.ts`, `lib/server/contact-create.ts`,
    `lib/server/admin-auth.ts`, `lib/server/admin-status.ts`,
    `lib/server/admin-products-summary.ts`
  - Type: secret
  - Example: `your-service-role-key`
  - Dashboard: Workers & Pages project settings, Variables, Add secret
  - CLI: `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
  - Required only for live contact persistence and admin server features.

- `SUPABASE_JWKS_URL`
  - Used in: `lib/admin-auth-check.ts`, `lib/server/admin-auth.ts`
  - Type: plain variable
  - Example: `https://your-project.supabase.co/auth/v1/.well-known/jwks.json`
  - Create in dashboard: Workers & Pages project settings, Variables, Add variable
  - Required only for admin JWT auth checks.

- `ADMIN_API_TOKEN`
  - Used in: `lib/server/api-core.ts`, admin API route handlers
  - Type: secret
  - Example: `replace-with-random-server-token`
  - Dashboard: Workers & Pages project settings, Variables, Add secret
  - CLI: `npx wrangler secret put ADMIN_API_TOKEN`
  - Required only for protected admin status/products API endpoints.

- `TURNSTILE_SECRET_KEY`
  - Used in: `lib/server/api-core.ts`
  - Type: secret
  - Example: `your-turnstile-secret-key`
  - Dashboard: Workers & Pages project settings, Variables, Add secret
  - CLI: `npx wrangler secret put TURNSTILE_SECRET_KEY`
  - Optional anti-abuse validation for API payloads when a Turnstile token is sent.

- `APP_ENV`
  - Used in: `lib/server/api-core.ts`, `lib/server/admin-status.ts`,
    `lib/server/contact-create.ts`
  - Type: plain variable
  - Example: `production`
  - Create in dashboard: Workers & Pages project settings, Variables, Add variable
  - Optional. In production, internal error details are suppressed.

### Da non mettere

- `CLOUDFLARE_API_TOKEN`
  - This belongs to Cloudflare Workers Builds/Git integration, not Worker runtime.

- `NEXT_PUBLIC_ADMIN_API_TOKEN`
- `NEXT_PUBLIC_ADMIN_AUTH_JWT`
- `NEXT_PUBLIC_SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
  - These are explicitly guarded against by tests and must never be exposed to
    browser code.

- `.env`, `.env.local`, `.env.development.local`, `.env.test.local`,
  `.env.production.local`
  - Local-only files. They are ignored by `next-prod/.gitignore` and should not
    be uploaded as files.
