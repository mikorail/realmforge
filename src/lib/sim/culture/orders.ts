/** Art movements and religious orders: founded, spread to neighbours, split into schools, suppressed by wary rulers. */
import type { Simulation } from '../engine';
import type { Polity } from '../types';
import { cultureProfile } from './profile';
import type { ArtMovement, MovementKind, OrderKind, ReligiousOrder } from './state';

const ADJ = ['Gilt', 'Silent', 'Lantern', 'Crimson', 'Tidal', 'Verdant', 'Austere', 'Radiant', 'Hollow', 'Wandering', 'Lacquered', 'Ember'];
const MOVE_NOUN: Record<MovementKind, string> = { painting: 'School', poetry: 'Circle', music: 'Consort', architecture: 'Guild', theatre: 'Players' };
const MOVE_TEXT: Record<MovementKind, string> = {
	painting: 'painters who break with the old canons',
	poetry: 'poets who prize a new, plainer verse',
	music: 'musicians who weave new modes into the old songs',
	architecture: 'master builders with bold new proportions',
	theatre: 'players who stage the old tales in a new manner'
};
const ORDER_NOUN: Record<OrderKind, string[]> = {
	martial: ['Knights', 'Wardens', 'Sworn Brothers'],
	healing: ['Hospitallers', 'Sisters of Mercy', 'Lamp-Bearers'],
	scholarly: ['Keepers', 'Scribes', 'Lore-Wardens'],
	ascetic: ['Hermits', 'Silent Brothers', 'Wall-Dwellers'],
	mendicant: ['Wayfarers', 'Almoners', 'Barefoot Friars']
};
const ORDER_TEXT: Record<OrderKind, string> = {
	martial: 'vows to guard pilgrims and holy places with the sword',
	healing: 'binds itself to tend the sick in every town it enters',
	scholarly: 'gathers to copy and guard the sacred teachings',
	ascetic: 'withdraws to bare cells to live by silence and fasting',
	mendicant: 'takes to the roads, preaching and living on alms'
};
const MOVE_KINDS: MovementKind[] = ['painting', 'poetry', 'music', 'architecture', 'theatre'];

const MAX_ACTIVE = 8;
const MAX_LIST = 60;

const active = (s: { status: string }) => s.status === 'rising' || s.status === 'flourishing';

function townOf(sim: Simulation, pol: Polity) {
	const b = sim.w.burgs[pol.capital];
	return b?.name ?? pol.name;
}

/** realm ids whose adherence is hostile to the movement (ideology or custom) */
function hostility(sim: Simulation, pol: Polity, kind: 'movement' | 'order', faith = 0): number {
	let h = 1;
	if (kind === 'movement') {
		if (pol.ideology === 'theocracy' || pol.ideology === 'autocracy') h *= 3;
		if (cultureProfile(sim.w, pol.culture).traits.includes('ancestral')) h *= 2;
	} else {
		if (pol.secularized) h *= 6;
		if (pol.ideology === 'autocracy') h *= 2;
		if (faith && pol.religion !== faith) h *= 3;
	}
	return h;
}

function trim<T extends { status: string; ended?: number }>(list: T[]) {
	if (list.length <= MAX_LIST) return;
	const dead = list.filter((x) => !active(x)).sort((a, b) => (a.ended ?? 0) - (b.ended ?? 0));
	for (const d of dead.slice(0, list.length - MAX_LIST)) list.splice(list.indexOf(d), 1);
}

