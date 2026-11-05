# Administrator visual creator

The routines-visual-library Edge Function checks the caller with Supabase Auth and
routines_is_administrator before every action. The browser never receives service keys.

Server secrets:
- ROUTINES_OPENAI_KEY for image generation
- VISUALS_GITHUB_TOKEN, a fine-grained token with Contents read/write for appliedbhp/visual-supports
- Optional ROUTINES_IMAGE_MODEL (defaults to gpt-image-1.5)

The function uses the existing Supabase runtime variables. Gateway JWT verification
is disabled because the handler verifies each user token itself, including the admin role.

Artwork is reviewed in the admin page before publishing. One Git commit includes
the square PNG, its adjacent JSON metadata/prompt record, and the updated catalog.
Publishing rebases concurrent changes and uses a stable ID and image digest for retries.
New entries default to draft. The administrator records the source and usage rights.

Deploy index.ts with handler.js as routines-visual-library. The UI reads categories,
age strands, the catalog, and CREATING-VISUALS.md from the fixed library repository.
Generation is explicit and uses the administrator's API account. No automatic generation
or publishing occurs on page load.

## Standard character reference

Generation uses the OpenAI image-edit endpoint with a fixed DiceBear Adventurer PNG
attached as its image input. character.js stores the reference pixels, pinned
configuration, and attribution. The creator previews the matching local SVG.
Defaults are no hair, transparent background, mouth variant02, eyes variant24,
eyebrows variant10, no glasses, and opaque white skin. Additional facial details
and earrings are disabled for consistency.

Generated results carry a versioned reference ID. Publishing archives the reference
PNG and its settings/license beside the catalog, includes the reference metadata
on each visual, and appends its attribution to the usage-rights field. Existing
uploaded artwork retains its recorded source; it does not acquire a character
reference just because it was uploaded through this interface.

## Age and face sets

The creator displays selected age strands with both default and blank faces. Two generation requests run at a time, with per-card state and elapsed time. Completed previews survive retries within the page. Review can be confirmed per card or for the selected set.

The publish_batch action validates up to six previews, archives both versioned character references, and updates all artwork, metadata and catalog entries with one Git ref update. Batch retries preserve visual IDs and reject changed content for an existing ID. Older single-visual publish requests remain supported.
