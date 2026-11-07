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

## Shared objects

Object mode produces one nonhuman visual with the same outline palette, using the image-generation endpoint without a character reference. Records follow the existing shared library convention: age_strand shared, min_age 0, max_age 18, and artwork under visuals/shared/<category>/. Face fields and character references are rejected on published objects. The creator hides age and face controls in this mode.

## Stylesheet scene builder

The current builder uses styles.js for six pinned ABHP sheets: 90s, 2000s,
Grunge, Anime style 1, Anime style 2, and Classic. Teen sheets select from
three skin-tone rows and three gender columns. Classic uses age columns
and boy/girl rows; nonbinary uses style-only adaptation. The selected
character defaults to a single image; all nine combinations are optional.

The backend fetches only the allowlisted pinned PNG and attaches it to the
image-edit request. A specific setting uses opaque output; transparent
uses transparent output. Style, tone, gender, derived grid position,
background, setting, and exact reference revision are recorded on publish.
Legacy DiceBear records remain supported. New stylesheet references do not
receive unrelated DiceBear attribution. Deploy styles.js with the other
function files. Changes to these sheets require a reviewed revision update.
