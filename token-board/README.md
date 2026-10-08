# Token board

Static client-side editor. Supports 1–12 tokens, interactive earning, optional sound, print/cut-outs, local saving, JSON import/export and shared email attachments. Version 2 stores a validated source, identifier and label for each picture. Shared files contain references, not embedded external pictures; internet is required to reload ARASAAC and Iconify pictures.

## Picture credits

- ARASAAC: Sergio Palao, Government of Aragón, CC BY-NC-SA 4.0. https://arasaac.org/terms-of-use
- Material Symbols: Google, Apache 2.0. https://github.com/google/material-design-icons/blob/master/LICENSE
- OpenMoji: OpenMoji contributors, CC BY-SA 4.0. https://openmoji.org/about/
- Bottts: Pablo Stanley, free for personal and commercial use. DiceBear generator code MIT. See CHARACTER-LICENSE.txt and DICEBEAR-LICENSE.txt.

Credits appear for the sources used on each board and cut-out page. External SVGs are loaded as images, never injected into document markup. No arbitrary imported URLs or SVG content are accepted. ARASAAC and Iconify receive searches and image requests. DiceBear generates SVG data images locally without the hosted DiceBear API.

## Rebuilding the character bundle

Install `@dicebear/core@10.6.0`, `@dicebear/styles@10.6.0`, and `esbuild@0.28.2` in a temporary build directory. Copy `vendor-src/characters-entry.js` into that directory, then run:

```
esbuild characters-entry.js --bundle --minify --format=iife --global-name=TokenCharacters --outfile=characters.js
```

Copy the resulting bundle and upstream license files here. No build step is needed to serve the site.

## Sessions, themes and animation

Run session requests fullscreen on the board with a full-window fallback. Exit session or Escape restores editing and retains progress. Awarding a token emits confetti; undoing does not. Completing the board triggers a larger celebration. Motion and sound are separate opt-ins/controls, and reduced-motion preferences suppress animation and confetti. Built-in animation is selected with DiceBear's animationVariant option only in sessions; editor and print images remain static.

Classic, Ocean, Space, Garden, Arcade and Boho themes set the font, text, background, accent and token colors. Font/text overrides remain available. Version 2 files without theme or motion fields load with Classic and motion enabled. The style identifier is saved per character; old style-less robot references use Bottts. The v10 generator replaces v9, so older robot seeds may render differently.

Available DiceBear styles: Bottts, Planets, Adventurer, Big Smile, Critters, Clay, Croodles, Marbles, Micah, Pixel Art, Voxel Art and Voxel Bot. Credits are derived from the bundled definitions and included per used style. Planets, Critters, Clay, Voxel Art and Voxel Bot have built-in animation.

## PixaBots and search

PixaBots uses the documented public batch and image endpoints (https://pixabots.com/docs/api). A selected four-character ID is saved in exports, never an arbitrary returned URL. Projection requests animated WebP; printing uses static PNG. Failed animated images fall back to static images. PixaBots receives connection information and picture IDs. Credits identify Pablo Stanley.

Text search combines ARASAAC, Material Symbols, and OpenMoji, independently of the browse source and category. Partial service failures preserve other results. Character generators are browsed separately. Favorites omit Star of David; explicit text searches remain unfiltered.
