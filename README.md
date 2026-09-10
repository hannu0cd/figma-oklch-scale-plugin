# Figma OKLCH Scale Plugin

A Figma plugin that builds OKLCH-based 19-step color palettes on the canvas and keeps them in sync with Figma color variables.

Pick a base color, and the plugin generates tones from 50 (near white) to 950 (near black), creates a color variable for each tone, and binds the swatches on the canvas to those variables. Edit the base swatch or rename the color, and the variables follow.

## How it works

1. **New Palette** creates a `COLOR PALETTE` frame with a header row and a `Color Palette` variable collection.
2. **New Color** adds a row: an editable name, a base swatch, and 19 tone swatches. It also creates 19 `COLOR` variables named `{name}/50` … `{name}/950` and binds each tone swatch's fill to its variable.
3. **Editing the base swatch** in Figma's color picker recalculates the palette and writes the new values into the variables. The tone swatches update through their bindings.
4. **Editing the name text** renames all 19 variables to match.
5. **Update All** reprocesses every row unconditionally. Use it after editing with the plugin closed.

Canvas edits are picked up by a `documentchange` listener and debounced by 300 ms, so a color picker drag triggers one recalculation instead of hundreds.

### Palette math

The base color is converted to OKLCH with [culori](https://culorijs.org/). The light half of the scale interpolates from `oklch(0.98 0 h)` to the base, and the dark half from the base to `oklch(0.10 0 h)`, where `h` is the base hue. Step 500 is always the base color exactly. Out-of-gamut results are clamped to sRGB.

### Canvas structure

```
COLOR PALETTE            vertical auto-layout
├── header               Name | Base | 50 100 … 950
└── color row            one per color
    ├── name text        editable
    ├── base swatch      60×60, plain fill (the input)
    └── tones            19 × 60×60, each fill bound to a variable
```

Nodes are identified by `pluginData` tags, not by name, so renaming layers does not break the plugin. Each row stores its variable IDs in `pluginData` too, so variable lookups never depend on names.

## Development

```bash
npm install
npm run build      # production build → dist/
npm run watch      # rebuild plugin.js on change (ui.html is built once)
npm test           # Vitest unit tests for the palette math
```

### Loading in Figma

1. Run `npm run build`.
2. In Figma desktop: **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` in this directory.

## Project layout

| Path | Purpose |
|---|---|
| `src/color.ts` | Pure OKLCH palette generation, no Figma dependency |
| `src/color.test.ts` | Unit tests for `color.ts` |
| `src/plugin.ts` | Main thread: canvas nodes, variables, change listener |
| `src/ui.ts`, `src/ui.html` | Plugin window with the three action buttons |
| `esbuild.config.js` | Bundles the main thread and inlines the UI script into `dist/ui.html` |
| `docs/superpowers/` | Design spec and implementation plan |

## Tech stack

TypeScript, esbuild, culori, Vitest, Figma Plugin API.

## Out of scope

Multiple palettes per page, per-step manual overrides, CSS/JSON export, and light/dark variable modes.
