# Routines beta

The public beta signup verifies email using Resend before enrollment. Trial access starts at confirmation, lasts two calendar months in America/Los_Angeles, and gains one calendar month per unique confirmed referral. Enrollment and referred enrollment close at December 1, 2026, 00:00 Pacific. Signup confirmation is separate from Supabase account sign-in; use the same verified email to bind access to an account.

## Deployment

Project: `soartoaobktpscnnbclq`. Apply the schema with migration tooling. `schema.sql` is the consolidated schema; `verification.sql` tests it inside a rolled-back transaction. Browser roles cannot access the enrollment, orders, limits, configuration, or reports directly. Service-only RPCs accept a caller ID only after the Edge Function verifies the user's JWT.

Deploy `routines-beta` with `index.ts` and `model.mjs`. Deploy `routines-beta-webhook` with `../beta-webhook/index.ts` and the same `model.mjs`. Both disable platform legacy JWT checking: the beta function performs user verification itself, and the webhook validates Stripe's signature before reading any event. Cloud-board-save also needs the updated handler and entitlement lookup.

Required Edge secrets: `RESEND_API_KEY`, `ROUTINES_API_KEY` (the Stripe server key; `STRIPE_SECRET_KEY` is also accepted as a fallback). Prefer a restricted Stripe key with the minimum Price read, Checkout read-write, and PaymentIntent/charge read permissions required by this implementation. Never add secret keys to this repository.

Stripe account: `acct_1UIYQeIiI1uuEHpt` (appliedbehavioral.health, live). All SDK calls pin `stripeContext` to this account, including when the supplied server key belongs to a Stripe Organization.

- Early Tier 1, USD 15: `price_1UYx47IiI1uuEHpt7F6yglje`
- After beta Tier 1, USD 27: `price_1UYx4BIiI1uuEHptZCmvyACH`
- After beta Tier 2, USD 47: `price_1UYx4EIiI1uuEHptq5jRSgfY`

Business-use SaaS category; no tax collection configured, per owner instruction. All purchases are one-time. No subscriptions or saved-card charging. Never simulate payment completion in live mode.

Webhook: `we_1UYxFTIiI1uuEHptUsg7G5VM`, endpoint `/functions/v1/routines-beta-webhook`. The signing secret is encrypted in Supabase Vault under `routines_beta_stripe_webhook`; only the service-only payment RPC can read it. It is deliberately absent from source and public configuration. Events: checkout completed, async success/failure, charge refunded, dispute created/closed. Paid access requires a matching server order, live paid session, price, currency, exact list-price subtotal, and a verified discounted total. Actual paid and discount amounts are recorded separately. Risk events remove access without deleting boards. Purchase fulfillment is idempotent. Above-plan files stay readable/exportable, with current limits enforced by both handler and database trigger.

Billing remains gated by `routine_beta_config` → billing → enabled. After `health` confirms the correct account, active prices and email configuration, and the webhook signature check passes, enable it with an administrator migration. Do not enable a checkout connected to a different Stripe account. The public health action exposes readiness only, never credentials.

## Reports

The bug button sends only the page pathname (not query/hash), description, impact and optionally verified account ID. No board contents are attached. Reports are rate-limited and restricted to trusted `routines_admin_private.administrators` members. Initial priority: blocked = High, workaround = Normal, cosmetic = Low. Admin edits use a revision to avoid overwriting someone else's triage.

## Checks

`node --test tests/*.test.cjs`; run `verification.sql`; verify signed-out state rejection, browser-role RPC/table denial, and unsigned webhook rejection. A production charge and real signup-email delivery require a separate deliberate end-to-end check. Do not call a successful server readiness probe a completed purchase test.
