# Iterative audit · v0.7.0

Baseline: PR #7, commit `90737d0977af4b95d7d4c310cb2e0692abe9946f`. Work remains on `agent/compact-sandbox-20260918`; this document does not imply a merge or deployment.

## Cycle 1 — establish behavior, then fix source and state lifecycles

The existing 17 workspace checks were rerun before editing. They did not cover project round-trips, paused procedural time, numeric-entry history, or recorder-start exceptions.

The original project importer treated all non-baked media as generated, spread unvalidated effect values into state, and could have its chosen generator overwritten by Math state. Project v7 now normalizes fields before modifying the scene, reconstructs bundled media by identifier, validates external file metadata, restores generated reference sources, and rejects invalid baked images before changing settings. The selected generator is reapplied after importing auxiliary Math settings. Restores are paused for inspection and exit Compare mode.

Media candidates are decoded off-DOM and committed synchronously as ready image/video nodes. Superseded decodes are cancelled, stale project restores cannot replace newer media, source transitions clear feedback, and replaced/failed object URLs are released. Viewers query the active media node rather than retaining a replaced node.

Playback now uses elapsed playback time rather than `performance.now()` as the animation phase. Pausing holds procedural motion, LFO phase and seeded noise. Zero motion speed stays zero. Video references pause/resume their actual video element. Hidden documents do not advance the animation clock.

## Cycle 2 — adversarial export and history checks

Failure injection reproduced a stuck-disabled-controls bug when `MediaRecorder.start()` threw. The failure path now unlocks controls and stops every capture track. Recorder state distinguishes recording from finalization, so repeated Stop clicks cannot create overlapping sessions. Chunks belong to one recording session. Capture dimensions are pinned; source and project replacement are blocked during recording.

Full-resolution export is a guarded transaction. It backs up preview and feedback, freezes video playback, forces source resolution even with scale automation, and restores state in `finally`. Encoder and render failures report an error without leaving the app at export resolution. Sweep timers survive export; their ticks are suspended during the transaction.

Undo/Redo covers exact-number and keyboard edits as well as sliders, modulation and rack bypass. A divergent edit clears Redo. Effect history no longer rewrites a source prompt/seed. Native Space handling on focused buttons is not duplicated by the global shortcut.

## Cycle 3 — compact expansion and workload refinement

Added a compact transport/blend row: Restart, 1/30-second Step, video seek and FX blend. An optional Source section contains six deterministic recipes and six named scene slots with thumbnails. User-entered names are inserted as text. Slot size and count are bounded; storage failures fall back to explicitly labeled session-only slots. Full/All-tools workspace preference survives startup.

Removed renderer-control reads and localStorage writes from the per-frame enhanced generator path. Reference sampling reuses its canvas. Source-cell work is bounded before the downstream pixel/ASCII pass, not only afterward. Requests up to 4096 pixels retain their source dimensions instead of being silently capped at 1024. The clean color-pass fast path and stable budgeted effect surfaces from the prior iteration are retained.

## Cycle 4 — rendered-pixel assertions

A review of the processing passes found that pixelation overwrote the original-frame buffer used by the new FX blend. Pixelation now uses the dedicated effect scratch surface; a test compares every blended channel against the dry/wet average. The legacy pixel-sort pass sorted colors but wrote each back to its original position, producing no sorting. It now preserves destination positions before sorting colors, with a synthetic pixel-row regression test.

## Automated coverage

`tests/workspace.browser.mjs`: 17 cases covering six sample decoders, playback, bad media, rapid selection, Compare, Remix/Undo, exact controls, expert mode, clean-pass bypass, budget/feedback preservation, PNGs, recording, actual-source/floating/pop-out viewers, five responsive widths and reduced motion.

`tests/lifecycle.browser.mjs`: 37 cases covering paused time/noise, zero speed, per-frame storage writes, numeric history, modulation, keyboard handling, all sample project round-trips, reference/baked/external projects, normalization, malformed projects, blend, export failures/locks, recorder failures/finalization, superseded imports/restores, video references, transport, scene persistence/bounds, all recipes, high-resolution generation, automated render scale, Compare restoration, sweep preservation and renderer exceptions.

CI runs against a real HTTP origin at a GitHub-Pages-style subpath and retains `workspace-report.json`, `lifecycle-report.json`, screenshots and `source.zip`. The optional embedded-document local harness does not validate browser persistence and labels that one check as skipped. Test reports, not this narrative, are the authoritative pass/fail record.

## Remaining scope

The engine still uses shared globals and wrapper-based extensions. Some mathematical and pixel renderers duplicate similar processing logic; a future module extraction should preserve existing output with image-based regression fixtures. Video export remains browser-codec-dependent and silent. Heavy processing is CPU-based; no universal FPS claim is made. Temporal feedback is previous-frame state and is not included in project JSON or scene slots. External media is referenced, not embedded. No background monitoring, deployment or merge is configured by this iteration.
