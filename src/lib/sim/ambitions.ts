import type { Simulation } from './engine';
import type { Person } from './types';

/**
 * Avatar depth: a life ambition to pursue, companions who travel with you and lend their
 * talents, and a letters inbox where the world writes back (calls to arms, court invitations,
 * trade tips, family news) with one-click responses.
 */
export interface Ambition {
	id: string;
	title: string;
	desc: string;
	icon: string;
	/** 0..1 progress */
	progress: (sim: Simulation, me: Person) => number;
	reward: { gold: number; renown: number };
}

const maxStat = (p: Person) => Math.max(p.martial, p.diplomacy, p.stewardship, p.intrigue);

export const AMBITIONS: Ambition[] = [
	{ id: 'wealth', title: 'Amass a Fortune', desc: 'Hold 500 gold.', icon: '💰', progress: (_s, me) => me.gold / 500, reward: { gold: 0, renown: 30 } },
	{ id: 'renown', title: 'Become a Legend', desc: 'Reach 150 renown.', icon: '🌟', progress: (_s, me) => me.renown / 150, reward: { gold: 100, renown: 0 } },
	{ id: 'crown', title: 'Wear a Crown', desc: 'Rule a realm, by any means.', icon: '👑', progress: (_s, me) => (me.role === 'ruler' ? 1 : Math.min(0.9, me.renown / 60)), reward: { gold: 100, renown: 40 } },
	{ id: 'slayer', title: 'Slay a Beast of Legend', desc: 'Defeat a monster in combat.', icon: '🗡', progress: (s, me) => (s.monsters.some((m) => !m.alive && m.slayer === me.name) ? 1 : 0), reward: { gold: 150, renown: 50 } },
	{ id: 'traveller', title: 'See the World', desc: 'Visit 12 different settlements.', icon: '🧭', progress: (_s, me) => (me.visited?.length ?? 0) / 12, reward: { gold: 80, renown: 25 } },
	{ id: 'master', title: 'Master a Craft', desc: 'Raise any skill to 16.', icon: '📜', progress: (_s, me) => maxStat(me) / 16, reward: { gold: 60, renown: 30 } },
	{ id: 'dynasty', title: 'Found a Dynasty', desc: 'Have a living child.', icon: '🌳', progress: (s, me) => (s.people.some((p) => p.alive && p.parent === me.id) ? 1 : 0), reward: { gold: 50, renown: 20 } },
	{ id: 'company', title: 'Gather a Fellowship', desc: 'Travel with 3 companions.', icon: '🤝', progress: (s, me) => (me.companions ?? []).filter((id) => s.people[id]?.alive).length / 3, reward: { gold: 40, renown: 30 } }
];

export const AMBITION_BY_ID = Object.fromEntries(AMBITIONS.map((a) => [a.id, a]));

export interface Letter {
	y: number;
	from: string;
	text: string;
	action?: { label: string; act: string; arg?: number };
	read?: boolean;
}

export function offerAmbitions(sim: Simulation, me: Person) {
	const pool = AMBITIONS.filter((a) => a.progress(sim, me) < 1 && !(me.ambitionsDone ?? []).includes(a.id));
	me.ambitionChoices = [...pool].sort(() => sim.rng() - 0.5).slice(0, 3).map((a) => a.id);
}

export function pickAmbition(sim: Simulation, id: string) {
	const me = sim.me;
	if (!me || !AMBITION_BY_ID[id]) return;
	me.ambition = id;
	me.ambitionChoices = [];
	sim.log('avatar', `${me.name} vows to ${AMBITION_BY_ID[id].title.toLowerCase()}.`);
}

/** monthly: complete the current ambition when its goal is reached */
export function checkAmbition(sim: Simulation) {
	const me = sim.me;
	if (!me) return;
	const here = me.burg;
	me.visited ??= [];
	if (here && !me.visited.includes(here)) me.visited.push(here);
	if (!me.ambition) {
		if (!me.ambitionChoices?.length) offerAmbitions(sim, me);
		return;
	}
	const a = AMBITION_BY_ID[me.ambition];
	if (!a || a.progress(sim, me) < 1) return;
	me.gold += a.reward.gold;
	me.renown += a.reward.renown;
	(me.ambitionsDone ??= []).push(a.id);
	me.ambition = undefined;
	sim.log('avatar', `Ambition fulfilled: ${a.title}! ${me.name} is rewarded with ${a.reward.gold ? `${a.reward.gold} gold` : ''}${a.reward.gold && a.reward.renown ? ' and ' : ''}${a.reward.renown ? `${a.reward.renown} renown` : ''}.`);
	offerAmbitions(sim, me);
}

