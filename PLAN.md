# Plan for Robust Browser Imports

## Problem
- Directly loading `index.html` with `ruby server.rb` does not resolve bare module specifiers like `vexflow`.
- This causes the app to fail before the tetrachord dropdown loads.

## Goal
- Keep local usage and deployment to Fly.io simple and reliable.
- Avoid requiring a JavaScript bundler at runtime.

## Options
1. **Build step for production (recommended)**
   - Use `bun build index.html --outdir dist` to bundle dependencies.
   - Serve `/dist` in production (and optionally locally).
   - Keeps imports in `app.js` clean: `import VexFlow from "vexflow"`.

2. **Import map for runtime resolution**
   - Add an import map in `index.html` that points `vexflow` to `./node_modules/.../vexflow.js`.
   - Still serves from the Ruby server without bundling.
   - Requires `node_modules` to be present in production (not ideal for Fly.io).

3. **Keep relative import to node_modules**
   - Current quick fix: `./node_modules/vexflow/build/esm/entry/vexflow.js`.
   - Works locally but is fragile and not deployable unless node_modules is shipped.

## Proposed Direction
- Use option 1 with a small build step before deploy.
- Fly.io deploy runs `bun install` and `bun run build`, then serves `dist`.
- Keep the dev flow simple: `ruby server.rb` serves `dist` first if it exists.

## Next Steps
- Add a Fly.io deploy script or build step that runs `bun install` and `bun run build`.
- Verify the tests page still passes after the build (`script/verify`).
