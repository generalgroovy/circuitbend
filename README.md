# Circuitbend Sandbox

[Open Circuitbend](https://generalgroovy.github.io/circuitbend/). Create procedural images, transform imported media, combine effects, and export the result. The app runs locally in the browser without a build step, account, API key or model download.

## Start with one workflow

1. In **Create**, choose an engine, render mode and seed, then **Generate**. **Variation** changes the seed. Source presets provide checkerboards, calibration cards, gradients and other reference patterns.
2. Use **Math** for mathematical generators, **Style** for palettes and glyph rendering, and **FX** for effect racks. Start with a small canvas and a few effects.
3. The preview comes first. Select an **FX preset** beside it; **Compare original** temporarily bypasses effects while retaining render resolution and all parameter values. **Show processed** restores the effect view. PNG exports the currently visible result. **Adjusted effects** discloses changed settings, including dependent parameters. Pin, float or open the preview in a separate window when useful; preview zoom changes display size, not export resolution.
4. Open **Export** for output/project controls. **More** contains secondary actions. **Focus** keeps the workspace compact; **Full** exposes the larger set of controls. **Info** holds workflow/shortcut/project notes; the compact workspace keeps controls readable and uses larger phone targets.

The complete workstation remains available: pixel/ASCII/hybrid/ANSI/braille rendering, image/video input, one imported-media overlay, presets, per-rack bypass, modulation and bake-output-to-source. Effects are applied in the implemented processing order; this is not a freely reorderable node graph.

## Source and output size

Source width/height can reach 4096 pixels. Choose final dimensions first, then keep the **Live effect budget** around 1–2 MP while editing large work. Live scale/quality and the budget affect the processed preview; preview zoom only changes presentation.

- **PNG** captures the current processed output resolution.
- **Full-res PNG** renders at the source dimensions, temporarily using the larger processing size.
- **ASCII** exports generated character output.
- **Record WebM** captures the canvas when the browser supports MediaRecorder/canvas capture.
- **Bake output → source** makes the processed image the new source for another effects pass.

Reduce live resolution, FPS or expensive temporal/pixel effects if interaction slows. Large canvases and multiple buffers consume substantial memory; browser and device limits still apply.

## Imported media and project files

Use **Open media** or drop an image/video. Replacing media releases its previous object URL. Unsupported file types leave the active source intact. Browser-supported formats determine what can be decoded; imported media stays local to the browser.

**Project JSON** saves the editable configuration in the current `circuitbend-project` format, version **6**: generator settings, effects, modulation, output settings and workspace/viewer state. **Load project** restores compatible project files; newer version numbers are rejected.

Project JSON does **not** embed original imported image/video files. Keep those originals and reload them after restoring an external-media project; the initial restore uses a generated source. A baked source can be included as PNG data. Download a project file when you need portable state—browser-local snapshots and named presets are not a substitute for a backup.

Workspace/viewer preferences, snapshots and named presets use local storage. These are scoped to the site/browser, can be cleared, and are not account synchronization. There is no automatic durable recording of every edit or complete imported-media session.

## Controls

| Key | Action |
|---|---|
| Ctrl/Cmd + Enter | Generate, including while editing the prompt |
| Alt + 1…5 | Create, Math, Style, FX, Export |
| Space | Play/pause |
| G | Generate |
| R | Mutate effects |
| S | Export PNG |
| Ctrl/Cmd + Z | Undo parameter state |
| Escape | Close the More menu and return focus to its summary |

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

On Windows, use `npm.cmd test` if PowerShell blocks `npm.ps1`. The suite checks script syntax, DOM references, relative asset paths and the media replacement/rejection lifecycle. It does not prove visual correctness for every effect or export combination.

A focused browser pass:

1. Generate a reference preset; change mode, seed and one effect.
2. Import an image, replace it, and confirm an unsupported drop leaves the source intact.
3. Export PNG and Full-res PNG; inspect dimensions and appearance.
4. Save/reload Project JSON, including a baked source. Separately verify external-media reloading.
5. Check the compact/full workspace and preview window; test WebM only on browsers supporting recording.

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