export function hireCompanion(sim: Simulation): string {
	const me = sim.me;
	if (!me) return 'No avatar.';
	me.companions = (me.companions ?? []).filter((id) => sim.people[id]?.alive);
	if (me.companions.length >= 3) return 'Your fellowship is full (3).';
	if (me.gold < 40) return 'Hiring a companion costs 40 gold.';
	const here = sim.w.burgs[me.burg];
	const role = sim.rng.pick(['wanderer', 'wanderer', 'priest', 'merchant'] as const);
	const c = sim.makePerson(here.culture, 0, here.id, role, sim.rng.int(18, 40));
	const best = sim.rng.pick(['martial', 'diplomacy', 'stewardship', 'intrigue'] as const);
	c[best] = Math.min(20, c[best] + 6);
	c.companionOf = me.id;
	me.gold -= 40;
	me.companions.push(c.id);
	const label = { martial: 'a sellsword', diplomacy: 'a silver-tongued envoy', stewardship: 'a learned scholar', intrigue: 'a quiet cutpurse' }[best];
	sim.log('avatar', `${c.name} ${c.house}, ${label}, joins ${me.name}'s fellowship in ${here.name}.`, here.cell);
	return '';
}

/** companions lend half of their best relevant skill to encounter checks */
export function companionBonus(sim: Simulation, me: Person, stat: 'martial' | 'diplomacy' | 'stewardship' | 'intrigue'): number {
	let best = 0;
	for (const id of me.companions ?? []) {
		const c = sim.people[id];
		if (c?.alive) best = Math.max(best, c[stat]);
	}
	return best / 4;
}

/** yearly: the world writes to the avatar */
export function yearlyLetters(sim: Simulation) {
	const me = sim.me;
	if (!me) return;
	const r = sim.rng;
	const send = (l: Omit<Letter, 'y'>) => {
		sim.letters.push({ ...l, y: sim.year });
		if (sim.letters.length > 40) sim.letters.splice(0, sim.letters.length - 40);
	};
	const pol = sim.polities[me.state];
	// call to arms
	if (pol?.alive && me.role !== 'ruler' && me.role !== 'general' && sim.warsOf(pol.id).length && r.chance(0.6)) {
		const ruler = sim.ruler(pol);
		send({ from: `${ruler?.name ?? 'The crown'} of ${pol.name}`, text: `${pol.name} is at war. Your sword is needed: take a commission and lead our soldiers.`, action: { label: 'Answer the call (become a general)', act: 'enlist' } });
	}
	// court invitation for the renowned
	if (me.renown >= 50 && me.role !== 'ruler' && r.chance(0.35)) {
		const courts = sim.polities.filter((p) => p.alive && p.id && p.id !== me.state && sim.w.burgs[p.capital]?.alive);
		if (courts.length) {
			const host = r.pick(courts);
			send({ from: `${sim.ruler(host)?.name ?? 'A sovereign'} of ${host.name}`, text: `Tales of your deeds have reached our court at ${sim.w.burgs[host.capital].name}. Come, and be honoured.`, action: { label: `Travel to ${sim.w.burgs[host.capital].name}`, act: 'goto', arg: host.capital } });
		}
	}
	// trade tip for merchants and anyone carrying goods
	if ((me.role === 'merchant' || me.role === 'trader' || me.cargo) && r.chance(0.5)) {
		const towns = sim.w.burgs.filter((b) => b.id && b.alive && b.id !== me.burg);
		if (towns.length) {
			const t = r.pick(towns);
			sim.tradeTip = { burg: t.id, until: sim.year + 2 };
			send({ from: 'A guild factor', text: `Goods fetch double prices in ${t.name} for the next two years. Sell there while it lasts.`, action: { label: `Travel to ${t.name}`, act: 'goto', arg: t.id } });
		}
	}
	// family news
	for (const p of sim.people) {
		if (p.died === sim.year - 1 && (p.parent === me.id || me.parent === p.id || (me.companions ?? []).includes(p.id))) {
			send({ from: 'A messenger in black', text: `${p.name} ${p.house} has died (${p.cause ?? 'unknown causes'}). The house mourns.` });
		}
	}
	// rival
	if (me.renown >= 30 && r.chance(0.15)) {
		const rival = sim.people.filter((p) => p.alive && p.id !== me.id && p.renown >= me.renown * 0.6 && !me.companions?.includes(p.id));
		if (rival.length) {
			const rv = r.pick(rival);
			send({ from: `${rv.name} ${rv.house}`, text: `Your name is spoken too loudly. Watch the roads, ${me.name}.` });
			me.rival = rv.id;
		}
	}
}
