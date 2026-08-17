# Circuitbend Sandbox

A dependency-free browser playground for generating, animating, circuit-bending, and exporting visual media.

**Live app:** https://generalgroovy.github.io/circuitbend/

Everything runs locally in the browser. There is no build step, server requirement, API key, model download, or cloud dependency.

## What it does

### Generate visual sources

The **Generator** creates deterministic animated sources from a text prompt and seed.

Modes:

- **Pixel** — block/pixel rendering.
- **ASCII** — prompt-driven pictures rendered as glyph fields.
- **Hybrid** — pixel blocks with ASCII detail.

Engines:

- **Math field** — layered trigonometric fields influenced by prompt words.
- **Cellular** — deterministic cellular/noise patterns.
- **Reference media** — converts a loaded image or video into pixel/ASCII animation.

Motion:

- Drift
- Pulse
- Orbit
- Wave
- Static

Prompt vocabulary is intentionally lightweight and offline. Words affect palette and geometry rather than calling an external image model. Useful cues include `circuit`, `city`, `forest`, `space`, `water`, `symmetry`, `rings`, `grid`, `organic`, `monochrome`, `warm`, and `neon`. Any prompt still changes the deterministic hash/field, so arbitrary text produces a distinct scene.

Example prompts:

```text
neon circuit city at night, symmetrical grid, violet cyan
organic forest signal, rings in water, moss terminal
recursive space antenna, monochrome, orbital interference
warm cellular machine garden, dense grid, pulse
```

## Bend images and video

Drop or open an image/video. Videos loop automatically. Imported media and generated scenes use the same effect pipeline.

The rack includes:

- brightness, contrast, saturation, hue, grayscale, inversion, solarize, duotone
- threshold, ordered dither, posterization, bit depth and noise
- RGB/chroma shift, pixelation and pixel sorting
- block corruption, inverted blocks, datamosh-like temporal slicing
- wobble, ripples, displacement, line offset, melt and shred
- mirror, kaleidoscope and tiling
- edge, glow, emboss, halftone and ASCII conversion
- scanlines, scratches, animated color bands and strobe
- tunnel, prism, ghost, echo and zoomed feedback

Every rack can be bypassed without destroying its values.

## Automation

Most numeric parameters expose three automation systems:

1. **Rate** — continuous parameter movement per second.
2. **LFO** — sine, triangle, square, noise or beat modulation.
3. **Sweep** — stepped left-to-right/right-to-left scanning with configurable jump size and interval.

Global controls provide master automation speed, two macros and BPM.

## Recursive workflow

**Bake output → source** freezes the currently processed frame and turns it into a fresh source. This enables repeated generations of processing:

```text
source → effects → bake → new effects → bake → ...
```

This is useful for destructive-looking circuit-bend experiments while the actual effect controls remain non-destructive until you intentionally bake.

## Determinism

There are two independent seeds:

- **Generator seed** controls prompt-driven source generation.
- **FX seed** controls frame-level random operations such as block glitches, scratches and datamosh slices.

The same prompt/seed/settings produce stable procedural structure. Animated random effects vary by frame in a reproducible sequence for the same FX seed and playback path.

## Export

- **PNG** — current processed frame.
- **ASCII** — text representation of the current source/output.
- **Record WebM** — records the processed canvas using `MediaRecorder` and `canvas.captureStream()` when supported by the browser.
- **Project JSON** — portable generator, effect rack, automation, timing and quality state. Baked still sources are embedded as PNG data.

Recording contains the visual canvas only; audio is intentionally not captured.

## Presets, snapshots and project files

Built-in FX scenes include Clean, Xerox, Neon, Acid, CCTV, Mosh, ASCII, Thermal, Poster, Fracture, Ritual, Dirty VHS, Databend, Feedback, Terminal and Dream.

**Save snapshot** stores the current FX/generator state in browser `localStorage`. **Load snapshot** restores it. **Undo** keeps an in-memory history for parameter and scene changes during the current page session.

Use **Project JSON** to download a portable `.json` project and **Load project** to restore it later or in another browser. Project files include prompt/seed, generator mode and dimensions, rack values, rack bypasses, rate/LFO automation, master/macros/BPM, quality and FX seed. A baked still source is embedded in the project. Original imported image/video files are intentionally not embedded; reload those separately when needed.

## Run

Use the published GitHub Pages app:

```text
https://generalgroovy.github.io/circuitbend/
```

Or open `index.html` directly in a modern browser. A local static server is recommended for consistent browser behavior:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

No npm install is required to run the app. Node is only used for repository smoke tests.

## Test

```bash
npm test
```

The dependency-free test suite checks JavaScript parsing, JavaScript-to-DOM references, core generator/effect/recording/project features, and GitHub Pages-safe relative asset paths.

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

The app deliberately remains small and hackable:

- `index.html` — workstation UI.
- `style.css` — responsive sandbox layout.
- `main.js` — generator, source handling, animation loop, effect rack, automation, recording and export.
- `project.js` — portable project import/export.
- `tests/` — dependency-free smoke and GitHub Pages compatibility tests.

The processing path is:

```text
prompt / image / video
        ↓
source canvas
        ↓
geometry + channel + pixel effects
        ↓
print / optical / temporal effects
        ↓
preview canvas
        ├─ PNG
        ├─ ASCII
        ├─ WebM
        ├─ project JSON
        └─ bake back to source
```

The project intentionally uses browser Canvas 2D instead of a framework or GPU dependency so it remains portable, inspectable and easy to extend.

## Performance

Use **Quality** to reduce the internal effect resolution when stacking expensive pixel operations. `Balanced` is the default. ASCII, edge detection, halftone, sorting, large source resolutions and many temporal effects are CPU-heavy.

For smooth experimentation:

1. Start at 512×512 or smaller.
2. Use Balanced/Fast quality while designing a look.
3. Reduce FPS for expensive effect stacks.
4. Switch to Full quality immediately before still export if needed.

## Good next extensions

The current architecture is ready for further slices such as:

- draggable effect ordering / user-defined effect chains
- keyframe timeline and curve editor
- GIF/APNG export
- optional WebGL shader effects
- optional local image-model adapter while retaining the procedural offline fallback
- MIDI/OSC input for live visual performance