export function yearlyMovements(sim: Simulation) {
	const r = sim.rng, cx = sim.cx;
	const alive = (id: number) => !!sim.polities[id]?.alive && sim.polities[id].cells > 0;

	// ── founding ──
	if (cx.movements.filter(active).length < MAX_ACTIVE && r.chance(0.05)) {
		const cand = sim.polities.filter((p) => p.alive && p.id && p.cells >= 5 && p.stability > 55 && p.treasury > 40);
		if (cand.length) {
			const home = r.pick(cand);
			const kind = r.pick(MOVE_KINDS);
			const name = `${r.pick(ADJ)} ${MOVE_NOUN[kind]} of ${townOf(sim, home)}`;
			const m: ArtMovement = { id: cx.nextId++, name, kind, founded: sim.year, culture: home.culture, homeRealm: home.id, realms: [home.id], status: 'rising' };
			cx.movements.push(m);
			home.treasury -= 6;
			home.stability = Math.min(100, home.stability + 2);
			sim.log('culture', `The ${name} takes shape in ${home.name}: ${MOVE_TEXT[kind]}.`, sim.w.burgs[home.capital]?.cell, home.id);
		}
	}
	if (cx.orders.filter(active).length < MAX_ACTIVE && r.chance(0.05)) {
		const cand = sim.polities.filter((p) => p.alive && p.id && p.religion && p.cells >= 4 && !p.secularized && p.stability > 40);
		if (cand.length) {
			const home = r.pick(cand);
			const faith = sim.w.religions[home.religion];
			if (faith?.id) {
				const doc = faith.doctrine;
				const kind: OrderKind = doc === 'militant' ? 'martial' : doc === 'compassion' ? 'healing' : doc === 'esoteric' ? 'scholarly' : doc === 'ancestral' || doc === 'caste' ? 'ascetic' : doc === 'evangelical' || doc === 'liberation' ? 'mendicant' : r.pick(['martial', 'healing', 'scholarly', 'ascetic', 'mendicant'] as OrderKind[]);
				const name = `${r.pick(ORDER_NOUN[kind])} of ${faith.name}`;
				const o: ReligiousOrder = { id: cx.nextId++, name, kind, faith: faith.id, founded: sim.year, seat: home.capital, homeRealm: home.id, realms: [home.id], status: 'rising' };
				cx.orders.push(o);
				applyOrderBoon(sim, home, kind);
				sim.log('culture', `The ${name} is founded in ${home.name}; it ${ORDER_TEXT[kind]}.`, sim.w.burgs[home.capital]?.cell, home.id);
			}
		}
	}

	// ── life of each movement ──
	for (const m of cx.movements.slice()) {
		if (!active(m)) continue;
		m.realms = m.realms.filter(alive);
		if (!m.realms.length) { m.status = 'faded'; m.ended = sim.year; continue; }
		// suppression
		for (const id of m.realms.slice()) {
			const pol = sim.polities[id];
			if (!r.chance(0.012 * hostility(sim, pol, 'movement'))) continue;
			m.realms.splice(m.realms.indexOf(id), 1);
			(m.banned ??= []).push(id);
			pol.stability = Math.max(0, pol.stability - 1);
			if (m.realms.length) sim.log('culture', `The court of ${pol.name} bans the ${m.name}; its masters flee across the border.`, sim.w.burgs[pol.capital]?.cell, pol.id);
			else {
				m.status = 'suppressed';
				m.ended = sim.year;
				sim.log('culture', `The last patron of the ${m.name} turns on it: ${pol.name} burns its works and silences the masters.`, sim.w.burgs[pol.capital]?.cell, pol.id);
			}
		}
		if (!active(m)) continue;
		// spread to one neighbour
		const targets: Polity[] = [];
		for (const id of m.realms) for (const n of sim.neighborsOf(id)) {
			const np = sim.polities[n];
			if (np?.alive && np.id && !m.realms.includes(n) && !m.banned?.includes(n) && !targets.includes(np) && !sim.atWar(id, n) && sim.rel(id, n) > -25) targets.push(np);
		}
		if (targets.length && m.realms.length < 6 && r.chance(0.06)) {
			const to = r.pick(targets);
			const resist = cultureProfile(sim.w, to.culture).traits.includes('ancestral') ? 0.5 : 1;
			if (r.chance(resist)) {
				m.realms.push(to.id);
				to.stability = Math.min(100, to.stability + 1);
				to.treasury -= 3;
				sim.log('culture', `The ${m.name} finds patrons in ${to.name}.`, sim.w.burgs[to.capital]?.cell, to.id);
			}
		}
		if (m.status === 'rising' && m.realms.length >= 3) m.status = 'flourishing';
		// schism: the school divides
		if (m.realms.length >= 5 && r.chance(0.02)) {
			const half = m.realms.filter((_, k) => k % 2 === 1);
			m.realms = m.realms.filter((_, k) => k % 2 === 0);
			const lead = sim.polities[half[0]];
			const name = `New ${m.name.replace(/^New /, '')}`;
			cx.movements.push({ id: cx.nextId++, name, kind: m.kind, founded: sim.year, culture: lead.culture, homeRealm: lead.id, realms: half, status: 'rising', parent: m.id, banned: m.banned?.slice() });
			sim.log('culture', `The ${m.name} splits: masters in ${lead.name} declare the ${name}.`, sim.w.burgs[lead.capital]?.cell, lead.id);
		}
	}

	// ── life of each order ──
	for (const o of cx.orders.slice()) {
		if (!active(o)) continue;
		o.realms = o.realms.filter(alive);
		if (!o.realms.length) { o.status = 'faded'; o.ended = sim.year; continue; }
		for (const id of o.realms.slice()) {
			const pol = sim.polities[id];
			if (!r.chance(0.01 * hostility(sim, pol, 'order', o.faith))) continue;
			o.realms.splice(o.realms.indexOf(id), 1);
			(o.banned ??= []).push(id);
			pol.treasury += 8; // confiscated endowments
			pol.stability = Math.max(0, pol.stability - 2);
			if (o.realms.length) sim.log('culture', `${pol.name} dissolves the ${o.name} and seizes its houses.`, sim.w.burgs[pol.capital]?.cell, pol.id);
			else {
				o.status = 'suppressed';
				o.ended = sim.year;
				sim.log('culture', `${pol.name} suppresses the last houses of the ${o.name}; its brothers scatter or go underground.`, sim.w.burgs[pol.capital]?.cell, pol.id);
			}
		}
		if (!active(o)) continue;
		const targets: Polity[] = [];
		for (const id of o.realms) for (const n of sim.neighborsOf(id)) {
			const np = sim.polities[n];
			if (np?.alive && np.id && np.religion === o.faith && !np.secularized && !o.realms.includes(n) && !o.banned?.includes(n) && !targets.includes(np)) targets.push(np);
		}
		if (targets.length && o.realms.length < 6 && r.chance(0.06)) {
			const to = r.pick(targets);
			o.realms.push(to.id);
			applyOrderBoon(sim, to, o.kind);
			sim.log('culture', `Houses of the ${o.name} open in ${to.name}.`, sim.w.burgs[to.capital]?.cell, to.id);
		}
		if (o.status === 'rising' && o.realms.length >= 3) o.status = 'flourishing';
		if (o.realms.length >= 5 && r.chance(0.02)) {
			const half = o.realms.filter((_, k) => k % 2 === 1);
			o.realms = o.realms.filter((_, k) => k % 2 === 0);
			const lead = sim.polities[half[0]];
			const name = `Reformed ${o.name.replace(/^Reformed /, '')}`;
			cx.orders.push({ id: cx.nextId++, name, kind: o.kind, faith: o.faith, founded: sim.year, seat: lead.capital, homeRealm: lead.id, realms: half, status: 'rising', parent: o.id, banned: o.banned?.slice() });
			sim.log('culture', `A schism divides the ${o.name}: the houses of ${lead.name} follow a stricter rule as the ${name}.`, sim.w.burgs[lead.capital]?.cell, lead.id);
		}
	}
	trim(cx.movements);
	trim(cx.orders);
}

function applyOrderBoon(sim: Simulation, pol: Polity, kind: OrderKind) {
	pol.treasury -= 4;
	pol.stability = Math.min(100, pol.stability + 2);
	if (kind === 'martial') pol.army *= 1.03;
	if (kind === 'scholarly') sim.gainInnovation(0.3);
}
