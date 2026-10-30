# Ready-made agent prompts

Paste one into a fresh agent that has its own worktree. Both are independent of each other and touch different files. Start each with: "Read AGENTS.md and CLAUDE.md first."

## 1. Sphere building styles and sphere quests (mid-tier model)
Task: ROADMAP "More sphere content".
- Per-sphere architecture styles for the 22 culture spheres in `src/lib/gen/spheres.ts`: a short style tag (e.g. pagoda roofs, mud-brick domes, stepped pyramids, stone enclosures, longhouses) used for settlement icons on the map (`src/lib/render/renderer.ts`, burg drawing) and shown on the culture card.
- Sphere-specific quests in a new file `src/lib/sim/culture/spherequests.ts`, hooked into `src/lib/sim/quests.ts` through one small call: at least 2 quests per sphere with their own targets and rewards (e.g. Sinic: recover a lost seal from a flooded canal city; Nahuan: win a flower-war duel; Andean: repair a mountain bridge before the festival).
- Respectful, generated content inspired by real traditions; no sacred figures of living faiths.
Rules: determinism (use `sim.rng`), tests in a new test file, `npm test` + `npm run check` green, tick the ROADMAP box, short CLAUDE.md bullet, commits ending with the required Co-Authored-By trailer. Final report: branch, commits, sample quest lines, risks.
