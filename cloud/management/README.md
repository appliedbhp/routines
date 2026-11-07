# Routines administration

Admin UI: `/admin/`. The dedicated navigation replaces the tool categories after the existing administrator check succeeds. The database and Edge Function independently enforce authorization; hiding the UI is not the access control.

## Data and scope

- `routines_admin_private.accounts` includes only accounts with Routines preferences, signup markers, board/date/link/purchase records, or administrator membership. This Supabase project is shared with other apps. The marker scopes reporting; it never grants authority.
- `routines_admin_snapshot` uses the existing private administrator table, paginates email searches, and never returns board payloads or student session results.
- Metrics describe account sign-ins, cloud-board counts, beta/referral counts, payments and flags. They are not website traffic analytics. Flagged payments are excluded entirely from “unflagged payments”; that figure is not net revenue.
- The five `routine_admin_*` tables have RLS and no browser grants. Only the management service reads/writes them.

## Deployment

Apply `schema.sql` before deploying. Deploy `index.ts` and `model.mjs` as `routines-management`, with platform JWT checking disabled because the function checks confirmed users and administrator membership itself. The mail worker requires its own Vault-generated secret; unsubscribe uses a separate unguessable per-contact token.

Existing server secrets: `RESEND_API_KEY`, `ROUTINES_API_KEY` (or `STRIPE_SECRET_KEY`). Stripe needs Prices read and Coupons / Promotion codes read+write for discount creation. The admin UI reports unavailable discount permissions. Do not expose keys to the browser.

Deploy the updated `routines-beta-webhook` before `routines-beta`; both include `cloud/beta/model.mjs`. The webhook validates the configured price, full subtotal, discount arithmetic, currency, one line item, and paid status. Only then does the existing fulfillment RPC grant lifetime access. Coupons are limited to the configured Routines products, expire within a year, and have redemption limits. The UI does not create zero-dollar purchases.

Run `schedule.sql` to create the named worker job (every 5 minutes) and its Vault secret. It is safe to re-run: the job name and secret name are stable.

## Email behavior

No automatic mass enrollment. Accounts opt in themselves under Settings → Account. Creating or editing a sequence sends nothing. An administrator activates the sequence, reviews exact recipient emails and content, and queues it explicitly. Each enrollment snapshots message content. Pausing prevents pending steps from being claimed; resuming sends overdue steps. Queue/history allows cancelling queued messages.

Emails are plain text with the business postal address and unsubscribe link. GET shows confirmation to avoid link scanners silently unsubscribing people; POST unsubscribes, including one-click email-client requests. Consent is tied to the confirmed account email. Changing the address requires a fresh opt-in; queued email is tied to its original recipient address.

Queue claims are atomic (`FOR UPDATE SKIP LOCKED`), use a stable Resend idempotency key, and stop uncertain retries before the provider's 24-hour idempotency window. “Sent” means accepted by Resend. Review bounces/suppression and inbox delivery in Resend. This version has no open-tracking pixels, automatic signup triggers, or drag-and-drop email designer.

## Validation

Node tests cover discount bounds, email/header validation, sequence order, footer content, and discounted payment verification. Database rollback checks exercise administrator/nonadministrator access, payment fulfillment, paused queues, duplicate claims, and unsubscribed recipients. Local browser fixtures contain sample data only and are not shipped.
