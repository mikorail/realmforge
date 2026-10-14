import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { decodeSharePayload, encodeSharePayload } from '../share';
import { forgeArtifact } from './relics';
import { buildLineageTree, findOldestAncestor, getHouseMembers } from './dynasty';
import { COMMODITIES, cellCommodity } from './trade';
import { generateSvgMap, generateWorldGazetteer } from '../export';
import { makeRng } from '../rng';
import { makeLang } from '../gen/names';
import { ERAS, DISCOVERIES, TECH_BRANCHES } from './tech';
import { SPECIES, SPECIES_BY_ID } from '../gen/species';
import { WONDER_TEMPLATES } from './wonders';
import { MONSTER_ARCHETYPES, resolveMonsterCombat, updateMonsters } from './monsters';
import { LUMINARY_PROFILES } from './luminaries';
import { chains } from '../render/renderer';
import {
	narrateWar,
	narrateSiege,
	narrateFall,
	narratePeace,
	narrateDeath,
	narratePalaceCoup,
	synthesizeAnnualAnnals,
	compileAnnalsBookMarkdown
} from './chronicle';
import { THEOLOGIES, DOCTRINES, assignReligionIdentity } from '../gen/religions';
import { IDEOLOGIES, generateFactionsForPolity, updatePolitics, formatRegimeTitle, transitionRegime } from './politics';
import { processAnthropogenicDisasters } from './ecology';
import { COVERT_OPS, updateIntrigue } from './intrigue';
import { QUEST_TEMPLATES, spawnQuest, updateQuests } from './quests';
import { destroyWonder, isWonderStanding } from './wonders';
import { PANTHEON_DEITIES, assignPatronDeity, processPantheonInterventions } from './pantheon';
import { Simulation } from './engine';

const base = {
	seed: 'studio-test',
	template: 'continents' as const,
	cells: 3000,
	states: 8,
	width: 1600,
	height: 1000,
	genre: 'fantasy' as const,
	planet: 'terran' as const,
	spheres: null,
	depth: 1,
	sky: true,
	sea: false
};

