/**
 * Ruler motives: every ruler who takes the crown gets one driving aim (vengeance, faith, glory, gold, legacy,
 * survival, knowledge, dynasty). It is rolled from traits, culture and the house's grudges, may pass to the heir,
 * and nudges existing systems through small multipliers (like `cultureMod`, clamped 0.7 to 1.4).
 *
 * Determinism: every roll uses a side rng (`${seed}:motive:...`), never `sim.rng`. With `GenOptions.motives === false`
 * every entry point returns immediately, so a world plays out exactly as before this module existed.
 */
import type { Simulation } from './engine';
import { makeRng, type Rng } from '../rng';
import { cultureProfile } from './culture/profile';
import { arrangeRoyalMarriage } from './leagues';
import { rulerName } from './story/people';
import type { LegendaryPlace, Person, Polity, War } from './types';

export type Motive = 'vengeance' | 'faith' | 'glory' | 'gold' | 'legacy' | 'survival' | 'knowledge' | 'dynasty';

export const MOTIVES: Motive[] = ['vengeance', 'faith', 'glory', 'gold', 'legacy', 'survival', 'knowledge', 'dynasty'];

export interface MotiveDef {
	name: string;
	icon: string;
	/** one genre-neutral line for cards */
	blurb: string;
	/** what the ruler is said to want, used in "driven by ..." */
	aim: string;
	/** the motive an heir may flip to */
	opposite: Motive;
	mods: Partial<Record<MotiveKey, number>>;
}

export type MotiveKey = 'aggression' | 'peace' | 'trade' | 'colonize' | 'conversion' | 'innovation' | 'wonder' | 'alliance' | 'army' | 'marriage';

/** multipliers per motive; the mix averages out near 1 so realm and war counts hold */
export const MOTIVE_DEFS: Record<Motive, MotiveDef> = {
	vengeance: { name: 'Vengeance', icon: '🗡', blurb: 'Seeks to repay a past wrong. Targets the realm that wronged the house and will not make an early peace.', aim: 'vengeance', opposite: 'dynasty', mods: { aggression: 1.12, peace: 0.85 } },
	faith: { name: 'Faith', icon: '🕯', blurb: 'Spreads the creed. Presses conversion, fights unbelievers and raises sacred works.', aim: 'the spread of the faith', opposite: 'knowledge', mods: { conversion: 1.4, wonder: 1.2 } },
	glory: { name: 'Glory', icon: '🏆', blurb: 'Hungers for renown. Wages more wars and raises monuments to itself.', aim: 'glory', opposite: 'survival', mods: { aggression: 1.15, peace: 0.95, wonder: 1.2, army: 1.05 } },
	gold: { name: 'Gold', icon: '🪙', blurb: 'Chases wealth. Favours trade, tolls and treaties over war.', aim: 'wealth', opposite: 'legacy', mods: { trade: 1.12, aggression: 0.92, alliance: 1.15 } },
	legacy: { name: 'Legacy', icon: '🏛', blurb: 'Wants to be remembered. Builds wonders and roads, and settles new land.', aim: 'a lasting legacy', opposite: 'gold', mods: { wonder: 1.4, colonize: 1.1, aggression: 0.88 } },
	survival: { name: 'Survival', icon: '🛡', blurb: 'Fears for the realm. Keeps a strong guard, seeks allies and welcomes peace.', aim: 'the safety of the realm', opposite: 'glory', mods: { aggression: 0.75, peace: 1.15, alliance: 1.3, army: 1.08, colonize: 0.9 } },
	knowledge: { name: 'Knowledge', icon: '📜', blurb: 'Loves learning. Quickens discovery and endows schools and observatories.', aim: 'knowledge', opposite: 'faith', mods: { innovation: 1.3, wonder: 1.15, aggression: 0.95 } },
	dynasty: { name: 'Dynasty', icon: '👑', blurb: 'Builds the house. Seeks marriages, unions and a secure line of succession.', aim: 'the fortunes of the dynasty', opposite: 'vengeance', mods: { marriage: 1.4, alliance: 1.1, aggression: 0.92 } }
};

export interface Grudge {
	kind: 'war' | 'sack' | 'kin';
	/** realm that did the wrong */
	by: number;
	y: number;
	/** the place or war it is remembered by */
	what: string;
}

