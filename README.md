# Routine Visual Timer (wireframe)

A visual-supports app for daily routines (morning, evening, chores, tasks),
built around a circular timer wheel and [ARASAAC](https://arasaac.org)
pictogram symbols.

This is an early, intentionally simple wireframe used to test the core
concept before investing in a polished version.

## Concept

- **Mode / category** — Morning Routine, Evening Routine, Chores, or Tasks.
  Switching mode changes the suggested step icons/keywords.
- **Steps** — each step has a name, a duration in minutes, and an ARASAAC
  pictogram (auto-suggested from the step name, or searched manually).
- **Wheel** — steps are laid out as slices around a ring, sized proportionally
  to their share of the total routine time.
- **Two output views**:
  - **Print** — a US Letter PDF (via the browser's Print dialog) with the
    wheel drawn at exact real-world size: **3.5in** center circle, **7in**
    outer circle.
  - **Projection** — a live, on-screen version of the same wheel with a
    rotating pointer and countdown, meant to be displayed (e.g. on a
    classroom projector or TV) while the routine is actually happening.

## Running it locally

No build step — plain HTML/CSS/JS. Serve the folder over HTTP (not `file://`,
so the ARASAAC API fetches work reliably) and open it:

```bash
python3 -m http.server 8420
```

Then visit `http://localhost:8420`.

## Structure

```
index.html       Markup for all three views (Builder / Print / Projection)
css/style.css     Styling, incl. exact-inch print sizing via @page/@media print
js/arasaac.js     Thin client for the ARASAAC pictogram search + image API
js/wheel.js       Wheel geometry (slice angles, SVG path generation)
js/app.js         App state, builder UI, icon picker, projection timer loop
```

## Symbols

Pictograms are from [ARASAAC](https://arasaac.org), created by Sergio Palao,
licensed under CC BY-NC-SA. Attribution is shown in the app footer and on
every printed page. Non-commercial use only per the license — revisit this
before any commercial deployment.

## Routines and sharing

Choose one of 12 examples in Builder and press **Use routine**: Morning,
Classroom, Bedtime, After School, Homework, Preschool Morning, Evening Wind Down,
Leaving Home, Bedroom Tidy, Kitchen Helper, Laundry, or Weekly Room Reset. This replaces current steps; save or
export a custom routine first. Presets are editable and load symbols as they
become available.

**Save** keeps a routine in this browser. **Export routine** downloads the
current routine as a versioned JSON file, including its theme, sound and
schedule settings, and separate print/projection icon and label positions.
**Import routine** validates and opens an exported file without replacing
saved routines. Press Save to add it to this browser's library.

## Projection controls

- Play, pause, and resume are available inside fullscreen, along with an exit
  button, quiet toggle, and Next step in either scheduling mode.
- On resume, border time markers immediately shift to account for the pause.
- Timed mode advances automatically and stops at completion.
- Flexible schedule mode holds on each step when its planned time runs out.
  Press **Next step** whenever ready, including early. Advancing while paused
  leaves the timer paused. Switching schedule modes resets progress.
- Quiet mode is on by default. Turn it off under Sound options to hear the
  individually selected step chime, countdown ticks, and completion sound.
- Show clock toggles the clock and its time-of-day border markers.

## Themes and print

Themes use Google Fonts: Ocean / Fascinate Inline, Farm / Flavors,
Unicorn / Freckle Face, Crafty / Ribeye Marrow, Pixel / Silkscreen,
Space / Sixtyfour Convergence, Comic / Yuyu (uppercase), Safari / Sofadi One,
Mystery / Syne Mono, Flower / Flavors, and Boho / Tenor Sans.
Comic retains the internal `superhero` key for compatibility.

Text size starts with **No text**. Labels follow the ring and fit their
available arc. Drag labels and icons independently or focus them and use
arrow keys (Shift for larger moves). Reset positions restores default
placement in that mode; Save or Export retains custom positions.

Print on US Letter at 100% / Actual size with browser headers and footers off.
The preview and printed page use the same spacing and dimensions.

## Checks

No dependencies required for the behavior tests:

```bash
node --test tests/app.test.cjs
```

Tests cover pause/resume time anchors, flexible scheduling, completion,
quiet mode, routine serialization, and invalid import data.

## Known limitations

- Fonts, pictograms, and QR images need internet access when not cached.
- Timer progress does not persist across reloads; opening Projection resets it.
- No drag-to-reorder steps.
- Very short slices may require manual positioning or smaller labels/icons.
- Saved routines belong to the current browser; export files for backups.

## Responsive projection

The wheel scales to the available viewport in normal and fullscreen modes.
Customize timer expands the settings; Timer controls floats over the stage
and collapses when playback starts. The current-step panel is hidden by
default and can be shown as an overlay. Neither panel reserves wheel space.

## Search visibility and publishing

The home page includes visible HTML instructions and FAQs, descriptive
metadata, canonical and social tags, and WebApplication structured data.
Three static guides link to working presets and remain readable without
JavaScript. Theme fonts load on demand to avoid blocking the initial page.

Canonical URLs, social URLs, robots.txt, and sitemap.xml use the existing
project address **https://routines.getadhd.care/**. If deploying on another
domain or a GitHub Pages project subpath, update these URLs before launch.
Use one public canonical host, redirect duplicate hosts to it, and keep the
static guide directories and their trailing-slash URLs accessible.

After publishing, verify ownership in Google Search Console, submit
`https://routines.getadhd.care/sitemap.xml`, and inspect the home and guide
URLs. Validate structured data and check real mobile performance. Metadata
and structured data do not guarantee rankings, rich results, or traffic.

Guidance used: [Google's developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers)
and [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## Weekly chore charts

Open **Create a weekly chore chart** in Builder for daily home helpers, bedroom
tidying, family chores, classroom jobs, daily independence, or a blank chart.
Edit chore names, add or remove rows (up to 10), and check off each day. Charts
print on landscape US Letter. Use **Save chart** to keep named charts in this browser, and **Load chart**
to restore them. **Export chart** downloads a JSON file; **Import chart** opens
an exported file without adding it to your saved library until you press Save.
Files preserve chart names, person/team, week, chore labels, pictogram IDs,
and daily checkmarks. Invalid files leave the open chart unchanged.

Chore charts automatically suggest ARASAAC picture symbols. Click a picture to
search for a replacement or remove it. Icons are included in print output;
an internet connection is needed to find and load symbols.

## Visual support boards

Five tools share the symbol picker, editing, printing, and file format:
- `/first-then/`: two activities, with First and Then labels.
- `/choice-board/`: 2–12 options; select one at a time.
- `/task-strip/`: 1–12 ordered steps; mark steps done.
- `/now-next-later/`: three activities labeled Now, Next, and Later.
- `/calm-down/`: 2–12 supportive choices; select one at a time.

Each tool includes three editable examples. Move cards earlier or later,
change or remove pictures, and add/remove cards where the layout permits.
Save named boards in this browser and load them from the same tool. Export
and import versioned JSON files with labels, pictogram IDs, names, and
selections. Imports are validated before changing the open board; import
a file on the matching tool's page. Picture searches require internet.
Printing hides the editor controls and includes the board and symbol credit.

## Visual workspace navigation

All seven visual editors share `js/workspace.js` and `css/workspace.css`.
The left navigation collapses to an icon rail and remembers the preference
in this browser. On smaller screens it starts collapsed; expanded navigation
overlays the workspace. Each visual keeps its existing URL and saved data.
Options and save/import/export/print actions sit above the editing canvas.
The shared interface is excluded from print output.

## Sharing and board layouts

Every visual has **Share by email**. It prepares the current JSON file and
step-by-step import/save/load instructions. Supported devices can pass the
attachment and text to an email app through native sharing. Otherwise, download
the attachment and open a prefilled email, or download an `.eml` email containing
both the instructions and attachment (requires a compatible desktop mail app).
The user chooses a recipient and sends it; the website sends no email itself.

Boards offer Rows and Columns selectors. Auto chooses a grid for a single
US Letter page; print at 100% with browser headers/footers disabled. Selecting
one dimension calculates the other. If both are specified and more cards need
space, the other dimension grows so no cards are dropped. Layout preferences
are preserved by saving, exporting, importing, and sharing; old files use Auto.
The task-strip examples include Get Ready with Me with its nine original symbols.

**Next step** is available in both timed and flexible projection, including
fullscreen. Skipping preserves whether the timer is running or paused and
immediately recalculates the wall-clock anchors. In timed mode, Next advances
to the next activity boundary (or the end of remaining buffer time).

## Free cloud accounts

Optional cloud saving supports two settings-only boards per verified adult account.
Every save requires a fresh privacy attestation. Results and personal fields are excluded.
See [cloud setup and security notes](cloud/README.md) for deployment and verification.

## Offline app

Service worker `sw.js` caches the versioned application shell and allowlisted image/font assets. It never caches Supabase requests, writes, or picture-search API responses. Board download stores a separate localStorage snapshot per tool plus its currently used external images (and both PixaBots variants). Unsupported/failed assets produce a partial-download warning. Self-monitor snapshots contain setup only; session persistence stays independent. Google Fonts may fall back to system fonts offline.

Before every deployment after runtime changes, run `python3 scripts/build-offline.py` and commit `offline-assets.js`. Installation is atomic; updated workers wait for existing tabs to close rather than interrupt sessions. Browser storage eviction/clearing removes offline files. Open online to prepare again; exports are the durable backup.

Verification: `node --test tests/*.test.cjs`. Offline tests cover cached navigation, image retrieval, and exclusion of authentication, search, and write requests.

## Shared editor menus

`js/file-menu.js` provides File/Edit/View/Help and the device/cloud library. `js/file-store.js` reads and updates existing per-tool storage without a migration. Save uses the open record ID; Save as creates a new ID. Device writes compare the original record to detect concurrent edits. Cloud writes retain the server revision check and per-write attestation; credentials and responses never enter the offline cache. A separate offline copy is not a cloud-sync status.

### Two-device self-monitor sessions

Choose **Two devices** on the child's screen to display a QR code before starting.
Opening the private QR link on the adult's phone pairs it and starts the timer.
For an already active session, compare the matching code and approve the phone. The default QR is 128px; Enlarge uses 280px. One-device
mode remains available offline. Two-device mode needs both pages open and online.
Check-ins pause until both independent ratings arrive; pending adult ratings retry.
The child owns the timer and results, and the adult can send encouragement, rate check-ins, export, or
print completed results. Countdown and pause/resume controls stay on the primary screen. Browser tab storage retains active state; no child login
or names are required. Refreshing the child page may require approving the phone
again. Use a new QR code to replace a paired phone. Six-character codes expire after 15 minutes; paired connections last up to two hours. Open `/join/` to type a code, or scan the short URL. Pairing consumes the code and hides the QR controls.

Live session transport uses the existing Supabase project’s client Broadcast service.
The `routine-join-code` Edge Function stores only encrypted temporary invitations in
`routine_join_codes`, plus short-lived salted connection hashes in `routine_join_limits`
for rate limiting. Both tables deny browser access; only the server role can use them.
Codes are allocated with a unique constraint, claimed atomically by one joining browser,
and revoked after pairing. A scheduled job deletes expired rows every ten minutes.
The Edge Function holds the at-rest encryption key; this is not end-to-end invitation storage.
No ratings or encouragement history are written to these tables. Deployment source and
idempotent setup SQL are in `cloud/join-code/`. A random 256-bit invite key protects the handshake;
the QR fragment also binds the child's P-256 public key. A per-device ECDH key
protects approved-session messages using AES-GCM; the matching code is derived
from the adult's public key. Only completed answer pairs are sent in snapshots.
No titles, names, custom prompts, or cloud credentials enter live payloads.
Keys are kept in tab storage. The relay still sees connection metadata. This is
not a claim of HIPAA/FERPA compliance. QR generation vendors qrcode-generator
1.4.4 (MIT, Kazuhiko Arase); its license notice is retained in the source.

Adults can send six emoji reactions and three fixed encouraging phrases through the same encrypted connection.
The child can disable effects; they are silent, noninteractive, removed after
4.2 seconds, and respect reduced motion. Effects pop at random positions with translucent
floating copies. Reactions do not change scores or timers, are rate-limited and
deduplicated, and are never retried after reconnection. The latest 300 encouragements
are retained in local tab session results, shown on both screens, and included in
exit tickets and the adult results export. They are excluded from board settings/cloud saves. A child acknowledgement confirms delivery on the adult screen.

Theme and presentation changes preserve session state and pairing. Realtime uses worker heartbeats with reconnect-on-focus/online recovery; reopening Run Session also requests recovery without replacing the invitation. Emoji effects have no visible text labels; phrase effects and collected phrases use pills. Accessible labels retain their descriptions.

Peer-presence grace is 90 seconds to allow ordinary browser background timer throttling. An explicit channel failure disables adult controls immediately; a fresh channel reconnects after three seconds while retaining ECDH keys and replay protection. The two-hour invitation/session expiry remains intentional.
