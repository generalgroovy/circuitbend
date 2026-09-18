# Circuitbend Sandbox · v0.7.0

A local browser playground for pictures, video, pixel/ASCII art and mathematical motion. No accounts, media uploads, API keys or runtime packages.

**Published app:** https://generalgroovy.github.io/circuitbend/ — GitHub Pages serves the merged branch, not unmerged pull requests.

## Start playing

Choose **Neon shapes**, try **VHS** or **Remix**, move **FX blend**, and use **Compare** to inspect the original. Undo and Redo restore effect edits. **Save PNG** captures the current result.

The shelf includes four original images and two real, embedded three-second WebM clips. The clips are deliberately tiny 192×120, 8 fps test loops, not HD stock footage. Everything loads through the same media pipeline as your own files.

**Source → Recipes & saved experiments** offers Circuit garden, Plasma tide, Orbital ink, Glass cells, Amber terminal and Interference loom. Recipes replace the source and its look; save a scene first to keep an experiment. Restored projects and recipes start paused. Press **Play** to animate.

## Workspace

| Tool | Purpose |
| --- | --- |
| Source | Imported media, procedural generators, reference patterns and scene slots |
| Math | Fractals, attractors, curves, fields and editable mathematical recipes |
| Pixel / ASCII | Pixel shapes, palettes, dithering, character sets and media-to-glyph conversion |
| Effects | Quick looks, exact-value sliders, searchable racks, Simple/Expert automation |
| Export | Preview/full-resolution PNG, silent video, ASCII text and project JSON |
| All tools | The complete inspector without duplicated controls |

The preview stays beside the inspector on desktop and stacks on small screens. Float, zoom and pop out the viewer. **Source** in the viewer shows the actual current source, including imported media.

**Restart** pauses and returns to time zero. **Step** advances 1/30 second; it is a time step, not an assertion about an imported clip's native frame rate. The video slider seeks through a loaded clip. **FX blend** mixes the processed result with the original without changing individual effect values.

## Keep and restore experiments

Save up to six named scene slots with thumbnails in the current browser. When storage is unavailable or full, slots remain session-only and the interface says so. Project JSON is the portable backup.

Version 7 projects restore built-in samples by identifier, procedural settings, effects, modulation, blend, playback position and baked PNG stills. Invalid numbers are normalized to supported ranges; unknown fields are discarded. Older project versions are accepted.

External files are not embedded or uploaded. Reopen the named file, then load its project. A missing or mismatched reference is reported before settings change instead of silently showing a generated substitute. Legacy external projects without identifiers require their original media to be reopened manually.

Undo/Redo covers effect values, rack bypass, modulation and blend, **not source-file history**. Use scene slots or project files for source changes. Temporal feedback buffers are not serialized; bake the output before saving when an exact still is required.

## Run locally

Extract the complete repository, open a terminal in that folder, and run:

```sh
python -m http.server 8000
```

Open http://localhost:8000. On systems that name Python `python3`, use `python3 -m http.server 8000` instead. No build step is needed.

## Validation

```sh
npm test
npm install --no-save --package-lock=false playwright@1.55.0
npx playwright install chromium
npm run test:browser
```

The browser suite contains 17 workspace cases and 37 lifecycle cases. CI serves the app under `/circuitbend/`, tests real-origin browser persistence, and uploads screenshots, JSON reports and the exact tested source. `CHROMIUM_PATH` optionally selects a locally installed browser. `CIRCUITBEND_EMBEDDED_TEST=1` uses an in-memory document harness in restricted environments; it explicitly skips the real-origin persistence check. CI does not use that mode.

## Limits and engineering notes

Media import is capped at 256 MB and 17 megapixels. Project files are capped at 24 MB. Generator work is bounded to 180,000 source cells while retaining the requested source dimensions; very fine grids are automatically coarsened. The live effect budget remains independent of source/export size.

Recordings are silent, use a browser-supported codec, and stop at two minutes or approximately 64 MB. Capture dimensions stay fixed, conflicting source/export operations are locked, and tracks are released on stop or start failure. Full-resolution PNG export suspends playback and restores the preview even when encoding fails.

Heavy effects remain CPU-based. Browser/codec support varies; automated coverage is Chromium rather than a guarantee for every browser. The shared-global rendering architecture remains a future refactoring task.

See [the iteration audit](docs/audit-v0.7.md) for fixes and regression coverage. The [archived v0.6 guide](docs/legacy-guide-v0.6.md) retains earlier feature explanations and examples; its historical project/export descriptions are superseded by this page.