export interface MotiveState {
	/** wrongs suffered, per house name (small lists, oldest dropped) */
	grudges: Record<string, Grudge[]>;
}

export function newMotiveState(): MotiveState {
	return { grudges: {} };
}

export const motivesOn = (sim: Simulation) => sim.w.opts.motives !== false;

const MAX_GRUDGES = 8;
const GRUDGE_WEIGHT: Record<Grudge['kind'], number> = { war: 1.2, sack: 2.8, kin: 2.2 };

function addGrudge(sim: Simulation, house: string, g: Grudge) {
	if (!house || !g.by) return;
	const mv = (sim.mv ??= newMotiveState());
	const list = (mv.grudges[house] ??= []);
	list.push(g);
	if (list.length > MAX_GRUDGES) list.shift();
}

/** the realm that wronged this house most (weighted by kind, fading with years); undefined if none alive */
export function grudgeTarget(sim: Simulation, house: string, selfId: number): { id: number; weight: number; why: string } | undefined {
	const list = sim.mv?.grudges[house];
	if (!list?.length) return undefined;
	const byRealm = new Map<number, { w: number; best: number; why: string }>();
	for (const g of list) {
		const t = sim.polities[g.by];
		if (!t?.alive || g.by === selfId) continue;
		const w = GRUDGE_WEIGHT[g.kind] * Math.exp(-(sim.year - g.y) / 45);
		const e = byRealm.get(g.by) ?? { w: 0, best: 0, why: '' };
		e.w += w;
		if (w > e.best) { e.best = w; e.why = grudgeText(g, t.name); }
		byRealm.set(g.by, e);
	}
	let out: { id: number; weight: number; why: string } | undefined;
	for (const [id, e] of byRealm) if (!out || e.w > out.weight) out = { id, weight: e.w, why: e.why };
	return out;
}

function grudgeText(g: Grudge, byName: string): string {
	if (g.kind === 'sack') return `the sack of ${g.what}`;
	if (g.kind === 'kin') return `the blood of kin shed by ${byName}`;
	return `the defeat in the ${g.what}`;
}

// ───────────── rolling ─────────────
function oppositeOf(m: Motive): Motive {
	return MOTIVE_DEFS[m].opposite;
}

/** weights for a fresh roll: traits, culture, regime and the house's grudges */
function weightsFor(sim: Simulation, pol: Polity, p: Person, avoid?: Motive): { weights: number[]; target?: { id: number; weight: number; why: string } } {
	const has = (t: string) => p.traits.includes(t);
	const cult = cultureProfile(sim.w, pol.culture).traits;
	const c = (t: string) => (cult.includes(t as never) ? 1 : 0);
	const age = sim.ageOf(p);
	const heirAlive = !!sim.people[pol.heir]?.alive;
	const target = grudgeTarget(sim, p.house, pol.id);
	const w: Record<Motive, number> = {
		vengeance: target && target.weight > 0.6 ? 0.5 + target.weight * 1.6 : 0,
		faith: 1 + (has('Pious') ? 1.8 : 0) + c('pious') * 1.2 + (pol.ideology === 'theocracy' ? 2 : 0),
		glory: 1 + (has('Ambitious') ? 1.5 : 0) + (has('Brave') ? 1 : 0) + (has('Cruel') ? 0.5 : 0) + c('martial') * 1.2,
		gold: 1 + (has('Greedy') ? 1.8 : 0) + c('mercantile') * 1.2 + (pol.ideology === 'oligarchy' ? 1 : 0),
		legacy: 1 + (has('Just') || has('Generous') ? 0.7 : 0) + (age >= 40 ? 1 : 0) + (pol.ideology === 'monarchy' ? 0.4 : 0),
		survival: 1 + (has('Craven') ? 1.5 : 0) + (has('Content') ? 1 : 0) + (has('Paranoid') ? 1 : 0) + c('insular') * 1 + (pol.cells < 25 ? 0.8 : 0),
		knowledge: 1 + (has('Scholar') ? 2 : 0) + c('scholarly') * 1.2 + (pol.ideology === 'technocracy' ? 2 : 0),
		dynasty: 1 + (heirAlive ? 0 : 1.5) + (age < 35 ? 0.5 : 0) + (has('Charming') ? 1 : 0) + (pol.ideology === 'monarchy' ? 0.7 : 0)
	};
	if (avoid) w[avoid] *= 0.3;
	return { weights: MOTIVES.map((m) => w[m]), target };
}

