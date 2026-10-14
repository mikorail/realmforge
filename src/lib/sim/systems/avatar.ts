/** Avatar play: choosing a person, routes and travel, encounters, deeds (act). */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { neighbors } from '../../gen/grid';
import { BIOMES } from '../../gen/physical';
import { ENCOUNTERS } from '../content';
import { forgeMonsterRelic } from '../relics';
import { checkNextDiscovery } from '../tech';
import { buildWonder, createTitanShrineWonder, destroyWonder } from '../wonders';
import { resolveMonsterCombat } from '../monsters';
import { transitionRegime } from '../politics';
import { packEncounters, reskin } from '../genrepacks';
import { companionBonus, offerAmbitions, hireCompanion } from '../ambitions';
import type { Effects, Encounter, IdeologyKind, Monster, LegendaryPlace, Person } from '../types';

export function choose(sim: Simulation, id: number) {
	sim.avatar = id;
	sim.travel = null;
	const p = sim.people[id];
	if (!p.ambition && !p.ambitionChoices?.length) offerAmbitions(sim, p);
	sim.log('avatar', `You take up the life of ${p.name} ${p.house}, ${p.role}${p.state ? ` of ${sim.polities[p.state].name}` : ''}.`);
}

/** Dijkstra over burg links (roads + sea lanes) */
export function route(sim: Simulation, from: number, to: number): number[] | null {
	const adj = new Map<number, [number, number][]>();
	for (const [a, b, d] of sim.w.links) {
		if (!sim.w.burgs[a].alive || !sim.w.burgs[b].alive) continue;
		(adj.get(a) ?? adj.set(a, []).get(a)!).push([b, d]);
		(adj.get(b) ?? adj.set(b, []).get(b)!).push([a, d]);
	}
	const dist = new Map<number, number>([[from, 0]]);
	const prev = new Map<number, number>();
	const open = new Set([from]);
	while (open.size) {
		let cur = -1, best = Infinity;
		for (const o of open) if ((dist.get(o) ?? Infinity) < best) { best = dist.get(o)!; cur = o; }
		open.delete(cur);
		if (cur === to) break;
		for (const [nb, d] of adj.get(cur) ?? []) {
			const nd = best + d;
			if (nd < (dist.get(nb) ?? Infinity)) { dist.set(nb, nd); prev.set(nb, cur); open.add(nb); }
		}
	}
	if (!dist.has(to)) return null;
	const path = [to];
	while (path[0] !== from) path.unshift(prev.get(path[0])!);
	return path;
}

export function linkDays(sim: Simulation, a: number, b: number) {
	for (const [x, y, d] of sim.w.links) if ((x === a && y === b) || (x === b && y === a)) return d;
	return 5;
}

export function startTravel(sim: Simulation, to: number): string | null {
	const me = sim.me;
	if (!me) return 'No avatar.';
	if (me.burg === to) return 'You are already here.';
	const path = sim.route(me.burg, to);
	if (!path) return 'No known road leads there.';
	sim.travel = { path, leg: 0, days: 0, legDays: sim.linkDays(path[0], path[1]) };
	return null;
}

export function advanceTravel(sim: Simulation) {
	const me = sim.me;
	const t = sim.travel;
	if (!me || !t) return;
	t.days += 30;
	while (t.days >= t.legDays && t.leg < t.path.length - 1) {
		t.days -= t.legDays;
		t.leg++;
		me.burg = t.path[t.leg];
		for (const id of me.companions ?? []) if (sim.people[id]?.alive) sim.people[id].burg = me.burg;
		if (t.leg < t.path.length - 1) t.legDays = sim.linkDays(t.path[t.leg], t.path[t.leg + 1]);
	}
	if (t.leg >= t.path.length - 1) {
		sim.travel = null;
		const b = sim.w.burgs[me.burg];
		sim.log('avatar', `You arrive at ${b.name}.`, b.cell);
		if (sim.rng.chance(0.55)) sim.pending = sim.encounter();
	} else if (sim.rng.chance(0.12)) sim.pending = sim.encounter();
}

