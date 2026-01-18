# AGENTS

## Project
- We are building a website for people to explore scales of Greek folk music.
- Scales are built from four-note tetrachords (τετράχορδα) and five-note pentachords (πεντάχορδα).
- For now, combinations are temporary and use 12-TET notes (no microtones).

## Tech Stack
- Keep it boring: plain HTML, CSS, and JavaScript.
- Use Ruby for the local server and tooling.
- Use Bun for JavaScript package management.

## Libraries
- Staff rendering: VexFlow (JavaScript, npm package `vexflow`).

## Workflow
- Keep changes small and focused.
- Make atomic commits (one logical change per commit).
- Use Bun for JavaScript package management tasks (for example, `bun install`).
- Run `script/verify` and confirm the tests page passes after changes.
