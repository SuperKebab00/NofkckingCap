# AGENTS.md

Operational instructions for Codex and other coding agents working on this project.

## 1. Project overview

This project is a static ecommerce/web app for a barber shop.

- Frontend: vanilla HTML, CSS, and JavaScript.
- API layer: Cloudflare Pages Functions in `functions/api`.
- Hosting target: Cloudflare Pages.
- Data/auth/storage: Supabase on both client and server-side paths.
- Payments: Stripe and PayPal integrations.
- Tests: security smoke checks in `tests/security-smoke-tests.mjs`.
- Tooling: npm scripts and Prettier.

The app should stay lightweight and production-oriented. Avoid broad rewrites unless explicitly requested.

## 2. Architecture

- `index.html`: main static HTML entrypoint.
- `styles.css`: global styling.
- `app.js`: main browser application logic.
- `js/`: frontend modules for rendering, data, storage, config, Supabase client, utilities, and repository access.
- `functions/api/`: serverless API endpoints for checkout, contact, Stripe, PayPal, and shared server helpers.
- `DATABASE.md`: current documentation source for the real Supabase schema and RLS model.
- `sql/`: not part of the current working tree; references to `sql/` mean historical/external operational SQL scripts unless a task explicitly creates that folder.
- `tests/security-smoke-tests.mjs`: smoke checks for security-sensitive assumptions.
- `_headers`: Cloudflare Pages security and cache headers.
- `package.json`: development tooling only.

## 3. Hard rules

- Do not introduce frameworks such as React, Next.js, Vite, TypeScript, or bundlers unless explicitly requested.
- Do not add dependencies unless explicitly requested.
- Do not change Cloudflare configuration or `_headers` unless explicitly requested.
- Do not rename or move files unless the user asks for it.
- Prefer small, isolated changes over large refactors.
- Preserve existing UI, layout, text, and behavior unless the task specifically asks to change them.
- Do not modify payment logic without running relevant tests and clearly reporting the risk.
- Do not modify auth, Supabase, RLS, or storage assumptions without explicitly calling it out in the final response.

## 4. Security rules

- Never expose server-side secrets in frontend files.
- Frontend may contain only public values such as Supabase URL, Supabase anon key, Stripe publishable key, and PayPal client id.
- Keep service role keys, Stripe secret keys, Stripe webhook secrets, PayPal secrets, Turnstile secrets, and Resend keys server-side only.
- Treat client-provided prices, totals, stock, payment status, and order status as untrusted.
- Public APIs must validate method, content type, payload size, input shape, and abusive payloads.
- Production errors should not expose internal details, payment ids, PII, stack traces, or secret names.
- Avoid logging full payloads containing customer data, addresses, emails, phones, notes, or payment identifiers.
- Changes to checkout, payment capture, webhooks, stock reservation, Supabase RLS, or admin auth require extra care and test coverage.

## 5. Coding style

- Use the existing vanilla HTML/CSS/JS style.
- Keep modules simple and close to current patterns.
- Use Prettier for formatting; do not hand-format large files differently from the project style.
- Prefer clear names and explicit validation over clever abstractions.
- Add comments only where they clarify non-obvious security or payment behavior.
- Treat `DATABASE.md` as the current source for real DB shape; create SQL migrations only when explicitly requested.

## 6. Testing commands

Use these commands when relevant:

```bash
npm run check:format
npm test
```

Use this command only when the task asks for formatting:

```bash
npm run format
```

For API/security-related changes, at minimum run:

```bash
npm test
```

For formatting/tooling changes, run:

```bash
npm run check:format
npm test
```

## 7. Change policy

- Inspect the current state before editing.
- Assume uncommitted changes may belong to the user; do not revert them unless explicitly asked.
- Keep each change scoped to the requested task.
- If a task touches payment, stock, auth, RLS, or deployment behavior, explain the impact and residual risks.
- Do not silently change environment variable names, API endpoint paths, database assumptions, or Cloudflare behavior.
- If a requested change cannot be verified locally, say so clearly and explain what should be checked manually.

## 8. Output format after each task

After each task, report:

- Files created or modified.
- Commands/tests executed.
- Whether tests passed.
- Risks or limitations.
- Recommended next steps, if useful.

Keep final responses concise and practical.
