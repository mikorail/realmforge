# AGENTS.md: Realmforge

Procedural fantasy and any-punk world generator plus a living-world simulator. Inspired by Azgaar's Fantasy Map Generator and Fantasy Map Simulator. You can watch history, play god, or live as any person. Fully client-side, no backend. Deep architecture notes are in `CLAUDE.md` (module-by-module; read it before touching `src/lib/sim/`). Open work is in `ROADMAP.md`. Visual direction is in `DESIGN.md`.

## Stack
SvelteKit 3, Svelte 5 runes, TypeScript, `adapter-static` (SPA, `ssr=false`). Runtime deps: `d3-delaunay`, `simplex-noise`, `fflate`, `@fontsource/*`. Rendering is Canvas2D with cached tiles. World generation runs in a Web Worker; the simulation runs on the main thread (a worker move was tried and dropped on purpose).

## Commands
Node must be v22+ (Vite 8). The machine default may be older, so every npm script goes through `scripts/run-with-nvm.sh`. If your shell already has Node 24, plain `npm` works too.
- `npm install`
- `npm run dev` serves on http://localhost:5180 (port is strict)
- `npm test` runs vitest (about 120 tests; long sims take several seconds)
- `npm run check` runs svelte-check (must show 0 errors)
- `npm run build` writes the static site to `build/`
- `npm run e2e` runs Playwright against a production build (needs `npx playwright install chromium` once)
- `npx tsx scripts/sim.ts 300 fantasy 2` runs a headless 300-year sim on 2 planets and prints the chronicle tail
- `npx tsx scripts/gen.ts continents 8000` prints generator stats

Always run tests and `npm run check` before finishing a change.

## Layout (short)
- `src/lib/gen/`: pure TS world generation (grid, heightmap, climate, rivers, cultures, states, layers, planets, naming). No DOM.
- `src/lib/sim/`: simulation. `engine.ts` holds state and the tick; behaviour is in `systems/*.ts` as free functions taking `sim`; features live in their own files (`story/`, `culture/`, `worldrules/`, `genre/`, `consolidation.ts`, `epochs.ts`, `ambitions.ts`, and so on).
- `src/lib/render/`: map renderer and per-genre themes.
- `src/lib/components/`: Svelte UI. `setup/` holds the Setup screen sections.
- `src/lib/save.ts`: IndexedDB saves (compressed, delta format).

## Rules that will bite you
- **Determinism:** the same seed must give the same world and history. Use `sim.rng` (seeded), never `Math.random()`, inside gen and sim code. Adding RNG draws shifts later results, so a few tests can become stream-sensitive.
- **Imports:** Node subpath imports. Components use `#lib/...` (and `#lib/sim/story/index`, not the bare directory). Inside `src/lib`, use relative imports (tsx scripts need them).
- **Indexes:** any write to `person.state` or `burg.state` must call `sim.idx.touch()`.
- **Big arrays:** never `Math.max(...bigArray)`; it overflows the call stack at about 100k items in browsers. Use `maxOf()` from `src/lib/rng.ts`.
- **Svelte reactivity:** panels get a non-reactive `sim` plus a `v` counter. Every `$derived.by` must read `v`. Sections that read fields of an object whose identity does not change need `{#key v}`. Do not use `(v, x)` comma expressions; svelte-check rejects them.
- **Layers:** `layers[0].state` is the same array as `cells.state`. Exotic layers (underground, sky, sea) share the surface cell graph and have their own `open` and `state` arrays.
- **Narration:** logged text passes through `log()`, which re-skins vocabulary to the current genre voice. Genre text lives in `sim/genrepacks.ts` and `sim/genre/*`.
- **Content:** no real sacred figures of living faiths as monsters or villains. Culture content is inspired by real traditions but generated; keep it respectful.
- **Copy style:** no em dashes in UI text or logs; keep commit messages and code comments short and factual.

## Deploy
Static site: build with `npm run build`, publish `build/`. `netlify.toml` is included (Node 24, SPA fallback to `/200.html`, no-cache for the service worker). The PWA and offline mode only work over HTTPS.

## Status
Roadmap is almost complete. Open items: per-sphere building styles and quests, and optional LLM-written chronicles (bring your own key). See `ROADMAP.md`.
