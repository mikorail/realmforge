/** probe: map name labels equal the Wanderer export names, and their compute cost. `npx tsx scripts/probe-maplayers.ts [cells] [years] [genre]` */
import { generateUniverse } from '../src/lib/gen/universe';
import { Cosmos } from '../src/lib/sim/cosmos';
import type { Genre } from '../src/lib/gen/types';
import { exportAdventureObject } from '../src/lib/adventure/export';
import { exportNames, namesGrid } from '../src/lib/adventure/names';
import { simLayerInfo } from '../src/lib/render/simlayers';

const cells = Number(process.argv[2] ?? 40000), years = Number(process.argv[3] ?? 80), genre = (process.argv[4] ?? 'steampunk') as Genre;
const u = generateUniverse({ seed: 'probe-ml', template: 'continents', cells, states: 14, width: 1600, height: 1000, genre, planet: 'terran', spheres: null, depth: 2, sky: true, sea: true }, 1);
const cos = new Cosmos(u);
for (let m = 0; m < years * 12; m++) cos.tick();
const sim = cos.sims[0];
const before = JSON.stringify(sim.dump());
let t = performance.now();
const { grid, pOfCell } = namesGrid(sim);
const live = exportNames(sim, grid, pOfCell);
const ms = performance.now() - t;
const exp = exportAdventureObject(sim).names;
const same = JSON.stringify(live) === JSON.stringify(exp);
t = performance.now();
let lines = 0;
for (let i = 0; i < sim.c.n; i += 7) lines += simLayerInfo(sim, i, 0).length;
const hov = (performance.now() - t) / Math.ceil(sim.c.n / 7);
const after = JSON.stringify(sim.dump());
console.log(`cells ${cells} y${sim.year}: names ${ms.toFixed(0)}ms (${live.features.length} features, ${live.routes.length} routes), equal to export: ${same}, hover ${(hov * 1000).toFixed(0)}µs/cell (${lines} lines), sim untouched: ${before === after}`);
const S = sim as unknown as { _railState?: { lines: unknown[] }; _hazardsState?: { faults: unknown[]; volcanoes: unknown[]; outbreaks: unknown[] } };
console.log(`rail lines ${S._railState?.lines.length ?? 0}, faults ${S._hazardsState?.faults.length ?? 0}, volcanoes ${S._hazardsState?.volcanoes.length ?? 0}, outbreaks ${S._hazardsState?.outbreaks.length ?? 0}, smog ${sim.gf.smog.length}`);
if (!same || before !== after) process.exit(1);
