# Circuitbend Sandbox

A dependency-free browser playground for generating, layering, scaling, circuit-bending, automating and exporting visual media.

**Live app:** https://generalgroovy.github.io/circuitbend/

Everything runs locally in the browser. There is no build step, server requirement, API key, model download or cloud dependency.

## Configuration model

The UI is organized around a simple flow:

```text
1. Source
   ↓
2. Canvas & output scale
   ↓
3. Palette & imported-media layer
   ↓
4. FX scenes / racks
   ↓
5. Effect configuration & automation
   ↓
Export / bake / project file
```

This separates source creation from render resolution, compositing and downstream effects.

## General source and reference material

Circuitbend no longer depends mainly on thematic prompt words. The source engine can be selected directly.

Available engines:

- **Math field** — deterministic trigonometric structures.
- **Cellular** — cellular/noise patterns.
- **Imported reference** — pixel/ASCII conversion of an image or video.
- **Gradient / ramp** — linear, radial, grayscale and interference ramps.
- **Geometry / sprites** — primitives, symbols, icon/sprite-like sheets and tiles.
- **Calibration / test card** — color bars, grayscale ramps, grid, circles and alignment marks.
- **Waveform / scope** — oscilloscope-style sine/multi-wave reference material.
- **Mandala / radial** — spokes, concentric rings and symmetry/resolution patterns.
- **Text / glyph sheet** — repeated text, alphabet, numbers and symbol references.
- **Noise / texture** — deterministic multi-scale texture fields.

Built-in source/reference presets include Calibration card, Checkerboard, Gradient ramp, Radial resolution, Geometry sheet, Glyph/text sheet, Wave/scope, Mandala/symmetry, Noise/texture, Sprite primitives, Moiré field and Tile reference.

These are useful both as artwork sources and as controlled material for testing glitches, scaling, palette changes, thresholding, edge effects, feedback and export quality.

## Prompt, seed and render modes

All procedural sources remain deterministic from their prompt/seed/settings.

Render modes:

- **Pixel** — block/pixel rendering.
- **ASCII** — glyph-field rendering.
- **Hybrid** — pixel blocks with ASCII detail.

Motion modes:

- Drift
- Pulse
- Orbit
- Wave
- Static

Prompts remain useful as an additional structural control language. Words such as `grid`, `rings`, `sprite`, `tile`, `moire`, `city`, `forest`, `space`, `water`, `symmetry`, `organic`, `monochrome`, `warm` and `neon` influence suitable engines, but direct source controls are always available.

## Scalable canvas and output

Source dimensions are configurable from **64×64 up to 4096×4096**.

Common presets include:

- 256×256
- 512×512
- 1024×1024
- 2048×2048
- 4096×4096
- 1280×720
- 1920×1080
- 3840×2160
- 1080×1920
- 1080×1080
- 2480×3508

The source canvas and live effect resolution are intentionally separate.

**Live effect budget** caps the internal processing area from 0.5 to 17 megapixels. This lets you keep a large final source while editing at a lower live resolution.

**Preview zoom** changes only the on-screen view. It does not change source or export dimensions.

**Pixel-crisp preview** switches the display to nearest-neighbor presentation for pixel art inspection.

**Full-res PNG** temporarily renders the current effect chain at the full source dimensions, up to the browser-safe project limit of roughly 17 megapixels, then restores the faster live settings.

## Palette and source compositing

Palette modes:

- Prompt / auto
- Monochrome
- Warm
- Cool
- Neon
- Earth
- Game palette
- RGB reference
- Pastel
- Custom four-color palette

A hue-shift control can rotate generated palettes without modifying the rest of the source configuration.

Imported image/video can also be retained as a layer over a generated/reference source. Layer controls include:

- enable/disable
- opacity
- blend mode: Normal, Screen, Multiply, Overlay, Difference, Exclusion, Lighten, Darken
- fit: Cover, Contain, Stretch or Native pixels
- scale
- rotation
- X/Y pan

This makes the source stage useful for collage, texture transfer, mixed reference material and circuit-bent compositing before downstream FX are applied.

## Effect rack

The rack includes:

- brightness, contrast, saturation, hue, grayscale, inversion, solarize, duotone
- threshold, ordered dither, posterization, bit depth and noise
- RGB/chroma shift, pixelation and pixel sorting
- block corruption, inverted blocks and datamosh-like temporal slicing
- wobble, ripples, displacement, line offset, melt and shred
- mirror, kaleidoscope and tiling
- edge, glow, emboss, halftone and ASCII conversion
- scanlines, scratches, animated color bands and strobe
- tunnel, prism, ghost, echo and zoomed feedback

Each rack now has explicit actions:

- **Bypass / Enable**
- **Random** — mutate only that rack
- **Reset** — restore only that rack
- **Copy / Paste** — transfer rack values
- **Fold** — collapse the rack

