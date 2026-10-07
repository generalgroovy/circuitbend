# Circuitbend Sandbox

[Open Circuitbend](https://generalgroovy.github.io/circuitbend/). Create procedural images, transform imported media, combine effects, and export the result. The app runs locally in the browser without a build step, account, API key or model download.

## Start with one workflow

1. Start in **Source**: choose an engine and render style, then **Generate** or **New variation**. A generated preview is ready on first visit. **Open media** accepts your image or video instead; imported files stay local.
2. **Choose a look** beside the preview and adjust **FX mix**. At 0% you see the source; at 100% the full effect. **Compare original** temporarily bypasses effects without changing settings. **Undo** restores the previous mix gesture or parameter state.
3. **Save image** downloads the visible pixels as PNG. **Export** distinguishes the preview image, full-size image, ASCII text and editable project backup.

For more control, open **Source options** for reference patterns, seed, dimensions and motion. **Math** and **Style** expose mathematical generators, palettes, layers and pixel/glyph rendering. **Effects** starts with folded racks and Simple controls. Search opens matching racks; **Clear search** restores their prior open/closed state. Choose **Expert automation** for rate, LFO and sweep controls. Existing expert projects retain their saved mode.

**Project & tools** holds project save/open, browser snapshots, recording, mutation, bake-output-to-source, fullscreen and **Show all tools**. **View options** on the preview contains source comparison views, zoom, crisp rendering, floating and pop-out controls. **How it works**, inside Project & tools, keeps explanations out of the main creative surface. Controls retain visible keyboard focus and the workspace uses ordinary page scrolling instead of nested scroll traps.

The complete workstation remains available: pixel/ASCII/hybrid/ANSI/braille rendering, image/video input, one imported-media overlay, presets, per-rack bypass, modulation and bake-output-to-source. Effects are applied in the implemented processing order; this is not a freely reorderable node graph.

## Source and output size

Source width/height can reach 4096 pixels. Choose final dimensions first, then keep the **Live effect budget** around 1–2 MP while editing large work. Live scale/quality and the budget affect the processed preview; preview zoom only changes presentation.

- **Save image** captures the currently visible pixels without another render, including FX mix or original comparison.
- **Full-size PNG** renders the current source at its dimensions (up to 17 MP). Live buffers and settings restore before asynchronous encoding, so editing can continue safely. The button stays disabled until encoding completes.
- **ASCII** exports generated character output.
- **Record WebM** captures the canvas when the browser supports MediaRecorder/canvas capture.
- **Bake output → source** makes the processed image the new source for another effects pass.

Reduce live resolution, FPS or expensive temporal/pixel effects if interaction slows. Large canvases and multiple buffers consume substantial memory; browser and device limits still apply.

## Imported media and project files

Use **Open media** (mouse, Enter or Space) or drop an image/video. The current source remains usable until the new file decodes successfully. **Cancel opening**, decoding failures, unsupported types and superseded requests leave it intact. Replacing media releases the previous object URL; cancelled candidates release theirs. Imports allow images under 64 MB and videos under 512 MB, up to 32 MP and 16,384 pixels per side. Loading times out after 30 seconds with an actionable message. Browser-supported formats determine what can be decoded; imported media stays local to the browser.

**Save project** saves the editable configuration in the current `circuitbend-project` format, version **6**: generator settings, effects, modulation, output settings and workspace/viewer state. **Open project** restores compatible project files; newer version numbers are rejected. Project files, browser snapshots and named presets retain FX mix. Version 6 includes an optional FX mix value; older files restore at 100%. Baked projects decode before applying settings. A newer source choice cancels an older project read or baked-image decode.

The project file does **not** embed original imported image/video files. Restoring an external-media project shows **Original media needed** beside the preview and focuses **Reload original media**. The generated preview is a placeholder; choose the original file to recover the artwork with its restored effects and FX mix. Failed or cancelled opening keeps the settings and recovery action available. Saving the project before reloading still records its need for external media. **Keep generated source** accepts the placeholder with the restored settings and cancels any unfinished media opening; Generate or Bake output also starts a deliberate new source. A baked source can be included as PNG data. Download a project file when you need portable state—browser-local snapshots and named presets are not a substitute for a backup.

Workspace/viewer preferences, snapshots and named presets use local storage. These are scoped to the site/browser, can be cleared, and are not account synchronization. There is no automatic durable recording of every edit or complete imported-media session.

## Controls

| Key | Action |
|---|---|
| Ctrl/Cmd + Enter | Generate, including while editing the prompt |
| Alt + 1…5 | Source, Effects, Export, Math, Style |
| Space | Play/pause |
| G | Generate |
| R | Mutate effects |
| S | Export PNG |
| Ctrl/Cmd + Z | Undo parameter state |
| Escape | Close Project & tools and return focus to its summary |

Playback and single-letter shortcuts leave focused controls, buttons, links and editable text to their normal keyboard behavior. Ctrl/Cmd + Enter is the explicit exception. Undo concerns application parameter snapshots; it does not recover a discarded original media file.

## Run locally

Serve this directory with a static HTTP server, for example:

```sh
python -m http.server 8080
```

Open `http://localhost:8080`. Keep all JavaScript/CSS files together: the project loader adds the math, streamlined workspace and preview modules dynamically. No `npm install` is needed.

## Verify changes

With Node.js 18 or newer:

```sh
npm test
```

On Windows, use `npm.cmd test` if PowerShell blocks `npm.ps1`. The suite checks script syntax, DOM references, relative assets, media replacement/races/cancellation, project decode/read races, missing-media recovery and persistence, export recovery and mix Undo. CI additionally runs Chromium at 1366, 390 and 320 pixels for first-view preview visibility, expanded expert-rack widths, effect search recovery, keyboard media opening, accessible field names, actual PNG dimensions/pixels, original transparency and expert/legacy project round trips, including a failed then successful original-media reload. See [the media-recovery flow record](docs/PROJECT-UX-FLOW-2026-10-07.md). These checks do not prove visual correctness for every effect, browser or physical device.

A focused browser pass:

1. Generate a reference preset; change mode, seed and one effect.
2. Import an image, replace it, and confirm an unsupported drop leaves the source intact.
3. Export PNG and Full-res PNG; inspect dimensions and appearance.
4. Save/reopen an editable project, including a baked source. Separately verify external-media reloading.
5. Check the focused/all-tools workspace and preview window; test WebM only on browsers supporting recording.

## Source map

| File | Responsibility |
|---|---|
| `index.html`, `style.css` | Base controls and layout |
| `main.js` | Generator/effects engine, media loading, animation, recording |
| `advanced.js`, `advanced.css` | Source presets, palettes, compositing, scale/output, rack controls |
| `webview.js`, `webview.css` | Compact presentation and render-mode extensions |
| `mathlab.js`, `mathlab.css` | Mathematical generators and their controls |
| `streamlined.js`, `streamlined.css` | Task navigation, quick controls, focus/full workspace |
| `preview-window.js`, `preview-window.css` | Pinned/floating/pop-out preview |
| `project.js` | Project version 6 serialization, restore and module loading |
| `tests/` | Dependency-free automated checks |

Use this README for the supported workflow and boundaries; source code defines exact parameter ranges and processing behavior.
