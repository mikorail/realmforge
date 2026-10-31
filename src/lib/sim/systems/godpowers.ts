/** God powers: the POWERS table, casting on a target, casting on a random target. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { neighbors } from '../../gen/grid';
import { makeLang } from '../../gen/names';
import { palette } from '../../gen/society';
import { SEA, type Culture, type Religion, type World } from '../../gen/types';
import { forgeArtifact } from '../relics';
import { checkNextDiscovery } from '../tech';
import { techName } from '../genre/techskins';
import { buildWonder, destroyWonder } from '../wonders';
import { MONSTER_ARCHETYPES } from '../monsters';
import { transitionRegime } from '../politics';
import { emancipate } from '../society/orders';
import type { Monster, LegendaryPlace, IdeologyKind, Polity, War } from '../types';

export type Power =
	| 'bless'
	| 'inspire'
	| 'host'
	| 'peace'
	| 'hero'
	| 'prophet'
	| 'relic'
	| 'enlighten'
	| 'raise'
	| 'sink'
	| 'dig'
	| 'cataclysm'
	| 'species'
	| 'monster'
	| 'discord'
	| 'chaos'
	| 'rebel'
	| 'smite'
	| 'villain'
	| 'plague'
	| 'pandemic'
	| 'meteor'
	| 'tear'
	| 'alien'
	| 'apocalypse'
	| 'wonder'
	| 'patron'
	| 'reform'
	| 'revolution'
	| 'coup'
	| 'worldwar'
	| 'ragnarok'
	| 'conspiracy'
	| 'resurgence'
	| 'emancipate';

export const POWERS: Record<Power, { name: string; cost: number; icon: string; desc: string }> = {
	dig: { name: 'Dig Caverns', cost: 6, icon: '⛏', desc: 'Carve new caverns and tunnels in the underdark below' },
	bless: { name: 'Bless', cost: 8, icon: '✦', desc: 'Fertility + calm around the target' },
	inspire: { name: 'Inspire', cost: 15, icon: '☀', desc: 'Realm stability +30, coffers +' },
	host: { name: 'Divine Host', cost: 30, icon: '⚔', desc: 'Realm army ×1.6' },
	peace: { name: 'Peace', cost: 20, icon: '☮', desc: 'End all wars of the realm' },
	hero: { name: 'Raise Hero', cost: 15, icon: '★', desc: 'A gifted hero appears at the nearest town' },
	prophet: { name: 'Anoint Prophet', cost: 20, icon: '🕊', desc: 'A visionary prophet appears, founding a fervent faith' },
	relic: { name: 'Forge Relic', cost: 20, icon: '👑', desc: 'Bestow a sacred heirloom upon the realm' },
	enlighten: { name: 'Enlighten', cost: 25, icon: '💡', desc: 'Bestow an era breakthrough upon the world' },
	raise: { name: 'Raise Land', cost: 3, icon: '▲', desc: 'Lift the earth (brush)' },
	sink: { name: 'Sink Land', cost: 3, icon: '▼', desc: 'Drown the earth (brush)' },
	cataclysm: { name: 'Cataclysm', cost: 35, icon: '🌋', desc: 'Trigger a tectonic cataclysm across the lands' },
	species: { name: 'Spawn Species', cost: 35, icon: '🧬', desc: 'An exotic folk emerges to carve out their dominion' },
	monster: { name: 'Awaken Beast', cost: 30, icon: '🐉', desc: 'Awaken a legendary beast at this location' },
	wonder: { name: 'Consecrate Wonder', cost: 35, icon: '🏛', desc: 'Consecrate a grand wonder or mystic tower' },
	discord: { name: 'Discord', cost: 12, icon: '⚡', desc: 'Neighbours grow to hate this realm' },
	chaos: { name: 'Unleash Chaos', cost: 25, icon: '🌪', desc: 'Shatter stability, incite mutiny, and trigger civil wars' },
	rebel: { name: 'Incite Revolt', cost: 25, icon: '✊', desc: 'A town rises against its ruler' },
	smite: { name: 'Smite Ruler', cost: 25, icon: '☠', desc: 'Strike down the ruler' },
	villain: { name: 'Spawn Villain', cost: 30, icon: '🦹', desc: 'A dark warlord arises with an army of dread' },
	plague: { name: 'Plague', cost: 20, icon: '☣', desc: 'A pestilence begins here' },
	pandemic: { name: 'Great Pestilence', cost: 35, icon: '💀', desc: 'A virulent black death sweeps across whole provinces' },
	meteor: { name: 'Meteor', cost: 40, icon: '☄', desc: 'Obliterate a region' },
	tear: { name: 'Tear Rift', cost: 45, icon: '🌀', desc: 'Rend the cosmic veil to connect another world' },
	alien: { name: 'Alien Invasion', cost: 45, icon: '🛸', desc: 'Extraterrestrial dreadnought descends to subjugate the world' },
	apocalypse: { name: 'Apocalypse Omen', cost: 55, icon: '🌑', desc: 'A blood eclipse and cataclysm bring the world to the brink' },
	patron: { name: 'Crown Chosen Realm', cost: 25, icon: '👑', desc: 'Anoint this nation as your Chosen Realm, granting supreme celestial protection and favor' },
	reform: { name: 'Divine Reform', cost: 20, icon: '📜', desc: 'Inspire the sovereign and estates to peacefully adopt sweeping constitutional reforms' },
	revolution: { name: 'Divine Revolution', cost: 25, icon: '✊', desc: 'Ignite a righteous popular revolution to topple autocracy and establish a new republic or union' },
	coup: { name: 'Divine Coup', cost: 25, icon: '⚔️', desc: 'Overthrow the ruler via a military putsch or palace conspiracy to transform the realm system' },
	worldwar: { name: 'Incite World War', cost: 50, icon: '🌐', desc: 'Polarize all nations into two ideological coalitions locked in total global war' },
	ragnarok: { name: 'True Ragnarok', cost: 60, icon: '🐺', desc: 'Summon the World-Eaters and Harbingers of the End, forcing a mortal stalemate' },
	conspiracy: { name: 'Grand Conspiracy', cost: 30, icon: '🗡️', desc: 'Shatter an empire from within through assassination, bankruptcy, and mutiny' },
	resurgence: { name: 'Phoenix Resurgence', cost: 35, icon: '🦅', desc: 'Resurrect a fallen or dying realm into a burgeoning golden empire' },
	emancipate: { name: 'Emancipate', cost: 18, icon: '🕊', desc: 'End the unfree, caste or feudal order of a realm; it becomes a free society' }
};

export function canCast(sim: Simulation, p: Power) {
	return sim.sandbox || sim.mana >= POWERS[p].cost;
}

export function cast(sim: Simulation, power: Power, cell: number, layer = 0): string | null {
	if (!sim.canCast(power)) return 'Not enough divine power.';
	const c = sim.c;
	if (layer > 0 && ['meteor', 'raise', 'sink', 'cataclysm', 'apocalypse', 'ragnarok'].includes(power)) layer = 0;
	const pol = sim.stateAt(cell, layer);
	const hasRealm = pol && pol.alive && pol.id > 0;
	const needRealm = ['inspire', 'host', 'peace', 'discord', 'chaos', 'rebel', 'smite', 'relic', 'patron', 'reform', 'revolution', 'coup', 'conspiracy', 'emancipate'].includes(power);
	if (needRealm && !hasRealm) return 'Choose a realm.';
	const spend = () => { if (!sim.sandbox) sim.mana -= POWERS[power].cost; };
	const area = (radius: number, center = cell) => {
		const out = [center];
		const seen = new Set(out);
		let ring = [center];
		for (let d = 0; d < radius; d++) {
			const next: number[] = [];
			for (const i of ring) for (const j of neighbors(c, i)) if (!seen.has(j)) { seen.add(j); next.push(j); out.push(j); }
			ring = next;
		}
		return out;
	};
	switch (power) {
		case 'bless': {
			for (const i of area(3)) { if (sim.isLand(i)) c.pop[i] *= 1.4; sim.plague[i] = 0; }
			if (hasRealm) pol.stability = clamp(pol.stability + 8, 0, 100);
			sim.log('god', `A radiant celestial aura descends upon the lands ${hasRealm ? `of ${pol.name}` : ''}: fields flourish and sick beds are cleansed by divine grace.`, cell, pol?.id);
			break;
		}
		case 'plague':
			sim.seedPlague(cell, 1);
			break;
		case 'meteor': {
			const hit = area(2);
			for (const i of hit) {
				if (!sim.isLand(i)) continue;
				c.pop[i] *= 0.1;
				if (c.burg[i]) {
					const b = sim.w.burgs[c.burg[i]];
					b.alive = false;
					for (const p of sim.people) if (p.alive && p.burg === b.id) sim.kill(p, 'the falling star');
					c.burg[i] = 0;
					const owner = sim.polities[b.state];
					if (owner?.capital === b.id && !sim.relocateCapital(owner)) sim.fall(owner);
				}
			}
			for (const w of sim.wonders) {
				if (!w.destroyed && hit.includes(w.cell)) {
					const res = destroyWonder(w, 'Falling Celestial Meteor', sim.year, 'shattered by kinetic impact of a falling star');
					sim.log('wonder', res.event.text, w.cell, w.stateId);
				}
			}
			c.h[cell] = 12;
			for (const j of neighbors(c, cell)) c.h[j] = Math.max(SEA - 2, c.h[j] - 25);
			sim.terraform();
			sim.log('god', `A blazing star falls screaming from the heavens${hasRealm ? ` upon ${pol.name}` : ''}, shattering the earth and leaving a smoking, glass-rimmed crater-lake.`, cell, pol?.id);
			break;
		}
		case 'raise':
		case 'sink': {
			for (const i of area(1)) c.h[i] = clamp(c.h[i] + (power === 'raise' ? (i === cell ? 8 : 5) : i === cell ? -8 : -5), 0, 100);
			sim.terraform();
			break;
		}
		case 'smite': {
			const ruler = sim.ruler(pol);
			if (!ruler?.alive) return 'No ruler to smite.';
			sim.log('god', `A deafening thunderclap splits the firmament: blinding lightning strikes ${ruler.name} of ${pol.name} dead upon their throne before the horrified court!`, cell, pol.id);
			sim.kill(ruler, 'divine wrath');
			break;
		}
		case 'discord':
			for (const n of sim.neighborsOf(pol.id)) sim.addRel(pol.id, n, -45);
			pol.allies = [];
			for (const p of sim.polities) p.allies = p.allies.filter((a) => a !== pol.id);
			sim.log('god', `Invisible malice whispers in the halls of princes: distrust and paranoia poison relations between ${pol.name} and its neighbours.`, cell, pol.id);
			break;
		case 'inspire':
			pol.stability = clamp(pol.stability + 30, 0, 100);
			pol.treasury += 40;
			sim.log('god', `Heavenly visions of imperial glory inflame the hearts of soldiers and nobility across ${pol.name}.`, cell, pol.id);
			break;
		case 'host':
			pol.army = pol.army * 1.6 + 2;
			sim.log('god', `A celestial vanguard of luminous champions descends from the sky, taking up spears beneath the banners of ${pol.name}!`, cell, pol.id);
			break;
		case 'peace': {
			const ws = sim.warsOf(pol.id);
			if (!ws.length) return `${pol.name} is at peace already.`;
			for (const w of ws) sim.finishWar(w, 'white');
			sim.log('god', `An awe-inspiring decree echoes from the heavens: the gods command peace, and ${pol.name} humbly lays down its arms.`, cell, pol.id);
			break;
		}
		case 'rebel': {
			const np = sim.revolt(pol, cell);
			if (!np) return 'No town here can rise.';
			void layer;
			break;
		}
		case 'hero': {
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));
			const h = sim.makePerson(b.culture, 0, b.id, 'hero', 18);
			h.martial += 6; h.diplomacy += 4; h.stewardship += 3; h.intrigue += 3; h.renown = 25; h.gold = 50;
			h.traits = ['Brave', 'Lucky'];
			sim.log('god', `A miraculous celestial sign heralds the birth of a child of destiny, ${h.name}, in ${b.name}. Prophecies foresee a legendary path.`, b.cell, b.state);
			break;
		}
		case 'relic': {
			const art = forgeArtifact(sim.nextArtifactId++, sim.rng, sim.year, sim.lang(pol.culture), 'polity', pol.id, pol.name, `Bestowed by divine grace in year ${sim.year}.`);
			sim.artifacts.push(art);
			pol.stability = clamp(pol.stability + 15, 0, 100);
			sim.log('god', `The clouds part as heavenly messengers bestow the sacred artifact ${art.name} upon the throne of ${pol.name}!`, cell, pol.id);
			break;
		}
		case 'cataclysm': {
			const hitCells = area(3);
			for (const i of hitCells) {
				if (sim.isLand(i)) c.pop[i] *= 0.4;
				c.h[i] = clamp(c.h[i] + (sim.rng() - 0.5) * 20, 5, 95);
			}
			for (const w of sim.wonders) {
				if (!w.destroyed && hitCells.includes(w.cell)) {
					const res = destroyWonder(w, 'Tectonic Cataclysm', sim.year, 'consumed by subterranean faultline chasms');
					sim.log('wonder', res.event.text, w.cell, w.stateId);
				}
			}
			sim.terraform();
			sim.log('god', `A terrifying cataclysm violently heaves the bedrock: cliffs plunge into the abyss and chasms tear across the continents!`, cell);
			break;
		}
		case 'dig': {
			// carve on the viewed deep layer, or the first one beneath the surface
			const li = sim.w.layers[layer]?.kind === 'deep' ? layer : sim.w.layers.findIndex((l) => l.kind === 'deep');
			if (li < 0) return 'This world has no underdark.';
			const L = sim.w.layers[li];
			const owners = new Map<number, number>();
			const carve = [cell];
			const seen = new Set(carve);
			for (let d = 0; d < 2; d++) for (const i of [...carve]) for (const j of neighbors(c, i)) if (!seen.has(j)) { seen.add(j); carve.push(j); }
			for (const i of carve) for (const j of neighbors(c, i)) if (L.open[j] && L.state[j]) owners.set(L.state[j], (owners.get(L.state[j]) ?? 0) + 1);
			const owner = [...owners].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
			for (const i of carve) if (!L.open[i]) { L.open[i] = 1; L.state[i] = owner; }
			sim.dirty.terrain = true;
			sim.log('god', `The earth groans: new caverns open in ${L.name}${owner ? `, and ${sim.polities[owner].name} spreads into them` : ''}.`, cell, owner || undefined);
			break;
		}
		case 'tear': {
			if (!sim.cosmos || sim.cosmos.u.planets.length < 2) {
				return 'Need multiple planets in the cosmos to tear a rift.';
			}
			const bHere = sim.lb[layer][cell] ? sim.w.burgs[sim.lb[layer][cell]] : sim.w.burgs.find((b) => b.id && b.alive);
			if (!bHere) return 'No settlement nearby to anchor a rift.';
			const otherPlanets = sim.cosmos.u.planets.map((_, i) => i).filter((i) => i !== sim.planetIndex);
			const targetPlanetIdx = sim.rng.pick(otherPlanets);
			const targetWorld = sim.cosmos.u.planets[targetPlanetIdx];
			const targetBurgs = targetWorld.burgs.filter((b) => b.id && b.alive);
			if (!targetBurgs.length) return 'The far world has no settlements to anchor.';
			const bFar = sim.rng.pick(targetBurgs);
			sim.cosmos.tearRift(sim.planetIndex, bHere.id, targetPlanetIdx, bFar.id);
			sim.log('god', `The fabric of space tears open! A rift now links ${sim.w.name} to ${targetWorld.name}.`, cell);
			break;
		}
		case 'enlighten': {
			sim.innovation += 60; // divine act: full effect
			const unlocked = checkNextDiscovery(sim.techs, sim.era, sim.rng);
			if (unlocked) {
				sim.techs.add(unlocked.id);
				sim.applyTechBonus(unlocked);
				sim.log('god', `Divine enlightenment descends: ${techName(sim.voice, unlocked.id, unlocked.name)} is revealed to the world!`, cell, pol?.id);
			} else {
				sim.log('god', `Divine enlightenment inspires scholars across ${sim.w.name}!`, cell, pol?.id);
			}
			break;
		}
		case 'chaos': {
			pol.treasury = Math.floor(pol.treasury * 0.4);
			pol.allies = [];
			for (const p of sim.polities) p.allies = p.allies.filter((a) => a !== pol.id);
			for (const n of sim.neighborsOf(pol.id)) sim.addRel(pol.id, n, -40);
			const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.id && b.alive && b.state === pol.id && b.id !== pol.capital);
			for (const t of sim.rng.shuffle(towns).slice(0, 2)) {
				sim.revolt(pol, t.cell);
			}
			pol.stability = Math.min(25, Math.max(5, pol.stability - 50));
			for (const p of sim.idx.living(sim.people).filter((x) => x.state === pol.id)) {
				if (!p.traits.includes('Paranoid') && sim.rng.chance(0.5)) p.traits.push('Paranoid');
			}
			sim.log('god', `Chaos consumes ${pol.fullName}! Riots shatter the cities, mutinous garrisons revolt, and the realm plunges into anarchy.`, cell, pol.id);
			break;
		}
		case 'pandemic': {
			const afflicted = area(4);
			for (const i of afflicted) {
				if (!sim.isLand(i)) continue;
				sim.plague[i] = 1.0;
				c.pop[i] = Math.max(0.01, c.pop[i] * 0.45);
				const bId = c.burg[i];
				if (bId) {
					const b = sim.w.burgs[bId];
					b.pop = Math.max(0.1, b.pop * 0.4);
					const owner = sim.polities[b.state];
					if (owner?.alive) owner.stability = clamp(owner.stability - 15, 0, 100);
					for (const p of sim.people.filter((x) => x.alive && x.burg === bId)) {
						if (sim.rng.chance(0.35)) sim.kill(p, 'the Great Pestilence');
					}
				}
			}
			sim.log('god', `The Great Pestilence strikes! A virulent black death sweeps across whole provinces, filling mass graves and emptying cities.`, cell, pol?.id);
			break;
		}
		case 'villain': {
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			if (!burgs.length) return 'No settlement found to raise a villain.';
			const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));
			const v = sim.makePerson(b.culture, 0, b.id, 'villain', sim.rng.int(26, 48));
			v.martial = 18; v.intrigue = 16; v.renown = 50; v.gold = 100; v.health = 100;
			v.traits = ['Cruel', 'Ambitious', 'Ruthless', 'Fierce'];
			const epithet = sim.rng.pick(['the Despoiler', 'the Scourge', 'the Dread', 'Blood-Drinker', 'the Defiler', 'Shadow-Bane']);
			v.name = `${v.name} ${epithet}`;

			const art = forgeArtifact(sim.nextArtifactId++, sim.rng, sim.year, sim.lang(b.culture), 'person', v.id, v.name, 'Forged in malice to conquer the mortal realms.');
			art.fame = 45; art.bonusVal = 4; art.kind = 'weapon'; art.icon = '⚔'; art.name = `Dread Blade of ${v.name.split(' ')[0]}`;
			sim.artifacts.push(art);

			const scourge = sim.foundState(b.id, 'scourge', v);
			const li = sim.burgLayer(b);
			const S = sim.st(li);
			for (const j of neighbors(c, b.cell)) if (sim.open(li, j)) S[j] = scourge.id;
			scourge.name = `${v.name.split(' ')[0]}'s Horde`;
			scourge.form = 'Dread Host';
			scourge.fullName = `Dread Host of ${v.name}`;
			scourge.color = '#3b0a0a';
			scourge.expansionism = 2.8;
			scourge.army = 65 + sim.rng.int(10, 30);
			scourge.stability = 80;

			sim.recount();
			const targets = sim.neighborsOf(scourge.id).filter((n) => n && n !== scourge.id);
			for (const target of targets.slice(0, 2)) {
				sim.declareWar(scourge.id, target, 'apocalyptic conquest');
			}

			sim.log('god', `The villain ${v.name} rises in ${b.name}! Wielding the ${art.name}, their Dread Host marches to conquer the world!`, b.cell, scourge.id);
			break;
		}
		case 'apocalypse': {
			const hit = area(5);
			const hitStates = new Set<number>();
			for (const i of hit) {
				if (!sim.isLand(i)) continue;
				if (c.state[i]) hitStates.add(c.state[i]);
			}
			const landHits = sim.rng.shuffle(hit.filter((i) => sim.isLand(i))).slice(0, 8);
			for (const k of landHits) {
				c.h[k] = clamp(c.h[k] + (sim.rng() - 0.5) * 25, 8, 92);
				c.pop[k] = Math.max(0.01, c.pop[k] * 0.15);
				if (c.burg[k]) {
					const b = sim.w.burgs[c.burg[k]];
					b.pop = Math.max(0.1, b.pop * 0.25);
				}
			}
			for (const sid of hitStates) {
				const p = sim.polities[sid];
				if (p?.alive) {
					p.stability = clamp(p.stability - 35, 5, 100);
					p.army = Math.max(1, p.army * 0.65);
					p.treasury = Math.floor(p.treasury * 0.5);
				}
			}
			const burgsInHit = sim.w.burgs.filter((b) => b.id && b.alive && hit.includes(b.cell));
			for (const b of sim.rng.shuffle(burgsInHit).slice(0, 3)) {
				const owner = sim.polities[b.state];
				if (owner?.alive && b.id !== owner.capital) {
					sim.revolt(owner, b.cell);
				}
			}
			for (const w of sim.wonders) {
				if (!w.destroyed && hit.includes(w.cell)) {
					const res = destroyWonder(w, 'Apocalyptic Calamity', sim.year, 'shattered during the apocalyptic blood eclipse');
					sim.log('wonder', res.event.text, w.cell, w.stateId);
				}
			}
			sim.terraform();
			sim.log('god', `DOOMSDAY OMENS: The skies bleed crimson as an apocalyptic cataclysm tears through ${sim.w.name}! Mountains buckle, cities burn, and panic grips civilization.`, cell);
			break;
		}
		case 'prophet': {
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			if (!burgs.length) return 'No settlement found to anoint a prophet.';
			const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));
			const pr = sim.makePerson(b.culture, b.state, b.id, 'prophet', sim.rng.int(22, 50));
			pr.diplomacy = 18; pr.martial = 4; pr.stewardship = 12; pr.intrigue = 8; pr.renown = 45; pr.gold = 40;
			pr.traits = ['Zealous', 'Charismatic', 'Wise', 'Honest'];

			const relId = sim.w.religions.length;
			const relName = sim.rng.pick(['Order of the Sacred Dawn', 'Covenant of the Celestial Star', 'Children of the Eternal Flame', 'Way of the Pure Light', 'Disciples of the Living Cosmos', `${pr.name}ite Revelation`]);
			const newRel: Religion = {
				id: relId,
				name: relName,
				color: '#e8c468',
				type: 'Organized',
				deity: `${pr.name}'s Divine Vision`,
				center: b.cell,
				culture: b.culture
			};
			sim.w.religions.push(newRel);
			pr.religion = relId;
			c.religion[b.cell] = relId;
			for (const j of area(2)) {
				if (sim.isLand(j)) c.religion[j] = relId;
			}

			const localPol = sim.polities[b.state];
			if (localPol?.alive) {
				localPol.religion = relId;
				localPol.stability = clamp(localPol.stability + 20, 0, 100);
				if (sim.rng.chance(0.4)) {
					localPol.form = 'Holy Theocracy';
					localPol.fullName = `Holy Theocracy of ${localPol.name}`;
				}
			}

			const tome = forgeArtifact(sim.nextArtifactId++, sim.rng, sim.year, sim.lang(b.culture), 'person', pr.id, pr.name, `Penned by the prophet ${pr.name} under divine revelation.`);
			tome.kind = 'tome';
			tome.icon = '📜';
			tome.name = `Holy Scripture of ${relName}`;
			tome.fame = 40;
			tome.bonusVal = 5;
			sim.artifacts.push(tome);

			sim.log('god', `The Holy Prophet ${pr.name} proclaims the ${relName} in ${b.name}! Miracles and holy visions inspire the populace, sweeping across the provinces.`, b.cell, b.state);
			break;
		}
		case 'species': {
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			if (!burgs.length) return 'No settlement found to anchor the new species.';
			const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));

			const specDef = sim.rng.pick([
				{ name: 'Saurian Brood', sphere: 'Eldritch', form: 'Brood-Kingdom' },
				{ name: 'Chitin Hive-Folk', sphere: 'Steppe', form: 'Hive-Colony' },
				{ name: 'Gorgon Kin', sphere: 'Hellenic', form: 'Ophidian Dominion' },
				{ name: 'Myconid Sporefolk', sphere: 'Boreal', form: 'Spore-Collective' },
				{ name: 'Star-Elves', sphere: 'Latinate', form: 'Astral Principality' },
				{ name: 'Crystal Golems', sphere: 'Nordic', form: 'Resonant Enclave' },
				{ name: 'Deep Chimera', sphere: 'Eldritch', form: 'Beast-Dominion' }
			]);

			const cultId = sim.w.cultures.length;
			const newCulture: Culture = {
				id: cultId,
				name: specDef.name,
				color: palette(sim.rng, 1, 65, 50)[0],
				center: b.cell,
				type: 'Generic',
				lang: cultId,
				sphere: specDef.sphere,
				layer: 'surface'
			};
			sim.w.cultures.push(newCulture);
			sim.langs[cultId] = makeLang(sim.w.opts.seed + ':species:' + cultId, specDef.sphere);

			b.culture = cultId;
			for (const j of area(2)) {
				if (sim.isLand(j)) c.culture[j] = cultId;
			}

			const leader = sim.makePerson(cultId, 0, b.id, 'ruler', sim.rng.int(20, 45));
			leader.traits.push('Fierce', 'Tough');

			const realm = sim.foundState(b.id, 'species', leader);
			const li = sim.burgLayer(b);
			const S = sim.st(li);
			for (const j of neighbors(c, b.cell)) if (sim.open(li, j)) S[j] = realm.id;
			realm.form = specDef.form;
			realm.name = specDef.name;
			realm.fullName = `${specDef.form} of the ${specDef.name}`;
			realm.color = newCulture.color;
			realm.expansionism = 1.9;
			realm.army = 35;

			newCulture.species = specDef.name.toLowerCase().includes('saurian') ? 'saurian' : specDef.name.toLowerCase().includes('star-elves') ? 'elf' : 'beastman';
			realm.species = newCulture.species;
			sim.recount();
			sim.log('god', `A new species emerges! The ${specDef.name} awaken in ${b.name}, establishing the ${realm.fullName}!`, b.cell, realm.id);
			break;
		}
		case 'monster': {
			const arch = sim.rng.pick(MONSTER_ARCHETYPES);
			const name = sim.rng.pick(arch.nameTpl);
			const bId = c.burg[cell];
			const lairName = bId ? `Lair near ${sim.w.burgs[bId].name}` : `Wilds of Cell ${cell}`;
			const m: Monster = {
				id: sim.monsters.length + 1,
				name,
				species: arch.species,
				tier: arch.tier,
				category: arch.category,
				icon: arch.icon,
				cell,
				layer,
				x: c.x[cell],
				y: c.y[cell],
				power: arch.power,
				health: arch.maxHealth,
				maxHealth: arch.maxHealth,
				alive: true,
				lairCell: cell,
				lairName,
				behavior: 'hunting',
				lore: arch.lore,
				armor: arch.armor,
				regen: arch.regen,
				trophy: arch.trophy,
				hardToKill: arch.armor >= 0.30
			};
			sim.monsters.push(m);
			sim.log('monster', `PRIMORDIAL AWAKENING: ${m.name} (${m.species}), a legendary ${m.tier} ${m.category} beast, awakens and stalks the territory!`, cell, pol?.id);
			break;
		}
		case 'wonder': {
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			const b = burgs.length
				? burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best))
				: null;
			const isCoastal = c.dist[cell] <= 1;
			const isMountain = c.h[cell] > 50;
			let kind: LegendaryPlace['kind'] = 'tower_magic';
			if (isCoastal && sim.rng.chance(0.5)) kind = 'giant_harbor';
			else if (isMountain) kind = 'tower_magic';
			else if (sim.rng.chance(0.4)) kind = 'tower_trials';
			else if (b && sim.rng.chance(0.5)) kind = 'university';
			else kind = 'ancient_forge';

			const builderName = pol?.alive ? pol.name : 'Divine Mandate';
			const nextWdObj = { val: sim.nextWonderId };
			const wonder = buildWonder(
				sim.w,
				cell,
				layer,
				kind,
				builderName,
				pol?.id ?? 0,
				sim.year,
				nextWdObj,
				sim.rng
			);
			sim.nextWonderId = nextWdObj.val;
			sim.wonders.push(wonder);
			if (pol?.alive) {
				pol.stability = clamp(pol.stability + 20, 0, 100);
			}
			sim.gainInnovation(30);
			sim.log('god', `DIVINE ARCHITECTURE: The heavens consecrate the ${wonder.name} (${wonder.icon}) on the landscape! ${wonder.effect}`, cell, pol?.id);
			break;
		}
		case 'alien': {
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			if (!burgs.length) return 'No settlement found to anchor the extraterrestrial invasion.';
			const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));

			c.h[cell] = clamp(c.h[cell] - 10, SEA + 5, 90);
			sim.innovation += 50; // divine act: full effect

			const xenoCultId = sim.w.cultures.length;
			const xenoCulture: Culture = {
				id: xenoCultId,
				name: 'Starborn Xenos',
				color: '#00ffcc',
				center: b.cell,
				type: 'Generic',
				lang: xenoCultId,
				sphere: 'Eldritch',
				layer: 'surface'
			};
			sim.w.cultures.push(xenoCulture);
			sim.langs[xenoCultId] = makeLang('alien-seed:' + sim.year, 'Eldritch');

			b.culture = xenoCultId;
			b.name = `Citadel Prime ${sim.rng.int(1, 99)}`;
			for (const j of area(2)) {
				if (sim.isLand(j)) c.culture[j] = xenoCultId;
			}

			const archon = sim.makePerson(xenoCultId, 0, b.id, 'ruler', 120);
			archon.name = `Archon-Vector ${sim.rng.int(101, 999)}`;
			archon.martial = 20; archon.intrigue = 18; archon.diplomacy = 4; archon.stewardship = 16;
			archon.renown = 60; archon.gold = 150;
			archon.traits = ['Ambitious', 'Genius', 'Ruthless'];

			const xenoRealm = sim.foundState(b.id, 'alien', archon);
			const li = sim.burgLayer(b);
			const S = sim.st(li);
			for (const j of neighbors(c, b.cell)) if (sim.open(li, j)) S[j] = xenoRealm.id;
			xenoRealm.name = 'Xeno Collective';
			xenoRealm.form = 'Starborn Hegemony';
			xenoRealm.fullName = 'Starborn Hegemony';
			xenoRealm.color = '#00e5ff';
			xenoRealm.expansionism = 3.0;
			xenoRealm.army = 85;
			xenoRealm.stability = 95;

			sim.recount();
			const victims = sim.neighborsOf(xenoRealm.id).filter((n) => n && n !== xenoRealm.id);
			for (const victim of victims.slice(0, 2)) {
				sim.declareWar(xenoRealm.id, victim, 'planetary subjugation');
			}

			sim.terraform();
			sim.log('god', `EXTRATERRESTRIAL DESCENT: An alien star-dreadnought impacts at ${b.name}! The Starborn Hegemony establishes a forward citadel and begins planetary subjugation.`, cell, xenoRealm.id);
			break;
		}
		case 'emancipate': {
			if (!hasRealm) return 'Choose a realm to emancipate.';
			const err = emancipate(sim, pol);
			if (err) return err;
			break;
		}
		case 'patron': {
			if (!hasRealm) return 'Choose a realm to crown as your Chosen Realm.';
			pol.isChosenRealm = true;
			pol.patronDeity = 'The Creator (You)';
			pol.patronDomain = 'Sun';
			pol.patronFavor = 100;
			pol.secularized = false;
			pol.stability = clamp(pol.stability + 30, 0, 100);
			pol.army = +(pol.army * 1.25 + 5).toFixed(1);
			sim.log('god', `DIVINE MANDATE: The Creator anoints ${pol.name} as the Chosen Realm of the Mortal World! Celestial light bathes the realm, granting supreme divine favor and eternal protection.`, cell, pol.id);
			break;
		}
		case 'reform': {
			if (!hasRealm) return 'Choose a realm to enact constitutional reform.';
			if (sim.divineTargetIdeology && sim.divineTargetIdeology === pol.ideology) {
				return `${pol.name} already follows this constitutional system.`;
			}
			const oldFullName = pol.fullName;
			let targetIdeology: IdeologyKind | undefined = sim.divineTargetIdeology;
			if (!targetIdeology) {
				if (pol.ideology === 'monarchy') {
					targetIdeology = sim.rng.pick(['republic', 'communal', 'technocracy'] as IdeologyKind[]);
				} else {
					const reformPool: IdeologyKind[] = ['republic', 'communal', 'technocracy', 'theocracy', 'oligarchy'];
					const viable = reformPool.filter((k) => k !== pol.ideology);
					targetIdeology = viable.length ? sim.rng.pick(viable) : 'republic';
				}
			}

			const res = transitionRegime(pol, targetIdeology, 'reform', sim.year, sim.rng, sim.people, { victorName: 'Divine Will' });
			for (const ev of res.events) {
				sim.log(ev.kind, ev.text, cell, pol.id);
			}
			pol.stability = clamp(pol.stability + 25, 10, 100);
			sim.idx.touch();
			sim.log('god', `DIVINE MANDATE: Divine wisdom moves the Grand Assembly of ${pol.name}! By celestial concordat, the realm peacefully adopts a new charter, reconstituting as the ${res.newFullName}.`, cell, pol.id);
			break;
		}
		case 'revolution': {
			if (!hasRealm) return 'Choose a realm to ignite a popular revolution.';
			const oldFullName = pol.fullName;
			let targetIdeology: IdeologyKind | undefined = sim.divineTargetIdeology;
			if (!targetIdeology) {
				const revPool: IdeologyKind[] = ['communal', 'republic', 'technocracy'];
				const viable = revPool.filter((k) => k !== pol.ideology);
				targetIdeology = viable.length ? sim.rng.pick(viable) : 'communal';
			}

			const citizen = sim.people.find((p) => p.alive && p.state === pol.id && p.id !== pol.ruler && (p.role === 'hero' || p.role === 'prophet'));
			const res = transitionRegime(pol, targetIdeology, 'revolution', sim.year, sim.rng, sim.people, { victorName: 'Divine Will', customLeader: citizen });
			for (const ev of res.events) {
				sim.log(ev.kind, ev.text, cell, pol.id);
			}
			pol.stability = clamp(sim.rng.int(45, 75), 10, 95);
			sim.idx.touch();
			sim.log('god', `DIVINE MANDATE: Holy fire stirs the populace of ${pol.name}! Millions rise in popular revolution, tearing down the throne and establishing the ${res.newFullName} by divine decree.`, cell, pol.id);
			break;
		}
		case 'coup': {
			if (!hasRealm) return 'Choose a realm to stage a coup.';
			const oldFullName = pol.fullName;
			let targetIdeology: IdeologyKind | undefined = sim.divineTargetIdeology;
			if (!targetIdeology) {
				const coupPool: IdeologyKind[] = ['autocracy', 'oligarchy', 'technocracy', 'theocracy', 'monarchy'];
				const opposition = pol.factions?.filter((f) => f.ideology !== pol.ideology).sort((a, b) => b.influence - a.influence);
				if (opposition && opposition.length > 0 && sim.rng.chance(0.7)) {
					targetIdeology = opposition[0].ideology;
				} else {
					const viable = coupPool.filter((k) => k !== pol.ideology);
					targetIdeology = viable.length ? sim.rng.pick(viable) : 'autocracy';
				}
			}

			const commander = sim.people.find((p) => p.alive && p.state === pol.id && p.id !== pol.ruler && p.role === 'general');
			const res = transitionRegime(pol, targetIdeology, 'coup', sim.year, sim.rng, sim.people, { victorName: 'Divine Will', customLeader: commander });
			for (const ev of res.events) {
				sim.log(ev.kind, ev.text, cell, pol.id);
			}
			pol.stability = clamp(sim.rng.int(40, 70), 5, 95);
			sim.idx.touch();
			sim.log('god', `DIVINE MANDATE: By the Creator's will, a sudden palace putsch overthrows the old regime in ${pol.name}! ${oldFullName} is reconstituted as the ${res.newFullName}.`, cell, pol.id);
			break;
		}
		case 'worldwar': {
			const living = sim.polities.filter((p) => p.id && p.alive);
			if (living.length < 2) return 'Need at least two living realms for a world war.';

			// Divide into two grand ideological coalitions
			// Bloc A: Progressive / Popular / Sacred Concord (republic, communal, theocracy)
			// Bloc B: Imperial / Dynastic / Stratocratic Axis (autocracy, monarchy, oligarchy, technocracy)
			let blocA = living.filter((p) => p.ideology && ['republic', 'communal', 'theocracy'].includes(p.ideology));
			let blocB = living.filter((p) => p.ideology && ['autocracy', 'monarchy', 'oligarchy', 'technocracy'].includes(p.ideology));

			// If one bloc is empty or severely lopsided, rebalance deterministically
			if (!blocA.length || !blocB.length) {
				const sorted = [...living].sort((a, b) => b.cells - a.cells);
				blocA = [];
				blocB = [];
				for (let i = 0; i < sorted.length; i++) {
					if (i % 2 === 0) blocA.push(sorted[i]);
					else blocB.push(sorted[i]);
				}
			}

			const blocAIds = blocA.map((p) => p.id);
			const blocBIds = blocB.map((p) => p.id);

			// Intra-bloc: cement grand alliances, +85 relations, mobilize armies
			for (const p of blocA) {
				p.allies = blocAIds.filter((id) => id !== p.id);
				p.army = +(p.army * 1.35 + 20).toFixed(1);
				p.expansionism = Math.max(p.expansionism, 2.5);
				p.stability = Math.max(p.stability, 65);
				for (const friendId of blocAIds) {
					if (friendId !== p.id) sim.addRel(p.id, friendId, 85);
				}
			}
			for (const p of blocB) {
				p.allies = blocBIds.filter((id) => id !== p.id);
				p.army = +(p.army * 1.35 + 20).toFixed(1);
				p.expansionism = Math.max(p.expansionism, 2.5);
				p.stability = Math.max(p.stability, 65);
				for (const friendId of blocBIds) {
					if (friendId !== p.id) sim.addRel(p.id, friendId, 85);
				}
			}

			// Inter-bloc: break all alliances, mutual hostility -180
			for (const a of blocA) {
				for (const b of blocB) {
					sim.addRel(a.id, b.id, -180);
				}
			}

			// End any petty internal wars within either bloc
			for (const w of sim.wars) {
				if (w.end) continue;
				const inA = w.attackers.some((id) => blocAIds.includes(id)) && w.defenders.some((id) => blocAIds.includes(id));
				const inB = w.attackers.some((id) => blocBIds.includes(id)) && w.defenders.some((id) => blocBIds.includes(id));
				if (inA || inB) sim.finishWar(w, 'white');
			}

			// Declare The Great World War
			const leaderA = blocA[0];
			const leaderB = blocB[0];
			const warName = 'The Great World War of Ideologies';
			const ww: War = {
				id: sim.nextWar++,
				name: warName,
				attackers: blocAIds,
				defenders: blocBIds,
				start: sim.year,
				score: 0,
				months: 0,
				startArmy: [sim.strength(blocAIds), sim.strength(blocBIds)]
			};
			sim.wars.push(ww);

			sim.computeBorders();
			sim.idx.touch();

			const namesA = blocA.map((p) => p.name).join(', ');
			const namesB = blocB.map((p) => p.name).join(', ');
			sim.log('war', `DIVINE MANDATE: The Great World War ignites! The mortal realms of ${sim.w.name} polarize into two titanic coalitions: the Concord of ${leaderA.name} (${namesA}) versus the Axis of ${leaderB.name} (${namesB}). Total global warfare begins!`, cell, leaderA.id);
			break;
		}
		case 'ragnarok': {
			// Spawn 4 primordial Cataclysmic Harbingers of the End
			const harbingers = [
				{
					name: 'Fenrir the World-Devourer',
					species: 'Cataclysmic Direwolf',
					icon: '🐺',
					power: 220,
					maxHealth: 700,
					armor: 0.85,
					regen: 35,
					lore: 'A cosmic dread wolf born from the astral abyss, whose jaws span from earth to firmament.'
				},
				{
					name: 'Surtr the World-Burner',
					species: 'Primal Flame Titan',
					icon: '🔥',
					power: 210,
					maxHealth: 650,
					armor: 0.80,
					regen: 30,
					lore: 'An ancient titan wielding a twilight blade of primordial fire that incinerates mountain ranges.'
				},
				{
					name: 'Nidhogg the Void-Dragon',
					species: 'Void Wyrm',
					icon: '🐉',
					power: 230,
					maxHealth: 750,
					armor: 0.85,
					regen: 35,
					lore: 'The cosmic wyrm gnawing at the roots of existence, breathing darkness and celestial ruin.'
				},
				{
					name: 'Jormungandr the Midgard-Serpent',
					species: 'World-Serpent',
					icon: '🐍',
					power: 200,
					maxHealth: 620,
					armor: 0.75,
					regen: 25,
					lore: 'A serpent so vast it encircles the sea trenches of the world, releasing toxic miasma.'
				}
			];

			const landCells: number[] = [];
			for (let i = 0; i < c.n; i++) {
				if (sim.isLand(i)) landCells.push(i);
			}
			const pool = landCells.length ? landCells : [cell];

			for (let idx = 0; idx < harbingers.length; idx++) {
				const h = harbingers[idx];
				const spawnCell = sim.rng.pick(pool);
				const bId = c.burg[spawnCell];
				const lairName = bId ? `Lair near ${sim.w.burgs[bId].name}` : `Wasteland of Cell ${spawnCell}`;

				const m: Monster = {
					id: sim.monsters.length + 1,
					name: h.name,
					species: h.species,
					tier: 'cataclysm',
					category: 'biblical',
					icon: h.icon,
					cell: spawnCell,
					layer: 0,
					x: c.x[spawnCell],
					y: c.y[spawnCell],
					power: h.power,
					health: h.maxHealth,
					maxHealth: h.maxHealth,
					alive: true,
					lairCell: spawnCell,
					lairName,
					behavior: 'hunting',
					lore: h.lore,
					armor: h.armor,
					regen: h.regen,
					trophy: `Primordial Core of ${h.name.split(' ')[0]}`,
					hardToKill: true,
					immortal: true,
					birthYear: -sim.rng.int(1000, 5000),
					destructionCount: 0
				};
				sim.monsters.push(m);
			}

			// The Final Concordat: all active mortal wars immediately cease in a desperate stalemate
			for (const w of sim.wars) {
				if (!w.end) sim.finishWar(w, 'white');
			}

			// Mortal polities unite in fear of extinction: elevate relations to at least +40
			const livingRealms = sim.polities.filter((p) => p.id && p.alive);
			for (let i = 0; i < livingRealms.length; i++) {
				const pi = livingRealms[i];
				pi.stability = clamp(pi.stability + 20, 10, 100);
				pi.army = +(pi.army * 1.25 + 15).toFixed(1);
				pi.treasury += 30;
				for (let j = i + 1; j < livingRealms.length; j++) {
					const pj = livingRealms[j];
					if (sim.rel(pi.id, pj.id) < 40) {
						sim.addRel(pi.id, pj.id, 50);
					}
				}
			}

			sim.dirty.terrain = true;
			sim.dirty.political = true;
			sim.idx.touch();

			sim.log('monster', `DIVINE MANDATE: TRUE RAGNAROK HAS BEGUN! The firmament cracks as the primordial World-Eaters descend upon ${sim.w.name}: Fenrir, Surtr, Nidhogg, and Jormungandr arise! Facing annihilation, mortal kingdoms sign the Final Concordat in a desperate stalemate for survival.`, cell);
			break;
		}
		case 'conspiracy': {
			if (!hasRealm) return 'Choose a realm to strike with conspiracy.';

			// 1. Assassinate ruler and royal heir
			const ruler = sim.ruler(pol);
			const oldRulerName = ruler?.name ?? 'The sovereign';
			if (ruler?.alive) {
				sim.kill(ruler, 'a poisoned dagger in the council chamber');
			}
			const heir = sim.people[pol.heir];
			if (heir?.alive) {
				sim.kill(heir, 'conspiratorial poison');
			}

			// 2. Plunder treasury, obliterate stability, and cause army mutiny
			pol.treasury = 0;
			pol.stability = 0;
			pol.army = Math.max(1, +(pol.army * 0.2).toFixed(1));

			// 3. Emancipate all vassals
			for (const v of sim.polities) {
				if (v.alive && v.overlord === pol.id) {
					v.overlord = undefined;
					sim.log('rebel', `Seizing upon the royal collapse in ${pol.name}, ${v.name} declares full independence!`, sim.w.burgs[v.capital]?.cell ?? cell, v.id);
				}
			}

			// 4. Fracture the empire into 1-2 splinter successor states
			const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.id && b.alive && b.id !== pol.capital);
			const splinterCount = Math.min(2, towns.length);
			const shuffledTowns = sim.rng.shuffle(towns).slice(0, splinterCount);
			for (const t of shuffledTowns) {
				const splinter = sim.revolt(pol, t.cell);
				if (splinter) {
					splinter.name = `${t.name} Secession`;
					splinter.fullName = `Secessionist State of ${t.name}`;
					splinter.army = 25;
					sim.declareWar(pol.id, splinter.id, 'succession schism');
				}
			}

			// Plunder treasury and obliterate civil stability completely
			pol.treasury = 0;
			pol.stability = 0;

			// 5. Total diplomatic isolation
			pol.allies = [];
			for (const p of sim.polities) p.allies = p.allies.filter((a) => a !== pol.id);
			for (const n of sim.neighborsOf(pol.id)) sim.addRel(pol.id, n, -60);

			sim.recount();
			sim.computeBorders();
			sim.dirty.political = true;
			sim.idx.touch();

			sim.log('god', `DIVINE CONSPIRACY: A treacherous shadow falls across ${pol.fullName}! Conspirators assassinate ${oldRulerName}, royal coffers are plundered, vassals break free, and mutinous generals shatter the realm into warring successor fragments!`, cell, pol.id);
			break;
		}
		case 'resurgence': {
			let targetPol: Polity | null = null;

			if (sim.divineTargetPolityId) {
				targetPol = sim.polities[sim.divineTargetPolityId] ?? null;
			}

			if (!targetPol) {
				const bId = c.burg[cell];
				const b = bId ? sim.w.burgs[bId] : null;
				const localPol = pol && pol.id ? pol : null;
				if (localPol && (!localPol.alive || localPol.cells <= 4)) {
					targetPol = localPol;
				} else if (b && b.state && !sim.polities[b.state]?.alive) {
					targetPol = sim.polities[b.state];
				}
			}

			if (!targetPol) {
				const fallen = sim.polities.filter((p) => !p.alive && p.id > 0 && p.fell !== undefined);
				if (fallen.length) {
					fallen.sort((a, b) => a.founded - b.founded);
					targetPol = fallen[0];
				} else if (hasRealm) {
					targetPol = pol;
				}
			}

			if (!targetPol) return 'No realm or ancient kingdom found to resurrect.';

			const wasDead = !targetPol.alive;
			const ancientFounded = targetPol.founded;
			const ancientFell = targetPol.fell ?? 'antiquity';

			targetPol.alive = true;
			targetPol.fell = undefined;
			targetPol.origin = 'resurgence';

			// Reconstruct ancestral house and dynasty
			const houseHist = sim.people.filter((p) => p.state === targetPol.id || targetPol.reigns?.some((r: { id: number }) => r.id === p.id));
			let royalHouse = targetPol.name;
			if (houseHist.length) {
				const withHouse = houseHist.filter((p) => p.house);
				if (withHouse.length) royalHouse = withHouse[0].house;
			}

			// Establish or reclaim capital
			let centerCell = cell;
			let capBurg = targetPol.capital ? sim.w.burgs[targetPol.capital] : null;
			if (capBurg && capBurg.id) {
				centerCell = capBurg.cell;
			} else {
				const bId = c.burg[cell];
				if (bId) {
					capBurg = sim.w.burgs[bId];
					targetPol.capital = capBurg.id;
				} else {
					const nearbyBurgs = sim.w.burgs.filter((b) => b.id && (b.x - c.x[cell]) ** 2 + (b.y - c.y[cell]) ** 2 < 2500);
					if (nearbyBurgs.length) {
						capBurg = nearbyBurgs[0];
						targetPol.capital = capBurg.id;
						centerCell = capBurg.cell;
					}
				}
			}

			if (capBurg) {
				capBurg.alive = true;
				capBurg.state = targetPol.id;
				capBurg.capital = true;
				capBurg.pop = Math.max(12, +(capBurg.pop * 1.5).toFixed(1));
			}

			// Reclaim ancestral territory: 10 to 18 contiguous land cells around the center
			const reclaimedCells = area(3, centerCell);
			const S = sim.st(layer);
			for (const idx of reclaimedCells) {
				if (sim.isLand(idx)) {
					S[idx] = targetPol.id;
					const subBurgId = c.burg[idx];
					if (subBurgId) {
						const subBurg = sim.w.burgs[subBurgId];
						subBurg.state = targetPol.id;
						subBurg.alive = true;
					}
				}
			}

			// Crown the immortal Phoenix Sovereign
			const sovereign = sim.makePerson(targetPol.culture, targetPol.id, targetPol.capital || 0, 'ruler', 28);
			sovereign.name = `${sovereign.name} the Phoenix Reborn`;
			sovereign.house = royalHouse;
			sovereign.martial = 95;
			sovereign.diplomacy = 95;
			sovereign.stewardship = 95;
			sovereign.intrigue = 90;
			sovereign.renown = 100;
			sovereign.gold = 500;
			sovereign.health = 100;
			sovereign.traits = ['Legendary', 'Immortal', 'Visionary', 'Ambitious', 'Brave', 'Inspiring'];
			sim.crown(targetPol, sovereign);

			// Elevate realm into Phoenix Empire
			targetPol.form = 'Phoenix Empire';
			targetPol.fullName = `Phoenix Empire of ${targetPol.name}`;
			targetPol.treasury += 500;
			targetPol.army = Math.max(targetPol.army + 150, 150);
			targetPol.stability = 100;
			targetPol.expansionism = 3.2;
			targetPol.tax = 0.08;

			// Inaugurate a 50-year Golden Age
			targetPol.era = 'The Phoenix Resurgence';
			if (!targetPol.eras) targetPol.eras = [];
			targetPol.eras.push({ from: sim.year, to: sim.year + 50, name: 'The Phoenix Resurgence' });

			// Bestow an imperial relic
			const crown = forgeArtifact(
				sim.nextArtifactId++,
				sim.rng,
				sim.year,
				sim.lang(targetPol.culture),
				'polity',
				targetPol.id,
				targetPol.name,
				`The sacred crown of House ${royalHouse}, rekindled with celestial fire for the rebirth of ${targetPol.name}.`
			);
			crown.kind = 'crown';
			crown.icon = '👑';
			crown.name = 'Imperial Crown of the Reborn Phoenix';
			crown.fame = 65;
			crown.bonusVal = 10;
			sim.artifacts.push(crown);

			// End lingering wars
			for (const w of sim.wars) {
				if (!w.end && (w.attackers.includes(targetPol.id) || w.defenders.includes(targetPol.id))) {
					sim.finishWar(w, 'white');
				}
			}

			sim.divineTargetPolityId = undefined;

			sim.recount();
			sim.computeBorders();
			sim.dirty.political = true;
			sim.idx.touch();

			if (wasDead) {
				sim.log(
					'god',
					`DIVINE RESURGENCE: House ${royalHouse} rises from centuries of slumber! Founded in year ${ancientFounded} and fallen in year ${ancientFell}, ${targetPol.name} is resurrected by divine mandate in year ${sim.year}! ${sovereign.name} claims the imperial throne of the ${targetPol.fullName}, commanding 150,000 reborn legions and inaugurating a 50-year Golden Age!`,
					centerCell,
					targetPol.id
				);
			} else {
				sim.log(
					'god',
					`DIVINE RESURGENCE: Like a phoenix from the ashes, ${targetPol.name} rises into supreme imperial glory! Crowned by divine mandate, ${sovereign.name} marshals 150,000 reborn legions under the ${targetPol.fullName}, reclaiming ancestral destiny in a 50-year Golden Age!`,
					centerCell,
					targetPol.id
				);
			}
			break;
		}
	}
	spend();
	sim.dirty.political = true;
	return null;
}

/** Cast a divine power on an automatically selected random target */
export function castRandom(sim: Simulation, power: Power, layer = 0): { text: string; cell: number } {
	const c = sim.c;
	const r = sim.rng;
	const aliveBurgs = sim.w.burgs.filter((b) => b.id && b.alive);
	const aliveRealms = sim.polities.filter((p) => p.id && p.alive);

	let targetCell = 0;
	if (aliveRealms.length && ['inspire', 'host', 'peace', 'relic', 'discord', 'chaos', 'smite', 'wonder', 'patron', 'reform', 'revolution', 'coup', 'conspiracy', 'emancipate'].includes(power)) {
		const picked = r.pick(aliveRealms);
		targetCell = sim.w.burgs[picked.capital]?.cell ?? r.int(0, c.n - 1);
	} else if (power === 'resurgence') {
		const dead = sim.polities.filter((p) => !p.alive && p.id > 0 && p.fell !== undefined);
		if (dead.length) {
			const picked = r.pick(dead);
			sim.divineTargetPolityId = picked.id;
			targetCell = (picked.capital && sim.w.burgs[picked.capital]?.cell) || r.int(0, c.n - 1);
		} else if (aliveRealms.length) {
			const smallest = [...aliveRealms].sort((a, b) => a.cells - b.cells)[0];
			targetCell = (smallest.capital && sim.w.burgs[smallest.capital]?.cell) || r.int(0, c.n - 1);
		} else {
			targetCell = r.int(0, c.n - 1);
		}
	} else if (aliveBurgs.length && ['hero', 'prophet', 'villain', 'rebel', 'species', 'alien', 'plague'].includes(power)) {
		targetCell = r.pick(aliveBurgs).cell;
	} else {
		const L = sim.w.layers[layer];
		const land: number[] = [];
		for (let i = 0; i < c.n; i++) {
			if (L.open[i] && (power === 'sink' || sim.isLand(i))) land.push(i);
		}
		targetCell = land.length ? r.pick(land) : r.int(0, c.n - 1);
	}

	const msg = sim.cast(power, targetCell, layer) ?? `Divine power ${POWERS[power].name} was cast upon the world.`;
	return { text: msg, cell: targetCell };
}
