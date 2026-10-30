// Balance probe: realms alive, wars, uprising share after N years over a few seeds. `npx tsx scripts/bench-culture.ts [years] [seeds]`
import { generateUniverse } from '../src/lib/gen/universe';
import { Cosmos } from '../src/lib/sim/cosmos';

const years = Number(process.argv[2] ?? 300);
const seeds = Number(process.argv[3] ?? 4);
const from = Number(process.argv[4] ?? 1); // first seed number, to split a run across processes
let A = 0, W = 0, U = 0, E = 0;
for (let k = from; k < from + seeds; k++) {
	const u = generateUniverse({ seed: 'bench-' + k, template: 'continents', cells: 6000, states: 14, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 2, sky: true, sea: true, ...(process.env.MOTIVES === '0' ? { motives: false } : {}) }, 1);
	const cos = new Cosmos(u);
	for (let m = 0; m < years * 12; m++) cos.tick();
	const s = cos.sims[0];
	const alive = s.polities.filter((p) => p.alive && p.id).length;
	const up = s.allEvents.filter((e) => e.kind === 'uprising').length;
	const kinds = new Map<string, number>();
	for (const e of s.allEvents) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
	console.log(`seed ${k}: alive ${alive}, wars ${s.wars.length}, uprisings ${up}/${s.allEvents.length}, culture ${kinds.get('culture') ?? 0}`);
	A += alive; W += s.wars.length; U += up; E += s.allEvents.length;
}
console.log(`MEAN alive ${(A / seeds).toFixed(1)}, wars ${(W / seeds).toFixed(1)}, uprising share ${((100 * U) / E).toFixed(1)}% (${(U / seeds).toFixed(0)}/seed)`);
