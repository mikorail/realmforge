import type { Simulation } from './engine';
import type { Polity, War } from './types';

/**
 * Counterweights to fragmentation: vassalage after lopsided wars, tribute,
 * peaceful absorption of tiny realms, dynastic unions, and vassals growing into
 * full annexation (or breaking free). Without these, rebellions and uprisings only ever split realms.
 */

/** move every cell, town and subject of `small` into `big` on all layers */
export function mergeInto(sim: Simulation, small: Polity, big: Polity) {
	for (const L of sim.w.layers) {
		const st = L.state;
		for (let i = 0; i < st.length; i++) if (st[i] === small.id) st[i] = big.id;
	}
	for (const b of sim.w.burgs) if (b.id && b.state === small.id) {
		b.state = big.id;
		b.capital = b.id === big.capital;
	}
	sim.idx.touch();
	for (const p of sim.idx.inState(sim.people, small.id)) if (p.alive && p.state === small.id) {
		p.state = big.id;
		if (p.role === 'ruler' || p.role === 'heir') p.role = 'general';
	}
	sim.idx.touch();
	for (const w of sim.wars) if (!w.end) {
		w.attackers = w.attackers.filter((x) => x !== small.id);
		w.defenders = w.defenders.filter((x) => x !== small.id);
	}
	for (const p of sim.polities) {
		p.allies = p.allies.filter((a) => a !== small.id);
		if (p.overlord === small.id) p.overlord = big.id;
	}
	big.treasury += Math.max(0, small.treasury);
	big.army += small.army * 0.7;
	small.alive = false;
	small.fell = sim.year;
	small.mergedInto = big.id;
	small.overlord = undefined;
	sim.dirty.political = true;
	sim.recount();
}

/** called from finishWar: a crushing victory over a much weaker foe makes it a vassal instead of a new grudge */
export function vassalizeAfterWar(sim: Simulation, w: War, winner: War['winner']) {
	if (winner !== 'attackers' && winner !== 'defenders') return;
	const win = sim.polities[(winner === 'attackers' ? w.attackers : w.defenders)[0]];
	const lose = winner === 'attackers' ? w.defenders : w.attackers;
	if (!win?.alive || win.overlord) return;
	for (const id of lose) {
		const l = sim.polities[id];
		if (!l?.alive || l.overlord || l.id === sim.playerState()) continue;
		if (Math.abs(w.score) < 6 || l.cells * 2.5 > win.cells) continue;
		if (!sim.rng.chance(0.55)) continue;
		l.overlord = win.id;
		l.vassalSince = sim.year;
		l.allies = [];
		sim.log('peace', `Humbled, ${l.fullName} bends the knee and becomes a vassal of ${win.name}, paying yearly tribute.`, sim.w.burgs[l.capital]?.cell, l.id, 'vassal', w.ev);
	}
}

export function yearlyConsolidation(sim: Simulation) {
	const r = sim.rng;
	const alive = sim.polities.filter((p) => p.alive && p.id);
	const player = sim.playerState();

	for (const v of alive) {
		if (!v.alive || !v.overlord) continue;
		const lord = sim.polities[v.overlord];
		if (!lord?.alive) { v.overlord = undefined; continue; }
		// tribute
		const t = Math.max(0, v.treasury * 0.08 + v.pop * 0.004);
		v.treasury -= t;
		lord.treasury += t;
		v.stability = Math.max(0, v.stability - 0.5);
		sim.addRel(v.id, lord.id, 1);
		const years = sim.year - (v.vassalSince ?? sim.year);
		// break free when the lord is weak or distracted
		if (v.id !== player && sim.strength([v.id]) > sim.strength([lord.id]) * 0.8 && r.chance(0.2)) {
			v.overlord = undefined;
			sim.log('rebel', `${v.name} throws off the yoke of ${lord.name} and declares its independence.`, sim.w.burgs[v.capital]?.cell, v.id);
			if (lord.id !== player && r.chance(0.6)) sim.declareWar(lord.id, v.id, 'to restore its suzerainty');
			continue;
		}
		// long, loyal vassalage ends in annexation
		if (years > 25 && v.id !== player && sim.rel(v.id, lord.id) > 30 && r.chance(0.1)) {
			sim.log('found', `After ${years} years of vassalage, ${v.fullName} is formally annexed by ${lord.name}.`, sim.w.burgs[v.capital]?.cell, lord.id);
			mergeInto(sim, v, lord);
		}
	}

	const live = () => sim.polities.filter((p) => p.alive && p.id);
	// peaceful absorption of micro-realms into a strong, friendly neighbour
	for (const p of live()) {
		if (!p.alive || p.cells >= 8 || p.id === player || sim.warsOf(p.id).length) continue;
		const nbs = sim.neighborsOf(p.id).map((id) => sim.polities[id]).filter((n) => n.alive && n.id !== player && !sim.warsOf(n.id).length);
		const host = nbs
			.filter((n) => n.cells > p.cells * 4 && (n.culture === p.culture || sim.rel(n.id, p.id) > 10))
			.sort((a, b) => b.cells - a.cells)[0];
		if (!host || !r.chance(0.25)) continue;
		sim.log('found', `The tiny ${p.fullName} seeks shelter and is peacefully absorbed into ${host.name}.`, sim.w.burgs[p.capital]?.cell, host.id);
		mergeInto(sim, p, host);
	}

	// dynastic unions between close allies of one culture
	for (const a of live()) {
		if (!a.alive || a.id === player || r() > 0.04) continue;
		for (const bid of a.allies) {
			const b = sim.polities[bid];
			if (!b?.alive || b.id === player || b.culture !== a.culture || sim.rel(a.id, b.id) < 60) continue;
			const [big, small] = a.cells >= b.cells ? [a, b] : [b, a];
			if (small.cells > big.cells * 0.7) continue;
			const ra = sim.ruler(big), rb = sim.ruler(small);
			sim.log('peace', `A royal wedding joins ${ra?.name ?? 'the crown'} of ${big.name} and ${rb?.name ?? 'the house'} of ${small.name}; the two realms are united under one crown.`, sim.w.burgs[small.capital]?.cell, big.id);
			mergeInto(sim, small, big);
			break;
		}
	}
}
