/**
 * Rare world moments (a council or crusade roughly every 100 to 200 years, first contact between
 * layers and between planets) and perspective names for major wars. Every roll here uses its own
 * seeded rng so the main simulation stream is untouched.
 */
import type { Simulation } from '../engine';
import type { Cosmos } from '../cosmos';
import { makeRng, type Rng } from '../../rng';
import type { ChronEvent, Polity, War } from '../types';
import { rulerName } from './people';

const srng = (sim: Simulation, salt: string) => makeRng(`${sim.w.opts.seed}:story:${sim.planetIndex}:${sim.year}:${salt}`);

function eventById(sim: Simulation, id: number): ChronEvent | undefined {
	const all = sim.allEvents;
	for (let i = all.length - 1; i >= 0; i--) if (all[i].id === id) return all[i];
	return undefined;
}

const alive = (sim: Simulation) => sim.polities.filter((p) => p.alive && p.id);

// ───────────────────────────── council and crusade ─────────────────────────────

function worldCouncil(sim: Simulation, r: Rng): boolean {
	const realms = alive(sim).filter((p) => p.cells >= 6);
	if (realms.length < 4) return false;
	const host = [...realms].filter((p) => !p.overlord).sort((a, b) => b.cells * b.stability - a.cells * a.stability)[0];
	if (!host) return false;
	const guests = realms.filter((p) => p.id !== host.id).sort((a, b) => b.cells - a.cells).slice(0, r.int(3, 7));
	if (guests.length < 3) return false;
	const town = sim.w.burgs[host.capital];
	const all = [host, ...guests];
	for (const g of guests) sim.addRel(host.id, g.id, 18);
	const ids = new Set(all.map((p) => p.id));
	let ended = 0;
	for (const w of sim.wars.filter((x) => !x.end)) {
		if (ended >= 3) break;
		if ([...w.attackers, ...w.defenders].every((id) => ids.has(id))) {
			sim.finishWar(w, 'white');
			ended++;
		}
	}
	for (const p of all) p.stability = Math.min(100, p.stability + 3);
	const text = `Envoys of ${all.length} realms gather at ${town?.name ?? host.name} for the Council of ${town?.name ?? host.name}, called by ${host.name}: borders are acknowledged, feuds are mended${ended ? ` and ${ended === 1 ? 'a war is' : `${ended} wars are`} laid to rest` : ''}.`;
	sim.log('peace', text, town?.cell, host.id, 'council');
	sim.story.moments.push({ y: sim.year, kind: 'council', text });
	return true;
}

function greatCrusade(sim: Simulation, r: Rng): boolean {
	const cands = alive(sim).filter((p) => !p.overlord && p.cells >= 8 && p.stability >= 35 && !sim.warsOf(p.id).length && p.id !== sim.playerState());
	if (!cands.length) return false;
	const order = r.shuffle(cands);
	for (const a of order) {
		const targets = sim.neighborsOf(a.id).map((id) => sim.polities[id]).filter((t) => t.alive && t.religion !== a.religion && !a.allies.includes(t.id) && !sim.atWar(a.id, t.id) && t.overlord !== a.id && sim.rel(a.id, t.id) < 25);
		if (!targets.length) continue;
		const b = targets.sort((x, y) => sim.rel(a.id, x.id) - sim.rel(a.id, y.id))[0];
		const faith = sim.w.religions[a.religion]?.name ?? 'the true faith';
		const ruler = sim.ruler(a);
		const cap = sim.w.burgs[a.capital];
		const call = sim.log('faith', `${ruler ? rulerName(ruler) : `The ruler of ${a.name}`} calls the faithful of ${faith} to a Great Crusade against ${b.name}; banners rise in every town of ${a.name}.`, cap?.cell, a.id, 'crusade');
		const w = sim.declareWar(a.id, b.id, 'in a Great Crusade');
		w.name = `Great Crusade against ${b.name}`;
		// co-religionists answer the call
		for (const q of alive(sim)) {
			if (w.attackers.length >= 3) break;
			if (q.id !== a.id && q.id !== b.id && q.religion === a.religion && !q.overlord && !w.defenders.includes(q.id) && !w.attackers.includes(q.id) && sim.neighborsOf(q.id).includes(b.id)) w.attackers.push(q.id);
		}
		w.startArmy = [sim.strength(w.attackers), sim.strength(w.defenders)];
		if (call?.id !== undefined && w.ev !== undefined) {
			const we = eventById(sim, w.ev);
			if (we) we.cause = call.id;
		}
		sim.story.moments.push({ y: sim.year, kind: 'crusade', text: `${a.name} against ${b.name}` });
		return true;
	}
	return false;
}

