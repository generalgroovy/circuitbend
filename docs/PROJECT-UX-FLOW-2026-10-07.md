# Circuitbend original-media recovery — 7 October 2026

## Observed friction and scope

Opening a project based on imported media restored settings, generated a substitute source and cleared the status message. The original image/video is intentionally not embedded, but the running workspace offered no explanation or direct recovery step. A saved imported-media viewer could also show the prior session's media element, making the incomplete restore look complete.

Baseline `d486211a6d578e49b9ccdc05d897e4bfb441e0bc` matched `origin/main` at the start. No unrelated edits or applicable AGENTS.md were present. Candidate branch: `codex/ux-flow-2026-10-07`. Runtime: `e2bb80ac4db70de801f549b67b38164b0a1a979d`.

## Result

- An external-media project now exposes Original media needed beside the preview, explains that the file is not embedded and a generated source is available, and focuses/reveals Reload original media.
- Reload original media opens the existing local image/video picker. Failed, cancelled, superseded and unsupported loads preserve restored settings and the recovery notice. A successful decode resolves the requirement and keeps the restored FX mix and effect settings. Focus returns to the nearby look control when a recovery action disappears.
- Keep generated source explicitly accepts the generated result, displays its processed output, keeps restored settings and cancels unfinished media opening. Deliberate Generate and Bake actions likewise resolve the requirement for the new source.
- Saving before recovering the original still records an external-media project; the generated placeholder cannot silently turn that project into a generated-only save. No project version change is needed.
- The restored reference engine cannot silently use a prior imported file. While the original is missing, the imported-media viewer reports no source and its pop-out hides stale pixels. Its saved source selection remains available when original media is reloaded.
- Generators, mathematical engines, layers, rendering styles, all effects and automation, mix/Undo, saved presets, viewer zoom/pop-out, recording and exports remain supported. The README documents the new recovery path and the existing boundary that parameter Undo cannot restore a discarded original file.

## Validation and review

- Local `npm.cmd test`: syntax/required DOM and Pages assets passed; **23 behavioral tests passed**, zero failures or skips. Added cases cover media-recovery failure/cancellation/success/focus, Keep generated cancelling a stale decode, external project state/resaving, generated/legacy/baked restoration, and hiding stale imported media in main/pop-out previews. The final pop-out presentation adjustment passed the targeted 8-test workspace suite.
- Local `node --check tests/browser.mjs` and `git diff --check`: passed.
- Final runtime `e2bb80ac4db70de801f549b67b38164b0a1a979d` passed [CI 37611663593](https://github.com/generalgroovy/circuitbend/actions/runs/37611663593), including all 23 behavioral tests and real Chromium journeys at 1366×768, 390×844 and 320×740. The browser suite checked PNG pixels/dimensions, original transparency, failed/successful original-media reload with retained FX mix, unresolved project resaving, Keep generated, missing imported-media preview, and all earlier expert/legacy/zoom/search workflows. All three report zero page errors and no horizontal document overflow. The earlier runtime also passed [CI 37611343053](https://github.com/generalgroovy/circuitbend/actions/runs/37611343053).
- Downloaded `circuitbend-browser-quality` to shared `ux-flow-2026-10-07/evidence/circuitbend-ci/`. Inspected all three complete `*-project-recovery.png` viewport screenshots: the notice, focus ring and both actions are readable and contained at desktop, 390px and 320px. Deliberate project restoration scrolls the recovery action into view on the shortest phone. The report and screenshots remain in the CI artifact.
- Independent source reviewer `flow_c`: **PASS** at `e2bb80a`, with all 23 tests and smoke/Pages checks independently rerun. Complete source/media/viewer review found no blocker. Shared report: `ux-flow-2026-10-07/reviews/circuitbend-review.md`.
- Root's separate CUA journey passed actual imported PNG → Save project download → reload/Open project → recovery card → Reload original media through the file chooser. The notice cleared with “Original media loaded. Restored project settings kept.” Root inspected the 390×844 recovery screenshot with readable actions at shared `ux-flow-2026-10-07/evidence/circuit-media-recovery-phone.png`. An initial attempt targeted a hidden input before startup finished; the visible Open media control completed the journey. No local browser automation has been used in this owner pass.

## Release boundary

Root accepted and authorized normal main promotion after completed source review and CI. The reviewed release was fast-forwarded to main at `08c5f354e03a318a2f11c5af30fa0d6f0c579a6c`; [Pages deployment 37612757703](https://github.com/generalgroovy/circuitbend/actions/runs/37612757703) succeeded. The documentation commit's skip-ci marker suppressed automatic Pages triggering, so the authorized Pages rebuild was requested through the repository API. At 2026-10-07T11:15:43Z, all **14 public runtime files** returned HTTP 200 and matched the canonical Git SHA-256 hashes with standard HTTPS certificate validation. Receipt: shared `ux-flow-2026-10-07/evidence/circuitbend-public.json`. Live URL: <https://generalgroovy.github.io/circuitbend/>. This final report update changes documentation only.

Automated behavior and Chromium checks do not establish every effect on every device, subjective visual quality, extended recording, or physical touch acceptance. Project files still require original external media separately.
