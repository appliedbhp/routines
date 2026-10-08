# Token board

Static client-side editor. Supports 1–12 tokens, interactive earning, optional sound, print/cut-outs, local saving, JSON import/export and shared email attachments. Version 2 stores a validated source, identifier and label for each picture. Shared files contain references, not embedded external pictures; internet is required to reload ARASAAC and Iconify pictures.

## Picture credits

- ARASAAC: Sergio Palao, Government of Aragón, CC BY-NC-SA 4.0. https://arasaac.org/terms-of-use
- Material Symbols: Google, Apache 2.0. https://github.com/google/material-design-icons/blob/master/LICENSE
- OpenMoji: OpenMoji contributors, CC BY-SA 4.0. https://openmoji.org/about/
- Bottts: Pablo Stanley, free for personal and commercial use. DiceBear generator code MIT. See CHARACTER-LICENSE.txt and DICEBEAR-LICENSE.txt.

Credits appear for the sources used on each board and cut-out page. External SVGs are loaded as images, never injected into document markup. No arbitrary imported URLs or SVG content are accepted. ARASAAC and Iconify receive searches and image requests. DiceBear generates SVG data images locally without the hosted DiceBear API.

## Rebuilding the character bundle

Install `@dicebear/core@9.4.3`, `@dicebear/bottts@9.4.3`, and `esbuild@0.28.2` in a temporary build directory. Copy `vendor-src/characters-entry.js` into that directory, then run:

```
esbuild characters-entry.js --bundle --minify --format=iife --global-name=TokenCharacters --outfile=characters.js
```

Copy the resulting bundle and upstream license files here. No build step is needed to serve the site.
