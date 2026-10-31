/**
 * Culture that plays differently (ROADMAP P4): behavioural traits (`cultureMod`), feast days, lingua franca,
 * slow conquest assimilation, art movements and religious orders. Hooks are called from engine.ts.
 */
import type { Simulation } from '../engine';
import { FEAST_TEXT } from './data';
import { cultureMod, realmFeasts } from './profile';
import { yearlyMovements } from './orders';
import { prestigeMult } from '../society/prestige';

export { cultureMod, cultureProfile, monthName, realmFeasts, calendarCulture, TRAITS, type TraitKey, type ModKey } from './profile';
export { newCultureState, type CultureState } from './state';

/** monthly: each realm's feast days fire a small culture event (always logged for the player's realm, otherwise about once in eighty years per feast) */
export function monthlyFeasts(sim: Simulation) {
	const player = sim.playerState();
	for (const pol of sim.polities) {
		if (!pol.alive || !pol.id || pol.cells <= 0) continue;
		const feasts = realmFeasts(sim.w, pol);
		for (let k = 0; k < feasts.length; k++) {
			const f = feasts[k];
			if (f.month !== sim.month) continue;
			pol.stability = Math.min(100, pol.stability + 0.3);
			if (f.kind === 'harvest' || f.kind === 'sea') pol.treasury += 1.5;
			if (f.kind === 'war') pol.army *= 1.002;
			if (f.kind === 'learning') sim.gainInnovation(0.02);
			if (pol.id !== player && (sim.year + pol.id + k * 5) % 80 !== 0) continue;
			const town = sim.w.burgs[pol.capital];
			const text = FEAST_TEXT[f.kind].replace(/\{realm\}/g, pol.name).replace(/\{town\}/g, town?.name ?? pol.name);
			sim.log('culture', `${f.name}: ${text}`, town?.cell, pol.id);
		}
	}
}

/** record that a surface cell just changed hands in war (the new owner's culture seeps in later) */
export function noteConquest(sim: Simulation, cell: number, taker: number) {
	const pol = sim.polities[taker];
	if (!pol?.alive || !pol.culture || sim.c.culture[cell] === pol.culture) return;
	sim.cx.conquered[cell] = sim.year;
}

/** lingua franca on the busiest cross-culture routes (every 10 years) */
function linguaFranca(sim: Simulation) {
	const cx = sim.cx, burgs = sim.w.burgs;
	const scored: { a: number; b: number; w: number; culture: number }[] = [];
	for (const rt of sim.w.routes) {
		if (rt.kind !== 'road' && rt.kind !== 'sea') continue;
		const A = burgs[rt.a], B = burgs[rt.b];
		if (!A?.alive || !B?.alive || !A.state || !B.state || A.culture === B.culture) continue;
		const culture = A.pop * prestigeMult(sim, A.culture) >= B.pop * prestigeMult(sim, B.culture) ? A.culture : B.culture;
		const w = Math.min(A.pop, B.pop) * (rt.kind === 'sea' ? 1.2 : 1) * prestigeMult(sim, culture);
		scored.push({ a: rt.a, b: rt.b, w, culture });
	}
	scored.sort((x, y) => y.w - x.w || x.a - y.a);
	const top = scored.slice(0, 3);
	const prev = cx.lingua;
	cx.lingua = top.map((t) => {
		const old = prev.find((p) => p.a === t.a && p.b === t.b);
		if (old && old.culture === t.culture) return old;
		const A = burgs[t.a], B = burgs[t.b];
		sim.log('culture', `Merchants on the route between ${A.name} and ${B.name} settle on the ${sim.w.cultures[t.culture]?.name ?? 'common'} tongue as their lingua franca.`, A.cell, A.state);
		return { a: t.a, b: t.b, culture: t.culture, since: sim.year };
	});
	const realms = new Set<number>();
	for (const l of cx.lingua) { realms.add(burgs[l.a].state); realms.add(burgs[l.b].state); }
	cx.francaRealms = [...realms].filter((x) => x > 0).sort((x, y) => x - y);
}

/** conquered cells slowly take the conqueror's culture */
export function assimilate(sim: Simulation) {
	const cx = sim.cx, c = sim.c, r = sim.rng;
	const shifted = new Map<number, number>();
	for (const key of Object.keys(cx.conquered)) {
		const cell = Number(key);
		const pol = sim.polities[c.state[cell]];
		if (!pol?.alive || !pol.culture || c.culture[cell] === pol.culture) { delete cx.conquered[cell]; continue; }
		if (sim.year - cx.conquered[cell] < 40 || !r.chance(0.015 * prestigeMult(sim, pol.culture))) continue;
		c.culture[cell] = pol.culture;
		const b = sim.w.burgs[c.burg[cell]];
		if (b?.alive && b.state === pol.id) b.culture = pol.culture;
		delete cx.conquered[cell];
		shifted.set(pol.id, (shifted.get(pol.id) ?? 0) + 1);
	}
	for (const [id, n] of shifted) {
		if (n < 8) continue;
		const pol = sim.polities[id];
		sim.log('culture', `In the lands ${pol.name} won by the sword, ${n} districts now speak the ${sim.w.cultures[pol.culture]?.name ?? ''} tongue and keep its customs.`, sim.w.burgs[pol.capital]?.cell, id);
		sim.dirty.political = true;
	}
}

export function yearlyCulture(sim: Simulation) {
	if (sim.year % 10 === 0) linguaFranca(sim);
	assimilate(sim);
	yearlyMovements(sim);
	// scholarly cultures speed discovery a little (their `innovation` mod, summed over realms, capped)
	let extra = 0;
	for (const p of sim.polities) if (p.alive && p.id) extra += cultureMod(sim, p, 'innovation') - 1;
	if (extra > 0) sim.gainInnovation(Math.min(extra, 2.4) * 0.1);
}
