import { latRange, windBand } from '../gen/options';
import type { Simulation } from './engine';

/**
 * The exotic planes are alive:
 * - Sky isles drift with the prevailing winds (every few years the whole plane slides one cell).
 * - The underdark grows (new caverns dug or found), collapses (cave-ins) and blooms (fungal harvests).
 * - Undersea realms ride currents: warm currents bring fish, cold upwellings bring hardship.
 */
export function yearlyLayerLife(sim: Simulation) {
	const layers = sim.w.layers;
	for (let li = 1; li < layers.length; li++) {
		const L = layers[li];
		if (L.kind === 'sky' && sim.year % 3 === 0) driftSky(sim, li);
		else if (L.kind === 'deep') underdark(sim, li);
		else if (L.kind === 'sea') currents(sim, li);
	}
}

/** slide every open sky cell one step downwind; settlements ride along */
function driftSky(sim: Simulation, li: number) {
	const c = sim.w.cells;
	const L = sim.w.layers[li];
	const { top, span } = latRange(sim.w.opts.climate);
	const H = sim.w.opts.height;
	const target = new Int32Array(c.n).fill(-1);
	let moved = 0;
	for (let i = 0; i < c.n; i++) {
		if (!L.open[i]) continue;
		const band = windBand(top - (c.y[i] / H) * span);
		const a = (sim.w.opts.climate.winds[band] * Math.PI) / 180;
		// winds swing back every few decades, so isles wander rather than pile up at one map edge
		const swing = Math.sin(sim.year / 37) >= 0 ? 1 : -1;
		const dx = Math.sin(a) * swing, dy = -Math.cos(a) * swing;
		let best = i, bd = 0;
		for (let k = c.nStart[i]; k < c.nStart[i + 1]; k++) {
			const j = c.nList[k];
			const d = (c.x[j] - c.x[i]) * dx + (c.y[j] - c.y[i]) * dy;
			if (d > bd) { bd = d; best = j; }
		}
		target[i] = best;
		moved++;
	}
	if (!moved) return;
	const open = new Uint8Array(c.n);
	const state = new Uint16Array(c.n);
	for (let i = 0; i < c.n; i++) if (target[i] >= 0) { open[target[i]] = 1; state[target[i]] = L.state[i]; }
	// close pinholes left by the shear so islands stay solid
	for (let i = 0; i < c.n; i++) {
		if (open[i]) continue;
		let n = 0, owner = 0;
		for (let k = c.nStart[i]; k < c.nStart[i + 1]; k++) { const j = c.nList[k]; if (open[j]) { n++; owner = state[j]; } }
		if (n >= 4) { open[i] = 1; state[i] = owner; }
	}
	L.open.set(open);
	L.state.set(state);
	// settlements ride their island
	const lb = sim.lb[li];
	lb.fill(0);
	for (const b of sim.w.burgs) {
		if (!b.id || sim.burgLayer(b) !== li) continue;
		const t = target[b.cell];
		if (t >= 0) {
			b.cell = t;
			b.x = c.x[t];
			b.y = c.y[t];
		}
		if (b.alive) lb[b.cell] = b.id;
	}
	for (const r of sim.w.routes) {
		if (r.kind !== 'sky' && r.kind !== 'shaft') continue;
		r.cells = r.cells.map((cell, idx) => {
			const bid = idx === 0 ? r.a : idx === r.cells.length - 1 ? r.b : 0;
			return bid ? sim.w.burgs[bid].cell : cell;
		});
	}
	sim.dirty.terrain = true;
	sim.dirty.political = true;
	// occasionally note where a sky city is now hovering
	if (sim.rng.chance(0.25)) {
		const sky = sim.w.burgs.filter((b) => b.id && b.alive && sim.burgLayer(b) === li);
		if (sky.length) {
			const b = sim.rng.pick(sky);
			const below = sim.polities[c.state[b.cell]];
			const where = c.h[b.cell] < 20 ? 'the open sea' : below?.alive && below.id ? `the lands of ${below.name}` : 'unclaimed wilds';
			sim.log('misc', `Borne on the winds, ${b.name} now drifts above ${where}.`, b.cell, b.state);
		}
	}
}

function underdark(sim: Simulation, li: number) {
	const r = sim.rng;
	const c = sim.w.cells;
	const L = sim.w.layers[li];
	const realms = sim.polities.filter((p) => p.alive && p.id && p.layer === li);
	if (!realms.length || !r.chance(0.35)) return;
	const pol = r.pick(realms);
	const towns = sim.w.burgs.filter((b) => b.id && b.alive && b.state === pol.id && sim.burgLayer(b) === li);
	const town = towns.length ? r.pick(towns) : null;
	const roll = r();
	if (roll < 0.4) {
		// delve: open new caverns next to the realm's territory
		const edge: number[] = [];
		for (let i = 0; i < c.n; i++) {
			if (L.open[i] || (li === 1 && c.h[i] < 20 && r() < 0.7)) continue;
			for (let k = c.nStart[i]; k < c.nStart[i + 1]; k++) if (L.state[c.nList[k]] === pol.id) { edge.push(i); break; }
		}
		const dug = edge.sort(() => r() - 0.5).slice(0, r.int(3, 8));
		for (const i of dug) { L.open[i] = 1; L.state[i] = pol.id; }
		if (dug.length) {
			sim.dirty.terrain = true;
			sim.dirty.political = true;
			sim.log('found', `Delvers of ${pol.name} break into ${r.pick(['a vast geode cavern', 'a forgotten dwarven gallery', 'an underground lake', 'a hall of glowing crystals', 'the bones of an elder wyrm'])}${town ? ` beyond ${town.name}` : ''}; the deep realm grows.`, dug[0], pol.id);
		}
	} else if (roll < 0.65) {
		pol.treasury += 20;
		pol.stability = Math.min(100, pol.stability + 3);
		if (town) town.pop = +(town.pop * 1.08).toFixed(2);
		sim.log('culture', `A great fungal bloom carpets the caverns of ${pol.name}${town ? ` around ${town.name}` : ''}; spore-bread and lamp-moss for all.`, town?.cell, pol.id);
	} else if (roll < 0.85 && town) {
		town.pop = +Math.max(0.2, town.pop * 0.8).toFixed(2);
		pol.stability = Math.max(0, pol.stability - 5);
		sim.log('disaster', `A cave-in thunders through ${town.name}; ${pol.name} digs for survivors for weeks.`, town.cell, pol.id);
	} else {
		pol.army += 1.5;
		sim.log('monster', `Something vast stirs in the lightless depths beneath ${pol.name}; the deep wardens double their watch.`, town?.cell, pol.id);
	}
}

function currents(sim: Simulation, li: number) {
	const r = sim.rng;
	const realms = sim.polities.filter((p) => p.alive && p.id && p.layer === li);
	if (!realms.length || !r.chance(0.3)) return;
	const pol = r.pick(realms);
	const cap = sim.w.burgs[pol.capital];
	if (r() < 0.6) {
		pol.treasury += 25;
		sim.log('culture', `A warm current sweeps past ${cap?.name ?? pol.name}; shoals of silver fish and drifting pearls enrich ${pol.name}.`, cap?.cell, pol.id);
	} else {
		pol.stability = Math.max(0, pol.stability - 4);
		pol.treasury = Math.max(0, pol.treasury - 15);
		sim.log('disaster', `A cold upwelling chills the domes of ${pol.name}; kelp farms wither and the reefs bleach.`, cap?.cell, pol.id);
	}
}