function fresh(sim: Simulation, pol: Polity, p: Person, r: Rng, avoid?: Motive) {
	const { weights, target } = weightsFor(sim, pol, p, avoid);
	const motive = r.weighted(MOTIVES, weights);
	return { motive, target: motive === 'vengeance' ? target : undefined };
}

function setMotive(p: Person, motive: Motive, year: number, target?: { id: number; why: string }) {
	p.motive = motive;
	p.motiveSince = year;
	p.motiveEnd = undefined;
	p.motiveTarget = target?.id;
	p.motiveWhy = target?.why;
}

/** called from `onCrown`: roll (or inherit) the new ruler's motive. `prevId` = the ruler before them in this realm */
export function rollOnCrown(sim: Simulation, pol: Polity, p: Person, prevId?: number) {
	if (!motivesOn(sim) || p.motive) return;
	const r = makeRng(`${sim.w.opts.seed}:motive:${p.id}:${sim.year}`);
	const prev = prevId ? sim.people[prevId] : undefined;
	let how: 'fresh' | 'inherit' | 'flip' = 'fresh';
	let pick: { motive: Motive; target?: { id: number; why: string } };
	if (prev?.motive) {
		const u = r();
		if (u < 0.6) how = 'inherit';
		else if (u < 0.8) how = 'flip';
	}
	if (prev?.motive && how === 'inherit') {
		const tgt = prev.motive === 'vengeance' && prev.motiveTarget && sim.polities[prev.motiveTarget]?.alive ? { id: prev.motiveTarget, why: prev.motiveWhy ?? 'an old wrong' } : undefined;
		pick = prev.motive === 'vengeance' && !tgt ? fresh(sim, pol, p, r, 'vengeance') : { motive: prev.motive, target: tgt };
	} else if (prev?.motive && how === 'flip') {
		pick = { motive: oppositeOf(prev.motive) };
	} else {
		pick = fresh(sim, pol, p, r, prev?.motive);
	}
	setMotive(p, pick.motive, sim.year, pick.target);
	// the very first rulers of a world are silent; later reigns are chronicled
	if (pol.reigns && pol.reigns.length > 1) {
		const who = rulerName(p);
		const d = MOTIVE_DEFS[pick.motive];
		const verb = how === 'inherit' ? 'takes up the cause of' : how === 'flip' ? 'turns from the old cause toward' : 'comes to the throne bent on';
		const text = pick.motive === 'vengeance' && pick.target
			? `${who} of ${pol.name} swears vengeance on ${sim.polities[pick.target.id].name} for ${pick.target.why}.`
			: `${who} of ${pol.name} ${verb} ${d.aim}.`;
		sim.log('misc', text, sim.w.burgs[pol.capital]?.cell, pol.id, 'motive');
	}
}

// ───────────── grudges ─────────────
/** a war ended: losers' ruling houses remember; winners may fulfil glory / vengeance / faith */
export function noteWarEnd(sim: Simulation, w: War, winner: War['winner']) {
	if (!motivesOn(sim) || !winner || winner === 'white') return;
	const win = winner === 'attackers' ? w.attackers : w.defenders;
	const lose = winner === 'attackers' ? w.defenders : w.attackers;
	if (!win.length || !lose.length) return;
	const victor = sim.polities[win[0]];
	for (const id of lose) {
		const lp = sim.polities[id];
		const lr = lp && sim.ruler(lp);
		if (lr && victor) addGrudge(sim, lr.house, { kind: 'war', by: victor.id, y: sim.year, what: w.aliases?.[winner === 'attackers' ? 2 : 0] ?? w.name });
	}
	for (const id of win) {
		const pol = sim.polities[id];
		const r = pol?.alive ? sim.ruler(pol) : undefined;
		if (!pol || !r?.alive || !r.motive || r.motiveEnd) continue;
		if (r.motive === 'vengeance' && r.motiveTarget !== undefined && lose.includes(r.motiveTarget)) fulfil(sim, pol, r, `${rulerName(r)} of ${pol.name} has had vengeance on ${sim.polities[r.motiveTarget].name} for ${r.motiveWhy ?? 'the old wrong'}.`);
		else if (r.motive === 'glory') fulfil(sim, pol, r, `${rulerName(r)} of ${pol.name} wins the glory sought in the ${w.name}.`);
		else if (r.motive === 'faith' && lose.some((x) => sim.polities[x]?.religion !== pol.religion)) fulfil(sim, pol, r, `${rulerName(r)} of ${pol.name} carries the faith to the unbelievers in the ${w.name}.`);
	}
}

