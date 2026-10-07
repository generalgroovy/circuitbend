# Circuitbend UX iteration — 7 October 2026

Base: `394e74938aa3843114935beb546ec17e29537b3e` (`origin/main`). Candidate branch: `codex/ux-clarity-2026-10-07`.

## Observed friction and implemented behavior

The initial entrypoint placed all source/scale/layer settings before the preview. Loaded compact styles squeezed three effect columns into a 310–390px panel and made many controls 8–10px. Expert automation and multiple open advanced sections created an intimidating first view. Export labels mixed image output with editable configuration and browser-local storage.

- The preview precedes source settings in both the entrypoint and loaded workspace. A readable Source → Effects → Export journey retains Math and Style as named deeper tools.
- Source details, palette/output settings, global automation and saved looks use native disclosures. First visits use Simple controls and folded effect racks. Advanced values and project mode restoration are preserved.
- Effect search opens matching controls, states when nothing matches and provides Clear search with focus recovery and restoration of prior rack expansion.
- Readable 13px main controls, 40px desktop / 44px narrow primary targets, responsive rack columns and normal page scrolling replace the conflicting compact-workspace overrides.
- Save image, Full-size PNG and Save project name their output. Export explains their distinction and the original-media limitation. Secondary actions stay in Project & tools; viewer controls have a View options disclosure.
- File labels can be activated by keyboard. Prompt, reference presets, custom colors, effect search, saved looks and numeric effect fields have accessible names. Play/Pause now reports its current action.

Full source generation, mathematical engines, render modes, overlays, palettes, all FX/automation, recording, presets, project restoration and exports remain supported. No dependency changes.

## Checks

- Local `npm.cmd test`: PASS — syntax/required DOM and Pages asset checks plus 18 behavior tests (media replacement/cancellation, project races, export buffers, exact mix endpoints and Undo, presets and keyboard behavior).
- `git diff --check`: PASS.
- Existing Chromium CI expanded to 1366×768, 390×844 and 320×740. It checks initial preview visibility, Simple defaults, expert-rack overflow, search recovery/focus, deeper tools, keyboard media picking, field labels, exact PNG pixels/dimensions, expert project restore and legacy mix defaults. Candidate CI result pending.
- Lead-agent rendered review and independent source review pending; findings and resolution will be recorded before acceptance.

## Limits

Automated Chromium checks and lead browser review do not establish universal beginner usability, every visual effect on every device, browser-specific recording support, or physical touch acceptance. Dynamic module startup is still progressive; browser-local preferences and old projects may intentionally restore an advanced workspace. Project files still require original imported media separately. Main and deployment are owned by the parent task and have not been changed here.
