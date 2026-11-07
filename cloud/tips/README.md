# Optional Routines tips

`routines-tips` is an intentionally public, rate-limited Checkout endpoint for one-time USD tips ($1–$500). It uses the existing appliedbehavioral.health Stripe account and server key; no sign-in, subscription, or plan grant occurs. The page offers $3, $5, $10, and a custom amount. Tax collection remains disabled, matching the account owner's existing instruction.

Deploy `index.ts` and `model.mjs` to `routines-tips` with gateway JWT verification off. The endpoint validates amounts, restricts browser origins, limits body size, uses Stripe idempotency, and rate-limits requests through the existing database limiter. Never expose the server key.

The existing signature-verified `routines-beta-webhook` handles tip completion, delayed success/failure, refunds, and disputes separately from beta orders. When deploying it, include this directory's `model.mjs` as `tip-model.mjs`, alongside its existing beta model. Existing webhook subscriptions already cover the required payment and risk events. No checkout redirect grants access or marks a tip as paid.

`schema.sql` creates the service-only payment log. Apply it before deploying the webhook. Administration → Tips reads through the administrator-checked management service. No payer email, name, or card data is copied into the Routines tip table; Stripe retains payment details. The footer prompt is shown to free/anonymous users in Adult or All view on the tool directory and planning pages, and is hidden during fullscreen.

Validation: `node --test tests/tips.test.cjs tests/beta.test.cjs tests/beta-auth.test.cjs tests/management.test.cjs`. The live integration was verified by opening an unpaid $3 Checkout Session, without entering card details or completing a payment. Paid and pending record validation is covered by automated tests; no live charge was made.