/** a capital fell: the house remembers the sack; a vengeful conqueror may be satisfied */
export function noteCapitalSack(sim: Simulation, loser: Polity, winner: Polity | undefined, place: string) {
	if (!motivesOn(sim) || !winner) return;
	const lr = sim.ruler(loser);
	if (lr) addGrudge(sim, lr.house, { kind: 'sack', by: winner.id, y: sim.year, what: place });
	const wr = winner.alive ? sim.ruler(winner) : undefined;
	if (wr?.alive && wr.motive === 'vengeance' && !wr.motiveEnd && wr.motiveTarget === loser.id) {
		fulfil(sim, winner, wr, `${rulerName(wr)} of ${winner.name} takes ${place} and answers ${wr.motiveWhy ?? 'the old wrong'}.`);
	}
}

/** a ruler or heir died of battle wounds while at war: their house blames the enemy */
export function noteKinLost(sim: Simulation, p: Person, cause: string) {
	if (!motivesOn(sim) || (p.role !== 'ruler' && p.role !== 'heir') || cause !== 'battle wounds') return;
	const war = sim.warsOf(p.state)[0];
	if (!war) return;
	const foe = war.attackers.includes(p.state) ? war.defenders[0] : war.attackers[0];
	if (foe) addGrudge(sim, p.house, { kind: 'kin', by: foe, y: sim.year, what: p.name });
}

// ───────────── completion ─────────────
function fulfil(sim: Simulation, pol: Polity, r: Person, text: string) {
	r.motiveEnd = 'done';
	r.renown += 10;
	sim.log('misc', text, sim.w.burgs[pol.capital]?.cell, pol.id, 'motive');
}

function abandon(sim: Simulation, pol: Polity, r: Person, text: string) {
	r.motiveEnd = 'dropped';
	sim.log('misc', text, sim.w.burgs[pol.capital]?.cell, pol.id, 'motive');
}

/** a realm built a wonder: legacy, glory, faith and knowledge rulers may be satisfied */
export function noteWonder(sim: Simulation, pol: Polity, kind: LegendaryPlace['kind'], name: string) {
	if (!motivesOn(sim)) return;
	const r = sim.ruler(pol);
	if (!r?.alive || !r.motive || r.motiveEnd) return;
	const m = r.motive;
	const ok = m === 'legacy' || m === 'glory' || (m === 'faith' && (kind === 'tower_magic' || kind === 'world_tree' || kind === 'titan_shrine')) || (m === 'knowledge' && (kind === 'university' || kind === 'tower_magic'));
	if (ok) fulfil(sim, pol, r, `${rulerName(r)} of ${pol.name} sees the ${name} raised, the work of ${MOTIVE_DEFS[m].aim}.`);
}

// ───────────── effects ─────────────
/** the active motive of a realm's ruler, if any */
export function activeMotive(sim: Simulation, pol: Polity | undefined): Motive | undefined {
	if (!pol || !pol.id || !motivesOn(sim)) return undefined;
	const r = sim.people[pol.ruler];
	return r?.alive && r.motive && !r.motiveEnd ? r.motive : undefined;
}

/** multiplier a ruler's motive applies to an existing system value (1 = none), like `cultureMod` */
export function motiveMod(sim: Simulation, pol: Polity | undefined, key: MotiveKey): number {
	const m = activeMotive(sim, pol);
	if (!m) return 1;
	return Math.min(1.4, Math.max(0.7, MOTIVE_DEFS[m].mods[key] ?? 1));
}

