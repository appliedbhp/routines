# Feedback and plan review

Apply schema.sql and plan-review.sql before deploying routines-beta with index.ts and model.mjs. SQL migrations were applied to the hosted Routines project. The existing JWT validation and private administrator membership checks remain required. No anonymous or authenticated browser role can query the feedback/contact tables or invoke the service RPC.

Signed-in identity comes from the server-verified user ID, never a submitted user ID. Optional contact addresses are unverified and require consent. Historical reports with account IDs resolve their current email; anonymous reports without a contact address cannot be identified retroactively. Mailto composition sends nothing; Mark contacted is a deliberate manual record, not proof of delivery.

Lifetime downgrade approval applies a reversible Free restriction. It retains original purchase rows, grants, and cloud resources, changes plan allowances through the existing access function, and records an audit event. No refund or cancellation of a Stripe payment is performed. Administrators are exempt. Restore eligible paid access removes the restriction; expired/refunded/disputed purchases are still evaluated normally. No existing requests were automatically approved.

## Future recurring subscriptions

The server configuration plan_change_policy records upgrades and downgrades at current_period_end, without proration. Lifetime requests remain reviewed. recurringBillingEnabled remains false: today's checkout is one-time lifetime access. This is a stored launch policy, not a live subscription scheduler.

At subscription launch, wire that policy to authenticated Stripe subscription ownership, allowlisted recurring prices, the authoritative current billing period, and signed lifecycle/payment webhooks. Show the exact effective date and next price before confirmation; support cancelling a pending change. Keep existing access through the paid period, apply upgraded access only when the next invoice is paid, and preserve saved data when limits decrease. Do not infer a subscription from matching email or turn a beta expiry into a paid billing period. Test with a Stripe sandbox/test clock before enabling recurringBillingEnabled. No recurring product prices or subscriptions were created by this change.
