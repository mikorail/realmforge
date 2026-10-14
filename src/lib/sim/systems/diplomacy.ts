/** Borders, relations and alliances, AI war declarations, war endings and peace terms. */
import type { Simulation } from '../engine';
import { WAR_NAMES } from '../content';
import { narratePeace, narrateWar } from '../chronicle';
import { transitionRegime } from '../politics';
import { vassalizeAfterWar } from '../consolidation';
import type { War } from '../types';
import { cultureMod } from '../culture';

export function computeBorders(sim: Simulation) {
	const { edges } = sim.w;
	// numeric pair keys while counting; insertion order (first sighting) is kept for `borders`
	const acc = new Map<number, number>();
	const bump = (sa: number, sb: number, n: number) => {
		if (sa === sb || !sa || !sb) return;
		const k = sa < sb ? sa * 65536 + sb : sb * 65536 + sa;
		acc.set(k, (acc.get(k) ?? 0) + n);
	};
	for (const L of sim.w.layers) {
		const st = L.state, op = L.open;
		for (let e = 0; e < edges.n; e++) {
			const a = edges.a[e], b = edges.b[e];
			if (op[a] && op[b] && st[a] !== st[b]) bump(st[a], st[b], 1);
		}
	}
	// vertical neighbours: settlements joined by shafts / docks
	for (const r of sim.w.routes) {
		if (r.kind !== 'shaft') continue;
		const A = sim.w.burgs[r.a], B = sim.w.burgs[r.b];
		if (A.alive && B.alive) bump(A.state, B.state, 4);
	}
	sim.borders.clear();
	for (const [k, n] of acc) sim.borders.set(`${Math.floor(k / 65536)}-${k % 65536}`, n);
	sim.neighborCache = null;
}

export function diplomacy(sim: Simulation) {
	const r = sim.rng;
	for (const p of sim.polities) {
		if (!p.alive) continue;
		for (const k in p.relations) p.relations[k] *= 0.94;
	}
	for (const [k, len] of sim.borders) {
		const [a, b] = k.split('-').map(Number);
		const pa = sim.polities[a], pb = sim.polities[b];
		let d = -Math.min(4, len / 15) + (r() - 0.5) * 10;
		if (pa.culture === pb.culture) d += 2;
		d += pa.religion === pb.religion ? 3 : -2;
		d += ((sim.ruler(pa)?.diplomacy ?? 5) + (sim.ruler(pb)?.diplomacy ?? 5) - 10) * 0.3;
		if (sim.ruler(pa)?.traits.includes('Ambitious')) d -= 2;
		sim.addRel(a, b, d);
	}
	// alliances
	for (const p of sim.polities) {
		if (!p.alive) continue;
		p.allies = p.allies.filter((a) => sim.polities[a].alive && sim.rel(p.id, a) > 15);
	}
	for (const [k] of sim.borders) {
		const [a, b] = k.split('-').map(Number);
		const pa = sim.polities[a], pb = sim.polities[b];
		if (sim.rel(a, b) > 55 && !pa.allies.includes(b) && !sim.atWar(a, b) && r.chance(0.3)) {
			pa.allies.push(b);
			pb.allies.push(a);
			sim.log('peace', `Envoys from ${pa.name} and ${pb.name} exchange solemn vows of mutual defense, binding their courts in a grand alliance.`, sim.w.burgs[pa.capital].cell, a);
		}
	}
}

export function aiWars(sim: Simulation) {
	const r = sim.rng;
	for (const p of sim.polities) {
		if (!p.alive || p.id === sim.playerState()) continue;
		if (sim.warsOf(p.id).length >= 1 || p.stability < 30 || p.overlord) continue;
		const ruler = sim.ruler(p);
		const aggression = 0.12 + (ruler?.traits.includes('Ambitious') ? 0.12 : 0) + (ruler?.traits.includes('Cruel') ? 0.05 : 0) - (ruler?.traits.includes('Content') ? 0.08 : 0);
		if (!r.chance(aggression * cultureMod(sim, p, 'aggression'))) continue;
		const targets = sim.neighborsOf(p.id).filter((t) => {
			const tp = sim.polities[t];
			if (!tp.alive || p.allies.includes(t) || sim.atWar(p.id, t) || tp.overlord === p.id || (tp.overlord && tp.overlord === p.overlord)) return false;
			return sim.rel(p.id, t) < -20 && sim.strength([p.id]) > sim.strength([t, ...tp.allies.filter((x) => sim.neighborsOf(t).length)]) * 1.15;
		});
		if (!targets.length) continue;
		targets.sort((a, b) => sim.rel(p.id, a) - sim.rel(p.id, b));
		sim.declareWar(p.id, targets[0]);
	}
}

