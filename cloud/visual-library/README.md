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
