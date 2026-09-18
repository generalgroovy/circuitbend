# Development & limits

For everyday use, start with the [field guide](GUIDE.md). This page covers maintenance, validation and boundaries.

## Run and test

The app is static HTML, CSS and JavaScript. Serve the repository root with `python -m http.server 8000`; no production dependencies or build step are required. Node 18+ is needed for tests.

```sh
npm test
npm install --no-save --package-lock=false playwright@1.55.0
npx playwright install chromium
npm run test:browser
```

`npm test` checks syntax, feature wiring, relative asset paths, documentation links and guide consistency. Browser tests cover the workspace, media/project lifecycles, rendering regressions, and visual-workbench behavior. CI runs Chromium against a real HTTP origin, including the `/circuitbend/` subpath, and uploads reports, screenshots and the exact source archive. A passing suite is not a guarantee for every browser or codec.

`CHROMIUM_PATH` selects a locally installed Chromium. `CIRCUITBEND_EMBEDDED_TEST=1` uses an in-memory document with routed local assets in restricted environments. Real-origin persistence is explicitly skipped in that mode; CI must run without it.

## Change the right layer

| File | Responsibility |
| --- | --- |
| `main.js` | Core canvas rendering, effect definitions, generators and playback clock |
| `advanced.js`, `webview.js`, `mathlab.js` | Palette/layers, pixel/ASCII rendering and mathematical generators |
| `sandbox-runtime.js`, `project.js` | Media lifecycle, recording/export transactions, history and project normalization |
| `sandbox-lab.js`, `sandbox-samples.js` | Recipes, browser scene slots and embedded test media |
| `streamlined.js`, `streamlined.css` | Workspace structure, layout and visual tokens |
| `workbench.js` | Presentation, recipe descriptions and the native help dialog; no renderer state writes |
| `preview-window.js` | Zoom, floating and pop-out viewer |

The engine still shares global state and extends functions through wrappers. Keep loading order intact. Reuse existing controls rather than cloning their state. Presentation changes must not change pixels, recording size or project content. Do not add per-frame browser-storage writes.

## Edit the guide once

Task instructions live as JSON between `guide:start` and `guide:end` in `workbench.js`. The dialog renders them as text, and the build script writes the same instructions to `docs/GUIDE.md`.

```sh
node scripts/build-guide.mjs
node scripts/build-guide.mjs --check
```

Keep release history out of the README and daily-use help. Preserve old audit files as historical records; the [documentation index](README.md) identifies current guidance.

## Visual contract

The graphite monitor separates output from the paper control desk. Citrus marks navigation and exploration; paper marks the PNG action, and a warm border marks playback. Numbers support scanning, not additional required steps. Labels, focus outlines and pressed states carry meaning independently of color. No external font, decorative animation, CSS filter over rendered media, or new runtime package is needed.

Styles live in `streamlined.css`; inherited inspector tokens cover the older tools. `sandbox-lab.css` contains only scene/transport structure. The guide is a native dialog, contains keyboard focus, closes with Escape, and suppresses app shortcuts while open. The preview toolbar's measured height affects CSS padding only.

## Operating limits

| Area | Current limit or behavior |
| --- | --- |
| Media import | 256 MB; 17 megapixels |
| Project JSON | 24 MB; external media referenced, not embedded |
| Browser experiments | Six slots; session-only when storage is full/unavailable |
| Generated sources | Up to 4096 per dimension; 180,000 source-cell work budget |
| Live preview | Separate pixel budget; heavy effects remain CPU-based |
| Recording | Silent; browser-supported codec; two minutes or about 64 MB |
| Test clips | Two embedded 3-second, 192×120, 8 fps WebM loops |
| History | Effects, modulation, bypass and blend—not source-file history |
| Feedback | Temporal buffers are not serialized; bake an exact still |

Source changes are locked during capture. Encoder/render failures must restore controls, preview and capture tracks. Remixes do not enable strobe, but Acid, Chaos and manual strobe controls can flash.

## Validation references

The contrast checks use the [W3C contrast criterion](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum). Native-dialog behavior follows the [HTML dialog reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog). These are implementation references, not a claim of complete accessibility certification.
