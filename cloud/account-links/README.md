# Linked accounts

`routine-account-links` verifies the bearer token with Supabase Auth before calling the service-only RPC. `RESEND_API_KEY` sends transactional invitations from `noreply@auth.getadhd.care`. No key is exposed in frontend files. Email failures return a copyable invitation rather than claiming delivery.

`account-links.sql` records the deployed schema. Linking tables deliberately have RLS enabled with no browser policies or grants. The public RPC is service-only and invokes a private, fixed-search-path function to read confirmed Auth identities. This is why the advisor reports “RLS enabled, no policy” for these service-owned tables. Do not grant browser access to either RPC or these tables.

Limits: one owned group; 2 family members / 3 classroom members including owner; 10 group memberships per account; 10 invitations per owned group per day; 20 code attempts per account per 10 minutes; 5 teacher emails per hour. Invitations are single-use, 10-character random codes, hashed at rest and valid for 24 hours. Email-addressed invitations must be accepted by that confirmed email. Group locks enforce capacity and single-use acceptance. Codes use URL fragments to keep them out of ordinary URL request logs.

Only selected saved dates and saved values are shared. Board settings and session history are never exposed by this API. Members can leave; owners can remove members, revoke invites, or close their group. Unlinking removes live access and the departing member’s contributions. Already exported copies cannot be recalled.

`verify.sql` creates synthetic identities inside a transaction and rolls everything back. It checks family capacity, classroom capacity/downgrade, target-email matching, invitation reuse, sharing, ownership, unlinking, teacher selection, and browser grants. It sends no email.

Teacher links reuse the existing temporary self-monitor QR invitation. They are session access links, not account sign-in credentials. The existing encrypted live channel and pairing controls remain in use.