function layerContact(sim: Simulation, r: Rng) {
	if (sim.w.layers.length < 2 || sim.year < 15) return;
	for (const k of sim.borders.keys()) {
		const [x, y] = k.split('-').map(Number);
		const a = sim.polities[x], b = sim.polities[y];
		if (!a?.alive || !b?.alive || a.layer === b.layer) continue;
		const key = a.layer < b.layer ? `${a.layer}-${b.layer}` : `${b.layer}-${a.layer}`;
		if (sim.story.contacts.includes(key)) continue;
		if (!r.chance(0.05)) continue;
		sim.story.contacts.push(key);
		const la = sim.w.layers[a.layer]?.name ?? 'the surface', lb = sim.w.layers[b.layer]?.name ?? 'the surface';
		sim.addRel(a.id, b.id, 10);
		const text = `First contact: the people of ${a.name} (${la}) and of ${b.name} (${lb}) find one another along an old shaft and learn that their worlds are not alone.`;
		sim.log('misc', text, sim.w.burgs[a.capital]?.cell, a.id, 'contact');
		sim.story.moments.push({ y: sim.year, kind: 'contact', text });
		return; // one meeting a year
	}
}

/** council or crusade scheduler plus layer contacts; once a year */
export function yearlyMoments(sim: Simulation) {
	const st = sim.story;
	layerContact(sim, srng(sim, 'contact'));
	if (!st.nextMoment) st.nextMoment = sim.year + srng(sim, 'first').int(60, 140);
	if (sim.year < st.nextMoment) return;
	const r = srng(sim, 'moment');
	const order = r() < 0.5 ? [worldCouncil, greatCrusade] : [greatCrusade, worldCouncil];
	for (const fn of order) {
		if (fn(sim, r)) {
			st.nextMoment = sim.year + r.int(100, 200);
			return;
		}
	}
	st.nextMoment = sim.year + 10; // nothing fit: try again soon
}

/** the first meeting of two planets: a rift colony or invasion appears; logged in both chronicles */
export function cosmosMoments(cos: Cosmos) {
	if (cos.sims.length < 2) return;
	const lead = cos.sims[0];
	if (lead.story.planetContact) return;
	for (const s of cos.sims) {
		const colony = s.polities.find((p) => p.alive && p.origin === 'rift');
		if (!colony) continue;
		for (const t of cos.sims) t.story.planetContact = true;
		for (const t of cos.sims) {
			const others = cos.sims.filter((x) => x !== t).map((x) => x.w.name).join(' and ');
			const text = t === s
				? `First contact between worlds: ${colony.name} is raised by strangers who came through a rift from ${others}.`
				: `First contact between worlds: travellers from ${s.w.name} step out of a rift, and the folk of ${t.w.name} learn that they are not alone in the heavens.`;
			t.log('misc', text, undefined, t === s ? colony.id : undefined, 'contact');
			t.story.moments.push({ y: t.year, kind: 'contact', text });
		}
		return;
	}
}

// ───────────────────────────── perspective war names ─────────────────────────────

/** [name the victor's side gives it, name the other side gives it] */
const WAR_PAIRS: [string, string][] = [
	['the Liberation', 'the Betrayal'],
	['the Great Reckoning', 'the Plunder'],
	['the Unification', 'the Subjugation'],
	['the Holy Defence', 'the Heretics\' War'],
	['the Reclamation', 'the Usurpation'],
	['the Rightful War', 'the Unprovoked War'],
	['the Vindication', 'the Aggression'],
	['the War of Deliverance', 'the Years of Ash']
];

function isMajor(w: War): boolean {
	const years = (w.end ?? Infinity) - w.start;
	return Math.abs(w.score) >= 10 || w.attackers.length + w.defenders.length >= 4 || (Number.isFinite(years) && years >= 4);
}

function lead(sim: Simulation, ids: number[]): Polity | undefined {
	return ids.map((i) => sim.polities[i]).find((p) => p);
}

export function nameWars(sim: Simulation) {
	for (const w of sim.wars) {
		if (w.aliases) continue;
		const finished = w.end !== undefined;
		if (finished ? w.end !== sim.year || !isMajor(w) : sim.year - w.start < 6) continue;
		const a = lead(sim, w.attackers), b = lead(sim, w.defenders);
		if (!a || !b) continue;
		const r = makeRng(`${sim.w.opts.seed}:warname:${sim.planetIndex}:${w.id}`);
		const [proud, bitter] = r.pick(WAR_PAIRS);
		const defendersWon = w.winner === 'defenders';
		const nameA = defendersWon ? bitter : proud;
		const nameB = defendersWon ? proud : bitter;
		const ca = sim.w.cultures[a.culture]?.name, cb = sim.w.cultures[b.culture]?.name;
		const sameCulture = !ca || !cb || ca === cb;
		const labelA = sameCulture ? a.name : ca, labelB = sameCulture ? b.name : cb;
		w.aliases = [labelA, nameA, labelB, nameB];
		const where = (x: string) => (sameCulture ? `in ${x}` : `among the ${x}`);
		const text = `The ${w.name} is known as ${nameA} ${where(labelA)}, and as ${nameB} ${where(labelB)}.`;
		sim.log('misc', text, sim.w.burgs[b.capital]?.cell, b.id, 'alias');
	}
}
