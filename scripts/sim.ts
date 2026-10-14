import { generateUniverse } from '../src/lib/gen/universe';
import { Cosmos } from '../src/lib/sim/cosmos';
import type { Genre } from '../src/lib/gen/types';

const years = Number(process.argv[2] ?? 200);
const genre = (process.argv[3] ?? 'fantasy') as Genre;
const planets = Number(process.argv[4] ?? 2);
const t0 = performance.now();
const u = generateUniverse({ seed: 'sim-test', template: 'continents', cells: 6000, states: 14, width: 1600, height: 1000, genre, planet: 'terran', spheres: null, depth: 2, sky: true, sea: true }, planets);
const t1 = performance.now();
const cos = new Cosmos(u);
for (let m = 0; m < years * 12; m++) cos.tick();
const t2 = performance.now();
console.log(`gen ${(t1 - t0).toFixed(0)}ms, sim ${years}y ${(t2 - t1).toFixed(0)}ms`);
for (const s of cos.sims) {
	const alive = s.polities.filter((p) => p.alive);
	const kinds = new Map<string, number>();
	for (const e of s.events) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
	console.log(`\n${s.w.name} (${s.w.opts.planet}) : year ${s.year}: ${alive.length}/${s.polities.length - 1} realms alive, wars ${s.wars.length} (${s.wars.filter((w) => !w.end).length} active), people ${s.people.filter((p) => p.alive).length}`);
	console.log('  events', [...kinds].map(([k, v]) => `${k}:${v}`).join(' '));
	console.log('  top', alive.sort((a, b) => b.cells - a.cells).slice(0, 6).map((p) => `${p.fullName}[L${p.layer}] ${p.cells}c army${p.army.toFixed(1)} stab${p.stability.toFixed(0)}`).join(' | '));
	for (const e of s.events.slice(-8)) console.log(`  y${e.y} ${e.kind}: ${e.text}`);
}
