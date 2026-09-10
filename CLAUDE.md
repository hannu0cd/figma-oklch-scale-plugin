# CLAUDE.md

## Project
A standalone Figma plugin that creates and manages OKLCH-based 19-step color palettes on the Figma canvas, backed by Figma color variables.

## Key docs (local only, not committed)
- @docs/superpowers/specs/2026-05-11-figma-color-palette-plugin-design.md — approved design spec
- @docs/superpowers/plans/2026-05-11-figma-color-palette-plugin.md — implementation plan (start here)

## Commands
```bash
npm install       # install deps
node esbuild.config.js   # production build → dist/
node esbuild.config.js --watch  # watch mode
npm test          # run Vitest tests
```

## Loading in Figma
Plugins → Development → Import plugin from manifest → select `manifest.json`

## Tech stack
- TypeScript + esbuild
- culori (OKLCH math)
- Vitest (unit tests for color.ts)
- Figma Plugin API (two-thread: main + UI)
