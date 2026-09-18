# Circuitbend

**A signal workbench for images, motion and happy accidents.**

Open an image or video, build a mathematical pattern, and bend it with live effects. Everything runs on your device. No account, upload, API key or build step.

## Start in a minute

Pick **Neon shapes** → try **VHS** or **Remix** → adjust **FX blend** → **Save PNG**.

**Compare** shows the original without changing your settings. **Undo / Redo** restore effect edits. For a ready-made scene, open **Source → Recipes & saved experiments**. Recipes replace the source and its look; save an experiment first.

## Find the right tool

| Section | Use it to… |
| --- | --- |
| Source | Open media, generate patterns, choose recipes, save experiments |
| Math | Explore fractals, curves and fields with editable parameters |
| Pixel / ASCII | Turn a source into pixels, palettes or characters |
| Effects | Try looks, search controls, adjust sliders or automation |
| Export | Save a still, a silent video or an editable project |

**? Guide** opens task-based help inside the app. **All tools** shows the full inspector. The viewer can zoom, float or pop out.

## Run this version

Extract the repository, open a terminal in its folder, and run:

```sh
python -m http.server 8000
```

Open **http://localhost:8000**. Use `python3` instead of `python` where required.

[Published app](https://generalgroovy.github.io/circuitbend/) — serves `main`; an unmerged branch is available only from its source download.

## Keep your work

**Save project** is the portable backup. Browser experiment slots are local to this browser. Imported files are **not embedded**: reopen the same media before loading its project. Undo does not restore source-file changes. Bake a still to preserve the appearance of temporal feedback.

[Field guide](docs/GUIDE.md) · [Development & limits](docs/DEVELOPMENT.md) · [Documentation index](docs/README.md)
