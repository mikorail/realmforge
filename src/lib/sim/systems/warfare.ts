/** Monthly war fronts (cell-by-cell on every layer + shaft raids), conquest, capital relocation, realm falls, army tokens. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { narrateFall, narrateRelicLoot, narrateSiege } from '../chronicle';
import { destroyWonder } from '../wonders';
import type { ArmyToken, Polity, War } from '../types';

export function monthlyWars(sim: Simulation) {
	const c = sim.c;
	const r = sim.rng;
	let changed = false;
	// every edge where ownership differs, on every layer, frozen for the month (shared by all wars)
	if (!sim.wars.some((w) => !w.end)) return;
	const fronts = sim.fronts, E = sim.w.edges, nE = E.n;
	fronts.sync(sim.w);
	let resync = false;
	for (const w of sim.wars) {
		if (w.end) continue;
		w.attackers = w.attackers.filter((id) => sim.polities[id].alive);
		w.defenders = w.defenders.filter((id) => sim.polities[id].alive);
		if (!w.attackers.length || !w.defenders.length) {
			sim.finishWar(w, w.attackers.length ? 'attackers' : 'defenders');
			resync = true; // peace terms (vassals, merges) can move cells outside takeCell
			continue;
		}
		if (resync) {
			fronts.resync(sim.w);
			resync = false;
		}
		w.months++;
		const sa = sim.strength(w.attackers), sd = sim.strength(w.defenders) * 1.1;
		const ratio = sa / Math.max(0.01, sd);
		// front cells: defender cells adjacent to attacker cells (and vice versa)
		const att = new Set(w.attackers), def = new Set(w.defenders);
		// [cell, taker, layer]
		const frontD: [number, number, number][] = [], frontA: [number, number, number][] = [];
		for (const g of fronts.gather(att, def)) {
			const li = Math.floor(g / nE), e = g - li * nE;
			const a = E.a[e], b = E.b[e];
			const st = sim.w.layers[li].state;
			const sa2 = st[a], sb2 = st[b];
			if (att.has(sa2) && def.has(sb2)) { frontD.push([b, sa2, li]); frontA.push([a, sb2, li]); }
			else if (def.has(sa2) && att.has(sb2)) { frontD.push([a, sb2, li]); frontA.push([b, sa2, li]); }
		}
		// raids down shafts / up to sky-docks open new fronts in other layers
		if (r.chance(frontD.length ? 0.04 : 0.15)) {
			const opts2: [number, number][] = [];
			for (const rt of sim.w.routes) {
				if (rt.kind !== 'shaft') continue;
				const A = sim.w.burgs[rt.a], B = sim.w.burgs[rt.b];
				if (!A.alive || !B.alive) continue;
				if (att.has(A.state) && def.has(B.state)) opts2.push([B.id, A.state]);
				else if (att.has(B.state) && def.has(A.state)) opts2.push([A.id, B.state]);
			}
			if (opts2.length && r.chance(clamp(ratio * 0.5, 0.1, 0.9))) {
				const [bid, taker] = r.pick(opts2);
				const b = sim.w.burgs[bid];
				sim.takeCell(b.cell, taker, w, sim.burgLayer(b));
				changed = true;
			}
		}
		if (!frontD.length) {
			// no shared border (e.g. across the sea): slowly exhausts
			if (w.months > 30) {
				sim.finishWar(w, 'white');
				resync = true;
			}
			if (changed) sim.dirty.political = true;
			continue;
		}
		const pushes = Math.max(1, Math.round(frontD.length * 0.04 * Math.min(3, ratio)));
		const counters = Math.max(0, Math.round(frontA.length * 0.04 * Math.min(3, 1 / ratio)) - 1);
		const flip = (list: [number, number, number][], n: number, adv: number, sign: number) => {
			for (let k = 0; k < n && list.length; k++) {
				const idx = r.int(0, list.length - 1);
				const [cell, taker, li] = list[idx];
				list[idx] = list[list.length - 1];
				list.pop();
				const cur = sim.st(li)[cell];
				if (!att.has(cur) && !def.has(cur)) continue;
				let defense = 1 + (li === 0 && c.h[cell] > 55 ? 0.8 : 0) + (li === 0 && c.river[cell] ? 0.3 : 0) + (li > 0 ? 0.4 : 0);
				const burg = sim.lb[li][cell];
				if (burg) defense += sim.w.burgs[burg].capital ? 2.5 : 1.2;
				if (!r.chance(clamp((0.35 * adv) / defense, 0.02, 0.9))) continue;
				sim.takeCell(cell, taker, w, li);
				w.score += sign * (burg ? 5 : 1);
				changed = true;
			}
		};
		flip(frontD, pushes, ratio, 1);
		flip(frontA, counters, 1 / ratio, -1);
		// attrition
		const loss = 0.015 + frontD.length / 4000;
		for (const id of w.attackers) sim.polities[id].army *= 1 - loss * clamp(1 / ratio, 0.4, 2);
		for (const id of w.defenders) sim.polities[id].army *= 1 - loss * clamp(ratio, 0.4, 2);
	}
	if (changed) {
		sim.dirty.political = true;
		sim.recount();
		for (const p of sim.polities) if (p.alive && p.cells === 0) sim.fall(p);
	}
}

export function takeCell(sim: Simulation, cell: number, taker: number, war?: War, layer = 0) {
	const c = sim.c;
	const st = sim.st(layer);
	const old = st[cell];
	st[cell] = taker;
	sim.fronts.rekey(sim.w, cell, layer);
	if (layer === 0) c.pop[cell] *= 0.93;
	const bid = sim.lb[layer][cell];
	if (!bid) return;
	const b = sim.w.burgs[bid];
	b.state = taker;
	sim.idx.touch();
	b.pop = +(b.pop * 0.85).toFixed(2);
	const loser = sim.polities[old];
	const winner = sim.polities[taker];
	const winnerName = winner?.name ?? 'An invading vanguard';
	const loserName = loser?.name ?? 'the frontier';
	if (loser && loser.capital === bid) {
		const siegeText = narrateSiege(sim.rng, winnerName, loserName, b.name, true);
		sim.log('capture', siegeText, cell, taker, 'capital');
		loser.stability -= 20;
		loser.treasury *= 0.6;
		if (winner) winner.treasury += 20;
		for (const art of sim.artifacts) {
			if (art.holderId === loser.id && art.holderType === 'polity') {
				art.holderId = winner?.id ?? 0;
				art.holderName = winnerName;
				const lootText = narrateRelicLoot(sim.rng, winnerName, loserName, art.name);
				sim.log('capture', lootText, cell, taker);
			}
		}
		sim.relocateCapital(loser);
		if (war) war.score += 10 * (war.attackers.includes(taker) ? 1 : -1);
	} else if (b.pop > 3 || sim.rng.chance(0.3)) {
		const capText = narrateSiege(sim.rng, winnerName, loserName, b.name, false);
		sim.log('capture', capText, cell, taker);
	}
	// people in the burg change allegiance
	for (const p of sim.idx.inState(sim.people, old)) if (p.alive && p.burg === bid && p.role !== 'ruler' && p.state === old && p.role !== 'heir') p.state = taker;
	sim.idx.touch();

	// Check for wonders at the captured settlement
	const wonder = sim.wonders.find((w) => w.cell === cell && !w.destroyed);
	if (wonder) {
		const isCapital = Boolean(loser && loser.capital === bid);
		const shouldDestroy = isCapital ? sim.rng.chance(0.55) : sim.rng.chance(0.35);
		if (shouldDestroy) {
			const res = destroyWonder(wonder, winnerName, sim.year, 'sacked and razed during siege conquest');
			sim.log('wonder', res.event.text, cell, taker);
		} else {
			wonder.stateId = taker;
			sim.log('wonder', `WONDER CLAIMED: The armies of ${winnerName} conquer ${wonder.name} (${wonder.icon}) in ${b.name}, placing it under imperial protection!`, cell, taker);
		}
	}
}

export function relocateCapital(sim: Simulation, p: Polity) {
	const mine = sim.idx.burgsIn(sim.w.burgs, p.id);
	const own = mine.filter((b) => b.id && b.alive && b.state === p.id).sort((a, b) => b.pop - a.pop);
	if (!own.length) return false;
	p.capital = own[0].id;
	for (const b of mine) if (b.state === p.id) b.capital = false;
	own[0].capital = true;
	const ruler = sim.ruler(p);
	if (ruler) ruler.burg = own[0].id;
	return true;
}

export function fall(sim: Simulation, p: Polity) {
	p.alive = false;
	p.fell = sim.year;
	p.allies = [];
	const r = sim.ruler(p);
	const fallText = narrateFall(sim.rng, p.fullName, r?.name, r?.house);
	sim.log('fall', fallText, sim.w.burgs[p.capital]?.cell, p.id);
	for (const x of sim.idx.inState(sim.people, p.id)) if (x.alive && x.state === p.id) {
		x.state = 0;
		if (x.role === 'ruler' || x.role === 'heir' || x.role === 'general') x.role = 'wanderer';
	}
	for (const b of sim.idx.burgsIn(sim.w.burgs, p.id)) if (b.state === p.id) b.state = 0;
	sim.idx.touch();
	for (const w of sim.wars) if (!w.end) {
		w.attackers = w.attackers.filter((x) => x !== p.id);
		w.defenders = w.defenders.filter((x) => x !== p.id);
	}
	sim.dirty.political = true;
}

export function updateArmyTokens(sim: Simulation) {
	const activeWars = sim.wars.filter((w) => !w.end);
	const tokens: ArmyToken[] = [];
	let tid = 1;
	for (const w of activeWars) {
		for (const attId of w.attackers.slice(0, 2)) {
			const pol = sim.polities[attId];
			if (!pol?.alive) continue;
			const defId = w.defenders[0];
			const defPol = sim.polities[defId];
			const capA = sim.w.burgs[pol.capital];
			const capB = defPol ? sim.w.burgs[defPol.capital] : null;
			if (capA && capB) {
				const t = 0.2 + (Math.sin(w.months * 0.4 + attId) * 0.5 + 0.5) * 0.6;
				tokens.push({
					id: tid++,
					warId: w.id,
					polityId: pol.id,
					name: `${pol.name} Vanguard`,
					size: Math.max(1, Math.round(pol.army * 0.4)),
					x: capA.x * (1 - t) + capB.x * t,
					y: capA.y * (1 - t) + capB.y * t,
					targetX: capB.x,
					targetY: capB.y,
					color: pol.color
				});
			}
		}
	}
	sim.armyTokens = tokens;
}
