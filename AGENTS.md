# AGENTS

## Project
- We are building a website for people to explore scales of Greek folk music.
- Scales are built from four-note tetrachords (τετράχορδα) and five-note pentachords (πεντάχορδα).
- For now, combinations are temporary and use 12-TET notes (no microtones).

## Tech Stack
- Keep it boring: plain HTML, CSS, and JavaScript.
- Use Bun for the dev server, tooling, and package management.

## Libraries
- Staff rendering: VexFlow (JavaScript, npm package `vexflow`).

## Workflow
- Keep changes small and focused.
- Make atomic commits (one logical change per commit).
- Use Bun for JavaScript package management tasks (for example, `bun install`).
- Run `script/verify` after changes.
- For browser builds, Bun recommends bundling via `bun build` (with `--watch` for dev) and serving the output.
