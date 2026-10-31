import { generateUniverse } from '../src/lib/gen/universe';
import { Cosmos } from '../src/lib/sim/cosmos';
import { Simulation } from '../src/lib/sim/engine';
import { orderInfo } from '../src/lib/sim/society/socialorders';
const mode = process.argv[2];
if (mode === 'off') {
	const u = generateUniverse({ seed: 'bench-1', template: 'continents', cells: 6000, states: 14, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 2, sky: true, sea: true, socialOrders: false }, 1);
	const cos = new Cosmos(u);
	for (let m = 0; m < 300 * 12; m++) cos.tick();
	const s = cos.sims[0];
	console.log(`off seed 1: alive ${s.polities.filter((p) => p.alive && p.id).length}, wars ${s.wars.length}, events ${s.allEvents.length}, so ${s.so}`);
} else {
	const u = generateUniverse({ seed: 'rt', template: 'continents', cells: 4000, states: 12, width: 1600, height: 1000, genre: 'steampunk', planet: 'terran', spheres: null, depth: 1, sky: false, sea: false }, 1);
	const cos = new Cosmos(u);
	for (let m = 0; m < 60 * 12; m++) cos.tick();
	const s = cos.sims[0];
	const d: any = structuredClone(s.dump());
	const r = Simulation.restore(s.w, d);
	const a = s.polities.filter((p) => p.alive && p.id).map((p) => orderInfo(s, p)!.form).join(',');
	const b = r.polities.filter((p) => p.alive && p.id).map((p) => orderInfo(r, p)!.form).join(',');
	console.log('roundtrip equal', a === b, a.slice(0, 120));
	const old = { ...d }; delete old.so;
	const o = Simulation.restore(s.w, old);
	console.log('old save derived', Object.keys(o.so!.r).length, 'records');
	for (let k = 0; k < 24; k++) { r.tick(); o.tick(); }
	console.log('continued ok', r.year, o.year);
	const p = r.polities.find((x) => x.alive && x.id && ['slave', 'caste', 'feudal'].includes(orderInfo(r, x)!.kind));
	if (p) { r.mana = 999; const cell = r.w.burgs[p.capital].cell; console.log('cast', r.cast('emancipate', cell, p.layer), orderInfo(r, p)!.form, r.events.at(-1)!.text); }
}