export function resolve(sim: Simulation, optIndex: number): { ok: boolean; text: string } {
	const enc = sim.pending;
	const me = sim.me;
	sim.pending = null;
	if (!enc || !me) return { ok: false, text: '' };
	const o = enc.options[optIndex];
	let ok = true;
	if (o.stat) {
		const roll = sim.rng.int(1, 10) + me[o.stat] / 2 + (me.traits.includes('Lucky') ? 2 : 0) + companionBonus(sim, me, o.stat);
		ok = roll >= (o.dc ?? 10);
	}
	const fx = ok ? o.win : (o.lose ?? o.win);
	sim.apply(me, fx);
	sim.log('avatar', `${enc.title}: ${fx.text}`);
	return { ok, text: fx.text };
}

export function apply(sim: Simulation, me: Person, fx: Effects) {
	me.gold = Math.max(0, me.gold + (fx.gold ?? 0));
	me.renown = Math.max(0, me.renown + (fx.renown ?? 0));
	me.health = clamp(me.health + (fx.health ?? 0), 0, 100);
	for (const k of ['martial', 'diplomacy', 'stewardship', 'intrigue'] as const) if (fx[k]) me[k] = clamp(me[k] + fx[k]!, 0, 20);
	if (fx.trait && !me.traits.includes(fx.trait)) me.traits.push(fx.trait);
	if (me.health <= 0) sim.kill(me, 'grievous wounds');
}

