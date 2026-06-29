# Next App Migration Shell

This folder contains the parallel Next.js App Router migration for the public
surface of the site. The vanilla site remains the primary production source.

## Current Route Status

- `/`: public home route active
- `/shop`: public catalog route active
- `/contact`: real Next contact form active
- `/privacy`: static informational route active
- `/cookie`: static informational route active
- `/checkout`: placeholder only
- `/admin`: placeholder only

## Current Public Scope

- Public navbar exposes only `Home`, `Shop`, and `Contatti`.
- A global footer links to `/`, `/contact`, `/privacy`, and `/cookie`.
- `/shop` uses read-only Supabase public access only.
- Current read-only data already used in Next includes products, categories,
  shop sections, and shop section items.
- `/shop` also includes local search, sort, and category filtering.
- `/contact` posts to the existing Cloudflare endpoint
  `POST /api/contact/create`.

## Current Constraints

- No Next API routes are part of the current migration stage.
- No `SUPABASE_SERVICE_ROLE_KEY` is used or exposed in the client.
- Checkout and admin real flows are still handled by the vanilla app.
- Public asset parity is still incomplete and remains a separate task.

## Preview Mode

For a detached preview deploy of `next-app/`, use only public env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_CONTACT_FORM_MODE=preview
```

Mode guidance:

- `live`: use only for local or same-origin live environments where
  `/api/contact/create` is reachable on the same domain.
- `preview`: use for detached preview domains. The contact form stays visible
  and contextual, but submit is intentionally disabled.
- `disabled`: manual fallback if the form must remain visible but fully blocked.

What works in preview:

- public home
- `/shop` read-only with public Supabase data
- `/checkout` in-shop client-side flow
- `/contact` contextual UI and prefill
- `/privacy`, `/cookie`
- `/admin` read-only structure

What remains disabled in preview:

- contact submit to `POST /api/contact/create`
- any behavior that depends on same-origin Cloudflare Functions

Why contact submit is disabled in preview:

- the real backend still lives in the vanilla/Cloudflare root app
- no proxy, rewrite, or Next API route has been introduced for preview mode
- this avoids detached-domain failures and fragile CORS workarounds

See [`.env.example`](C:/Users/Jadir/Desktop/NO%20CAP/next-app/.env.example) for a
minimal preview-safe example.

## Verification Commands

Inside `next-app/`:

```bash
npm test
npm run typecheck
npm run build
```

From the repository root:

```bash
npm test
```

## Formatting Note

Root `npm run check:format` is known to fail because of pre-existing unrelated
formatting issues. It is not the gating command for the current migration
micro-steps unless a dedicated formatting task is opened.
## Admin API env

Use these server-only env vars when you want `/admin` to read the protected Cloudflare admin status endpoint:

```bash
ADMIN_API_BASE_URL=...
ADMIN_API_TOKEN=replace-on-server-only
```

- `ADMIN_API_BASE_URL` should point to the Cloudflare origin exposing `GET /api/admin/status`.
- `ADMIN_API_TOKEN` must stay server-side only and must never be exposed as `NEXT_PUBLIC_*`.
- If one of these env vars is missing, `/admin` falls back to a static read-only status instead of crashing.