describe('studio and simulation expansions', () => {
	it('encodes and decodes share payloads accurately', () => {
		const payload = {
			seed: 'starlight-vale-42',
			genre: 'fantasy',
			planet: 'terran',
			template: 'continents',
			cells: 4000,
			states: 12,
			width: 1920,
			height: 1080,
			climate: {
				tEq: 28,
				tN: -20,
				tS: -15,
				prec: 110
			}
		};
		const encoded = encodeSharePayload(payload);
		expect(encoded.length).toBeGreaterThan(10);
		const decoded = decodeSharePayload(encoded);
		expect(decoded).not.toBeNull();
		expect(decoded?.seed).toBe(payload.seed);
		expect(decoded?.genre).toBe(payload.genre);
		expect(decoded?.cells).toBe(payload.cells);
		expect(decoded?.climate?.prec).toBe(110);
	});

	it('forges relics with deterministic attributes', () => {
		const rng = makeRng('relic-seed-test');
		const lang = makeLang('lang-seed-test');
		const r1 = forgeArtifact(42, rng, 1, lang, 'polity', 3, 'Gudfogldesh', 'Forged in myth');
		expect(r1.name).toBeTruthy();
		expect(r1.holderType).toBe('polity');
		expect(r1.holderId).toBe(3);
		expect(r1.bonusVal).toBeGreaterThanOrEqual(1);
		expect(r1.fame).toBeGreaterThanOrEqual(20);
	});

	it('builds dynasties and tracks royal houses', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Run 20 years to populate lineages and events
		for (let m = 0; m < 240; m++) cos.tick();

		const rulers = sim.people.filter((p) => p.role === 'ruler');
		expect(rulers.length).toBeGreaterThan(0);

		const ruler = rulers[0];
		const ancestorId = findOldestAncestor(sim, ruler.id);
		expect(ancestorId).toBeGreaterThan(0);

		const tree = buildLineageTree(sim, ancestorId);
		expect(tree).not.toBeNull();
		expect(tree?.id).toBe(ancestorId);

		const houseMembers = getHouseMembers(sim, ruler.house);
		expect(houseMembers.length).toBeGreaterThanOrEqual(1);
	});

	it('generates commodity nodes and moves caravans along roads', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Check cell commodities
		const comKey = cellCommodity(u.planets[0].cells.biome[100], u.planets[0].cells.h[100]);
		const def = COMMODITIES[comKey];
		expect(def).toBeDefined();
		expect(def.name).toBeTruthy();
		expect(def.icon).toBeTruthy();

		// Advance simulation to trigger trade caravans
		for (let m = 0; m < 12; m++) cos.tick();
		expect(sim.caravans).toBeDefined();
	});

	it('records periodic history snapshots for timeline scrubbing', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// 1 initial snapshot recorded at birth
		expect(sim.historySnapshots.length).toBeGreaterThanOrEqual(1);

		// Simulate 12 years (144 months)
		for (let m = 0; m < 144; m++) cos.tick();

		// Should have recorded at least 3 snapshots (year 0, 5, 10)
		expect(sim.historySnapshots.length).toBeGreaterThanOrEqual(3);
		const snap = sim.historySnapshots[1];
		expect(snap.surfaceStates.length).toBe(u.planets[0].cells.n);
	});

	it('casts divine powers for relic creation and tectonic cataclysm', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const pol = sim.polities.find((p) => p.alive && p.id);
		expect(pol).toBeDefined();
		const capBurg = u.planets[0].burgs[pol!.capital];
		expect(capBurg).toBeDefined();
		const capCell = capBurg.cell;

		const startRelicCount = sim.artifacts.length;
		sim.sandbox = true;
		const relicErr = sim.cast('relic', capCell, 0);
		expect(relicErr).toBeNull();
		expect(sim.artifacts.length).toBe(startRelicCount + 1);

		const initialHeight = u.planets[0].cells.h[capCell];
		const cataclysmErr = sim.cast('cataclysm', capCell, 0);
		expect(cataclysmErr).toBeNull();
		expect(u.planets[0].cells.h[capCell]).not.toBe(initialHeight);
	});

	it('generates Markdown world gazetteers and layered SVG vector maps', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const gazetteer = generateWorldGazetteer(u.planets[0], sim);
		expect(gazetteer).toContain('# Chronicle and Gazetteer of');
		expect(gazetteer).toContain('## The Great Realms');
		expect(gazetteer).toContain('## Culture Spheres');

		const svg = generateSvgMap(u.planets[0], sim, 0);
		expect(svg).toContain('<svg');
		expect(svg).toContain('id="cells"');
		expect(svg).toContain('id="settlements"');
		expect(svg).toContain('</svg>');
	});

	it('tears interplanetary rifts and conducts cross-planet warfare', () => {
		const u = generateUniverse(base, 2);
		const cos = new Cosmos(u);
		expect(cos.sims.length).toBe(2);

		const b0 = u.planets[0].burgs.find((b) => b.id && b.alive)!;
		const b1 = u.planets[1].burgs.find((b) => b.id && b.alive)!;
		expect(b0).toBeDefined();
		expect(b1).toBeDefined();

		const rift = cos.tearRift(0, b0.id, 1, b1.id, 'Starlight Bridge');
		expect(rift).toBeDefined();
		expect(rift.name).toBe('Starlight Bridge');
		expect(u.rifts.some((r) => r.name === 'Starlight Bridge')).toBe(true);

		const sim0 = cos.sims[0];
		sim0.sandbox = true;
		const initialRifts = u.rifts.length;
		const err = sim0.cast('tear', b0.cell, 0);
		expect(err).toBeNull();
		expect(u.rifts.length).toBe(initialRifts + 1);

		const pol0 = sim0.polities[b0.state];
		if (pol0) {
			pol0.army = 60;
			pol0.expansionism = 1.8;
		}

		for (let m = 0; m < 24; m++) cos.tick();
		expect(cos.sims[0].year).toBeGreaterThanOrEqual(2);
	});

	it('progresses through technological eras and unlocks breakthroughs', () => {
		expect(ERAS.length).toBe(5);
		expect(DISCOVERIES.length).toBe(25);

		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		expect(sim.era).toBe(0);
		expect(sim.innovation).toBe(0);
		expect(sim.techs.size).toBe(0);

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		expect(pol).toBeDefined();
		const oldArmy = pol.army;
		const bronze = DISCOVERIES.find((d) => d.id === 'bronze')!;
		sim.applyTechBonus(bronze);
		expect(pol.army).toBeGreaterThanOrEqual(oldArmy);

		sim.sandbox = true;
		const capCell = u.planets[0].burgs[pol.capital].cell;
		const err = sim.cast('enlighten', capCell, 0);
		expect(err).toBeNull();
		expect(sim.innovation).toBeGreaterThanOrEqual(60);

		sim.innovation = 120;
		for (let m = 0; m < 12; m++) cos.tick();
		expect(sim.era).toBeGreaterThanOrEqual(1);

		const person = sim.people.find((p) => p.alive)!;
		sim.avatar = person.id;
		person.gold = 50;
		const innovBefore = sim.innovation;
		const res = sim.act('research');
		expect(res).toMatch(/breakthrough|innovation/);
		expect(sim.innovation).toBe(innovBefore + 20);
		expect(person.gold).toBe(30);
	});

	it('extracts ghost contours for subterranean peeking and surface overlays', () => {
		const u = generateUniverse({ ...base, depth: 2 }, 1);
		const w = u.planets[0];

		const coastChains = chains(w.edges, (a, b) => (w.cells.h[a] >= 20) !== (w.cells.h[b] >= 20));
		expect(coastChains.length).toBeGreaterThan(0);
		expect(coastChains[0].length).toBeGreaterThanOrEqual(2);

		const deep = w.layers.find((l) => l.kind === 'deep');
		if (deep) {
			const caveChains = chains(w.edges, (a, b) => deep.open[a] !== deep.open[b]);
			expect(caveChains.length).toBeGreaterThan(0);
		}
	});

	it('unleashes chaos, great pestilence, and apocalyptic near-extinction events', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const cell = u.planets[0].cells.state.findIndex((s) => s > 0);
		const pol = sim.stateAt(cell, 0);
		pol.stability = 80;
		pol.treasury = 100;

		const chaosErr = sim.cast('chaos', cell, 0);
		expect(chaosErr).toBeNull();
		expect(pol.stability).toBeLessThanOrEqual(35);
		expect(pol.treasury).toBeLessThanOrEqual(40);

		const popBefore = u.planets[0].cells.pop[cell];
		const plagueErr = sim.cast('pandemic', cell, 0);
		expect(plagueErr).toBeNull();
		expect(sim.plague[cell]).toBe(1.0);
		expect(u.planets[0].cells.pop[cell]).toBeLessThan(popBefore);

		const apocErr = sim.cast('apocalypse', cell, 0);
		expect(apocErr).toBeNull();
		expect(sim.events.some((e) => e.text.includes('DOOMSDAY OMENS'))).toBe(true);
	});

	it('spawns villains, anointed prophets, exotic species, and alien invasions', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const burg = u.planets[0].burgs.find((b) => b.id && b.alive)!;
		const cell = burg.cell;

		// 1. Villain
		const villainErr = sim.cast('villain', cell, 0);
		expect(villainErr).toBeNull();
		const villain = sim.people.find((p) => p.role === 'villain');
		expect(villain).toBeDefined();
		expect(villain?.traits).toContain('Cruel');
		const scourgeState = sim.polities.find((p) => p.origin === 'scourge');
		expect(scourgeState).toBeDefined();
		expect(scourgeState?.army).toBeGreaterThanOrEqual(60);
		expect(sim.artifacts.some((a) => a.kind === 'weapon' && a.holderId === villain!.id)).toBe(true);

		// 2. Prophet
		const relsCountBefore = u.planets[0].religions.length;
		const prophetErr = sim.cast('prophet', cell, 0);
		expect(prophetErr).toBeNull();
		expect(u.planets[0].religions.length).toBe(relsCountBefore + 1);
		const prophet = sim.people.find((p) => p.role === 'prophet');
		expect(prophet).toBeDefined();
		expect(prophet?.traits).toContain('Zealous');
		expect(sim.artifacts.some((a) => a.kind === 'tome' && a.holderId === prophet!.id)).toBe(true);

		// 3. Species
		const cultsCountBefore = u.planets[0].cultures.length;
		const speciesErr = sim.cast('species', cell, 0);
		expect(speciesErr).toBeNull();
		expect(u.planets[0].cultures.length).toBe(cultsCountBefore + 1);
		const speciesRealm = sim.polities.find((p) => p.origin === 'species');
		expect(speciesRealm).toBeDefined();

		// 4. Alien Invasion
		const innovBefore = sim.innovation;
		const alienErr = sim.cast('alien', cell, 0);
		expect(alienErr).toBeNull();
		expect(sim.innovation).toBe(innovBefore + 50);
		const alienRealm = sim.polities.find((p) => p.origin === 'alien');
		expect(alienRealm).toBeDefined();
		expect(alienRealm?.army).toBeGreaterThanOrEqual(80);
	});

	it('enables special avatar deeds for prophets and villains', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const person = sim.people.find((p) => p.alive)!;
		sim.avatar = person.id;

		// As Prophet
		person.role = 'prophet';
		person.gold = 10;
		const preachMsg = sim.act('preach');
		expect(preachMsg).toContain('preach the revelation');
		expect(person.gold).toBeGreaterThan(10);

		// As Villain
		person.role = 'villain';
		person.gold = 50;
		const terrorMsg = sim.act('terrorize');
		expect(terrorMsg).toContain('terrorize');
		expect(person.traits).toContain('Feared');

		const goldBefore = person.gold;
		const scourgeMsg = sim.act('scourge');
		expect(scourgeMsg).toContain('banner');
		expect(person.gold).toBe(goldBefore - 30); // spent 30 gold
	});

	it('generates evocative procedural chronicle narration prose without em dashes', () => {
		const rng = makeRng('chronicle-prose-test');

		const warTxt = narrateWar(rng, 'Kingdom of Eldamar', 'Valdoria', 'War of Eldamar', undefined, 'allies rally');
		expect(warTxt.length).toBeGreaterThan(25);
		expect(warTxt).not.toContain('—');

		const siegeTxt = narrateSiege(rng, 'Valdoria', 'Eldamar', 'Oakhaven', true);
		expect(siegeTxt).toContain('Oakhaven');
		expect(siegeTxt).not.toContain('—');

		const fallTxt = narrateFall(rng, 'Kingdom of Eldamar', 'Aragorn', 'Elessar');
		expect(fallTxt).toContain('Eldamar');
		expect(fallTxt).not.toContain('—');

		const peaceTxt = narratePeace(rng, 'War of Eldamar', 3, 'attackers', 'Valdoria');
		expect(peaceTxt).toContain('War of Eldamar');
		expect(peaceTxt).not.toContain('—');

		const deathTxt = narrateDeath(rng, 'Elrond', 'Halfelven', 'Rivendell', 'old age', 'Arwen', false, 25);
		expect(deathTxt).toContain('Rivendell');
		expect(deathTxt).not.toContain('—');

		const coupTxt = narratePalaceCoup(rng, 'Goran', 'Alden', 'Sundergard');
		expect(coupTxt).toContain('Goran');
		expect(coupTxt).not.toContain('—');
	});

	it('synthesizes annual annals and exports rich narrative chronicle markdown', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Simulate 20 years to produce a rich chronicle
		for (let m = 0; m < 20 * 12; m++) sim.tick();

		expect(sim.events.length).toBeGreaterThan(10);

		// Synthesize annals
		const annals = synthesizeAnnualAnnals(sim.events, sim.w.name, 20);
		expect(annals.length).toBeGreaterThan(0);
		expect(annals[0].headline).toBeDefined();
		expect(annals[0].prose.length).toBeGreaterThan(20);

		// Compile full markdown annals
		const md = compileAnnalsBookMarkdown(sim.events, sim.w.name);
		expect(md).toContain(`# The Annals of ${sim.w.name}`);
		expect(md).toContain('### Year');
		expect(md).not.toContain('—');
	});

	it('supports fantasy species, wonders of the world, tiered monsters, luminaries, and tech tree', () => {
		expect(SPECIES.length).toBeGreaterThanOrEqual(12);
		expect(SPECIES_BY_ID['elf'].lifespanMult).toBeGreaterThan(2);
		expect(SPECIES_BY_ID['dwarf'].mods.stewardship).toBeGreaterThan(0);
		expect(SPECIES_BY_ID['orc'].mods.martial).toBeGreaterThan(0);

		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Polities and people have species assigned
		const activePol = sim.polities.find((p) => p.alive && p.id)!;
		expect(activePol.species).toBeDefined();
		const ruler = sim.people[activePol.ruler];
		expect(ruler.species).toBeDefined();

		// Wonders are placed
		expect(sim.wonders.length).toBeGreaterThanOrEqual(5);
		for (const w of sim.wonders) {
			expect(w.name).toBeDefined();
			expect(w.effect).toBeDefined();
			expect(w.lore).not.toContain('—');
		}

		// Monsters are generated across categories
		expect(sim.monsters.length).toBeGreaterThanOrEqual(5);
		const categories = new Set(sim.monsters.map((m) => m.category));
		expect(categories.size).toBeGreaterThan(1);
		for (const m of sim.monsters) {
			expect(m.power).toBeGreaterThan(0);
			expect(m.health).toBe(m.maxHealth);
			expect(m.lore).not.toContain('—');
		}

		// Tick simulation and check for monster updates, luminaries spawning, and tech tree
		for (let m = 0; m < 36; m++) sim.tick();

		const luminaries = sim.people.filter((p) => ['magician', 'thinker', 'artist', 'athlete', 'inventor'].includes(p.role));
		expect(luminaries.length).toBeGreaterThanOrEqual(1);
		const firstLum = luminaries[0];
		expect(firstLum.magnumOpus).toBeDefined();

		// Tech tree branches and landmark inventions
		expect(Object.keys(TECH_BRANCHES).length).toBe(5);
		const warfareTechs = DISCOVERIES.filter((d) => d.branch === 'warfare');
		expect(warfareTechs.length).toBeGreaterThanOrEqual(4);
		for (const t of DISCOVERIES) {
			expect(t.inventions.length).toBeGreaterThanOrEqual(3);
			expect(t.description).not.toContain('—');
		}
	});

	it('assigns unique theologies and doctrines to religions with zero em dashes', () => {
		const rng = makeRng('theology-test-seed');
		const rel = assignReligionIdentity(rng, 'Organized', 'Holy');

		expect(rel.theology).toBeDefined();
		expect(THEOLOGIES[rel.theology]).toBeDefined();
		expect(rel.doctrine).toBeDefined();
		expect(DOCTRINES[rel.doctrine]).toBeDefined();
		expect(rel.features.length).toBeGreaterThanOrEqual(1);

		for (const feat of rel.features) {
			expect(feat).not.toContain('—');
		}

		// Universe generation wires theologies and doctrines
		const u = generateUniverse(base, 1);
		for (const r of u.planets[0].religions) {
			if (r.id) {
				expect(r.theology).toBeDefined();
				expect(r.doctrine).toBeDefined();
			}
		}
	});

	it('simulates ideologies, factions, and coups d etat', () => {
		const rng = makeRng('politics-test-seed');
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const factions = generateFactionsForPolity(pol, sim.people, rng);
		expect(factions.length).toBeGreaterThanOrEqual(2);
		for (const f of factions) {
			expect(IDEOLOGIES[f.ideology]).toBeDefined();
			expect(f.influence).toBeGreaterThan(0);
			expect(f.name).not.toContain('—');
		}

		// Force high militancy and low stability to trigger a coup
		pol.factions = factions;
		pol.stability = 15;
		pol.factions[1].militancy = 95;
		pol.factions[1].influence = 75;

		let coupEventFound = false;
		for (let i = 0; i < 20; i++) {
			const res = updatePolitics(pol, sim.people, 10 + i, rng, false);
			if (res.events.some((e) => e.kind === 'coup')) {
				coupEventFound = true;
				const coupEv = res.events.find((e) => e.kind === 'coup')!;
				expect(coupEv.text).toContain('seizes control');
				expect(coupEv.text).not.toContain('—');
				break;
			}
		}
		expect(coupEventFound).toBe(true);
	});

	it('simulates anthropogenic ecological disasters and landscape changes', () => {
		const rng = makeRng('ecology-test-seed');
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Run processAnthropogenicDisasters over multiple cycles
		const events: any[] = [];
		for (let yr = 1; yr <= 20; yr++) {
			events.push(...processAnthropogenicDisasters(sim.w, sim.polities, yr, rng));
		}

		expect(events.length).toBeGreaterThanOrEqual(1);
		for (const ev of events) {
			expect(ev.kind).toBe('eco_disaster');
			expect(ev.text).not.toContain('—');
		}
	});

	it('simulates intrigue, covert operations, and diplomatic scandals', () => {
		const rng = makeRng('intrigue-test-seed');
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		expect(Object.keys(COVERT_OPS).length).toBe(5);
		const nextMissionObj = { val: 1 };
		const { events, missions } = updateIntrigue(sim.polities, sim.people, 8, rng, nextMissionObj);

		expect(missions.length).toBeGreaterThanOrEqual(1);
		expect(events.length).toBeGreaterThanOrEqual(1);
		for (const ev of events) {
			expect(ev.kind).toBe('intrigue');
			expect(ev.text).not.toContain('—');
		}
	});

	it('simulates story quests and multi-stage expeditions', () => {
		const rng = makeRng('quests-test-seed');
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Ensure hero candidate exists
		const candidate = sim.people.find((p) => p.alive && p.id)!;
		candidate.role = 'hero';
		candidate.renown = 50;

		const nextQuest = { val: 1 };
		const quest = spawnQuest(
			sim.w,
			sim.polities,
			sim.people,
			sim.monsters,
			rng,
			1,
			nextQuest
		);

		expect(quest).not.toBeNull();
		expect(quest!.stage).toBe('scouting');
		expect(quest!.icon).toBeDefined();
		expect(quest!.storyLog.length).toBeGreaterThan(0);
		expect(quest!.storyLog[0]).not.toContain('—');

		const quests = [quest!];
		const nextArt = { val: 100 };
		// First step advances to confrontation
		updateQuests(quests, sim.people, sim.artifacts, 2, rng, nextArt, sim.lang(1));
		expect(quest!.stage).toBe('confrontation');
		expect(quest!.storyLog[1].length).toBeGreaterThan(15);
		expect(quest!.storyLog[1]).not.toContain('—');

		// Second step finishes the quest
		const ev2 = updateQuests(quests, sim.people, sim.artifacts, 3, rng, nextArt, sim.lang(1));
		expect(quest!.stage).toBe('completed');
		expect(ev2[0].text).toContain('QUEST COMPLETED');
		expect(ev2[0].text).not.toContain('—');
	});

	it('supports trader/entrepreneur avatar actions and random divine casting', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const person = sim.people.find((p) => p.alive)!;
		sim.avatar = person.id;

		// Invest action
		person.gold = 50;
		person.role = 'wanderer';
		const investMsg = sim.act('invest');
		expect(investMsg).toContain('invest');
		expect(investMsg).not.toContain('—');

		// Enterprise action
		person.gold = 100;
		person.renown = 20;
		const enterpriseMsg = sim.act('enterprise');
		expect(enterpriseMsg).toContain('charter');
		expect(person.role).toBe('entrepreneur');
		expect(enterpriseMsg).not.toContain('—');

		// Infiltrate action
		person.gold = 50;
		person.intrigue = 15;
		const infiltrateMsg = sim.act('infiltrate');
		expect(infiltrateMsg.length).toBeGreaterThan(10);
		expect(infiltrateMsg).not.toContain('—');

		// Automated Random Divine Casting
		const resBless = sim.castRandom('bless');
		expect(resBless.cell).toBeGreaterThanOrEqual(0);
		expect(resBless.text).not.toContain('—');

		const resHero = sim.castRandom('hero');
		expect(resHero.cell).toBeGreaterThanOrEqual(0);
		expect(sim.people.some((p) => p.role === 'hero')).toBe(true);

		const resMonster = sim.castRandom('monster');
		expect(resMonster.cell).toBeGreaterThanOrEqual(0);
		expect(sim.monsters.length).toBeGreaterThan(0);
	});

	it('serializes and restores covert missions and story quests in dump/restore', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Run 3 years of simulation
		for (let m = 0; m < 36; m++) sim.tick();

		const snapshot = sim.dump();
		expect(snapshot.missions).toBeDefined();
		expect(snapshot.quests).toBeDefined();

		const restored = Simulation.restore(sim.w, snapshot);
		expect(restored.missions.length).toBe(sim.missions.length);
		expect(restored.quests.length).toBe(sim.quests.length);
	});

	it('supports constructible wonders, towers, and divine wonder consecration', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const initialWondersCount = sim.wonders.length;
		const burg = u.planets[0].burgs.find((b) => b.id && b.alive)!;

		// 1. Divine power wonder consecration
		const res = sim.cast('wonder', burg.cell, 0);
		expect(res).toBeNull();
		expect(sim.wonders.length).toBe(initialWondersCount + 1);
		const newWonder = sim.wonders[sim.wonders.length - 1];
		expect(newWonder.cell).toBe(burg.cell);
		expect(newWonder.name.length).toBeGreaterThan(0);
		expect(newWonder.effect).toBeDefined();

		// 2. Avatar building tower and wonder
		const person = sim.people.find((p) => p.alive)!;
		sim.avatar = person.id;
		person.gold = 200;

		const towerMsg = sim.act('build_tower');
		expect(towerMsg).toContain('commission the construction of');
		expect(towerMsg).not.toContain('—');
		expect(sim.wonders.length).toBe(initialWondersCount + 2);
		const builtTower = sim.wonders[sim.wonders.length - 1];
		expect(builtTower.kind === 'tower_magic' || builtTower.kind === 'tower_trials').toBe(true);
		expect(builtTower.builder).toContain(person.name);

		const wonderMsg = sim.act('build_wonder');
		expect(wonderMsg).toContain('complete the construction of');
		expect(wonderMsg).not.toContain('—');
		expect(sim.wonders.length).toBe(initialWondersCount + 3);
	});

	it('enforces monster toughness, armor damage reduction, and regeneration', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Ensure monsters exist
		expect(sim.monsters.length).toBeGreaterThan(0);
		const cataclysmMonster = sim.monsters.find((m) => m.tier === 'cataclysm');
		if (cataclysmMonster) {
			expect(cataclysmMonster.armor).toBeGreaterThanOrEqual(0.40);
			expect(cataclysmMonster.hardToKill).toBe(true);
			expect(cataclysmMonster.regen).toBeGreaterThanOrEqual(10);
			expect(cataclysmMonster.trophy).toBeDefined();

			// Test combat damage reduction
			const hpBefore = cataclysmMonster.health;
			const rawDamage = 50;
			const expectedMaxDamage = Math.round(rawDamage * (1 - cataclysmMonster.armor!));

			const res = resolveMonsterCombat(cataclysmMonster, rawDamage, 'Sir Galahad', 10, sim.rng);
			expect(res.effectiveDamage).toBeLessThanOrEqual(expectedMaxDamage + 1);
			expect(cataclysmMonster.health).toBe(hpBefore - res.effectiveDamage);
			expect(res.summary).not.toContain('—');

			// Test annual regeneration
			const damagedHp = cataclysmMonster.health;
			updateMonsters(sim.monsters, sim.w, sim.rng, 11, 0); // Month 0 triggers annual regen
			expect(cataclysmMonster.health).toBe(Math.min(cataclysmMonster.maxHealth, damagedHp + (cataclysmMonster.regen ?? 5)));
		}
	});

	it('awards relics, material bounties, stability surge, and titan shrines when beasts are slain', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const monster = sim.monsters.find((m) => m.alive)!;
		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const hero = sim.people.find((p) => p.alive && p.state === pol.id)!;
		sim.avatar = hero.id;

		// Teleport monster next to avatar's burg
		const here = sim.w.burgs[hero.burg];
		monster.cell = here.cell;
		monster.health = 10; // low health so next strike slays it

		const artifactsBefore = sim.artifacts.length;
		const wondersBefore = sim.wonders.length;
		const goldBefore = hero.gold;
		const stabBefore = pol.stability;

		const huntMsg = sim.act('hunt');
		expect(huntMsg).toContain('VICTORY!');
		expect(huntMsg).not.toContain('—');
		expect(monster.alive).toBe(false);
		expect(monster.slayer).toContain(hero.name);

		// Relic awarded
		expect(sim.artifacts.length).toBe(artifactsBefore + 1);
		const forgedRelic = sim.artifacts[sim.artifacts.length - 1];
		expect(forgedRelic.holderName).toBe(hero.name);
		expect(forgedRelic.lore).toContain(monster.name);

		// Material and stability rewards
		expect(hero.gold).toBeGreaterThan(goldBefore);
		expect(pol.stability).toBeGreaterThanOrEqual(stabBefore);

		// If cataclysm or legendary, titan shrine wonder created
		if (monster.tier === 'cataclysm' || monster.tier === 'legendary') {
			expect(sim.wonders.length).toBe(wondersBefore + 1);
			const shrine = sim.wonders[sim.wonders.length - 1];
			expect(shrine.kind).toBe('titan_shrine');
			expect(shrine.monumentTo).toBe(monster.name);
			expect(shrine.builder).toBe(hero.name);
		}
	});

	it('handles wonder destruction, sacking in war, avatar razing, and human-made disasters', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Check standing wonder helper
		const wonder = sim.wonders[0];
		expect(isWonderStanding(wonder)).toBe(true);

		// Manual wonder destruction
		const destroyRes = destroyWonder(wonder, 'Invading Horde', 15, 'sacked during siege');
		expect(wonder.destroyed).toBe(true);
		expect(wonder.destroyedYear).toBe(15);
		expect(wonder.destroyer).toBe('Invading Horde');
		expect(wonder.ruinCause).toBe('sacked during siege');
		expect(destroyRes.event.text).toContain('WONDER DESTROYED:');
		expect(destroyRes.event.text).not.toContain('—');
		expect(isWonderStanding(wonder)).toBe(false);

		// Avatar raze action
		const activeWonder = sim.wonders.find((w) => !w.destroyed)!;
		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const ruler = sim.people[pol.ruler];
		sim.avatar = ruler.id;

		// Move ruler to the wonder's burg
		const targetBurg = sim.w.burgs[activeWonder.burgId ?? 1];
		ruler.burg = targetBurg.id;
		activeWonder.cell = targetBurg.cell;

		const goldBefore = ruler.gold;
		const razeMsg = sim.act('raze');
		expect(razeMsg).toContain('You raze');
		expect(razeMsg).not.toContain('—');
		expect(activeWonder.destroyed).toBe(true);
		expect(ruler.gold).toBe(goldBefore + 80);
		expect(ruler.traits).toContain('Feared');

		// Anthropogenic disaster: Arcane meltdown destroying wonders
		const freshWonder = sim.wonders.find((w) => !w.destroyed)!;
		const testCell = freshWonder.cell;
		sim.innovation = 65;
		sim.c.pop[testCell] = 1.5;
		sim.c.h[testCell] = 35;

		const ecoEvents = processAnthropogenicDisasters(sim.w, sim.polities, 25, makeRng('test-meltdown'), sim.wonders, 65);
		expect(ecoEvents.length).toBeGreaterThan(0);
		for (const ev of ecoEvents) {
			expect(ev.text).not.toContain('—');
		}

		// God power meteor destruction
		const thirdWonder = sim.wonders.find((w) => !w.destroyed);
		if (thirdWonder) {
			const targetC = thirdWonder.cell;
			sim.cast('meteor', targetC, 0);
			expect(thirdWonder.destroyed).toBe(true);
		}
	});

	it('features celestial pantheon deities, patron backing, divine proxy wars, and chosen realms', () => {
		expect(PANTHEON_DEITIES.length).toBe(8);
		for (const d of PANTHEON_DEITIES) {
			expect(d.name).toBeDefined();
			expect(d.domain).toBeDefined();
			expect(d.blessing).not.toContain('—');
		}

		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Polities receive patron deities
		const alivePolities = sim.polities.filter((p) => p.alive && p.id);
		expect(alivePolities.length).toBeGreaterThan(0);
		for (const pol of alivePolities) {
			expect(pol.patronDeity).toBeDefined();
			expect(pol.patronFavor).toBeGreaterThanOrEqual(40);
		}

		// Test divine proxy war
		const p1 = alivePolities[0];
		const p2 = alivePolities[1];
		p1.patronDeity = 'Kaelok the Iron Warlord';
		p1.patronDomain = 'War';
		p2.patronDeity = 'Solarius the Dawn-Bringer';
		p2.patronDomain = 'Sun';

		sim.declareWar(p1.id, p2.id, 'holy conflict');
		const activeWar = sim.wars.find((w) => !w.end && w.attackers.includes(p1.id) && w.defenders.includes(p2.id))!;
		expect(activeWar).toBeDefined();

		const loggedEvents: string[] = [];
		const testRng = makeRng('proxy-war-rng');
		for (let step = 0; step < 12; step++) {
			processPantheonInterventions(sim.polities, [activeWar], 10 + step, testRng, (k, t) => {
				loggedEvents.push(t);
			});
			if (loggedEvents.some((t) => t.includes('DIVINE PROXY WAR') || t.includes('PATRON MIRACLE'))) break;
		}

		expect(loggedEvents.some((t) => t.includes('DIVINE PROXY WAR') || t.includes('PATRON MIRACLE'))).toBe(true);
		for (const t of loggedEvents) {
			expect(t).not.toContain('—');
		}

		// Player God Power: Crown Chosen Realm
		const chosenPol = alivePolities[2];
		const crownMsg = sim.cast('patron', sim.w.burgs[chosenPol.capital].cell, 0);
		expect(crownMsg).toBeNull(); // successfully cast
		expect(chosenPol.isChosenRealm).toBe(true);
		expect(chosenPol.patronDeity).toBe('The Creator (You)');
		expect(chosenPol.patronFavor).toBe(100);
		expect(sim.events.some((e) => e.text.includes('Chosen Realm'))).toBe(true);
	});

	it('enacts faith destruction by radical secularization, state atheism, and the Great Reformation with iconoclasm', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Test State Atheism via Coup d'Etat
		const pol = sim.polities.find((p) => p.alive && p.id)!;
		pol.ideology = 'theocracy';
		pol.stability = 20;

		const insurgentFaction = {
			id: 'rival_communal',
			name: 'Communal Vanguard',
			ideology: 'communal' as const,
			influence: 75,
			militancy: 80,
			leaderId: pol.ruler
		};
		pol.factions = [insurgentFaction];

		const coupResult = updatePolitics(pol, sim.people, 30, makeRng('secular-coup-test'), false);
		if ((pol.ideology as string) === 'communal') {
			expect(pol.secularized).toBe(true);
			expect(pol.religion).toBe(0);
			expect(pol.patronDeity).toBeUndefined();
			expect(pol.treasury).toBeGreaterThanOrEqual(65);
			expect(coupResult.events.some((e) => e.text.includes('STATE ATHEISM PROCLAIMED'))).toBe(true);
		}

		// Test Avatar secularize action
		const secularTargetPol = sim.polities.find((p) => p.alive && p.id && !p.secularized)!;
		const secularRuler = sim.people[secularTargetPol.ruler];
		sim.avatar = secularRuler.id;
		const initialTreasury = secularTargetPol.treasury;

		const secularMsg = sim.act('secularize');
		expect(secularMsg).toContain('State Atheism');
		expect(secularMsg).not.toContain('—');
		expect(secularTargetPol.secularized).toBe(true);
		expect(secularTargetPol.religion).toBe(0);
		expect(secularTargetPol.treasury).toBe(initialTreasury + 70);

		// Test The Great Reformation
		sim.innovation = 60;
		sim.era = 2;
		const relsBefore = sim.w.religions.length;

		// Run simulation for several years to trigger Reformation
		for (let yr = 0; yr < 50; yr++) {
			for (let m = 0; m < 12; m++) sim.tick();
			if (sim.w.religions.some((r) => r.name.includes('Reformed'))) break;
		}

		const hasReformedRel = sim.w.religions.some((r) => r.name.includes('Reformed'));
		expect(hasReformedRel).toBe(true);
		const reformationEvent = sim.events.find((e) => e.text.includes('THE GREAT REFORMATION'));
		expect(reformationEvent).toBeDefined();
		expect(reformationEvent?.text).not.toContain('—');
	});

	it('revolts establish ideological systems (Republic, Free Union, etc.) with dynamic titles', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const parent = sim.polities.find((p) => p.alive && p.cells > 10)!;
		const rebelBurg = sim.w.burgs.find((b) => b.alive && b.state === parent.id && b.id !== parent.capital)!;

		const rebel = sim.revolt(parent, rebelBurg.cell);
		expect(rebel).toBeDefined();
		if (rebel) {
			expect(rebel.ideology).toBeDefined();
			expect(['monarchy', 'republic', 'theocracy', 'oligarchy', 'autocracy', 'communal', 'technocracy']).toContain(rebel.ideology);
			expect(rebel.fullName).toContain(rebel.name);
			expect(rebel.factions).toBeDefined();
			expect(rebel.factions!.length).toBeGreaterThan(0);

			const rebelEv = sim.events.find((e) => e.kind === 'rebel' && e.text.includes(rebel.name));
			expect(rebelEv).toBeDefined();
			expect(rebelEv!.text).not.toContain('—');
		}
	});

	it('popular revolutions and constitutional reforms change realm systems', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const initialName = pol.name;

		// 1. Format regime title
		const titleRep = formatRegimeTitle(initialName, 'republic', makeRng('title-test'));
		expect(titleRep.fullName).toContain(initialName);
		expect(titleRep.fullName).not.toContain('—');

		const titleUnion = formatRegimeTitle(initialName, 'communal', makeRng('title-union-test'));
		expect(titleUnion.fullName).toContain(initialName);
		expect(titleUnion.fullName).not.toContain('—');

		// 2. Popular revolution
		pol.ideology = 'monarchy';
		const revRes = transitionRegime(pol, 'republic', 'revolution', 45, makeRng('rev-test'), sim.people);
		expect(revRes.changed).toBe(true);
		expect(pol.ideology).toBe('republic');
		expect(pol.systemChangeCause).toBe('revolution');
		expect(pol.reformedSystemYear).toBe(45);
		expect(revRes.events.some((e) => e.text.includes('POPULAR REVOLUTION'))).toBe(true);
		for (const ev of revRes.events) {
			expect(ev.text).not.toContain('—');
		}

		// 3. Peaceful constitutional reform
		pol.stability = 60;
		const reformRes = transitionRegime(pol, 'communal', 'reform', 60, makeRng('reform-test'), sim.people);
		expect(reformRes.changed).toBe(true);
		expect(pol.ideology).toBe('communal');
		expect(pol.systemChangeCause).toBe('reform');
		expect(pol.reformedSystemYear).toBe(60);
		expect(reformRes.events.some((e) => e.text.includes('CONSTITUTIONAL REFORM'))).toBe(true);
		for (const ev of reformRes.events) {
			expect(ev.text).not.toContain('—');
		}

		// 4. Enforced post-war conquest regime change
		const conquestRes = transitionRegime(pol, 'autocracy', 'conquest', 75, makeRng('conq-test'), sim.people, { victorName: 'Allied Coalition' });
		expect(conquestRes.changed).toBe(true);
		expect(pol.ideology).toBe('autocracy');
		expect(pol.systemChangeCause).toBe('conquest');
		expect(conquestRes.events.some((e) => e.text.includes('ENFORCED REGIME CHANGE'))).toBe(true);
		for (const ev of conquestRes.events) {
			expect(ev.text).not.toContain('—');
		}

		// 5. Interregnum crown abolition
		pol.ideology = 'monarchy';
		const interregnumRes = transitionRegime(pol, 'republic', 'interregnum', 90, makeRng('inter-test'), sim.people);
		expect(interregnumRes.changed).toBe(true);
		expect(pol.ideology).toBe('republic');
		expect(pol.systemChangeCause).toBe('interregnum');
		expect(interregnumRes.events.some((e) => e.text.includes('INTERREGNUM ABOLITION'))).toBe(true);
		for (const ev of interregnumRes.events) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('avatar can transform realm system or lead popular revolution in capital', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Avatar as ruler transforming state
		const targetPol = sim.polities.find((p) => p.alive && p.id)!;
		const ruler = sim.people[targetPol.ruler];
		sim.avatar = ruler.id;

		// 1. Proclaim Republic
		targetPol.ideology = 'monarchy';
		const repMsg = sim.act('proclaim_republic');
		expect(repMsg).toContain('elected assembly');
		expect(repMsg).not.toContain('—');
		expect(targetPol.ideology).toBe('republic');

		// 2. Proclaim Free Union
		const unionMsg = sim.act('proclaim_union');
		expect(unionMsg).toContain('Common lands');
		expect(unionMsg).not.toContain('—');
		expect(targetPol.ideology).toBe('communal');

		// 3. Proclaim Monarchy
		const monMsg = sim.act('proclaim_monarchy');
		expect(monMsg).toContain('Dynastic rule');
		expect(monMsg).not.toContain('—');
		expect(targetPol.ideology).toBe('monarchy');

		// 4. Non-ruler leading a revolution in the capital
		const nonRuler = sim.people.find((p) => p.alive && p.role !== 'ruler' && p.state === targetPol.id)!;
		nonRuler.burg = targetPol.capital;
		nonRuler.renown = 50;
		nonRuler.intrigue = 15;
		targetPol.stability = 30;
		sim.avatar = nonRuler.id;

		const revMsg = sim.act('revolution');
		expect(revMsg).toContain('You lead the masses to storm the palace');
		expect(revMsg).not.toContain('—');
		expect(targetPol.ruler).toBe(nonRuler.id);
		expect(nonRuler.role).toBe('ruler');
	});

	it('executes completeSim and preserves all annals and timeline snapshots from start to end', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Initial history snapshot recorded at birth
		expect(sim.historySnapshots.length).toBeGreaterThanOrEqual(1);

		// Execute complete simulation for 25 years
		const res = cos.completeSim(25);
		expect(res.yearsSimulated).toBe(25);
		expect(sim.year).toBeGreaterThanOrEqual(26);

		// allEvents must contain all historical events from year 1 to year 26 without truncation
		expect(sim.allEvents.length).toBeGreaterThanOrEqual(25);
		const yearsRecorded = new Set(sim.allEvents.map((e) => e.y));
		expect(yearsRecorded.has(1) || yearsRecorded.has(2)).toBe(true);

		// History snapshots must have preserved year 0/1 and periodic snapshots
		expect(sim.historySnapshots.length).toBeGreaterThanOrEqual(5);
		expect(sim.historySnapshots[0].year).toBeLessThanOrEqual(5);
		expect(sim.historySnapshots[sim.historySnapshots.length - 1].year).toBeGreaterThanOrEqual(20);

		// Synthesizing annals from allEvents should cover multiple decades
		const annals = synthesizeAnnualAnnals(sim.allEvents, sim.w.name, 100);
		expect(annals.length).toBeGreaterThanOrEqual(10);
		for (const a of annals) {
			expect(a.headline).toBeDefined();
			expect(a.prose).not.toContain('—');
		}

		// Compile full markdown annals book
		const md = compileAnnalsBookMarkdown(sim.allEvents, sim.w.name, 100);
		expect(md).toContain(`# The Annals of ${sim.w.name}`);
		expect(md).toContain('Year ');
		expect(md).not.toContain('—');

		// Verify serialization through dump and restore
		const dumped = sim.dump();
		expect(dumped.allEvents.length).toBe(sim.allEvents.length);
		expect(dumped.historySnapshots.length).toBe(sim.historySnapshots.length);
		const restored = Simulation.restore(sim.w, dumped);
		expect(restored.allEvents.length).toBe(sim.allEvents.length);
		expect(restored.historySnapshots.length).toBe(sim.historySnapshots.length);
		expect(restored.historySnapshots[0].surfaceStates instanceof Uint16Array).toBe(true);
	});

	it('simulates randomized uprisings including riots, cults, prophets, folk heroes, mutinies, and avatar deeds', () => {
		const u = generateUniverse(base, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Force conditions for riots and uprisings
		const pol = sim.polities.find((p) => p.alive && p.id && sim.w.burgs.some((b) => b.alive && b.state === p.id))!;
		pol.stability = 20;
		pol.tax = 0.25;

		// Simulate forward 15 years to trigger spontaneous uprisings
		for (let yr = 0; yr < 15; yr++) {
			for (let m = 0; m < 12; m++) cos.tick();
		}

		// Check for recorded uprising events
		const uprisingEvents = sim.allEvents.filter((e) => e.kind === 'uprising');
		expect(uprisingEvents.length).toBeGreaterThanOrEqual(1);
		for (const ev of uprisingEvents) {
			expect(ev.text).not.toContain('—');
		}

		// Verify uprisings tracked in sim.uprisings
		expect(sim.uprisings.length).toBeGreaterThanOrEqual(1);
		const up = sim.uprisings[0];
		expect(['riot', 'cult', 'prophet', 'hero', 'mutiny', 'slave_revolt']).toContain(up.kind);
		expect(up.title).toBeDefined();

		// Test Avatar Uprising Deeds
		const citizen = sim.people.find((p) => p.alive && p.role !== 'ruler')!;
		sim.avatar = citizen.id;
		const burg = sim.w.burgs[citizen.burg];
		expect(burg).toBeDefined();

		// 1. Incite Riot
		const startGold = citizen.gold;
		const riotMsg = sim.act('stir_riot');
		expect(riotMsg).toContain('incite a roaring riot');
		expect(riotMsg).not.toContain('—');
		expect(citizen.gold).toBe(startGold + 25);

		// 2. Found Secret Cult
		const cultCount = sim.uprisings.filter((x) => x.kind === 'cult').length;
		const cultMsg = sim.act('found_cult');
		expect(cultMsg).toContain('secret esoteric coven');
		expect(cultMsg).not.toContain('—');
		expect(sim.uprisings.filter((x) => x.kind === 'cult').length).toBe(cultCount + 1);

		// 3. Proclaim Holy Prophecy
		const prophetCount = sim.uprisings.filter((x) => x.kind === 'prophet').length;
		const prophetMsg = sim.act('proclaim_prophecy');
		expect(prophetMsg).toContain('proclaim divine prophecy');
		expect(prophetMsg).not.toContain('—');
		expect(citizen.traits).toContain('Prophet');
		expect(sim.uprisings.filter((x) => x.kind === 'prophet').length).toBe(prophetCount + 1);

		// 4. Rally as Folk Hero
		const heroCount = sim.uprisings.filter((x) => x.kind === 'hero').length;
		const heroMsg = sim.act('rally_hero');
		expect(heroMsg).toContain('folk champion');
		expect(heroMsg).not.toContain('—');
		expect(citizen.traits).toContain('Hero');
		expect(sim.uprisings.filter((x) => x.kind === 'hero').length).toBe(heroCount + 1);
	});
});