/** aiWars hook: how this ruler sees a potential target. relBias is added to the relation; strengthNeed replaces the 1.15 margin */
export function warBias(sim: Simulation, p: Polity, t: number): { relBias: number; strengthNeed: number } {
	const m = activeMotive(sim, p);
	if (m === 'vengeance' && sim.people[p.ruler].motiveTarget === t) return { relBias: -60, strengthNeed: 0.95 };
	if (m === 'faith' && sim.polities[t]?.religion !== p.religion) return { relBias: -6, strengthNeed: 1.15 };
	return { relBias: 0, strengthNeed: 1.15 };
}

/** endWars hook: mean peace multiplier over the belligerents; a vengeful attacker holds out until it has the upper hand */
export function peaceMod(sim: Simulation, w: War): number {
	if (!motivesOn(sim)) return 1;
	const sides = [...w.attackers, ...w.defenders];
	let sum = 0;
	for (const id of sides) {
		const pol = sim.polities[id];
		let m = motiveMod(sim, pol, 'peace');
		const r = pol && activeMotive(sim, pol) === 'vengeance' ? sim.people[pol.ruler] : undefined;
		const foes = w.attackers.includes(id) ? w.defenders : w.attackers;
		if (r && r.motiveTarget !== undefined && foes.includes(r.motiveTarget) && (w.attackers.includes(id) ? w.score : -w.score) < 8) m = Math.min(m, 0.55);
		sum += m;
	}
	return sum / Math.max(1, sides.length);
}

/** alliance formation: mean of the two rulers' treaty appetite */
export function allianceMod(sim: Simulation, a: Polity, b: Polity): number {
	if (!motivesOn(sim)) return 1;
	return (motiveMod(sim, a, 'alliance') + motiveMod(sim, b, 'alliance')) / 2;
}

/** wonder builder: with a side-rng roll, a builder whose ruler wants a monument is preferred over the sim's pick */
export function preferWonderBuilder(sim: Simulation, candidates: Polity[], picked: Polity): Polity {
	if (!motivesOn(sim)) return picked;
	const r = makeRng(`${sim.w.opts.seed}:motive:wonder:${sim.year}`);
	const eager = candidates.filter((c) => motiveMod(sim, c, 'wonder') > 1);
	if (!eager.length || motiveMod(sim, picked, 'wonder') > 1 || !r.chance(0.35)) return picked;
	return r.pick(eager);
}

/** wonder kind: the ruler's motive steers the choice a share of the time */
export function wonderKindFor(sim: Simulation, pol: Polity, kind: LegendaryPlace['kind']): LegendaryPlace['kind'] {
	const m = activeMotive(sim, pol);
	if (!m) return kind;
	const r = makeRng(`${sim.w.opts.seed}:motive:wkind:${pol.id}:${sim.year}`);
	if (!r.chance(0.5)) return kind;
	if (m === 'faith') return 'tower_magic'; // the sacred spire
	if (m === 'knowledge') return 'university';
	if (m === 'glory') return 'tower_trials';
	if (m === 'gold') return 'giant_harbor';
	if (m === 'legacy') return r.pick(['bridge', 'university', 'giant_harbor'] as const);
	return kind;
}