Numeric effects expose both a slider and an exact number field. Each control also has a concise description/tooltip.

## Clear simple vs expert configuration

The configuration bar provides two modes:

- **Simple controls** — values only; rate/LFO/sweep rows are hidden.
- **Expert automation** — exposes full automation for every numeric parameter.

An effect search filters racks/parameters by name or description.

An **active effects** summary shows which parameters currently differ from their defaults, so heavily modified scenes remain understandable.

Racks can be expanded or folded globally.

## Automation

Most numeric effects expose:

1. **Rate** — continuous change per second.
2. **LFO** — sine, triangle, square, noise or beat modulation.
3. **Sweep** — stepped left-to-right/right-to-left scanning with configurable jump and interval.

Global controls provide master automation speed, two macros and BPM.

## FX scenes, user presets and snapshots

Built-in FX scenes include Clean, Xerox, Neon, Acid, CCTV, Mosh, ASCII, Thermal, Poster, Fracture, Ritual, Dirty VHS, Databend, Feedback, Terminal and Dream.

Named **user presets** can now be stored in browser local storage and include generator, rack and advanced source/canvas/palette state.

**Save browser snapshot** stores the current quick snapshot locally. **Load browser snapshot** restores it. **Undo** keeps an in-memory history during the current session.

## Recursive circuit-bending

**Bake output → source** freezes the processed frame and turns it into a new source:

```text
source → effects → bake → new effects → bake → ...
```

This makes destructive-looking multi-generation circuit-bending possible while keeping the active effect rack non-destructive until you intentionally bake.

## Export

- **PNG** — current live processed frame.
- **Full-res PNG** — full source-size render with the current effect stack.
- **ASCII** — text representation of the source/output.
- **Record WebM** — records the processed canvas with `MediaRecorder` and `canvas.captureStream()` when supported.
- **Project JSON** — portable project configuration. Baked still sources are embedded as PNG data.

Recording is visual-only; audio is intentionally not captured.

## Project files

Project format v2 stores:

- prompt, seed, engine, render mode and motion
- source width/height, cell size and generator speed
- palette mode, hue shift and custom colors
- imported-media layer settings
- live render budget, preview scale and display mode
- all effect rack values and bypass states
- rate/LFO automation
- master speed, macros, BPM, quality and FX seed
- baked still source when present

Original imported image/video files are not embedded; reload those separately when required.

## Run

Published app:

```text
https://generalgroovy.github.io/circuitbend/
```

Or run locally:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

No npm install is required to run the app.

## Test

```bash
npm test
```

The dependency-free suite checks JavaScript parsing, JavaScript-to-DOM references, core and advanced source/scaling/configuration entry points, project import/export hooks, and GitHub Pages-safe relative asset paths.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play/pause |
| `G` | Generate/refresh source |
| `R` | Mutate effects |
| `S` | Export PNG |
| `Ctrl/Cmd + Z` | Undo |

Shortcuts are disabled while typing in an input, select or prompt field.

## Architecture

- `index.html` — workstation UI and explicit source/canvas/configuration controls.
- `style.css` — base responsive workstation layout.
- `advanced.css` — scalable-source and enhanced rack UI.
- `main.js` — original generator/effect engine, source handling, animation, automation and recording.
- `advanced.js` — general reference engines, palette/compositing, scalable canvas/output, rack clarity and user presets.
- `project.js` — portable project v2 import/export.
- `tests/` — dependency-free smoke and GitHub Pages compatibility checks.

Processing path:

```text
prompt / reference engine / image / video
               ↓
          source canvas
               ↓
      optional media layer
               ↓
   live resolution / budget
               ↓
 geometry + color + glitch FX
               ↓
 print + optical + temporal FX
               ↓
          preview canvas
       ├─ PNG / full-res PNG
       ├─ ASCII
       ├─ WebM
       ├─ project JSON
       └─ bake back to source
```

The app deliberately stays on browser Canvas 2D and static files so it remains inspectable, offline-first and directly deployable on GitHub Pages.

## Performance guidance

For large work:

1. Choose the desired final source/output dimensions first.
2. Keep Live effect budget around 1–2 MP while designing.
3. Use Draft/Fast/Balanced quality for expensive stacks.
4. Reduce FPS when using ASCII, edge, sort, feedback or many temporal operations.
5. Use Full-res PNG only for the final still render.
6. 4K and 4096-square sources can consume substantial browser memory, especially with multiple temporal buffers.

## Good next extensions

- draggable effect ordering / user-defined effect chains
- keyframe timeline and curve editor
- multi-source layer stack rather than one imported overlay
- GIF/APNG export
- optional WebGL shader effects for faster large-resolution work
- optional local image-model adapter while retaining procedural offline fallbacks
- MIDI/OSC input for live visual performance
