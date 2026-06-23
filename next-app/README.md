# Next App Migration Shell

This directory contains the parallel Next.js migration shell. The current vanilla app remains the primary working application.

## Dependency Audit Status

Known audit result for the current shell:

- Package path: `next -> postcss`
- Severity: moderate
- Advisory: PostCSS XSS via unescaped `</style>` in CSS stringify output
- npm audit fix status: `No fix available`

Current risk is low because `next-app/` is only a migration shell:

- it does not process user-provided CSS;
- it does not contain API route handlers;
- it does not contain checkout, admin, Supabase client, PayPal, or Stripe logic;
- it is not configured as the production deployment target.

Do not run `npm audit fix --force` without an explicit task. A forced fix may introduce major dependency changes or runtime behavior changes outside the intended migration scope.

Before deploying this shell to preview/production, or before migrating real UI flows into it, re-run dependency audit and decide on a dedicated remediation task if needed.

Upgrading to Next 16 is a major upgrade and must be handled as an explicit task, not as an automatic audit fix.
