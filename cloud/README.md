# Free cloud boards

Routines offers two private settings-only slots per verified adult account. Local saves,
exports, and session persistence remain independent. No paid plans or billing are implemented.

## Deployment

- Supabase project: `soartoaobktpscnnbclq` (existing ABHP project, shared with other applications).
- `schema.sql` is the initial schema snapshot applied through the Supabase connector on 2026-10-08.
- `cloud-board-save` bundles `edge-function.ts`, `board-settings.js`, and `save-handler.js`.
- Gateway JWT verification is off for compatibility with publishable keys. The handler itself
  **requires** a bearer token and calls Supabase Auth `getUser` for every write. Never remove this check.
- Only a publishable client key belongs in `config.js`. The Edge Function obtains its
  service-role credential from Supabase runtime secrets; never put it in browser code.
- Browser SDK is pinned to 2.57.4. Recheck browser and Edge Function compatibility when upgrading.
- Exact allowed auth return URL: `https://routines.getadhd.care/account/`.
- Configure production SMTP in this project (Resend sender requested: `noreply@auth.getadhd.care`).
  Keep email verification enabled. Confirm delivery before enabling `cloudConfig.enabled` publicly.
- Preserve other applications' auth URLs, templates, tables, and credentials in this shared project.
- Public launch requires a real email sign-in test, then save/open from a second browser/device.

## Boundaries

`board-settings.js` rebuilds each supported payload from known settings on both client and server.
It removes person/team fields, dates, checkmarks, earned tokens, homework responses and assignments,
uploaded images, arbitrary routine image URLs, and unknown fields (including session results).
Free text such as board titles and labels cannot reliably be classified as personal information.
The user reviews the exact snapshot and confirms the versioned no-personal-information statement
before every insert or replacement. The server records the version and timestamp on the saved row.
This attestation is not a guarantee of HIPAA/FERPA compliance or automated content detection.

`(user_id, slot)` is the primary key, and slot is constrained to 1 or 2. Quotas therefore remain
safe during concurrent inserts. Replacements and deletions check an opaque revision to prevent
silently overwriting another device's edits. The caller cannot choose another owner's user ID.
RLS restricts reads/deletes to the owner; client INSERT/UPDATE privileges are revoked. Anonymous
Auth users are not permitted. Only the authenticated, validating function writes rows.

The UI never automatically uploads local boards. Opening a cloud board uses the editor's existing
import validator. It requires confirmation before replacing edits. Changing tool navigates to a
fixed allowlisted tool path, then loads by slot from the signed-in account; payloads never go in URLs.

Deleting a cloud board removes its active row. Do not promise instantaneous erasure from backups.
Deleting the shared Auth user would affect other applications: handle account deletion requests
with an ownership and impact review. No user records are queried for analytics by this feature.

## Verification

`node --test tests/*.test.cjs` includes settings stripping, imported shape compatibility,
authentication/attestation checks, two-slot limits, owner separation, and stale-edit conflicts.

Live integration checks on 2026-10-08 used two temporary `example.invalid` test identities and
verified real Auth login, function writes, RLS isolation, quota rejection, direct-write denial,
and stale revisions. Both test identities and their board rows were removed afterward.
A separate local browser fixture verified the two-slot UI, review snapshot, disabled save until
attestation, successful save, and attestation reset on replacement. It was not deployed.

Current rollout status: backend deployed and tested; public UI disabled pending SMTP configuration and an email-link round trip.