export function declareWar(sim: Simulation, a: number, b: number, reason?: string) {
	const pa = sim.polities[a], pb = sim.polities[b];
	const attackers = [a];
	const defenders = [b, ...pb.allies.filter((x) => sim.polities[x].alive && x !== a && !sim.atWar(x, b))];
	// a suzerain defends its vassals
	if (pb.overlord && pb.overlord !== a && sim.polities[pb.overlord]?.alive && !defenders.includes(pb.overlord)) defenders.push(pb.overlord);
	// attacker's allies may join
	for (const al of pa.allies) if (sim.polities[al].alive && !defenders.includes(al) && sim.rng.chance(0.5)) attackers.push(al);
	const tpl = sim.rng.pick(WAR_NAMES);
	const name = tpl.replace('{a}', pa.name).replace('{b}', pb.name).replace('{c}', sim.rng.pick([pa.name, pb.name]));
	const w: War = { id: sim.nextWar++, name, attackers, defenders, start: sim.year, score: 0, months: 0, startArmy: [sim.strength(attackers), sim.strength(defenders)] };
	sim.wars.push(w);
	pa.allies = pa.allies.filter((x) => x !== b);
	pb.allies = pb.allies.filter((x) => x !== a);
	sim.addRel(a, b, -40);
	const joined = defenders.length > 1 ? `Pledging mutual defense, the levies of ${defenders.slice(1).map((d) => sim.polities[d].name).join(', ')} rally to ${pb.name}'s side.` : undefined;
	const warText = narrateWar(sim.rng, pa.fullName, pb.fullName, name, reason, joined);
	w.ev = sim.log('war', warText, sim.w.burgs[pb.capital].cell, a).id;
	return w;
}

export function endWars(sim: Simulation) {
	for (const w of sim.wars) {
		if (w.end) continue;
		const years = sim.year - w.start;
		const sa = sim.strength(w.attackers), sd = sim.strength(w.defenders);
		const aExh = sa / Math.max(1, w.startArmy[0]), dExh = sd / Math.max(1, w.startArmy[1]);
		let chance = 0.08 + years * 0.06;
		if (aExh < 0.35 || dExh < 0.35) chance += 0.4;
		if (w.attackers.includes(sim.playerState()) || w.defenders.includes(sim.playerState())) chance *= 0.3; // the player sues for peace themselves
		// proud cultures hold out, insular ones tire early: mean over the belligerents
		const sides = [...w.attackers, ...w.defenders];
		chance *= sides.reduce((s, id) => s + cultureMod(sim, sim.polities[id], 'peace'), 0) / Math.max(1, sides.length);
		if (!sim.rng.chance(chance)) continue;
		sim.finishWar(w, w.score > 8 ? 'attackers' : w.score < -4 ? 'defenders' : 'white');
	}
}

export function finishWar(sim: Simulation, w: War, winner: War['winner']) {
	w.end = sim.year;
	w.winner = winner;
	const a = w.attackers.map((x) => sim.polities[x].name).join(' & ') || 'the attackers';
	const d = w.defenders.map((x) => sim.polities[x].name).join(' & ') || 'the defenders';
	const winnerText = winner === 'attackers' ? a : winner === 'defenders' ? d : '';
	const peaceText = narratePeace(sim.rng, w.name, sim.year - w.start, winner ?? 'white', winnerText);
	sim.log('peace', peaceText, undefined, undefined, 'peace', w.ev);
	const win = winner === 'attackers' ? w.attackers : winner === 'defenders' ? w.defenders : [];
	const lose = winner === 'attackers' ? w.defenders : winner === 'defenders' ? w.attackers : [];
	for (const x of win) { sim.polities[x].stability += 8; sim.polities[x].treasury += 15; }
	for (const x of lose) { sim.polities[x].stability -= 10; sim.polities[x].treasury -= 10; }
	for (const x of w.attackers) for (const y of w.defenders) sim.addRel(x, y, 25);
	vassalizeAfterWar(sim, w, winner);

	// Post-war Enforced Regime Change:
	// Decisive victory (|score| >= 10) with opposing ideologies can impose a sister system
	if (Math.abs(w.score) >= 10 && win.length > 0 && lose.length > 0) {
		const victor = sim.polities[win[0]];
		const defeated = sim.polities[lose[0]];
		if (victor?.alive && defeated?.alive && victor.ideology && defeated.ideology && victor.ideology !== defeated.ideology) {
			if (sim.rng.chance(0.35)) {
				const transRes = transitionRegime(defeated, victor.ideology, 'conquest', sim.year, sim.rng, sim.people, { victorName: victor.name });
				for (const ev of transRes.events) {
					sim.log(ev.kind, ev.text, ev.cell, ev.state, 'regime', w.ev);
				}
				sim.addRel(victor.id, defeated.id, 50);
				sim.dirty.political = true;
			}
		}
	}
}
