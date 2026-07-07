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
- `/contact` posts to the same-origin Next Route Handler
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

- contact submit when `NEXT_PUBLIC_CONTACT_FORM_MODE=preview`
- any behavior intentionally blocked by preview mode copy

Why contact submit is disabled in preview:

- preview mode is still a manual safety rail
- `nocap-next` now exposes the contact backend same-origin, but preview can stay
  non-invasive until the final runtime check is complete

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

Use these server-only env vars when you want `nocap-next` to expose protected
admin and contact APIs directly:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWKS_URL=...
ADMIN_API_TOKEN=replace-on-server-only
```

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWKS_URL` stay
  server-side only.
- `ADMIN_API_TOKEN` must stay server-side only and must never be exposed as `NEXT_PUBLIC_*`.
- If required server env vars are missing, `/admin` falls back to a read-only
  status instead of crashing.

Admin auth check:

- `/admin` can also show the status of `GET /api/admin/auth/check`.
- The current Next integration does not source a Supabase admin JWT server-side yet.
- Until a secure server-side session/JWT handoff exists, the panel falls back to `Sessione admin mancante`.
- Do not add `NEXT_PUBLIC_*` JWT/admin auth env vars for this flow.
- A minimal client-side login panel can use Supabase Auth with the anon key, keep the JWT in browser memory, and call the same-origin `GET /api/admin/auth/check` route.
- The browser is not trusted for admin privileges: `nocap-next` remains the source of truth for verification.
## Migration status

Current `next-app` scope:

- public routes migrated: `/`, `/shop`, `/contact`, `/privacy`, `/cookie`
- `/checkout` available only as `in-shop` client-side flow
- `/admin` available only as read-only dashboard + auth verification

Existing Cloudflare admin endpoints:

- `GET /api/admin/status`
- `GET /api/admin/products/summary`
- `GET /api/admin/auth/check`
- `POST /api/contact/create`

Still blocked on purpose:

- admin write endpoints
- CRUD UI
- payments
- automatic SQL migration application

## Pre-write checklist

Before the first real admin write:

1. Apply `sql/admin_users_proposed.sql` manually in Supabase.
2. Insert a real admin row manually in `public.admin_users`.
3. Configure Cloudflare env:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWKS_URL`
   - `ADMIN_API_TOKEN`
4. Configure Next public env:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_CONTACT_FORM_MODE`
5. Verify `/admin` login + `GET /api/admin/auth/check`.
6. Verify `/contact` submit on same-origin `POST /api/contact/create`.
7. Verify no CRUD UI is active before enabling any write endpoint.
