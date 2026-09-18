# Circuitbend field guide

Use **? Guide** in the app for the same instructions, next to your work.

## First experiment

1. Pick Neon shapes from Test signals, or use Open media for your own image or video.
2. Try VHS or Remix. Sample changes keep the current effects; recipes replace the source and its look.
3. Move FX blend toward the original. Compare temporarily bypasses the effects without changing their values.
4. Choose Save PNG. Use Export → Save project to keep an editable version too.

Everything runs on this device. There is no account, media upload or AI image service.

## Make a source

Source → Recipes & saved experiments has six starting scenes. Save the current experiment before trying one. Recipes and restored projects start paused; press Play to animate.

To build a pattern, choose a source engine, a palette and a seed. Keywords such as grid, rings, warm or monochrome influence some engines. This is procedural generation, not general text-to-image AI.

New seed changes the variation. Generate replaces the source. Bake → source freezes the processed output into a still that you can process again. Undo does not restore an earlier source file.

## Explore a mathematical structure

Choose Math, then a Concept or recipe. The formula and description explain what you are changing. Adjust one parameter at a time; use Explore for a variation.

Play animates the scene. Pause holds it still. Restart pauses at time zero; Step advances 1/30 second. That step is a time increment, not a native frame of an imported video.

## Turn media into pixels or type

Open an image or video, choose Pixel / ASCII, then Use imported media as reference. Choose a Render mode; adjust cell size, pixel shape, palette or glyph set.

Smaller cells give more detail and cost more work. Larger cells make a bolder pattern. These controls style the generator; a directly imported source does not use them until it becomes a reference.

## Shape a look

Start with a quick look, then open Effects. Search for a control, drag its slider or type an exact value. Simple controls hide automation; Expert automation reveals rates, oscillation and sweeps.

Undo and Redo cover effect values, modulation, rack bypass and FX blend—not source-file changes. Remix changes a few effects without changing render scale or frame rate. Reset FX returns the effects to their defaults.

Remix does not enable strobing. Acid, Chaos and some manually configured effects can flash. Those controls carry warnings; avoid them when flashing is a concern.

## Save and reopen

Save PNG captures preview resolution. Full-res PNG uses source resolution. Record video captures a silent clip at preview resolution; Stop recording finishes the download. Clips stop at two minutes or about 64 MB.

Save project keeps built-in sample references, generator settings, effects, playback position and baked stills. It does not embed your imported files. Reopen the same media first, then Load project.

Up to six named experiments can stay in this browser. Use Save project for a portable backup. Session-only means browser storage is unavailable or full; closing the page can lose those slots.

Trails and feedback buffers are not saved. Bake → source preserves a still when the exact appearance matters.

## When something looks wrong

Effects seem inactive? Turn Compare off, raise FX blend, and check the rack is enabled. A paused image will not animate until you press Play.

Preview feels slow? Lower Live quality under Effects → Animation, macros & performance. Lower Live effect budget under Export → Canvas & resolution. Source size is independent of preview size.

Cannot load a file? Try a smaller image or a browser-supported video codec. Imports are limited to 256 MB and 17 megapixels; project files to 24 MB. Unsupported codecs vary by browser.

Cannot change the source? Finish the recording or export first. Fit resets viewer zoom. Float and Pop out keep a separate view without changing the rendered image.

## Keyboard

Space: play/pause. G: generate. R: remix. S: save PNG. These single-key shortcuts do not run while typing in a field.

Ctrl/Cmd + Z: undo effects. Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: redo. Ctrl/Cmd + Enter: generate. Alt + 1–5: switch workspace sections.

?: open this guide. Escape: close the guide or More menu. Shortcuts are suspended while the guide is open. Tab and Shift + Tab move between controls.

---

[Start page](../README.md) · [Development & limits](DEVELOPMENT.md) · [Documentation index](README.md)