// ───────────── yearly ─────────────
export function yearlyMotives(sim: Simulation) {
	if (!motivesOn(sim)) return;
	let learning = 0;
	for (const pol of sim.polities) {
		if (!pol.alive || !pol.id) continue;
		const r = sim.ruler(pol);
		// regime changes seat rulers without `crown`: give them a motive here
		if (r?.alive && !r.motive) rollOnCrown(sim, pol, r);
		if (!r?.alive || !r.motive || r.motiveEnd) continue;
		const since = sim.year - (r.motiveSince ?? sim.year);
		const who = rulerName(r);
		switch (r.motive) {
			case 'vengeance': {
				const t = r.motiveTarget !== undefined ? sim.polities[r.motiveTarget] : undefined;
				if (!t?.alive) fulfil(sim, pol, r, `${who} of ${pol.name} lets the old grudge rest as ${t?.name ?? 'the foe'} is no more.`);
				else if (since > 35) abandon(sim, pol, r, `${who} of ${pol.name} lays aside the vow of vengeance on ${t.name}; the years have worn it thin.`);
				break;
			}
			case 'gold':
				if (pol.treasury >= 250) fulfil(sim, pol, r, `${who} of ${pol.name} fills the treasury, the wealth long sought.`);
				else if (since > 30) abandon(sim, pol, r, `${who} of ${pol.name} tires of the chase for gold.`);
				break;
			case 'survival':
				if (since >= 20 && pol.stability >= 50) fulfil(sim, pol, r, `${who} of ${pol.name} keeps the realm whole through ${since} hard years.`);
				else if (since > 40) abandon(sim, pol, r, `${who} of ${pol.name} no longer fears for the realm.`);
				break;
			case 'dynasty': {
				const heir = sim.people[pol.heir];
				if (heir?.alive && sim.ageOf(heir) >= 16 && since >= 8) fulfil(sim, pol, r, `${who} of ${pol.name} secures the line, with ${heir.name} grown to take the crown.`);
				else if (since > 30) abandon(sim, pol, r, `${who} of ${pol.name} stops scheming for the house.`);
				else dynastyMarriage(sim, pol, r);
				break;
			}
			case 'knowledge':
				learning += 1;
				if (since > 25) abandon(sim, pol, r, `${who} of ${pol.name} sets down the scholar's pursuits.`);
				break;
			default:
				if (since > 30) abandon(sim, pol, r, `${who} of ${pol.name} lets go of the aim for ${MOTIVE_DEFS[r.motive].aim}.`);
		}
	}
	// learned courts add a little to the world's discovery, on top of the culture bonus
	if (learning) sim.gainInnovation(Math.min(learning, 6) * 0.3 * 0.1);
}

/** a dynasty-minded ruler sometimes seeks a royal marriage with a friendly neighbour (side rng) */
function dynastyMarriage(sim: Simulation, pol: Polity, r: Person) {
	const rng = makeRng(`${sim.w.opts.seed}:motive:marry:${pol.id}:${sim.year}`);
	if (!rng.chance(0.04 * motiveMod(sim, pol, 'marriage'))) return;
	const friends = sim.neighborsOf(pol.id).filter((t) => sim.polities[t]?.alive && !sim.atWar(pol.id, t) && sim.rel(pol.id, t) > -15 && !(pol.royalMarriages ?? []).includes(t));
	if (friends.length) arrangeRoyalMarriage(sim, pol.id, rng.pick(friends));
}

// ───────────── display ─────────────
export interface MotiveInfo {
	motive: Motive;
	icon: string;
	name: string;
	blurb: string;
	/** "Vengeance for the sack of X" / "Fulfilled" etc. */
	detail: string;
	status: 'active' | 'done' | 'dropped';
}

export function motiveInfo(sim: Simulation, p: Person | undefined): MotiveInfo | null {
	if (!p?.motive) return null;
	const d = MOTIVE_DEFS[p.motive];
	const status = p.motiveEnd ?? 'active';
	const tgt = p.motiveTarget !== undefined ? sim.polities[p.motiveTarget]?.name : undefined;
	let detail = d.name;
	if (p.motive === 'vengeance' && tgt) detail = `Vengeance on ${tgt} for ${p.motiveWhy ?? 'an old wrong'}`;
	if (status === 'done') detail += ' (fulfilled)';
	else if (status === 'dropped') detail += ' (abandoned)';
	return { motive: p.motive, icon: d.icon, name: d.name, blurb: d.blurb, detail, status };
}

/** a sentence for biographies */
export function motiveLine(sim: Simulation, p: Person): string {
	if (!p.motive) return '';
	const d = MOTIVE_DEFS[p.motive];
	const tgt = p.motiveTarget !== undefined ? sim.polities[p.motiveTarget]?.name : undefined;
	const base = p.motive === 'vengeance' && tgt ? `${p.name} was driven by vengeance on ${tgt} for ${p.motiveWhy ?? 'an old wrong'}` : `${p.name} was driven by ${d.aim}`;
	if (p.motiveEnd === 'done') return `${base}, and lived to see it fulfilled.`;
	if (p.motiveEnd === 'dropped') return `${base}, but in time let it go.`;
	return `${base}.`;
}
