# Compact sandbox workspace

## What changed

The preview now stays beside a single tool inspector on desktop, instead of sitting below a long generator form. Source, Math, Pixel / ASCII, Effects, Export and All tools are views over the **same original controls**. There is no duplicated control state. The layout stacks on narrow screens; essential controls use readable text instead of the previous 8–10px labels.

A built-in shelf offers four original images (Neon shapes, Color lab, Pixel harbor and Fine detail) and two real three-second WebM clips (Orbit loop and Color drift). The small 192×120, 8 fps loops are deliberately lightweight test media, not stock footage. Everything is embedded in `sandbox-samples.js`; there are no remote image hosts, API keys, tracking, runtime packages, or licensing dependencies. Images use SVG so fine edges remain useful for resolution tests. Sources load through the same image/video path as user files. Sample changes keep effects in place.

Compare temporarily bypasses the effect pipeline without overwriting settings. Remix changes a small group of effects, preserves source/render scale/frame rate, and does not enable strobe. The original extreme Chaos control remains under More, with a warning. Undo restores effect values and modulation; it is not a source-file history.

Full-resolution PNG, silent video recording, ASCII export, project JSON, browser snapshots, personal presets, all mathematical engines, automation, layering, baking, and float/pop-out viewers remain available. Basic mode hides automation rows; Expert mode reveals them. All tools puts the complete tool collection in one inspector.

## Runtime fixes

- Clean color passes skip unnecessary pixel readback and RGB/HSL conversion; active color adjustments retain the original renderer.
- The render pixel budget is applied before canvas dimensions are assigned. Repeated capped-size renders no longer grow/shrink the surfaces or erase their feedback buffers during resize.
- Animation-frame control synchronization is limited to about eight updates per second. Direct edits still synchronize immediately.
- Image/video loading validates and decodes a candidate before replacing the current source. Object URLs are released when replaced, failed, stale, or unloaded. Source commits are serialized to prevent overlapping selections from corrupting the active media state.
- Unsupported files show a recoverable status message. Autoplay rejection leaves a usable Play control. Reduced-motion preferences keep sample videos paused.
- Recording chooses a supported MIME type and stops capture tracks when finished. The stop control remains in the top bar while recording.

## Test coverage

`npm test` retains the original syntax, feature-marker and Pages-path checks. The Workspace browser checks workflow additionally installs a development-only, pinned Playwright version and runs `node tests/workspace.browser.mjs`. It checks six sample decoders, video playback, invalid/corrupt files, rapid selection, Compare, Remix/Undo, effect persistence, exact inputs, search, expert controls, clean-pass bypass, budget/feedback stability, PNG/full-resolution PNG, recording track cleanup, viewer controls, five responsive widths, reduced motion and uncaught errors. Screenshots and the JSON report are workflow artifacts. This is Chromium coverage, not a claim that every browser/codec combination has been tested.

To run locally:

```sh
npm test
npm install --no-save --package-lock=false playwright@1.55.0
npx playwright install chromium
node tests/workspace.browser.mjs
```

## Remaining architecture work

The legacy engine still uses shared globals and wrapper-based extensions. A full module rewrite would be a separate, higher-risk change. The existing enhanced generator also reads renderer controls and writes browser state on generated frames; removing that path should be paired with generator-state regression tests. Imported files are not embedded in project JSON: reopen the same file after loading, select the built-in sample again, or bake a still into the source before saving. Video codecs and recording formats remain browser-dependent; failed decodes leave the current source available.