/** Avatar actions; returns a message for the UI. */
export function act(sim: Simulation, action: string, arg?: number): string {
	const me = sim.me;
	if (!me) return 'You have no avatar.';
	const here = sim.w.burgs[me.burg];
	const pol = sim.polities[me.state];
	const local = sim.polities[here.state];
	const r = sim.rng;
	const say = (t: string) => { sim.log('avatar', t, here.cell); return t; };
	switch (action) {
		case 'work': {
			const g = Math.round(5 + me.stewardship * 1.5 + here.pop * 0.5 + r.int(0, 6));
			me.gold += g;
			sim.skipMonths(1);
			return say(`You labour a month in ${here.name} and earn ${g} gold.`);
		}
		case 'adventure':
			sim.pending = sim.encounter();
			return '';
		case 'train': {
			if (me.gold < 25) return 'Training costs 25 gold.';
			me.gold -= 25;
			const stat = r.pick(['martial', 'diplomacy', 'stewardship', 'intrigue'] as const);
			me[stat] = Math.min(20, me[stat] + 1);
			sim.skipMonths(2);
			return say(`Months of study sharpen your ${stat}.`);
		}
		case 'research': {
			if (me.gold < 20) return 'Researching innovations requires 20 gold for materials.';
			me.gold -= 20;
			sim.innovation += 20; // player deed: full effect
			me.renown += 3;
			const disc = checkNextDiscovery(sim.techs, sim.era, sim.rng);
			if (disc && sim.rng.chance(0.4)) {
				sim.techs.add(disc.id);
				sim.applyTechBonus(disc);
				return say(`Through diligent research, you pioneer a breakthrough: ${disc.name}!`);
			}
			sim.skipMonths(2);
			return say(`You devote months to research in ${here.name}, advancing global innovation (+20).`);
		}
		case 'buy': {
			if (me.cargo) return 'You already carry goods.';
			if (me.gold < 30) return 'Goods cost 30 gold.';
			me.gold -= 30;
			me.cargo = { from: here.id, cost: 30 };
			return say(`You load a cart with ${BIOMES[sim.c.biome[here.cell]].name.toLowerCase()} goods from ${here.name}.`);
		}
		case 'companion':
			return say(hireCompanion(sim) || `Your fellowship grows.`);
		case 'goto': {
			if (arg === undefined) return '';
			return sim.startTravel(arg) ?? say(`You set out for ${sim.w.burgs[arg].name}.`);
		}
		case 'enlist': {
			if (!pol?.alive) return 'You serve no realm.';
			if (me.role === 'ruler' || me.role === 'general') return 'You already command.';
			me.role = 'general';
			me.martial = Math.min(20, me.martial + 1);
			me.renown += 5;
			return say(`You take a commission and lead the soldiers of ${pol.name}.`);
		}
		case 'sell': {
			if (!me.cargo) return 'You carry nothing to sell.';
			const from = sim.w.burgs[me.cargo.from];
			const d = Math.hypot(from.x - here.x, from.y - here.y) / 30;
			const diff = sim.c.biome[from.cell] !== sim.c.biome[here.cell] ? 1.3 : 1;
			const war = local && sim.warsOf(local.id).length ? 1.4 : 1;
			const tip = sim.tradeTip && sim.tradeTip.burg === here.id && sim.year <= sim.tradeTip.until ? 2 : 1;
			const price = Math.round(me.cargo.cost * (0.8 + d * 0.12) * diff * war * tip * (0.85 + r() * 0.3) + me.stewardship);
			me.gold += price;
			me.renown += 1;
			me.cargo = undefined;
			return say(`You sell your goods in ${here.name} for ${price} gold.`);
		}
		case 'audience': {
			if (!local?.alive || here.id !== local.capital) return 'There is no court here.';
			const ruler = sim.ruler(local);
			if (me.renown >= 30 && me.state !== local.id) {
				me.state = local.id;
				me.role = me.martial >= me.diplomacy ? 'general' : 'priest';
				return say(`${ruler.name} welcomes you to court and names you ${me.role === 'general' ? 'a general' : 'a counsellor'} of ${local.name}.`);
			}
			if (me.gold >= 50) {
				me.gold -= 50;
				me.renown += 6;
				return say(`You present gifts to ${ruler.name}. Your name rises at court.`);
			}
			return say(`${ruler.name} barely notices you. (Need 30 renown or 50 gold.)`);
		}
		case 'pilgrim': {
			const rel = sim.w.religions[me.religion];
			me.renown += 3;
			me.health = Math.min(100, me.health + 10);
			sim.skipMonths(1);
			return say(`You pray at the temples of ${here.name}${rel ? ` to ${rel.deity}` : ''}.`);
		}
		case 'preach': {
			if (me.role !== 'prophet' && me.role !== 'priest') return 'Only prophets or priests can preach the creed.';
			const rel = sim.w.religions[me.religion];
			sim.c.religion[here.cell] = me.religion;
			const offerings = 15 + Math.round(me.diplomacy * 1.5) + r.int(0, 10);
			me.gold += offerings;
			me.renown += 4;
			sim.skipMonths(1);
			if (local?.alive && r.chance(0.35)) {
				local.religion = me.religion;
				local.stability = clamp(local.stability + 10, 0, 100);
				return say(`You preach the revelation of ${rel?.name ?? 'the faith'} in ${here.name}. The ruler and council embrace your divine creed!`);
			}
			return say(`You preach the revelation of ${rel?.name ?? 'the faith'} in ${here.name}, collecting ${offerings} gold in offerings from devout disciples.`);
		}
		case 'terrorize': {
			if (me.role !== 'villain') return 'Only villains can extort and terrorize.';
			const loot = Math.round(30 + me.martial * 2 + r.int(10, 25));
			me.gold += loot;
			me.renown += 4;
			if (local?.alive) {
				local.stability = clamp(local.stability - 12, 5, 100);
				local.treasury = Math.max(0, local.treasury - loot);
			}
			if (!me.traits.includes('Feared')) me.traits.push('Feared');
			sim.skipMonths(1);
			return say(`You terrorize ${here.name}, extorting ${loot} gold from terrified burghers!`);
		}
		case 'scourge': {
			if (me.role !== 'villain') return 'Only villains can summon a dark warband.';
			if (me.gold < 30) return 'Recruiting dark marauders requires 30 gold.';
			me.gold -= 30;
			me.renown += 8;
			if (pol?.alive) {
				pol.army = +(pol.army + 10).toFixed(1);
				pol.expansionism = Math.min(3, (pol.expansionism ?? 1) + 0.3);
			}
			sim.skipMonths(1);
			return say(`Dark raiders and bloodthirsty cutthroats rally to your banner in ${here.name}!`);
		}
		case 'hunt': {
			const c = sim.c;
			const nearby = [here.cell, ...Array.from(neighbors(c, here.cell))];
			const monster = sim.monsters.find((m) => m.alive && nearby.includes(m.cell));
			if (!monster) return `No legendary beasts stalk the wilderness near ${here.name}.`;
			sim.skipMonths(1);
			const martialBonus = me.traits.includes('Brave') ? 10 : 0;
			const rawDmg = Math.round(me.martial * 4.5 + martialBonus + r.int(15, 35));
			const res = resolveMonsterCombat(monster, rawDmg, `${me.name} ${me.house}`, sim.year, sim.rng);
			me.health = Math.max(5, me.health - res.damageTaken);

			if (!res.slain) {
				return say(`${res.summary} You sustained ${res.damageTaken} damage (health: ${me.health}) and retreated.`);
			}

			// Monster slain!
			const art = forgeMonsterRelic(
				sim.nextArtifactId++,
				sim.rng,
				sim.year,
				monster,
				`${me.name} ${me.house}`,
				'person',
				me.id,
				me.name
			);
			sim.artifacts.push(art);
			me.gold += 150;
			me.renown += 45;
			if (pol?.alive) pol.stability = clamp(pol.stability + 20, 0, 100);
			if (local?.alive) local.stability = clamp(local.stability + 20, 0, 100);
			sim.gainInnovation(40);

			let wonderText = '';
			if (monster.tier === 'cataclysm' || monster.tier === 'legendary') {
				const nextWdObj = { val: sim.nextWonderId };
				const shrine = createTitanShrineWonder(sim.w, monster.cell, monster.layer, monster, me.name, sim.year, nextWdObj);
				sim.nextWonderId = nextWdObj.val;
				sim.wonders.push(shrine);
				wonderText = ` The titan's remains are consecrated as the ${shrine.name} (${shrine.icon})!`;
			}

			return say(`VICTORY! You strike down ${monster.name}! You harvest rare materials (${monster.trophy || 'Dragonhide'}), earning 150 gold, +45 renown, and forging ${art.name}! Realm stability surges (+20).${wonderText}`);
		}
		case 'build_tower': {
			const isRuler = me.role === 'ruler' && pol?.alive;
			const cost = 60;
			if (isRuler && pol.treasury >= cost) {
				pol.treasury -= cost;
			} else if (me.gold >= cost) {
				me.gold -= cost;
			} else {
				return isRuler
					? `The treasury of ${pol.name} requires ${cost} gold (or personal gold) to erect a tower.`
					: `Erecting a high tower requires ${cost} gold for master architects and stone.`;
			}
			sim.skipMonths(2);
			const isMountain = sim.c.h[here.cell] > 50;
			const kind: LegendaryPlace['kind'] = (isMountain || me.role === 'magician' || r.chance(0.5)) ? 'tower_magic' : 'tower_trials';
			const builderName = isRuler ? `${me.name} of ${pol.name}` : `${me.name} ${me.house}`;
			const nextWdObj = { val: sim.nextWonderId };
			const tower = buildWonder(sim.w, here.cell, sim.burgLayer(here), kind, builderName, me.state || local?.id || 0, sim.year, nextWdObj, sim.rng);
			sim.nextWonderId = nextWdObj.val;
			sim.wonders.push(tower);
			me.renown += 15;
			if (local?.alive) local.stability = clamp(local.stability + 10, 0, 100);
			sim.gainInnovation(25);
			return say(`You commission the construction of ${tower.name} (${tower.icon}) in ${here.name}! Its battlements pierce the clouds. ${tower.effect}`);
		}
		case 'build_wonder': {
			const isRuler = me.role === 'ruler' && pol?.alive;
			const cost = 100;
			if (isRuler && pol.treasury >= cost) {
				pol.treasury -= cost;
			} else if (me.gold >= cost) {
				me.gold -= cost;
			} else {
				return isRuler
					? `The treasury of ${pol.name} requires ${cost} gold (or personal gold) to construct a world wonder.`
					: `Constructing a world wonder requires ${cost} gold for masons and artisans.`;
			}
			sim.skipMonths(3);
			const isCoastal = sim.c.dist[here.cell] <= 1;
			let kind: LegendaryPlace['kind'] = 'university';
			if (isCoastal && r.chance(0.5)) kind = 'giant_harbor';
			else if (sim.c.river[here.cell] && r.chance(0.4)) kind = 'bridge';
			else if (me.martial > 14 && r.chance(0.4)) kind = 'ancient_forge';
			else kind = 'university';

			const builderName = isRuler ? `${me.name} of ${pol.name}` : `${me.name} ${me.house}`;
			const nextWdObj = { val: sim.nextWonderId };
			const wonder = buildWonder(sim.w, here.cell, sim.burgLayer(here), kind, builderName, me.state || local?.id || 0, sim.year, nextWdObj, sim.rng);
			sim.nextWonderId = nextWdObj.val;
			sim.wonders.push(wonder);
			me.renown += 25;
			if (local?.alive) local.stability = clamp(local.stability + 15, 0, 100);
			if (pol?.alive) pol.stability = clamp(pol.stability + 15, 0, 100);
			sim.gainInnovation(35);
			return say(`A historic triumph! You complete the construction of ${wonder.name} (${wonder.icon}) in ${here.name}! ${wonder.effect}`);
		}
		case 'invest': {
			if (me.gold < 25) return 'Commercial investment requires 25 gold in capital.';
			me.gold -= 25;
			const profit = Math.round(25 + me.stewardship * 2.2 + (here.pop > 1.5 ? 8 : 2) + r.int(3, 16));
			me.gold += profit;
			me.renown += 2;
			if (me.role === 'wanderer' && r.chance(0.6)) me.role = 'trader';
			sim.skipMonths(2);
			return say(`You invest 25 gold in merchant caravans across ${here.name}, securing a return of ${profit} gold!`);
		}
		case 'enterprise': {
			if (me.gold < 75 || me.renown < 15) return 'Establishing a chartered enterprise requires 75 gold and 15 renown.';
			me.gold -= 75;
			me.role = 'entrepreneur';
			me.renown += 12;
			sim.gainInnovation(20);
			if (local?.alive) {
				local.treasury += 25;
				local.stability = clamp(local.stability + 6, 0, 100);
			}
			sim.skipMonths(3);
			return say(`You charter a grand commercial enterprise in ${here.name}, establishing merchant houses and bank vaults!`);
		}
		case 'infiltrate': {
			if (me.intrigue < 8) return 'Infiltration requires at least 8 intrigue.';
			if (me.gold < 25) return 'Infiltration requires 25 gold for bribes, disguise, and contacts.';
			me.gold -= 25;
			sim.skipMonths(1);
			const success = me.intrigue + r.int(1, 10) > 13;
			if (success) {
				const loot = 35 + r.int(5, 20);
				me.gold += loot;
				me.renown += 5;
				if (local?.alive && local.id !== me.state) {
					local.stability = Math.max(5, local.stability - 8);
				}
				return say(`You slip undetected into the citadels of ${here.name}, sabotaging rival records and seizing ${loot} gold in secret documents!`);
			}
			me.health = Math.max(10, me.health - 25);
			return say(`Alarm bells ring through ${here.name}! City sentries ambush your cell, wounding you before you evade capture.`);
		}
		case 'raze': {
			const standing = sim.wonders.find((w) => w.cell === here.cell && !w.destroyed);
			if (!standing) return 'There is no standing wonder or monument in sim city to raze.';
			const res = destroyWonder(standing, me.name, sim.year, 'razed and pillaged by personal decree');
			sim.log('wonder', res.event.text, here.cell, pol?.id);
			me.gold += 80;
			me.renown += 25;
			if (pol?.alive && me.role === 'ruler') pol.treasury += 50;
			if (!me.traits.includes('Feared')) me.traits.push('Feared');
			return say(`You raze ${standing.name} (${standing.icon}) to the earth! Sacking the ancient monument yields 80 gold in looted relics, leaving only smoldering ruins behind.`);
		}
		case 'raise': {
			// raise a rebellion and become a ruler
			if (!local?.alive) {
				if (me.renown < 25) return 'You need 25 renown to found a realm.';
				const np = sim.foundState(here.id, 'avatar', me);
				np.army += me.renown / 10;
				return say(`You proclaim the ${np.fullName} with yourself at its head!`);
			}
			if (here.id === local.capital) return 'You cannot rise in the capital itself.';
			if (me.renown < 40) return 'You need 40 renown to raise a revolt.';
			if (local.stability > 55 && me.intrigue < 12) return `${local.name} is too stable (stability ${local.stability.toFixed(0)}).`;
			const np = sim.revolt(local, here.cell, me);
			if (!np) return 'The town will not rise.';
			np.army += me.renown / 10;
			return say(`You raise your banner in ${here.name}: the ${np.fullName} is born!`);
		}
		case 'coup': {
			if (me.role !== 'general' || !pol?.alive) return 'Only a general can seize the throne.';
			const ruler = sim.ruler(pol);
			const chance = clamp(0.2 + (me.martial + me.intrigue - ruler.intrigue - 8) * 0.04 + (50 - pol.stability) / 100, 0.05, 0.85);
			if (r.chance(chance)) {
				sim.kill(ruler, 'your coup');
				sim.crown(pol, me);
				pol.stability -= 15;
				return say(`The palace falls to your soldiers. You are now ruler of ${pol.name}!`);
			}
			me.health -= 40;
			me.state = 0;
			me.role = 'wanderer';
			me.renown = Math.max(0, me.renown - 20);
			if (me.health <= 0) sim.kill(me, 'execution');
			return say(`Your coup fails! You flee ${pol.name} with a price on your head.`);
		}
		case 'revolution': {
			if (!local?.alive) return 'There is no organized realm here to overthrow.';
			if (here.id !== local.capital) return 'A revolution against the national government must be sparked in the capital.';
			if (me.renown < 35 && me.intrigue < 10) return 'You need at least 35 renown or 10 intrigue to rally the masses.';
			if (local.stability > 60 && me.intrigue < 14) return `${local.name} is too stable for an uprising (stability ${local.stability.toFixed(0)}).`;
			const targetIdeology: IdeologyKind = local.ideology === 'republic' ? 'communal' : 'republic';
			const res = transitionRegime(local, targetIdeology, 'revolution', sim.year, sim.rng, sim.people, { customLeader: me });
			for (const ev of res.events) sim.log(ev.kind, ev.text, ev.cell, ev.state);
			sim.dirty.political = true;
			me.role = 'ruler';
			me.renown += 30;
			return say(`You lead the masses to storm the palace! The old order is toppled, and you are proclaimed leader of the ${local.fullName}!`);
		}
		case 'stir_riot': {
			if (!local?.alive) return 'There is no organized authority here to riot against.';
			local.stability = Math.max(5, local.stability - 14);
			local.treasury = Math.max(0, local.treasury - 20);
			me.gold += 25;
			me.renown += 8;
			sim.log('uprising', `${me.name} incites a furious riot in ${here.name}! Mobs storm municipal storehouses and clash with royal bailiffs of ${local.name}.`, here.cell, local.id);
			return say(`You incite a roaring riot in ${here.name}! The crowds ransack storehouses, yielding 25 gold in looted supplies while shaking the realm's order.`);
		}
		case 'found_cult': {
			me.intrigue = Math.min(20, me.intrigue + 2);
			me.renown += 12;
			const cultTitle = `Order of ${me.name}`;
			sim.uprisings.push({
				id: sim.uprisings.length + 1,
				kind: 'cult',
				subtype: 'eldritch_cult',
				title: cultTitle,
				burgId: here.id,
				burgName: here.name,
				stateId: local?.id ?? 0,
				stateName: local?.name ?? 'Wilds',
				year: sim.year,
				cell: here.cell,
				leaderName: me.name,
				leaderId: me.id,
				description: `Clandestine mystery cabal founded by ${me.name}.`,
				active: true
			});
			sim.log('uprising', `${me.name} initiates a clandestine esoteric cabal in ${here.name}, drawing initiates into dark subterranean vaults.`, here.cell, local?.id);
			return say(`You initiate a secret esoteric coven in the shadows of ${here.name}!`);
		}
		case 'proclaim_prophecy': {
			me.traits = [...new Set([...me.traits, 'Prophet', 'Visionary'])];
			me.renown += 20;
			if (local?.alive) local.stability = Math.min(100, local.stability + 10);
			here.pop = +(here.pop + 0.3).toFixed(2);
			sim.uprisings.push({
				id: sim.uprisings.length + 1,
				kind: 'prophet',
				subtype: 'ascetic_reformer',
				title: `Sermons of ${me.name}`,
				burgId: here.id,
				burgName: here.name,
				stateId: local?.id ?? 0,
				stateName: local?.name ?? 'Wilds',
				year: sim.year,
				cell: here.cell,
				leaderName: me.name,
				leaderId: me.id,
				description: `Spiritual prophecy and moral revival proclaimed by ${me.name}.`,
				active: true
			});
			sim.log('uprising', `${me.name} climbs the temple steps in ${here.name}, proclaiming holy prophecy! Multitudes flock to receive spiritual blessings.`, here.cell, local?.id);
			return say(`You climb the sacred steps of ${here.name} and proclaim divine prophecy! Pilgrims flock from afar.`);
		}
		case 'rally_hero': {
			me.traits = [...new Set([...me.traits, 'Hero', 'Champion'])];
			me.renown += 25;
			if (local?.alive) {
				local.stability = Math.min(100, local.stability + 15);
				local.army = +(local.army * 1.08).toFixed(1);
			}
			sim.uprisings.push({
				id: sim.uprisings.length + 1,
				kind: 'hero',
				subtype: 'border_paladin',
				title: `Vow of ${me.name}`,
				burgId: here.id,
				burgName: here.name,
				stateId: local?.id ?? 0,
				stateName: local?.name ?? 'Wilds',
				year: sim.year,
				cell: here.cell,
				leaderName: me.name,
				leaderId: me.id,
				description: `Sworn folk champion and defender ${me.name}.`,
				active: true
			});
			sim.log('uprising', `${me.name} steps forward in ${here.name} as a champion of the common folk, vowing to defend the innocent from all tyrants.`, here.cell, local?.id);
			return say(`You draw your blade and swear a sacred oath as folk champion in ${here.name}!`);
		}
		// ── ruler actions ──
		case 'war': {
			if (me.role !== 'ruler' || arg === undefined) return '';
			const t = sim.polities[arg];
			if (!t?.alive || t.id === pol.id) return 'Invalid target.';
			if (sim.atWar(pol.id, t.id)) return 'Already at war.';
			sim.declareWar(pol.id, t.id, 'by your command');
			return '';
		}
		case 'peace': {
			if (me.role !== 'ruler') return '';
			const ws = sim.warsOf(pol.id);
			if (!ws.length) return 'You are at peace.';
			const w = ws[0];
			const mine = w.attackers.includes(pol.id) ? 1 : -1;
			const myScore = w.score * mine;
			const accept = myScore > 0 || r.chance(0.35 + (me.diplomacy - 8) * 0.04);
			if (!accept) return say('Your envoys return with a curt refusal.');
			sim.finishWar(w, myScore > 8 ? (mine > 0 ? 'attackers' : 'defenders') : 'white');
			return '';
		}
		case 'ally': {
			if (me.role !== 'ruler' || arg === undefined) return '';
			const t = sim.polities[arg];
			if (sim.rel(pol.id, t.id) < 25 && !r.chance(me.diplomacy / 40)) return say(`${t.name} declines your alliance (relations ${sim.rel(pol.id, t.id).toFixed(0)}).`);
			pol.allies.push(t.id);
			t.allies.push(pol.id);
			return say(`${pol.name} and ${t.name} are now allies.`);
		}
		case 'gift': {
			if (me.role !== 'ruler' || arg === undefined) return '';
			if (pol.treasury < 20) return 'The treasury cannot spare 20.';
			pol.treasury -= 20;
			sim.addRel(pol.id, arg, 25);
			return say(`Gifts flow to ${sim.polities[arg].name}.`);
		}
		case 'festival':
			if (me.role !== 'ruler') return '';
			if (pol.treasury < 25) return 'The treasury cannot spare 25.';
			pol.treasury -= 25;
			pol.stability = clamp(pol.stability + 12, 0, 100);
			me.renown += 3;
			return say(`Feasts and games in ${here.name}! The people cheer.`);
		case 'tax+':
			if (me.role !== 'ruler') return '';
			pol.tax = Math.min(0.3, pol.tax + 0.03);
			return say(`Taxes rise to ${(pol.tax * 100).toFixed(0)}%.`);
		case 'tax-':
			if (me.role !== 'ruler') return '';
			pol.tax = Math.max(0.03, pol.tax - 0.03);
			return say(`Taxes fall to ${(pol.tax * 100).toFixed(0)}%.`);
		case 'recruit': {
			if (me.role !== 'ruler') return '';
			const cost = 30;
			if (pol.treasury < cost) return 'Not enough gold in the treasury.';
			pol.treasury -= cost;
			pol.army += pol.pop * 0.01 + 1;
			pol.stability -= 2;
			return say('Levies are raised across the realm.');
		}
		case 'secularize': {
			if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can decree state policy.';
			if (pol.secularized) return `${pol.name} has already enacted State Atheism.`;
			pol.secularized = true;
			pol.secularYear = sim.year;
			pol.religion = 0;
			pol.patronDeity = undefined;
			pol.patronFavor = 0;
			pol.treasury += 70;
			me.gold += 30;
			me.renown += 15;
			sim.log('faith', `STATE ATHEISM DECREED: Ruler ${me.name} of ${pol.name} formally abolishes official religion! Monasteries and temples are nationalized (+70 gold to treasury), and ecclesiastical privileges are eliminated.`, here.cell, pol.id);
			return say(`You issue a revolutionary decree of State Atheism in ${pol.name}! Temple treasuries are confiscated (+70 treasury, +30 personal gold), and ecclesiastical dogma is suppressed.`);
		}
		case 'proclaim_republic': {
			if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can transform state governance.';
			if (pol.ideology === 'republic') return `${pol.name} is already a republic.`;
			const res = transitionRegime(pol, 'republic', 'avatar', sim.year, sim.rng, sim.people);
			for (const ev of res.events) sim.log(ev.kind, ev.text, ev.cell, ev.state);
			sim.dirty.political = true;
			me.renown += 20;
			return say(`You promulgate a new constitution! ${pol.name} is now the ${pol.fullName} with an elected assembly.`);
		}
		case 'proclaim_union': {
			if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can transform state governance.';
			if (pol.ideology === 'communal') return `${pol.name} is already a free union.`;
			const res = transitionRegime(pol, 'communal', 'avatar', sim.year, sim.rng, sim.people);
			for (const ev of res.events) sim.log(ev.kind, ev.text, ev.cell, ev.state);
			sim.dirty.political = true;
			me.renown += 20;
			return say(`You proclaim the ${pol.fullName}! Common lands are granted to the folk moots and communes.`);
		}
		case 'proclaim_monarchy': {
			if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can transform state governance.';
			if (pol.ideology === 'monarchy') return `${pol.name} is already a monarchy.`;
			const res = transitionRegime(pol, 'monarchy', 'avatar', sim.year, sim.rng, sim.people);
			for (const ev of res.events) sim.log(ev.kind, ev.text, ev.cell, ev.state);
			sim.dirty.political = true;
			me.renown += 20;
			return say(`You crown yourself Sovereign of the ${pol.fullName}! Dynastic rule is formally established.`);
		}
		case 'abdicate': {
			if (me.role !== 'ruler') return '';
			const heir = sim.people[pol.heir];
			if (!heir?.alive) return 'You have no heir.';
			sim.crown(pol, heir);
			me.role = 'wanderer';
			sim.avatar = heir.id;
			return say(`You step down. ${heir.name} takes the crown, and you play on as them.`);
		}
	}
	return '';
}

/** draw from the base deck plus the genre's own deck (weighted ×2 so it feels present) */
export function encounter(sim: Simulation): Encounter {
	const extra = packEncounters(sim.voice);
	const deck = [...ENCOUNTERS, ...extra, ...extra];
	const e = sim.rng.pick(deck);
	const g = sim.voice;
	return { ...e, title: reskin(g, e.title), text: reskin(g, e.text), options: e.options.map((o) => ({ ...o, label: reskin(g, o.label), win: { ...o.win, text: reskin(g, o.win.text) }, lose: o.lose && { ...o.lose, text: reskin(g, o.lose.text) } })) };
}
