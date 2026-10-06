# Circuitbend quality pass — 6 October 2026

Baseline: `1a54263`, clean `origin/main`. Candidate branch: `codex/circuitbend-quality-2026-10-06`.

## Journey and plan

Open or generate a source → choose a look → adjust its strength → compare → export.

Inspection found that opening a replacement immediately discarded the current media before decoding succeeded; stale load callbacks were unguarded. Full-resolution export held temporary settings across asynchronous encoding, allowing late restoration to overwrite newer edits. Presets also lacked an easy continuous strength control.

Implement atomic, cancellable media replacement; a reversible final-output FX mix beside the preview; and a synchronous render transaction that restores live state before asynchronous encoding. Preserve fixed effect order, all existing racks, mathematical engines and version 6 project compatibility. Keep explanations under Info and put errors beside the preview.

Acceptance: failed, cancelled and superseded imports preserve the active source and release their resources; only the latest successful candidate replaces it. Mix preserves underlying settings, uses one Undo per gesture and survives project/snapshot save. Compare displays the original without altering mix or feedback history. Export failure restores settings and a second request is guarded. Verify the behavior with dependency-free tests and desktop/mobile browser inspection when the shared browser lease is available.

## Results

Implemented continuous transparent FX mix with one Undo per gesture; atomic media replacement with size/time bounds and actionable errors; source-intent cancellation covering generated sources, imports, project reads and baked-project decoding; synchronous full-resolution render restoration; PNG export of the existing preview pixels; and 44 px phone header actions.

Local verification: syntax/DOM/assets checks and 17 behavior tests passed. CUA at 1366�768 and 390�844 confirmed mix/Undo, original comparison, image import, corrupt-image preservation and full-resolution export returning to the original preview dimensions/mix. Phone document width equalled client width (375 px), with no horizontal overflow. Browser warnings/errors: none observed. Screenshots under `docs/evidence/` show this inspection before the final phone target-size adjustment.

The local download event observation timed out; no downloaded-file correctness is claimed from that attempt. A dedicated Chromium CI job tests exact downloaded PNG pixels/dimensions, original transparency, live-buffer restoration, project round trips and desktop/phone layout. CI result pending.

Review iteration added shared intent guards after the parent identified stale baked-project and File.text callbacks. Failed baked decode now leaves both source and settings intact. A second review guarded late autoplay rejection against newer media and froze the current generated source during full-resolution export.

Not run: physical touch devices, codec coverage across browsers, WebM recording, or all combinations of mathematical/temporal effects. Imported originals remain external to project files. Full-resolution output can vary with resolution-dependent effects; PNG is the exact visible-pixel export. Publication remains parent-owned.
