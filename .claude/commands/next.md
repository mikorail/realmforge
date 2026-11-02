---
description: Pick up the remaining Realmforge work (perf, dieselpunk balance, cleanup, merge) on this machine
argument-hint: perf | balance | cleanup | merge
---

You are working locally in the Realmforge repo (SvelteKit + TS world generator and simulator; the Wanderer roguelike is the sibling repo `../realmforge-wanderer`). Read `CLAUDE.md` and `ROADMAP.md` first.

Task: **$ARGUMENTS**. If that is empty, list the options below with one line each and ask which one to do.

## Setup (local machine)
- Start from the latest development branch: `git fetch origin && git switch -c <task>-local origin/claude/dreamy-cerf-kcp93i` (it has the map layers and smoke test on top of `main`; if that branch is gone, use `origin/main`).
- System node may be too old: every npm script goes through `scripts/run-with-nvm.sh` (nvm v24).
- The vitest suite was removed on purpose; do not restore it. Checks: `npm run check` (0 errors), `npm run selftest`, `npm run build`, `npm run smoke`.
- Simulation code uses side rngs (`makeRng(seed + ':...')`), never `sim.rng`, for anything new; new sim state goes into `dump()`/`restore()` (the selftest round trip catches anything missing).
- Commit after each finished piece.

## Options
### perf
Big-map performance with byte-identical output. A 200k-cell world takes 19-23 s to generate; about two thirds is `generateRoutes` in `src/lib/gen/society.ts` (O(burgs²) nearest-burg scan plus `landPath` A* that allocates two full-map arrays per pair), layers about 4 s. The sim at 200k is about 50 ms/month, hot spots `buildRealmRoads` in `src/lib/sim/roads.ts` (again `landPath`), `recount`, `computeBorders`. Profile with `node --cpu-prof`, then use a spatial grid for nearest-burg pairing that keeps the same pair order, reusable typed-array scratch buffers with generation counters for `landPath` (keep the float types), early exits. Prove identity by hashing `npx tsx scripts/gen.ts` output and full world exports (`npx tsx scripts/adventure-world.ts`) for several seeds and templates at 6k/40k/100k cells before and after, plus `npm run selftest` and a 300-year chronicle hash. Report timings at 10k/40k/100k/200k.

### balance
Dieselpunk soft spot: with genre forces on, a 4-seed probe showed about 16% fewer wars (war economy force in `src/lib/sim/genre/forces.ts`). Run 10 seeds as 5 parallel 2-seed runs: `GENRE=dieselpunk GF=0 npx tsx scripts/bench-culture.ts 300 2 <from>` vs `GF=1` (from = 1,3,5,7,9). If outside ±15%, tune the war-economy force modestly and re-run; confirm default fantasy stays within ±15% of a baseline run on the starting commit.

### cleanup
`package.json` still has the old `e2e` script and the `@playwright/test` dependency from the removed e2e suite; `scripts/smoke.mjs` uses the preinstalled `playwright` package. Remove the leftovers if nothing else uses them, keep `npm run smoke` working.

### merge
Merge the finished development branch into `main`: check `git log origin/main..origin/claude/dreamy-cerf-kcp93i`, run all checks above, then open a PR to `main` (or merge locally if the owner prefers) and push.

When done, update `CLAUDE.md` and `ROADMAP.md`, and summarise what changed and what the checks showed.
