import { clamp, makeRng, type Rng } from '../rng';
import { neighbors } from '../gen/grid';
import { makeLang, makeName, personName, type Lang } from '../gen/names';
import { assignBiomes, assignPopulation, biomeOf, BIOMES, climate, markFeatures, planetBiomes, precipitation } from '../gen/physical';
import { withDefaults } from '../gen/options';
import type { Climate } from '../gen/types';
import { GENRES, type Genre } from '../gen/genre';
import { langSeed, palette, polityForm } from '../gen/society';
import { SEA, type Culture, type Religion, type World } from '../gen/types';
import { AGES, ENCOUNTERS, REBEL_FORMS, TRAITS, TRAIT_FX, WAR_NAMES } from './content';
import { forgeArtifact, forgeMonsterRelic, type Artifact } from './relics';
import { updateCaravans, type CaravanToken } from './trade';
import { DISCOVERIES, ERAS, checkNextDiscovery, type TechDiscovery } from './tech';
import {
	narrateColonization,
	narrateConversion,
	narrateDeath,
	narrateDisaster,
	narrateFall,
	narrateFounding,
	narrateHeirlessCrisis,
	narrateMiscEvent,
	narratePalaceCoup,
	narratePeace,
	narrateProphet,
	narrateRebellion,
	narrateRelicLoot,
	narrateSiege,
	narrateWar
} from './chronicle';
import { generateWonders, buildWonder, createTitanShrineWonder, destroyWonder, isWonderStanding } from './wonders';
import { generateMonsters, updateMonsters, MONSTER_ARCHETYPES, resolveMonsterCombat } from './monsters';
import { createLuminary, LUMINARY_PROFILES } from './luminaries';
import { SPECIES_BY_ID } from '../gen/species';
import { updatePolitics, generateFactionsForPolity, formatRegimeTitle, transitionRegime } from './politics';
import { processAnthropogenicDisasters } from './ecology';
import { updateIntrigue } from './intrigue';
import { spawnQuest, updateQuests } from './quests';
import { assignPatronDeity, processPantheonInterventions } from './pantheon';
import { processYearlyUprisings } from './uprisings';
import { packEncounters, packLine, reskin } from './genrepacks';
import { vassalizeAfterWar, yearlyConsolidation } from './consolidation';
import { yearlySphereLore } from './spherelore';
import { yearlyLayerLife } from './layerlife';
import { yearlyEpochs, type ClimateEpoch } from './epochs';
import { checkAmbition, companionBonus, hireCompanion, yearlyLetters, type Letter } from './ambitions';
import type { ArmyToken, ChronEvent, CovertMission, Effects, Encounter, EventKind, HistorySnapshot, IdeologyKind, Monster, LegendaryPlace, Person, Polity, Quest, Role, Travel, UprisingRecord, War } from './types';

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
	| 'patron';

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
	patron: { name: 'Crown Chosen Realm', cost: 25, icon: '👑', desc: 'Anoint this nation as your Chosen Realm, granting supreme celestial protection and favor' }
};

const MAX_EVENTS = 600;

/**
 * The living world. Owns and mutates World.cells.state / burgs; everything is deterministic
 * from the world seed + sequence of player actions.
 */
export class Simulation {
	w: World;
	rng: Rng;
	year = 1;
	month = 0;
	mana = 50;
	manaMax = 100;
	sandbox = false;
	people: Person[] = [];
	polities: Polity[] = [];
	wars: War[] = [];
	events: ChronEvent[] = [];
	allEvents: ChronEvent[] = [];
	plague: Float32Array;
	basePop: Float32Array;
	langs: Lang[] = [];
	avatar = -1;
	travel: Travel | null = null;
	pending: Encounter | null = null;
	/** cells whose ownership/terrain changed since the renderer last looked */
	dirty = { political: true, terrain: false };
	/** border length between polities, refreshed yearly */
	borders = new Map<string, number>();
	private nextWar = 1;
	/** burg id per cell, per layer */
	lb: Uint16Array[] = [];
	/** layer index per burg id */
	bl: number[] = [];
	artifacts: Artifact[] = [];
	caravans: CaravanToken[] = [];
	armyTokens: ArmyToken[] = [];
	historySnapshots: HistorySnapshot[] = [];
	wonders: LegendaryPlace[] = [];
	monsters: Monster[] = [];
	quests: Quest[] = [];
	missions: CovertMission[] = [];
	uprisings: UprisingRecord[] = [];
	/** polity id → year its next notable uprising may happen */
	unrestUntil = new Map<number, number>();
	/** avatar inbox (ambitions.ts) */
	letters: Letter[] = [];
	tradeTip: { burg: number; until: number } | null = null;
	/** active climate epoch (epochs.ts) */
	epoch: ClimateEpoch | null = null;
	era = 0;
	innovation = 0;
	techs = new Set<string>();
	cosmos?: import('./cosmos').Cosmos;
	planetIndex = 0;
	private nextArtifactId = 1;
	private nextQuestId = 1;
	private nextMissionId = 1;
	private nextWonderId = 1;

	constructor(world: World, restoring = false) {
		this.w = world;
		this.rng = makeRng(world.opts.seed + ':sim');
		this.voice = world.opts.genre;
		const c = world.cells;
		this.plague = new Float32Array(c.n);
		this.basePop = c.pop.slice();
		for (const cu of world.cultures) this.langs[cu.id] = makeLang(langSeed(world.opts.seed, cu.id || 1) + ':sim', cu.sphere || undefined);
		// per-layer burg lookup (surface shares cells.burg)
		this.lb = world.layers.map((l, k) => (k === 0 ? c.burg : new Uint16Array(c.n)));
		for (const b of world.burgs) {
			if (!b.id) continue;
			const li = world.layers.findIndex((l) => l.kind === b.layer && l.depth === b.depth);
			this.bl[b.id] = Math.max(0, li);
			if (li > 0) this.lb[li][b.cell] = b.id;
		}
		if (restoring) return;
		this.people.push(this.blankPerson()); // id 0 = nobody
		for (const s of world.states) {
			const p: Polity = {
				id: s.id,
				name: s.name,
				form: s.form,
				fullName: s.fullName,
				color: s.color,
				capital: s.capital,
				culture: s.culture,
				religion: s.religion,
				alive: s.id > 0,
				founded: -this.rng.int(20, 400),
				treasury: 30 + this.rng() * 40,
				army: 0,
				stability: 50 + this.rng() * 30,
				tax: 0.1,
				ruler: 0,
				heir: 0,
				relations: {},
				allies: [],
				cells: 0,
				pop: 0,
				peak: 0,
				expansionism: s.expansionism,
				origin: 'founding',
				layer: s.layer,
				species: world.cultures[s.culture]?.species ?? 'human',
				ideology: this.rng.chance(0.65) ? 'monarchy' : this.rng.pick(['republic', 'theocracy', 'oligarchy', 'communal'])
			};
			this.polities.push(p);
		}
		this.recount();
		for (const p of this.polities) {
			if (!p.alive) continue;
			p.army = p.pop * 0.02;
			p.peak = p.cells;
			this.crown(p, this.makePerson(p.culture, p.id, p.capital, 'ruler', this.rng.int(20, 55)));
			if (this.rng.chance(0.8)) p.heir = this.makePerson(p.culture, p.id, p.capital, 'heir', this.rng.int(0, 20), this.polities[p.id].ruler).id;
			this.makePerson(p.culture, p.id, p.capital, 'general', this.rng.int(25, 50));
			p.factions = generateFactionsForPolity(p, this.people, this.rng);
			p.spymaster = this.makePerson(p.culture, p.id, p.capital, 'general', this.rng.int(22, 45)).id;
		}
		// a few free folk to play as
		const burgs = world.burgs.filter((b) => b.id && b.alive);
		for (let k = 0; k < Math.min(40, burgs.length); k++) {
			const b = this.rng.pick(burgs);
			const role = this.rng.pick<Role>(['merchant', 'trader', 'entrepreneur', 'wanderer', 'priest']);
			this.makePerson(b.culture, 0, b.id, role, this.rng.int(16, 40));
		}
		this.computeBorders();
		for (const pol of this.polities.slice(1, 5)) {
			if (!pol.alive) continue;
			const art = forgeArtifact(this.nextArtifactId++, this.rng, -this.rng.int(50, 250), this.lang(pol.culture), 'polity', pol.id, pol.name);
			this.artifacts.push(art);
		}
		this.wonders = generateWonders(world, this.rng);
		this.nextWonderId = Math.max(10, ...this.wonders.map((w) => w.id)) + 1;
		this.monsters = generateMonsters(world, this.rng);
		for (const pol of this.polities) {
			if (pol.id && pol.alive && !pol.patronDeity && !pol.secularized) {
				assignPatronDeity(pol, this.rng);
			}
		}
		this.takeHistorySnapshot();
		this.updateVoice();
		this.log('misc', `The grand chronicle of ${world.name} begins: sovereign houses arise and uncharted lands await their destiny.`);
	}

	// ───────────────────────────── helpers ─────────────────────────────
	get c() {
		return this.w.cells;
	}
	get age() {
		let name: string = AGES[0][1];
		for (const [y, n] of AGES) if (this.year >= y) name = n;
		return name;
	}
	private nextEventId = 1;
	log(kind: EventKind, text: string, cell?: number, state?: number) {
		const ev: ChronEvent = { id: this.nextEventId++, y: this.year, m: this.month, kind, text: reskin(this.voice, text), cell, state };
		this.events.push(ev);
		if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
		this.allEvents.push(ev);
	}
	blankPerson(): Person {
		return { id: 0, name: '', house: '', born: 0, culture: 0, religion: 0, state: 0, burg: 0, role: 'wanderer', martial: 0, diplomacy: 0, stewardship: 0, intrigue: 0, health: 0, gold: 0, renown: 0, alive: false, traits: [], parent: 0 };
	}
	ageOf(p: Person) {
		return this.year - p.born;
	}
	lang(culture: number) {
		return this.langs[culture] ?? this.langs[1];
	}
	makePerson(culture: number, state: number, burg: number, role: Role, age: number, parent = 0): Person {
		const r = this.rng;
		const par = parent ? this.people[parent] : null;
		const L = this.lang(culture);
		const traits: string[] = [];
		while (traits.length < 2) {
			const t = r.pick(TRAITS);
			if (!traits.includes(t)) traits.push(t);
		}
		const stat = () => r.int(1, 8) + (role === 'ruler' || role === 'hero' || role === 'villain' || role === 'prophet' ? 2 : 0);
		const p: Person = {
			id: this.people.length,
			name: personName(L),
			house: par ? par.house : makeName(L, 'house'),
			born: this.year - age,
			culture,
			religion: this.polities[state]?.religion || this.c.religion[this.w.burgs[burg]?.cell ?? 0] || culture,
			state,
			burg,
			role,
			martial: stat(),
			diplomacy: stat(),
			stewardship: stat(),
			intrigue: stat(),
			health: 70 + r.int(0, 30),
			gold: role === 'entrepreneur' ? 140 : role === 'trader' ? 90 : role === 'merchant' ? 60 : role === 'ruler' ? 100 : role === 'villain' ? 80 : 20,
			renown: role === 'ruler' ? 40 : role === 'general' ? 20 : role === 'entrepreneur' ? 15 : role === 'villain' || role === 'prophet' ? 30 : r.int(0, 8),
			alive: true,
			traits,
			parent
		};
		for (const t of traits) for (const [k, v] of Object.entries(TRAIT_FX[t] ?? {})) p[k as 'martial'] = clamp(p[k as 'martial'] + v, 0, 20);
		if (role === 'general') p.martial = clamp(p.martial + 4, 0, 20);
		if (role === 'merchant') p.stewardship = clamp(p.stewardship + 3, 0, 20);
		if (role === 'trader') { p.stewardship = clamp(p.stewardship + 4, 0, 20); p.diplomacy = clamp(p.diplomacy + 2, 0, 20); }
		if (role === 'entrepreneur') { p.stewardship = clamp(p.stewardship + 6, 0, 20); p.intrigue = clamp(p.intrigue + 3, 0, 20); }
		if (role === 'priest') p.diplomacy = clamp(p.diplomacy + 3, 0, 20);
		if (role === 'villain') { p.martial = clamp(p.martial + 6, 0, 20); p.intrigue = clamp(p.intrigue + 4, 0, 20); }
		if (role === 'prophet') { p.diplomacy = clamp(p.diplomacy + 6, 0, 20); p.martial = clamp(p.martial + 1, 0, 20); }
		p.species = this.w.cultures[culture]?.species ?? 'human';
		const spDef = SPECIES_BY_ID[p.species];
		if (spDef) {
			p.martial = clamp(p.martial + spDef.mods.martial, 0, 20);
			p.diplomacy = clamp(p.diplomacy + spDef.mods.diplomacy, 0, 20);
			p.stewardship = clamp(p.stewardship + spDef.mods.stewardship, 0, 20);
			p.intrigue = clamp(p.intrigue + spDef.mods.intrigue, 0, 20);
			p.health = Math.max(20, p.health + spDef.mods.health);
		}
		this.people.push(p);
		return p;
	}
	crown(pol: Polity, person: Person) {
		if (person.role !== 'villain') person.role = 'ruler';
		person.state = pol.id;
		person.burg = pol.capital;
		pol.ruler = person.id;
		if (pol.heir === person.id) pol.heir = 0;
	}
	ruler(p: Polity) {
		return this.people[p.ruler];
	}
	general(p: Polity) {
		return this.people.find((x) => x.alive && x.state === p.id && x.role === 'general');
	}
	stateAt(cell: number, layer = 0) {
		return this.polities[this.w.layers[layer].state[cell]];
	}
	st(layer: number) {
		return this.w.layers[layer].state;
	}
	open(layer: number, i: number) {
		return this.w.layers[layer].open[i] === 1;
	}
	burgLayer(b: { id: number }) {
		return this.bl[b.id] ?? 0;
	}
	syncBurgs() {
		for (const b of this.w.burgs) if (b.id && b.alive) b.state = this.st(this.burgLayer(b))[b.cell];
	}
	isLand(i: number) {
		return this.c.h[i] >= SEA;
	}
	atWar(a: number, b: number) {
		return this.wars.some((w) => !w.end && ((w.attackers.includes(a) && w.defenders.includes(b)) || (w.attackers.includes(b) && w.defenders.includes(a))));
	}
	warsOf(id: number) {
		return this.wars.filter((w) => !w.end && (w.attackers.includes(id) || w.defenders.includes(id)));
	}
	rel(a: number, b: number) {
		return this.polities[a].relations[b] ?? 0;
	}
	addRel(a: number, b: number, d: number) {
		if (!a || !b || a === b) return;
		const pa = this.polities[a], pb = this.polities[b];
		pa.relations[b] = clamp((pa.relations[b] ?? 0) + d, -100, 100);
		pb.relations[a] = clamp((pb.relations[a] ?? 0) + d, -100, 100);
	}
	neighborsOf(id: number): number[] {
		const out: number[] = [];
		for (const k of this.borders.keys()) {
			const [a, b] = k.split('-').map(Number);
			if (a === id) out.push(b);
			else if (b === id) out.push(a);
		}
		return out;
	}
	strength(ids: number[]) {
		let s = 0;
		for (const id of ids) {
			const p = this.polities[id];
			if (!p.alive) continue;
			const g = this.general(p);
			const lead = Math.max(this.ruler(p)?.martial ?? 0, g?.martial ?? 0);
			s += p.army * (1 + lead * 0.04) * (0.6 + p.stability / 250);
		}
		return s;
	}
	recount() {
		const c = this.c;
		for (const p of this.polities) { p.cells = 0; p.pop = 0; }
		this.w.layers.forEach((L, li) => {
			for (let i = 0; i < c.n; i++) {
				if (!L.open[i]) continue;
				const p = this.polities[L.state[i]];
				if (!p || !p.id) continue;
				p.cells++;
				// surface folk live off the land; other planes count their settlements + cavern/isle hinterland
				p.pop += li === 0 ? c.pop[i] : 0.35;
			}
		});
		for (const b of this.w.burgs) if (b.id && b.alive && this.burgLayer(b) > 0 && b.state) this.polities[b.state].pop += b.pop * 2;
		for (const p of this.polities) p.peak = Math.max(p.peak, p.cells);
	}
	computeBorders() {
		const { edges } = this.w;
		this.borders.clear();
		const bump = (sa: number, sb: number, n: number) => {
			if (sa === sb || !sa || !sb) return;
			const k = sa < sb ? `${sa}-${sb}` : `${sb}-${sa}`;
			this.borders.set(k, (this.borders.get(k) ?? 0) + n);
		};
		for (const L of this.w.layers) {
			const st = L.state, op = L.open;
			for (let e = 0; e < edges.n; e++) {
				const a = edges.a[e], b = edges.b[e];
				if (op[a] && op[b]) bump(st[a], st[b], 1);
			}
		}
		// vertical neighbours: settlements joined by shafts / docks
		for (const r of this.w.routes) {
			if (r.kind !== 'shaft') continue;
			const A = this.w.burgs[r.a], B = this.w.burgs[r.b];
			if (A.alive && B.alive) bump(A.state, B.state, 4);
		}
	}

	// ───────────────────────────── tick ─────────────────────────────
	tick() {
		if (this.pending) return; // waiting for the player to resolve an encounter
		this.month++;
		if (this.month >= 12) {
			this.month = 0;
			this.year++;
			this.yearly();
			if (this.year % 5 === 0) this.takeHistorySnapshot();
		}
		this.mana = Math.min(this.manaMax, this.mana + 1.5);
		this.monthlyWars();
		this.spreadPlague();
		if (this.month % 3 === 0) this.colonize();
		if (this.month % 2 === 0) {
			this.caravans = updateCaravans(this.caravans, this.w, this.rng);
			this.updateArmyTokens();
		}
		if (this.monsters.length) {
			const monsterEvents = updateMonsters(this.monsters, this.w, this.rng, this.year, this.month);
			for (const ev of monsterEvents) {
				this.log(ev.kind, ev.text, ev.cell, ev.state);
			}
		}
		this.advanceTravel();
		checkAmbition(this);
	}

	takeHistorySnapshot() {
		const surfaceStates = new Uint16Array(this.w.layers[0].state);
		const activeRealms = this.polities.filter((p) => p.id && p.alive).length;
		const activeWars = this.wars.filter((w) => !w.end).length;
		this.historySnapshots.push({
			year: this.year,
			surfaceStates,
			activeRealms,
			activeWars
		});
		if (this.historySnapshots.length > 1000) this.historySnapshots.shift();
	}

	updateArmyTokens() {
		const activeWars = this.wars.filter((w) => !w.end);
		const tokens: ArmyToken[] = [];
		let tid = 1;
		for (const w of activeWars) {
			for (const attId of w.attackers.slice(0, 2)) {
				const pol = this.polities[attId];
				if (!pol?.alive) continue;
				const defId = w.defenders[0];
				const defPol = this.polities[defId];
				const capA = this.w.burgs[pol.capital];
				const capB = defPol ? this.w.burgs[defPol.capital] : null;
				if (capA && capB) {
					const t = 0.2 + (Math.sin(w.months * 0.4 + attId) * 0.5 + 0.5) * 0.6;
					tokens.push({
						id: tid++,
						warId: w.id,
						polityId: pol.id,
						name: `${pol.name} Vanguard`,
						size: Math.max(1, Math.round(pol.army * 0.4)),
						x: capA.x * (1 - t) + capB.x * t,
						y: capA.y * (1 - t) + capB.y * t,
						targetX: capB.x,
						targetY: capB.y,
						color: pol.color
					});
				}
			}
		}
		this.armyTokens = tokens;
	}

	private yearly() {
		this.recount();
		this.computeBorders();
		this.demographics();
		this.economy();
		this.diplomacy();
		this.aiWars();
		this.endWars();
		this.lifecycle();
		this.faiths();
		this.rebellions();
		this.tribes();
		this.randomEvents();
		this.innovate();
		this.updateWonders();
		this.updateLuminaries();
		this.yearlyPolitics();
		this.yearlyIntrigue();
		this.yearlyEcology();
		this.yearlyQuests();
		this.yearlyWonderConstruction();
		this.yearlyMonsterHunts();
		this.yearlyPantheon();
		this.yearlyUprisings();
		yearlySphereLore(this);
		yearlyLayerLife(this);
		yearlyLetters(this);
		yearlyEpochs(this);
		yearlyConsolidation(this);
		this.pruneMinorPeople();
		this.compactArchive();
		this.recount();
	}

	/**
	 * Keep the living cast bounded: once the world holds more notable people than it can
	 * meaningfully track, the least renowned commoners fade from the annals (no log line).
	 * Rulers, heirs, generals, the avatar and anyone mid-quest are never pruned.
	 */
	private pruneMinorPeople() {
		const aliveRealms = this.polities.filter((p) => p.alive && p.id).length;
		const cap = 150 + aliveRealms * 6;
		const alive = this.people.filter((p) => p.alive && p.id);
		if (alive.length <= cap) return;
		const busy = new Set<number>();
		for (const q of this.quests ?? []) if (!q.completed) busy.add(q.heroId);
		const keepRole = new Set(['ruler', 'heir', 'general']);
		const candidates = alive
			.filter((p) => p.id !== this.avatar && p.companionOf !== this.avatar && !busy.has(p.id) && !(keepRole.has(p.role) && this.polities[p.state]?.alive) && !p.magnumOpus)
			.sort((a, b) => a.renown - b.renown);
		for (const p of candidates.slice(0, alive.length - cap)) {
			p.alive = false;
			p.died = this.year;
			p.cause = 'faded from the annals';
		}
	}

	/** major events are kept forever; routine ones older than 60 years are dropped once the archive is large */
	private compactArchive() {
		if (this.allEvents.length < 25000) return;
		const MINOR = new Set(['uprising', 'intrigue', 'misc', 'luminary', 'quest', 'avatar', 'capture', 'birth', 'tech']);
		const cutoff = this.year - 60;
		this.allEvents = this.allEvents.filter((e) => e.y >= cutoff || !MINOR.has(e.kind));
	}

	private yearlyUprisings() {
		const upEvents = processYearlyUprisings(this);
		for (const ev of upEvents) {
			this.log('uprising', ev.text, ev.cell, ev.state);
		}
	}

	applyTechBonus(disc: TechDiscovery) {
		for (const p of this.polities) {
			if (!p.alive || !p.id) continue;
			if (disc.bonus.stability) p.stability = clamp(p.stability + disc.bonus.stability, 0, 100);
			if (disc.bonus.tax) p.tax = clamp(p.tax + disc.bonus.tax, 0.05, 0.4);
			if (disc.bonus.army) p.army = +(p.army * (1 + disc.bonus.army)).toFixed(1);
		}
	}

	/** event-driven breakthroughs count for less than they claim; keeps era pacing sane */
	gainInnovation(x: number) {
		this.innovation += x * 0.16;
	}

	private innovate() {
		const scholars = this.people.filter((p) => p.alive && p.traits.includes('Scholar')).length;
		const stableRealms = this.polities.filter((p) => p.alive && p.stability > 60).length;
		// diminishing returns so the ages unfold over centuries, not years (≈ era every 100–150 yrs)
		this.gainInnovation(0.9 + Math.sqrt(scholars) * 0.25 + Math.sqrt(stableRealms) * 0.15);

		// Check epoch transition
		const nextEra = ERAS.find((e) => e.index === this.era + 1);
		if (nextEra && this.innovation >= nextEra.threshold) {
			this.era = nextEra.index;
			this.updateVoice();
			this.log('misc', `The grand wheel of ages turns: the ancient ways yield as the ${nextEra.name} (${nextEra.genreName}) dawns across the lands of ${this.w.name}!`);
		}

		// Chance of procedural tech breakthrough
		if (this.rng.chance(0.35)) {
			const disc = checkNextDiscovery(this.techs, this.era, this.rng);
			if (disc) {
				this.techs.add(disc.id);
				this.applyTechBonus(disc);
				const invSummary = disc.inventions?.length ? ` (${disc.inventions.slice(0, 2).join(', ')})` : '';
				this.log('tech', `Artificers and scholars achieve a historic breakthrough: ${disc.name}${invSummary} spreads between guilds and academies across the realms!`);
			}
		}
	}

	private updateWonders() {
		for (const w of this.wonders) {
			if (w.destroyed) continue;
			if (w.kind === 'university') {
				this.gainInnovation(2.5);
			} else if (w.kind === 'tower_magic') {
				this.gainInnovation(1.5);
			} else if (w.kind === 'world_tree') {
				if (w.stateId && this.polities[w.stateId]?.alive) {
					this.polities[w.stateId].stability = clamp(this.polities[w.stateId].stability + 1, 0, 100);
				}
			} else if (w.kind === 'giant_harbor' || w.kind === 'metropolis') {
				if (w.stateId && this.polities[w.stateId]?.alive) {
					this.polities[w.stateId].treasury += 2;
				}
			} else if (w.kind === 'ancient_forge' || w.kind === 'tower_trials') {
				if (w.stateId && this.polities[w.stateId]?.alive) {
					this.polities[w.stateId].army = +(this.polities[w.stateId].army * 1.01).toFixed(1);
				}
			} else if (w.kind === 'titan_shrine') {
				if (w.stateId && this.polities[w.stateId]?.alive) {
					this.polities[w.stateId].stability = clamp(this.polities[w.stateId].stability + 1, 0, 100);
				}
			} else if (w.kind === 'bridge') {
				if (w.stateId && this.polities[w.stateId]?.alive) {
					this.polities[w.stateId].treasury += 1.5;
				}
			}
		}
	}

	private updateLuminaries() {
		const activeLuminaries = this.people.filter((p) => p.alive && ['magician', 'thinker', 'artist', 'athlete', 'inventor'].includes(p.role));
		if (activeLuminaries.length < 8 && this.rng.chance(0.45)) {
			const aliveBurgs = this.w.burgs.filter((b) => b.id && b.alive);
			if (aliveBurgs.length) {
				const b = this.rng.pick(aliveBurgs);
				const role = this.rng.pick<Role>(['magician', 'thinker', 'artist', 'athlete', 'inventor']) as 'magician' | 'thinker' | 'artist' | 'athlete' | 'inventor';
				const speciesId = this.w.cultures[b.culture]?.species ?? 'human';
				const lum = createLuminary(
					this.people.length,
					this.rng,
					b.culture,
					b.state,
					b.id,
					role,
					this.year,
					this.lang(b.culture),
					speciesId
				);
				this.people.push(lum);
				const prof = LUMINARY_PROFILES[role];
				this.log('luminary', `${prof.title} ${lum.name} of ${b.name} achieves worldwide acclaim with their magnum opus: "${lum.magnumOpus}".`, b.cell, b.state);
				if (role === 'thinker' || role === 'inventor') {
					this.gainInnovation(3);
				}
			}
		}

		for (const lum of activeLuminaries) {
			if (this.rng.chance(0.12)) {
				const prof = LUMINARY_PROFILES[lum.role];
				if (prof) {
					const ach = this.rng.pick(prof.achievementTpl);
					const b = this.w.burgs[lum.burg];
					const locName = b ? b.name : 'the realm';
					this.log('luminary', `${lum.name} (${prof.title}) ${ach} in ${locName}.`, b ? b.cell : undefined, lum.state);
					lum.renown += 5;
					if (lum.role === 'inventor' || lum.role === 'thinker') this.gainInnovation(2);
				}
			}
		}
	}

	private yearlyPolitics() {
		for (const pol of this.polities) {
			if (!pol.alive || !pol.id) continue;
			const hasWars = this.warsOf(pol.id).length > 0;
			const { events, regimeChanged } = updatePolitics(pol, this.people, this.year, this.rng, hasWars);
			for (const ev of events) {
				this.log(ev.kind, ev.text, ev.cell, ev.state);
			}
			if (regimeChanged) {
				this.dirty.political = true;
			}
		}
	}

	private yearlyIntrigue() {
		const nextMissionObj = { val: this.nextMissionId };
		const { events, missions } = updateIntrigue(this.polities, this.people, this.year, this.rng, nextMissionObj);
		this.nextMissionId = nextMissionObj.val;
		for (const ev of events) {
			this.log(ev.kind, ev.text, ev.cell, ev.state);
		}
		this.missions.push(...missions);
		if (this.missions.length > 50) this.missions.splice(0, this.missions.length - 50);
	}

	private yearlyEcology() {
		const ecoEvents = processAnthropogenicDisasters(this.w, this.polities, this.year, this.rng, this.wonders, this.innovation);
		for (const ev of ecoEvents) {
			this.log(ev.kind, ev.text, ev.cell, ev.state);
			this.dirty.terrain = true;
		}
	}

	private yearlyPantheon() {
		processPantheonInterventions(this.polities, this.wars, this.year, this.rng, (k, t, c, s) => this.log(k, t, c, s));
	}

	private yearlyQuests() {
		const nextArtObj = { val: this.nextArtifactId };
		const nextWdObj = { val: this.nextWonderId };
		const questEvents = updateQuests(
			this.quests,
			this.people,
			this.artifacts,
			this.year,
			this.rng,
			nextArtObj,
			this.lang(1),
			this.monsters,
			this.polities,
			this.w,
			this.wonders,
			nextWdObj
		);
		this.nextArtifactId = nextArtObj.val;
		this.nextWonderId = nextWdObj.val;
		for (const ev of questEvents) {
			this.log(ev.kind, ev.text, ev.cell, ev.state);
		}

		// Spawn new quest periodically if under cap
		const activeQuests = this.quests.filter((q) => !q.completed);
		if (activeQuests.length < 4 && this.rng.chance(0.45)) {
			const nextQObj = { val: this.nextQuestId };
			const q = spawnQuest(this.w, this.polities, this.people, this.monsters, this.rng, this.year, nextQObj);
			this.nextQuestId = nextQObj.val;
			if (q) {
				this.quests.push(q);
				this.log('quest', `QUEST UNDERTAKEN: ${q.heroName} embarks upon the ${q.title}! ${q.storyLog[0]}`, q.targetCell, q.stateId);
			}
		}
	}

	private yearlyWonderConstruction() {
		if (this.wonders.length >= 18) return;
		const candidates = this.polities.filter(
			(p) => p.id && p.alive && p.treasury >= 120 && p.stability >= 55 && !this.warsOf(p.id).length
		);
		if (!candidates.length || !this.rng.chance(0.22)) return;

		const pol = this.rng.pick(candidates);
		const ruler = this.people[pol.ruler];
		const builderName = ruler?.alive ? `${ruler.name} of ${pol.name}` : pol.name;
		const capitalBurg = this.w.burgs[pol.capital];
		if (!capitalBurg) return;

		const isCoastal = this.w.cells.dist[capitalBurg.cell] === 1;
		const isMountain = this.w.cells.h[capitalBurg.cell] > 50;
		let kind: LegendaryPlace['kind'] = 'tower_magic';
		if (isCoastal && this.rng.chance(0.5)) kind = 'giant_harbor';
		else if (isMountain || this.rng.chance(0.35)) kind = 'tower_magic';
		else if (pol.army > 30 && this.rng.chance(0.4)) kind = 'tower_trials';
		else if (this.rng.chance(0.5)) kind = 'university';
		else kind = 'bridge';

		pol.treasury -= 90;
		pol.stability = clamp(pol.stability + 12, 0, 100);
		if (ruler?.alive) ruler.renown += 25;

		const nextWdObj = { val: this.nextWonderId };
		const wonder = buildWonder(
			this.w,
			capitalBurg.cell,
			pol.layer ?? 0,
			kind,
			builderName,
			pol.id,
			this.year,
			nextWdObj,
			this.rng
		);
		this.nextWonderId = nextWdObj.val;
		this.wonders.push(wonder);

		this.log(
			'wonder',
			`MONUMENT ERECTED: ${builderName} commissions and completes the ${wonder.name} (${wonder.icon}) in ${capitalBurg.name}! ${wonder.effect}`,
			capitalBurg.cell,
			pol.id
		);
	}

	private yearlyMonsterHunts() {
		const aliveMonsters = this.monsters.filter((m) => m.alive);
		if (!aliveMonsters.length) return;
		const aliveRealms = this.polities.filter((p) => p.id && p.alive && p.army >= 28);
		if (!aliveRealms.length) return;

		for (const pol of aliveRealms) {
			if (this.rng.chance(0.20)) {
				// Target monster within or near realm
				const targetMonster =
					aliveMonsters.find((m) => {
						const cellState = this.w.layers[m.layer]?.state[m.cell];
						return cellState === pol.id;
					}) || (this.rng.chance(0.3) ? this.rng.pick(aliveMonsters) : null);

				if (!targetMonster || !targetMonster.alive) continue;

				const ruler = this.people[pol.ruler];
				const leaderName = ruler?.alive ? ruler.name : `${pol.name} Royal Host`;
				const rawDmg = Math.round(pol.army * 1.6 + this.rng.int(15, 40));
				const res = resolveMonsterCombat(targetMonster, rawDmg, leaderName, this.year, this.rng);

				pol.army = Math.max(5, +(pol.army - res.damageTaken * 0.15).toFixed(1));

				if (res.slain) {
					// Forge monster relic for the realm
					const art = forgeMonsterRelic(
						this.nextArtifactId++,
						this.rng,
						this.year,
						targetMonster,
						leaderName,
						'polity',
						pol.id,
						pol.name
					);
					this.artifacts.push(art);

					pol.treasury += 150;
					pol.stability = clamp(pol.stability + 20, 0, 100);
					this.gainInnovation(35);
					if (ruler?.alive) ruler.renown += 40;

					if (targetMonster.tier === 'cataclysm' || targetMonster.tier === 'legendary') {
						const nextWdObj = { val: this.nextWonderId };
						const shrine = createTitanShrineWonder(
							this.w,
							targetMonster.cell,
							targetMonster.layer,
							targetMonster,
							leaderName,
							this.year,
							nextWdObj
						);
						this.nextWonderId = nextWdObj.val;
						this.wonders.push(shrine);
					}

					this.log(
						'monster',
						`EXPEDITION TRIUMPH: ${leaderName} and the hosts of ${pol.name} slay ${targetMonster.name}! Spoils: ${art.name} (${targetMonster.trophy || 'Dragonhide'}), boosting stability (+20) and treasury (+150 gold).`,
						targetMonster.cell,
						pol.id
					);
				} else {
					this.log(
						'monster',
						`TITAN CLASH: The armies of ${pol.name} clash with ${targetMonster.name} in cell ${targetMonster.cell}! The beast resists with ${res.monsterHpRemaining}/${targetMonster.maxHealth} HP.`,
						targetMonster.cell,
						pol.id
					);
				}
				break;
			}
		}
	}

	/** Cast a divine power on an automatically selected random target */
	castRandom(power: Power, layer = 0): { text: string; cell: number } {
		const c = this.c;
		const r = this.rng;
		const aliveBurgs = this.w.burgs.filter((b) => b.id && b.alive);
		const aliveRealms = this.polities.filter((p) => p.id && p.alive);

		let targetCell = 0;
		if (aliveRealms.length && ['inspire', 'host', 'peace', 'relic', 'discord', 'chaos', 'smite', 'wonder', 'patron'].includes(power)) {
			const picked = r.pick(aliveRealms);
			targetCell = this.w.burgs[picked.capital]?.cell ?? r.int(0, c.n - 1);
		} else if (aliveBurgs.length && ['hero', 'prophet', 'villain', 'rebel', 'species', 'alien', 'plague'].includes(power)) {
			targetCell = r.pick(aliveBurgs).cell;
		} else {
			const L = this.w.layers[layer];
			const land: number[] = [];
			for (let i = 0; i < c.n; i++) {
				if (L.open[i] && (power === 'sink' || this.isLand(i))) land.push(i);
			}
			targetCell = land.length ? r.pick(land) : r.int(0, c.n - 1);
		}

		const msg = this.cast(power, targetCell, layer) ?? `Divine power ${POWERS[power].name} was cast upon the world.`;
		return { text: msg, cell: targetCell };
	}

	private demographics() {
		const c = this.c;
		const r = this.rng;
		for (let i = 0; i < c.n; i++) {
			if (!this.isLand(i)) continue;
			const cap = this.basePop[i] * (c.state[i] ? 1.6 : 1.1) + (c.burg[i] ? 2 : 0);
			if (cap <= 0) continue;
			const p = c.pop[i];
			c.pop[i] = Math.max(0.01, p + p * 0.03 * (1 - p / cap) + (r() - 0.5) * 0.01);
		}
		for (const b of this.w.burgs) {
			if (!b.id || !b.alive) continue;
			const li = this.burgLayer(b);
			const ratio = li === 0 ? c.pop[b.cell] / Math.max(0.1, this.basePop[b.cell]) : 1.01;
			b.pop = +clamp(b.pop * (0.97 + ratio * 0.03 + (r() - 0.5) * 0.02), 0.2, 500).toFixed(2);
			b.state = this.st(li)[b.cell];
		}
	}

	private economy() {
		const r = this.rng;
		for (const p of this.polities) {
			if (!p.alive) continue;
			const ruler = this.ruler(p);
			const wars = this.warsOf(p.id).length;
			const income = p.pop * p.tax * (0.8 + (ruler?.stewardship ?? 5) * 0.04);
			const upkeep = p.army * 0.6;
			p.treasury += income - upkeep;
			const target = p.pop * (wars ? 0.05 : 0.02);
			if (p.army < target && p.treasury > 0) {
				const add = Math.min(target - p.army, p.pop * 0.01, p.treasury / 2);
				p.army += add;
				p.treasury -= add * 2;
			} else if (p.army > target * 1.3 && !wars) p.army *= 0.92;
			// stability drift
			let cult = 0, faith = 0, tot = 0;
			const c = this.c;
			for (let i = 0; i < c.n; i += 3) {
				if (c.state[i] !== p.id) continue;
				tot++;
				if (c.culture[i] === p.culture) cult++;
				if (c.religion[i] === p.religion) faith++;
			}
			const cs = tot ? cult / tot : 1, fs = tot ? faith / tot : 1;
			const target2 = 45 + (ruler?.diplomacy ?? 5) * 1.6 + (cs - 0.7) * 40 + (fs - 0.7) * 30 - wars * 7 - (p.treasury < 0 ? 15 : 0) - (p.tax - 0.1) * 120 - Math.max(0, p.cells / Math.max(1, p.peak) < 0.6 ? 10 : 0);
			p.stability = clamp(p.stability + (target2 - p.stability) * 0.2 + (r() - 0.5) * 6, 0, 100);
			if (p.treasury < -60) {
				p.army *= 0.8;
				p.stability -= 5;
			}
		}
	}

	private diplomacy() {
		const r = this.rng;
		for (const p of this.polities) {
			if (!p.alive) continue;
			for (const k in p.relations) p.relations[k] *= 0.94;
		}
		for (const [k, len] of this.borders) {
			const [a, b] = k.split('-').map(Number);
			const pa = this.polities[a], pb = this.polities[b];
			let d = -Math.min(4, len / 15) + (r() - 0.5) * 10;
			if (pa.culture === pb.culture) d += 2;
			d += pa.religion === pb.religion ? 3 : -2;
			d += ((this.ruler(pa)?.diplomacy ?? 5) + (this.ruler(pb)?.diplomacy ?? 5) - 10) * 0.3;
			if (this.ruler(pa)?.traits.includes('Ambitious')) d -= 2;
			this.addRel(a, b, d);
		}
		// alliances
		for (const p of this.polities) {
			if (!p.alive) continue;
			p.allies = p.allies.filter((a) => this.polities[a].alive && this.rel(p.id, a) > 15);
		}
		for (const [k] of this.borders) {
			const [a, b] = k.split('-').map(Number);
			const pa = this.polities[a], pb = this.polities[b];
			if (this.rel(a, b) > 55 && !pa.allies.includes(b) && !this.atWar(a, b) && r.chance(0.3)) {
				pa.allies.push(b);
				pb.allies.push(a);
				this.log('peace', `Envoys from ${pa.name} and ${pb.name} exchange solemn vows of mutual defense, binding their courts in a grand alliance.`, this.w.burgs[pa.capital].cell, a);
			}
		}
	}

	playerState(): number {
		const a = this.people[this.avatar];
		return a && a.alive && (a.role === 'ruler' || a.role === 'villain') ? a.state : -1;
	}

	private aiWars() {
		const r = this.rng;
		for (const p of this.polities) {
			if (!p.alive || p.id === this.playerState()) continue;
			if (this.warsOf(p.id).length >= 1 || p.stability < 30 || p.overlord) continue;
			const ruler = this.ruler(p);
			const aggression = 0.12 + (ruler?.traits.includes('Ambitious') ? 0.12 : 0) + (ruler?.traits.includes('Cruel') ? 0.05 : 0) - (ruler?.traits.includes('Content') ? 0.08 : 0);
			if (!r.chance(aggression)) continue;
			const targets = this.neighborsOf(p.id).filter((t) => {
				const tp = this.polities[t];
				if (!tp.alive || p.allies.includes(t) || this.atWar(p.id, t) || tp.overlord === p.id || (tp.overlord && tp.overlord === p.overlord)) return false;
				return this.rel(p.id, t) < -20 && this.strength([p.id]) > this.strength([t, ...tp.allies.filter((x) => this.neighborsOf(t).length)]) * 1.15;
			});
			if (!targets.length) continue;
			targets.sort((a, b) => this.rel(p.id, a) - this.rel(p.id, b));
			this.declareWar(p.id, targets[0]);
		}
	}

	declareWar(a: number, b: number, reason?: string) {
		const pa = this.polities[a], pb = this.polities[b];
		const attackers = [a];
		const defenders = [b, ...pb.allies.filter((x) => this.polities[x].alive && x !== a && !this.atWar(x, b))];
		// a suzerain defends its vassals
		if (pb.overlord && pb.overlord !== a && this.polities[pb.overlord]?.alive && !defenders.includes(pb.overlord)) defenders.push(pb.overlord);
		// attacker's allies may join
		for (const al of pa.allies) if (this.polities[al].alive && !defenders.includes(al) && this.rng.chance(0.5)) attackers.push(al);
		const tpl = this.rng.pick(WAR_NAMES);
		const name = tpl.replace('{a}', pa.name).replace('{b}', pb.name).replace('{c}', this.rng.pick([pa.name, pb.name]));
		const w: War = { id: this.nextWar++, name, attackers, defenders, start: this.year, score: 0, months: 0, startArmy: [this.strength(attackers), this.strength(defenders)] };
		this.wars.push(w);
		pa.allies = pa.allies.filter((x) => x !== b);
		pb.allies = pb.allies.filter((x) => x !== a);
		this.addRel(a, b, -40);
		const joined = defenders.length > 1 ? `Pledging mutual defense, the levies of ${defenders.slice(1).map((d) => this.polities[d].name).join(', ')} rally to ${pb.name}'s side.` : undefined;
		const warText = narrateWar(this.rng, pa.fullName, pb.fullName, name, reason, joined);
		this.log('war', warText, this.w.burgs[pb.capital].cell, a);
		return w;
	}

	private monthlyWars() {
		const c = this.c;
		const r = this.rng;
		let changed = false;
		// one pass: every edge where ownership differs, on every layer (shared by all wars)
		const contested: number[] = [];
		if (this.wars.some((w) => !w.end))
			this.w.layers.forEach((L, li) => {
				const st = L.state, op = L.open, E = this.w.edges;
				for (let e = 0; e < E.n; e++) {
					const a = E.a[e], b = E.b[e];
					if (op[a] && op[b] && st[a] !== st[b] && st[a] && st[b]) contested.push(a, b, li);
				}
			});
		for (const w of this.wars) {
			if (w.end) continue;
			w.attackers = w.attackers.filter((id) => this.polities[id].alive);
			w.defenders = w.defenders.filter((id) => this.polities[id].alive);
			if (!w.attackers.length || !w.defenders.length) {
				this.finishWar(w, w.attackers.length ? 'attackers' : 'defenders');
				continue;
			}
			w.months++;
			const sa = this.strength(w.attackers), sd = this.strength(w.defenders) * 1.1;
			const ratio = sa / Math.max(0.01, sd);
			// front cells: defender cells adjacent to attacker cells (and vice versa)
			const att = new Set(w.attackers), def = new Set(w.defenders);
			// [cell, taker, layer]
			const frontD: [number, number, number][] = [], frontA: [number, number, number][] = [];
			for (let k = 0; k < contested.length; k += 3) {
				const a = contested[k], b = contested[k + 1], li = contested[k + 2];
				const st = this.w.layers[li].state;
				const sa2 = st[a], sb2 = st[b];
				if (att.has(sa2) && def.has(sb2)) { frontD.push([b, sa2, li]); frontA.push([a, sb2, li]); }
				else if (def.has(sa2) && att.has(sb2)) { frontD.push([a, sb2, li]); frontA.push([b, sa2, li]); }
			}
			// raids down shafts / up to sky-docks open new fronts in other layers
			if (r.chance(frontD.length ? 0.04 : 0.15)) {
				const opts2: [number, number][] = [];
				for (const rt of this.w.routes) {
					if (rt.kind !== 'shaft') continue;
					const A = this.w.burgs[rt.a], B = this.w.burgs[rt.b];
					if (!A.alive || !B.alive) continue;
					if (att.has(A.state) && def.has(B.state)) opts2.push([B.id, A.state]);
					else if (att.has(B.state) && def.has(A.state)) opts2.push([A.id, B.state]);
				}
				if (opts2.length && r.chance(clamp(ratio * 0.5, 0.1, 0.9))) {
					const [bid, taker] = r.pick(opts2);
					const b = this.w.burgs[bid];
					this.takeCell(b.cell, taker, w, this.burgLayer(b));
					changed = true;
				}
			}
			if (!frontD.length) {
				// no shared border (e.g. across the sea): slowly exhausts
				if (w.months > 30) this.finishWar(w, 'white');
				if (changed) this.dirty.political = true;
				continue;
			}
			const pushes = Math.max(1, Math.round(frontD.length * 0.04 * Math.min(3, ratio)));
			const counters = Math.max(0, Math.round(frontA.length * 0.04 * Math.min(3, 1 / ratio)) - 1);
			const flip = (list: [number, number, number][], n: number, adv: number, sign: number) => {
				for (let k = 0; k < n && list.length; k++) {
					const idx = r.int(0, list.length - 1);
					const [cell, taker, li] = list[idx];
					list[idx] = list[list.length - 1];
					list.pop();
					const cur = this.st(li)[cell];
					if (!att.has(cur) && !def.has(cur)) continue;
					let defense = 1 + (li === 0 && c.h[cell] > 55 ? 0.8 : 0) + (li === 0 && c.river[cell] ? 0.3 : 0) + (li > 0 ? 0.4 : 0);
					const burg = this.lb[li][cell];
					if (burg) defense += this.w.burgs[burg].capital ? 2.5 : 1.2;
					if (!r.chance(clamp((0.35 * adv) / defense, 0.02, 0.9))) continue;
					this.takeCell(cell, taker, w, li);
					w.score += sign * (burg ? 5 : 1);
					changed = true;
				}
			};
			flip(frontD, pushes, ratio, 1);
			flip(frontA, counters, 1 / ratio, -1);
			// attrition
			const loss = 0.015 + frontD.length / 4000;
			for (const id of w.attackers) this.polities[id].army *= 1 - loss * clamp(1 / ratio, 0.4, 2);
			for (const id of w.defenders) this.polities[id].army *= 1 - loss * clamp(ratio, 0.4, 2);
		}
		if (changed) {
			this.dirty.political = true;
			this.recount();
			for (const p of this.polities) if (p.alive && p.cells === 0) this.fall(p);
		}
	}

	takeCell(cell: number, taker: number, war?: War, layer = 0) {
		const c = this.c;
		const st = this.st(layer);
		const old = st[cell];
		st[cell] = taker;
		if (layer === 0) c.pop[cell] *= 0.93;
		const bid = this.lb[layer][cell];
		if (!bid) return;
		const b = this.w.burgs[bid];
		b.state = taker;
		b.pop = +(b.pop * 0.85).toFixed(2);
		const loser = this.polities[old];
		const winner = this.polities[taker];
		const winnerName = winner?.name ?? 'An invading vanguard';
		const loserName = loser?.name ?? 'the frontier';
		if (loser && loser.capital === bid) {
			const siegeText = narrateSiege(this.rng, winnerName, loserName, b.name, true);
			this.log('capture', siegeText, cell, taker);
			loser.stability -= 20;
			loser.treasury *= 0.6;
			if (winner) winner.treasury += 20;
			for (const art of this.artifacts) {
				if (art.holderId === loser.id && art.holderType === 'polity') {
					art.holderId = winner?.id ?? 0;
					art.holderName = winnerName;
					const lootText = narrateRelicLoot(this.rng, winnerName, loserName, art.name);
					this.log('capture', lootText, cell, taker);
				}
			}
			this.relocateCapital(loser);
			if (war) war.score += 10 * (war.attackers.includes(taker) ? 1 : -1);
		} else if (b.pop > 3 || this.rng.chance(0.3)) {
			const capText = narrateSiege(this.rng, winnerName, loserName, b.name, false);
			this.log('capture', capText, cell, taker);
		}
		// people in the burg change allegiance
		for (const p of this.people) if (p.alive && p.burg === bid && p.role !== 'ruler' && p.state === old && p.role !== 'heir') p.state = taker;

		// Check for wonders at the captured settlement
		const wonder = this.wonders.find((w) => w.cell === cell && !w.destroyed);
		if (wonder) {
			const isCapital = Boolean(loser && loser.capital === bid);
			const shouldDestroy = isCapital ? this.rng.chance(0.55) : this.rng.chance(0.35);
			if (shouldDestroy) {
				const res = destroyWonder(wonder, winnerName, this.year, 'sacked and razed during siege conquest');
				this.log('wonder', res.event.text, cell, taker);
			} else {
				wonder.stateId = taker;
				this.log('wonder', `WONDER CLAIMED: The armies of ${winnerName} conquer ${wonder.name} (${wonder.icon}) in ${b.name}, placing it under imperial protection!`, cell, taker);
			}
		}
	}

	relocateCapital(p: Polity) {
		const own = this.w.burgs.filter((b) => b.id && b.alive && b.state === p.id).sort((a, b) => b.pop - a.pop);
		if (!own.length) return false;
		p.capital = own[0].id;
		for (const b of this.w.burgs) if (b.state === p.id) b.capital = false;
		own[0].capital = true;
		const ruler = this.ruler(p);
		if (ruler) ruler.burg = own[0].id;
		return true;
	}

	fall(p: Polity) {
		p.alive = false;
		p.fell = this.year;
		p.allies = [];
		const r = this.ruler(p);
		const fallText = narrateFall(this.rng, p.fullName, r?.name, r?.house);
		this.log('fall', fallText, this.w.burgs[p.capital]?.cell, p.id);
		for (const x of this.people) if (x.alive && x.state === p.id) {
			x.state = 0;
			if (x.role === 'ruler' || x.role === 'heir' || x.role === 'general') x.role = 'wanderer';
		}
		for (const b of this.w.burgs) if (b.state === p.id) b.state = 0;
		for (const w of this.wars) if (!w.end) {
			w.attackers = w.attackers.filter((x) => x !== p.id);
			w.defenders = w.defenders.filter((x) => x !== p.id);
		}
		this.dirty.political = true;
	}

	private endWars() {
		for (const w of this.wars) {
			if (w.end) continue;
			const years = this.year - w.start;
			const sa = this.strength(w.attackers), sd = this.strength(w.defenders);
			const aExh = sa / Math.max(1, w.startArmy[0]), dExh = sd / Math.max(1, w.startArmy[1]);
			let chance = 0.08 + years * 0.06;
			if (aExh < 0.35 || dExh < 0.35) chance += 0.4;
			if (w.attackers.includes(this.playerState()) || w.defenders.includes(this.playerState())) chance *= 0.3; // the player sues for peace themselves
			if (!this.rng.chance(chance)) continue;
			this.finishWar(w, w.score > 8 ? 'attackers' : w.score < -4 ? 'defenders' : 'white');
		}
	}

	finishWar(w: War, winner: War['winner']) {
		w.end = this.year;
		w.winner = winner;
		const a = w.attackers.map((x) => this.polities[x].name).join(' & ') || 'the attackers';
		const d = w.defenders.map((x) => this.polities[x].name).join(' & ') || 'the defenders';
		const winnerText = winner === 'attackers' ? a : winner === 'defenders' ? d : '';
		const peaceText = narratePeace(this.rng, w.name, this.year - w.start, winner ?? 'white', winnerText);
		this.log('peace', peaceText);
		const win = winner === 'attackers' ? w.attackers : winner === 'defenders' ? w.defenders : [];
		const lose = winner === 'attackers' ? w.defenders : winner === 'defenders' ? w.attackers : [];
		for (const x of win) { this.polities[x].stability += 8; this.polities[x].treasury += 15; }
		for (const x of lose) { this.polities[x].stability -= 10; this.polities[x].treasury -= 10; }
		for (const x of w.attackers) for (const y of w.defenders) this.addRel(x, y, 25);
		vassalizeAfterWar(this, w, winner);

		// Post-war Enforced Regime Change:
		// Decisive victory (|score| >= 10) with opposing ideologies can impose a sister system
		if (Math.abs(w.score) >= 10 && win.length > 0 && lose.length > 0) {
			const victor = this.polities[win[0]];
			const defeated = this.polities[lose[0]];
			if (victor?.alive && defeated?.alive && victor.ideology && defeated.ideology && victor.ideology !== defeated.ideology) {
				if (this.rng.chance(0.35)) {
					const transRes = transitionRegime(defeated, victor.ideology, 'conquest', this.year, this.rng, this.people, { victorName: victor.name });
					for (const ev of transRes.events) {
						this.log(ev.kind, ev.text, ev.cell, ev.state);
					}
					this.addRel(victor.id, defeated.id, 50);
					this.dirty.political = true;
				}
			}
		}
	}

	private lifecycle() {
		const r = this.rng;
		for (const p of this.people) {
			if (!p.alive || !p.id) continue;
			const age = this.ageOf(p);
			const spMult = SPECIES_BY_ID[p.species ?? 'human']?.lifespanMult ?? 1.0;
			const effAge = age / spMult;
			let risk = effAge < 5 ? 0.02 : effAge < 45 ? 0.006 : 0.006 + (effAge - 45) * 0.0045;
			risk *= 1 + (100 - p.health) / 60;
			if (p.traits.includes('Sickly')) risk *= 1.6;
			if (p.traits.includes('Strong')) risk *= 0.7;
			if (this.plague[this.w.burgs[p.burg]?.cell ?? 0] > 0.2) risk += 0.08;
			if (p.role === 'general' && this.warsOf(p.state).length) risk += 0.04;
			p.health = clamp(p.health + 4 - Math.max(0, effAge - 50) * 0.3, 0, 100);
			if (r.chance(risk)) this.kill(p, effAge > 60 ? 'old age' : r.pick(['fever', 'a fall from a horse', 'poison', 'a wasting sickness', 'a hunting accident', 'battle wounds']));
		}
		for (const pol of this.polities) {
			if (!pol.alive) continue;
			const ruler = this.ruler(pol);
			const rulerSpMult = SPECIES_BY_ID[ruler?.species ?? 'human']?.lifespanMult ?? 1.0;
			if (ruler?.alive && !this.people[pol.heir]?.alive && this.ageOf(ruler) > 18 && this.ageOf(ruler) < 55 * Math.min(2.5, rulerSpMult) && r.chance(0.25)) {
				const h = this.makePerson(pol.culture, pol.id, pol.capital, 'heir', 0, ruler.id);
				pol.heir = h.id;
				if (ruler.id === this.avatar) this.log('birth', `A child, ${h.name}, is born to ${ruler.name}.`, undefined, pol.id);
			}
			if (!this.general(pol) && r.chance(0.5)) this.makePerson(pol.culture, pol.id, pol.capital, 'general', r.int(22, 40));
		}
		// keep a pool of wanderers for avatar mode
		const free = this.people.filter((p) => p.alive && p.state === 0).length;
		if (free < 25) {
			const burgs = this.w.burgs.filter((b) => b.id && b.alive);
			const b = r.pick(burgs);
			this.makePerson(b.culture, 0, b.id, r.pick<Role>(['merchant', 'wanderer', 'priest']), r.int(16, 30));
		}
	}

	kill(p: Person, cause: string) {
		p.alive = false;
		p.died = this.year;
		p.cause = cause;
		const pol = this.polities[p.state];
		if ((p.role === 'ruler' || p.role === 'villain') && pol?.alive && pol.ruler === p.id) {
			const heir = this.people[pol.heir];
			if (heir?.alive) {
				this.crown(pol, heir);
				const isChild = this.ageOf(heir) < 16;
				pol.stability -= isChild ? 12 : 4;
				const deathText = narrateDeath(this.rng, p.name, p.house, pol.name, cause, heir.name, isChild, this.ageOf(heir));
				this.log('death', deathText, this.w.burgs[pol.capital].cell, pol.id);
				if (p.id === this.avatar) this.avatar = heir.id;
			} else {
				// Interregnum: check if monarchy is abolished in favor of a Republic or Union
				const republicanParty = pol.factions?.find((f) => f.ideology === 'republic' || f.ideology === 'communal');
				const shouldAbolishCrown = pol.ideology === 'monarchy' && (this.rng.chance(0.30) || (republicanParty && republicanParty.influence > 45));
				if (shouldAbolishCrown) {
					const targetIdeology: IdeologyKind = republicanParty ? republicanParty.ideology : (this.rng.chance(0.6) ? 'republic' : 'communal');
					const citizenLeader = this.makePerson(pol.culture, pol.id, pol.capital, 'ruler', this.rng.int(28, 55));
					this.crown(pol, citizenLeader);
					const transRes = transitionRegime(pol, targetIdeology, 'interregnum', this.year, this.rng, this.people, { customLeader: citizenLeader });
					for (const ev of transRes.events) {
						this.log(ev.kind, ev.text, ev.cell, ev.state);
					}
					this.dirty.political = true;
					if (p.id === this.avatar) this.avatar = citizenLeader.id;
				} else {
					const claimant = this.makePerson(pol.culture, pol.id, pol.capital, 'ruler', this.rng.int(20, 45));
					claimant.house = makeName(this.lang(pol.culture), 'house');
					this.crown(pol, claimant);
					pol.stability -= 25;
					const heirlessText = narrateHeirlessCrisis(this.rng, p.name, p.house, pol.name, cause, claimant.house);
					this.log('death', heirlessText, this.w.burgs[pol.capital].cell, pol.id);
					if (p.id === this.avatar) this.avatar = -1;
				}
			}
		} else if (p.id === this.avatar) {
			// continue as a child if any
			const child = this.people.find((x) => x.alive && x.parent === p.id);
			this.log('avatar', `${p.name} ${p.house} departs this mortal realm (${cause}).${child ? ` Their kin, ${child.name}, carries on the family mantle.` : ' The journey ends here.'}`);
			this.avatar = child ? child.id : -1;
			if (child) { child.gold += p.gold; child.renown += Math.round(p.renown / 2); }
		}
		if (pol && pol.heir === p.id) pol.heir = 0;
	}

	private faiths() {
		const c = this.c;
		const r = this.rng;
		const changes: [number, number][] = [];
		for (let k = 0; k < c.n / 6; k++) {
			const i = r.int(0, c.n - 1);
			if (!this.isLand(i)) continue;
			const pol = this.polities[c.state[i]];
			const nb = neighbors(c, i);
			const j = nb[r.int(0, nb.length - 1)];
			if (!this.isLand(j) || c.religion[j] === c.religion[i]) continue;
			let p = 0.15;
			if (pol?.alive && c.religion[j] === pol.religion) p += 0.35;
			if (pol?.alive && c.religion[i] === pol.religion) p -= 0.12;
			if (this.w.religions[c.religion[j]]?.type !== 'Folk') p += 0.08;
			if (r.chance(p)) changes.push([i, c.religion[j]]);
		}
		for (const [i, rel] of changes) c.religion[i] = rel;
		// state conversion when the realm's majority faith differs
		for (const pol of this.polities) {
			if (!pol.alive || pol.secularized || r() > 0.15) continue;
			const counts = new Map<number, number>();
			for (let i = 0; i < c.n; i += 2) if (c.state[i] === pol.id) counts.set(c.religion[i], (counts.get(c.religion[i]) ?? 0) + 1);
			let best = pol.religion, bestN = counts.get(pol.religion) ?? 0;
			for (const [rel, n] of counts) if (n > bestN * 1.5) { best = rel; bestN = n; }
			if (best !== pol.religion) {
				const convText = narrateConversion(this.rng, pol.name, this.w.religions[best].name);
				this.log('faith', convText, this.w.burgs[pol.capital].cell, pol.id);
				pol.religion = best;
				pol.stability -= 10;
			}
		}
		// heresy
		if (r.chance(0.04)) {
			const burgs = this.w.burgs.filter((b) => b.id && b.alive && b.pop > 2);
			if (burgs.length) {
				const b = r.pick(burgs);
				const parent = this.w.religions[c.religion[b.cell]];
				const L = this.lang(b.culture);
				const prophet = personName(L);
				const id = this.w.religions.length;
				const relName = `${prophet}ite ${parent?.type === 'Folk' ? 'Cult' : 'Heresy'}`;
				this.w.religions.push({ id, name: relName, color: palette(r, 1, 55, 55)[0], type: 'Cult', deity: parent?.deity ?? '', center: b.cell, culture: b.culture });
				c.religion[b.cell] = id;
				for (const j of neighbors(c, b.cell)) if (this.isLand(j) && r.chance(0.5)) c.religion[j] = id;
				const prophText = narrateProphet(this.rng, prophet, b.name, relName);
				this.log('faith', prophText, b.cell, b.state);
			}
		}
		// The Great Reformation (occurs when innovation > 40 or era >= 2)
		if ((this.innovation > 40 || this.era >= 2) && r.chance(0.08)) {
			const candidateBurgs = this.w.burgs.filter(
				(b) => b.id && b.alive && b.pop > 1.0 && this.polities[b.state]?.alive && !this.polities[b.state]?.secularized && !this.polities[b.state]?.reformed
			);
			if (candidateBurgs.length) {
				const b = r.pick(candidateBurgs);
				const pol = this.polities[b.state];
				const oldRel = this.w.religions[pol.religion];
				const reformer = this.makePerson(b.culture, pol.id, b.id, 'priest', r.int(28, 55));
				reformer.traits.push('Zealous');
				const id = this.w.religions.length;
				const relName = `Reformed Covenant of ${b.name}`;
				this.w.religions.push({
					id,
					name: relName,
					color: '#60a5fa',
					type: 'Organized',
					deity: oldRel?.deity ? `Reformed ${oldRel.deity}` : 'The Divine Word',
					center: b.cell,
					culture: b.culture
				});
				c.religion[b.cell] = id;
				for (const j of neighbors(c, b.cell)) if (this.isLand(j) && r.chance(0.6)) c.religion[j] = id;

				pol.reformed = true;
				pol.religion = id;
				pol.stability = Math.max(10, pol.stability - 15);

				this.log(
					'faith',
					`THE GREAT REFORMATION: In ${b.name}, ${reformer.name} nails ninety-five theses condemning clerical indulgence! Proclaiming the ${relName}, reformers split from ancient dogma. Riots break out as iconoclasts smash old idols.`,
					b.cell,
					pol.id
				);

				// Iconoclasm: chance to deface or ruin old religious monuments / titan shrines in the area
				const localWonder = this.wonders.find((w) => w.cell === b.cell && !w.destroyed);
				if (localWonder && (localWonder.kind === 'titan_shrine' || r.chance(0.45))) {
					const res = destroyWonder(localWonder, 'Iconoclast Reformers', this.year, 'smashed and stripped of idols during the Reformation');
					this.log('wonder', res.event.text, b.cell, pol.id);
				}
			}
		}
	}

	private rebellions() {
		for (const pol of this.polities) {
			if (!pol.alive || pol.cells < 12) continue;
			if (pol.stability > 25) continue;
			if (!this.rng.chance((25 - pol.stability) / 70)) continue;
			this.revolt(pol);
		}
	}

	/** Split part of a realm around a rebel town into a new polity at war with its old master. */
	revolt(pol: Polity, nearCell?: number, leader?: Person): Polity | null {
		const c = this.c;
		const r = this.rng;
		const towns = this.w.burgs.filter((b) => b.id && b.alive && b.state === pol.id && b.id !== pol.capital);
		if (!towns.length) return null;
		let town = towns[0];
		if (nearCell !== undefined) {
			town = towns.reduce((best, b) => ((b.x - c.x[nearCell]) ** 2 + (b.y - c.y[nearCell]) ** 2 < (best.x - c.x[nearCell]) ** 2 + (best.y - c.y[nearCell]) ** 2 ? b : best));
		} else {
			const cap = this.w.burgs[pol.capital];
			const score = (b: (typeof towns)[0]) => Math.hypot(b.x - cap.x, b.y - cap.y) * (b.culture !== pol.culture ? 2 : 1) * (0.5 + r());
			town = towns.sort((a, b) => score(b) - score(a))[0];
		}
		// grow region (in the town's own layer): cells closer (by BFS) to the rebel town than to the capital
		const li = this.burgLayer(town);
		const S = this.st(li);
		const capCell = this.burgLayer(this.w.burgs[pol.capital]) === li ? this.w.burgs[pol.capital].cell : -1;
		const dist = (start: number) => {
			const d = new Int32Array(c.n).fill(-1);
			d[start] = 0;
			const q = [start];
			for (let qi = 0; qi < q.length; qi++) {
				const i = q[qi];
				for (const j of neighbors(c, i)) if (d[j] < 0 && S[j] === pol.id) { d[j] = d[i] + 1; q.push(j); }
			}
			return d;
		};
		const dr = dist(town.cell), dc = capCell >= 0 ? dist(capCell) : new Int32Array(c.n).fill(-1);
		const cand: number[] = [];
		for (let i = 0; i < c.n; i++) if (S[i] === pol.id && dr[i] >= 0 && (dc[i] < 0 || dr[i] < dc[i])) cand.push(i);
		cand.sort((a, b) => dr[a] - dr[b]);
		const take = cand.slice(0, Math.max(3, Math.floor(pol.cells * (0.2 + r() * 0.25))));
		if (take.length < 3) return null;
		const id = this.polities.length;
		const L = this.lang(town.culture);
		const name = r.chance(0.6) ? town.name : makeName(L, 'land');

		// Determine ideological motive of the revolt
		const parentIdeology = pol.ideology ?? 'monarchy';
		let rebelIdeology: IdeologyKind;
		const roll = r();
		if (parentIdeology === 'monarchy') {
			if (roll < 0.45) rebelIdeology = 'republic';
			else if (roll < 0.75) rebelIdeology = 'communal';
			else if (roll < 0.88) rebelIdeology = 'oligarchy';
			else if (roll < 0.95) rebelIdeology = 'theocracy';
			else rebelIdeology = 'monarchy';
		} else if (parentIdeology === 'autocracy') {
			if (roll < 0.50) rebelIdeology = 'republic';
			else if (roll < 0.85) rebelIdeology = 'communal';
			else rebelIdeology = 'oligarchy';
		} else if (parentIdeology === 'theocracy') {
			if (roll < 0.50) rebelIdeology = 'republic';
			else if (roll < 0.80) rebelIdeology = 'communal';
			else rebelIdeology = 'theocracy';
		} else {
			rebelIdeology = r.pick(['republic', 'communal', 'oligarchy', 'autocracy', 'technocracy', 'monarchy']);
		}

		const { form, fullName } = formatRegimeTitle(name, rebelIdeology, this.rng);
		const share = take.length / pol.cells;
		const np: Polity = {
			id,
			name,
			form,
			fullName,
			ideology: rebelIdeology,
			color: palette(r, 1, 60, 55)[0],
			capital: town.id,
			culture: town.culture,
			religion: li === 0 ? c.religion[town.cell] : pol.religion,
			alive: true,
			founded: this.year,
			treasury: pol.treasury * share,
			army: pol.army * share * 1.2,
			stability: 65,
			tax: 0.1,
			ruler: 0,
			heir: 0,
			relations: { [pol.id]: -80 },
			allies: [],
			cells: 0,
			pop: 0,
			peak: 0,
			expansionism: 1.1,
			origin: 'rebellion',
			layer: li
		};
		pol.relations[id] = -80;
		pol.army *= 1 - share;
		pol.treasury *= 1 - share;
		np.factions = generateFactionsForPolity(np, this.people, this.rng);
		assignPatronDeity(np, this.rng);
		this.polities.push(np);
		for (const i of take) S[i] = id;
		this.syncBurgs();
		town.capital = true;
		this.crown(np, leader ?? this.makePerson(town.culture, id, town.id, 'ruler', r.int(25, 50)));
		this.makePerson(town.culture, id, town.id, 'general', r.int(25, 45));
		pol.stability = clamp(pol.stability + 15, 0, 100);
		this.recount();
		this.computeBorders();
		this.dirty.political = true;
		const rebelText = narrateRebellion(this.rng, town.name, pol.name, np.fullName, this.ruler(np).name, rebelIdeology);
		this.log('rebel', rebelText, town.cell, id);
		if (r.chance(0.8)) this.declareWar(pol.id, id, 'to crush the rebels');
		return np;
	}

	/** neutral lands slowly get settled by neighbours */
	private colonize() {
		const c = this.c;
		const r = this.rng;
		for (let k = 0; k < 40; k++) {
			const li = k % this.w.layers.length;
			const S = this.st(li);
			const i = r.int(0, c.n - 1);
			if (!this.open(li, i) || S[i]) continue;
			if (li === 0 && BIOMES[c.biome[i]].hab === 0) continue;
			for (const j of neighbors(c, i)) {
				const s = S[j];
				if (s && this.open(li, j) && this.polities[s].alive && r.chance(0.25 * this.polities[s].expansionism)) {
					S[i] = s;
					const bid = this.lb[li][i];
					if (bid) {
						this.w.burgs[bid].state = s;
						const colText = narrateColonization(this.rng, this.polities[s].name, this.w.burgs[bid].name);
						this.log('found', colText, i, s);
					}
					this.dirty.political = true;
					break;
				}
			}
		}
	}

	/** independent towns in neutral land may found a new realm */
	private tribes() {
		const free = this.w.burgs.filter((b) => b.id && b.alive && !b.state && b.pop > 0.8);
		if (!free.length || !this.rng.chance(0.15)) return;
		const b = this.rng.pick(free);
		this.foundState(b.id, 'tribe');
	}

	foundState(burgId: number, origin: string, leader?: Person): Polity {
		const c = this.c;
		const r = this.rng;
		const b = this.w.burgs[burgId];
		const L = this.lang(b.culture);
		const form = origin === 'tribe' && r() > GENRES[this.w.opts.genre].formBias ? r.pick(['Chiefdom', 'Principality', 'Free City', 'Tribe']) : polityForm(r, this.w.cultures[b.culture]?.sphere ?? '', this.w.opts.genre, this.w.cultures[b.culture]?.type ?? 'Generic');
		const name = r.chance(0.5) ? b.name : makeName(L, 'land');
		const id = this.polities.length;
		const li = this.burgLayer(b);
		const S = this.st(li);
		const np: Polity = { id, name, form, fullName: `${form} of ${name}`, color: palette(r, 1, 60, 55)[0], capital: b.id, culture: b.culture, religion: li === 0 ? c.religion[b.cell] : this.w.religions.find((x) => x.culture === b.culture)?.id ?? 0, alive: true, founded: this.year, treasury: 20, army: 1, stability: 60, tax: 0.1, ruler: 0, heir: 0, relations: {}, allies: [], cells: 0, pop: 0, peak: 0, expansionism: 1.3, origin, layer: li };
		assignPatronDeity(np, this.rng);
		this.polities.push(np);
		const prev = this.polities[S[b.cell]];
		S[b.cell] = id;
		for (const j of neighbors(c, b.cell)) if (this.open(li, j) && (!S[j] || origin === 'rift')) S[j] = id;
		if (prev?.alive && prev.capital === b.id) this.relocateCapital(prev);
		b.state = id;
		b.capital = true;
		this.crown(np, leader ?? this.makePerson(b.culture, id, b.id, 'ruler', r.int(20, 45)));
		this.recount();
		this.dirty.political = true;
		const foundText = narrateFounding(this.rng, np.fullName, b.name);
		this.log('found', foundText, b.cell, id);
		return np;
	}

	private randomEvents() {
		const r = this.rng;
		const alive = this.polities.filter((p) => p.alive);
		if (!alive.length) return;
		const n = r.int(0, 2);
		for (let k = 0; k < n; k++) {
			const p = r.pick(alive);
			const cap = this.w.burgs[p.capital];
			const roll = r();
			if (roll < 0.2) {
				p.stability += 15;
				p.treasury += 30;
				this.log('misc', packLine(this.voice, 'golden', this.rng, { realm: p.name, town: cap.name }) ?? narrateMiscEvent(this.rng, 'golden_age', cap.name, p.name), cap.cell, p.id);
			} else if (roll < 0.35) {
				for (let i = 0; i < this.c.n; i++) if (this.c.state[i] === p.id) this.c.pop[i] *= 0.85;
				p.stability -= 10;
				this.log('disaster', packLine(this.voice, 'famine', this.rng, { realm: p.name, town: cap.name }) ?? narrateDisaster(this.rng, 'famine', cap.name, p.name), cap.cell, p.id);
			} else if (roll < 0.45) {
				const towns = this.w.burgs.filter((b) => b.alive && b.state === p.id);
				if (towns.length) {
					const t = r.pick(towns);
					t.pop = +(t.pop * 0.7).toFixed(2);
					this.log('disaster', narrateDisaster(this.rng, 'fire', t.name, p.name), t.cell, p.id);
				}
			} else if (roll < 0.52) {
				const towns = this.w.burgs.filter((b) => b.alive && b.state === p.id);
				if (towns.length) this.seedPlague(r.pick(towns).cell, 0.6);
			} else if (roll < 0.6) {
				const omenKind = r.pick(['comet', 'library', 'wall', 'road', 'omen'] as const);
				this.log('misc', narrateMiscEvent(this.rng, omenKind, cap.name, p.name), cap.cell, p.id);
			} else if (roll < 0.66) {
				const ruler = this.ruler(p);
				if (ruler?.alive && p.id !== this.playerState() && r.chance(0.5)) {
					const plotter = this.general(p);
					if (plotter && plotter.intrigue + plotter.martial > ruler.intrigue + 10 && p.stability < 40) {
						const coupText = narratePalaceCoup(this.rng, plotter.name, ruler.name, p.name);
						this.log('rebel', coupText, cap.cell, p.id);
						this.kill(ruler, 'the coup');
						this.crown(p, plotter);
					}
				}
			}
		}
	}

	// ───────────────────────────── plague ─────────────────────────────
	seedPlague(cell: number, v = 1) {
		this.plagueActive = true;
		this.plague[cell] = Math.max(this.plague[cell], v);
		const b = this.c.burg[cell] ? this.w.burgs[this.c.burg[cell]] : null;
		this.log('disaster', narrateDisaster(this.rng, 'plague', b?.name ?? 'the frontier'), cell, this.c.state[cell]);
		this.dirty.political = true;
	}

	plagueActive = false;
	private spreadPlague() {
		if (!this.plagueActive) return;
		const c = this.c, pl = this.plague;
		let any = false;
		const next = pl.slice();
		for (let i = 0; i < c.n; i++) {
			if (pl[i] <= 0.02) { if (pl[i]) next[i] = 0; continue; }
			any = true;
			c.pop[i] *= 1 - pl[i] * 0.04;
			next[i] = pl[i] * 0.93;
			for (const j of neighbors(c, i)) {
				if (!this.isLand(j) && !c.road[i]) continue;
				const spread = pl[i] * (c.road[j] ? 0.35 : 0.18) * (c.pop[j] > 1 ? 1.2 : 0.6);
				if (spread > next[j] && this.rng.chance(0.3)) next[j] = Math.min(1, spread);
			}
		}
		this.plague = next;
		if (any) this.dirty.political = true;
		if (this.plagueActive && !any) this.log('misc', 'After seasons of dread, the pestilence finally burns itself out; survivors emerge from shuttered homes to bury the dead and rebuild.');
		this.plagueActive = any;
	}

	// ───────────────────────────── god powers ─────────────────────────────
	canCast(p: Power) {
		return this.sandbox || this.mana >= POWERS[p].cost;
	}

	cast(power: Power, cell: number, layer = 0): string | null {
		if (!this.canCast(power)) return 'Not enough divine power.';
		const c = this.c;
		if (layer > 0 && ['meteor', 'raise', 'sink', 'cataclysm', 'apocalypse'].includes(power)) layer = 0;
		const pol = this.stateAt(cell, layer);
		const hasRealm = pol && pol.alive && pol.id > 0;
		const needRealm = ['inspire', 'host', 'peace', 'discord', 'chaos', 'rebel', 'smite', 'relic', 'patron'].includes(power);
		if (needRealm && !hasRealm) return 'Choose a realm.';
		const spend = () => { if (!this.sandbox) this.mana -= POWERS[power].cost; };
		const area = (radius: number) => {
			const out = [cell];
			const seen = new Set(out);
			let ring = [cell];
			for (let d = 0; d < radius; d++) {
				const next: number[] = [];
				for (const i of ring) for (const j of neighbors(c, i)) if (!seen.has(j)) { seen.add(j); next.push(j); out.push(j); }
				ring = next;
			}
			return out;
		};
		switch (power) {
			case 'bless': {
				for (const i of area(3)) { if (this.isLand(i)) c.pop[i] *= 1.4; this.plague[i] = 0; }
				if (hasRealm) pol.stability = clamp(pol.stability + 8, 0, 100);
				this.log('god', `A radiant celestial aura descends upon the lands ${hasRealm ? `of ${pol.name}` : ''}: fields flourish and sick beds are cleansed by divine grace.`, cell, pol?.id);
				break;
			}
			case 'plague':
				this.seedPlague(cell, 1);
				break;
			case 'meteor': {
				const hit = area(2);
				for (const i of hit) {
					if (!this.isLand(i)) continue;
					c.pop[i] *= 0.1;
					if (c.burg[i]) {
						const b = this.w.burgs[c.burg[i]];
						b.alive = false;
						for (const p of this.people) if (p.alive && p.burg === b.id) this.kill(p, 'the falling star');
						c.burg[i] = 0;
						const owner = this.polities[b.state];
						if (owner?.capital === b.id && !this.relocateCapital(owner)) this.fall(owner);
					}
				}
				for (const w of this.wonders) {
					if (!w.destroyed && hit.includes(w.cell)) {
						const res = destroyWonder(w, 'Falling Celestial Meteor', this.year, 'shattered by kinetic impact of a falling star');
						this.log('wonder', res.event.text, w.cell, w.stateId);
					}
				}
				c.h[cell] = 12;
				for (const j of neighbors(c, cell)) c.h[j] = Math.max(SEA - 2, c.h[j] - 25);
				this.terraform();
				this.log('god', `A blazing star falls screaming from the heavens${hasRealm ? ` upon ${pol.name}` : ''}, shattering the earth and leaving a smoking, glass-rimmed crater-lake.`, cell, pol?.id);
				break;
			}
			case 'raise':
			case 'sink': {
				for (const i of area(1)) c.h[i] = clamp(c.h[i] + (power === 'raise' ? (i === cell ? 8 : 5) : i === cell ? -8 : -5), 0, 100);
				this.terraform();
				break;
			}
			case 'smite': {
				const ruler = this.ruler(pol);
				if (!ruler?.alive) return 'No ruler to smite.';
				this.log('god', `A deafening thunderclap splits the firmament: blinding lightning strikes ${ruler.name} of ${pol.name} dead upon their throne before the horrified court!`, cell, pol.id);
				this.kill(ruler, 'divine wrath');
				break;
			}
			case 'discord':
				for (const n of this.neighborsOf(pol.id)) this.addRel(pol.id, n, -45);
				pol.allies = [];
				for (const p of this.polities) p.allies = p.allies.filter((a) => a !== pol.id);
				this.log('god', `Invisible malice whispers in the halls of princes: distrust and paranoia poison relations between ${pol.name} and its neighbours.`, cell, pol.id);
				break;
			case 'inspire':
				pol.stability = clamp(pol.stability + 30, 0, 100);
				pol.treasury += 40;
				this.log('god', `Heavenly visions of imperial glory inflame the hearts of soldiers and nobility across ${pol.name}.`, cell, pol.id);
				break;
			case 'host':
				pol.army = pol.army * 1.6 + 2;
				this.log('god', `A celestial vanguard of luminous champions descends from the sky, taking up spears beneath the banners of ${pol.name}!`, cell, pol.id);
				break;
			case 'peace': {
				const ws = this.warsOf(pol.id);
				if (!ws.length) return `${pol.name} is at peace already.`;
				for (const w of ws) this.finishWar(w, 'white');
				this.log('god', `An awe-inspiring decree echoes from the heavens: the gods command peace, and ${pol.name} humbly lays down its arms.`, cell, pol.id);
				break;
			}
			case 'rebel': {
				const np = this.revolt(pol, cell);
				if (!np) return 'No town here can rise.';
				void layer;
				break;
			}
			case 'hero': {
				const burgs = this.w.burgs.filter((b) => b.id && b.alive);
				const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));
				const h = this.makePerson(b.culture, 0, b.id, 'hero', 18);
				h.martial += 6; h.diplomacy += 4; h.stewardship += 3; h.intrigue += 3; h.renown = 25; h.gold = 50;
				h.traits = ['Brave', 'Lucky'];
				this.log('god', `A miraculous celestial sign heralds the birth of a child of destiny, ${h.name}, in ${b.name}. Prophecies foresee a legendary path.`, b.cell, b.state);
				break;
			}
			case 'relic': {
				const art = forgeArtifact(this.nextArtifactId++, this.rng, this.year, this.lang(pol.culture), 'polity', pol.id, pol.name, `Bestowed by divine grace in year ${this.year}.`);
				this.artifacts.push(art);
				pol.stability = clamp(pol.stability + 15, 0, 100);
				this.log('god', `The clouds part as heavenly messengers bestow the sacred artifact ${art.name} upon the throne of ${pol.name}!`, cell, pol.id);
				break;
			}
			case 'cataclysm': {
				const hitCells = area(3);
				for (const i of hitCells) {
					if (this.isLand(i)) c.pop[i] *= 0.4;
					c.h[i] = clamp(c.h[i] + (this.rng() - 0.5) * 20, 5, 95);
				}
				for (const w of this.wonders) {
					if (!w.destroyed && hitCells.includes(w.cell)) {
						const res = destroyWonder(w, 'Tectonic Cataclysm', this.year, 'consumed by subterranean faultline chasms');
						this.log('wonder', res.event.text, w.cell, w.stateId);
					}
				}
				this.terraform();
				this.log('god', `A terrifying cataclysm violently heaves the bedrock: cliffs plunge into the abyss and chasms tear across the continents!`, cell);
				break;
			}
			case 'dig': {
				// carve on the viewed deep layer, or the first one beneath the surface
				const li = this.w.layers[layer]?.kind === 'deep' ? layer : this.w.layers.findIndex((l) => l.kind === 'deep');
				if (li < 0) return 'This world has no underdark.';
				const L = this.w.layers[li];
				const owners = new Map<number, number>();
				const carve = [cell];
				const seen = new Set(carve);
				for (let d = 0; d < 2; d++) for (const i of [...carve]) for (const j of neighbors(c, i)) if (!seen.has(j)) { seen.add(j); carve.push(j); }
				for (const i of carve) for (const j of neighbors(c, i)) if (L.open[j] && L.state[j]) owners.set(L.state[j], (owners.get(L.state[j]) ?? 0) + 1);
				const owner = [...owners].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
				for (const i of carve) if (!L.open[i]) { L.open[i] = 1; L.state[i] = owner; }
				this.dirty.terrain = true;
				this.log('god', `The earth groans: new caverns open in ${L.name}${owner ? `, and ${this.polities[owner].name} spreads into them` : ''}.`, cell, owner || undefined);
				break;
			}
			case 'tear': {
				if (!this.cosmos || this.cosmos.u.planets.length < 2) {
					return 'Need multiple planets in the cosmos to tear a rift.';
				}
				const bHere = this.lb[layer][cell] ? this.w.burgs[this.lb[layer][cell]] : this.w.burgs.find((b) => b.id && b.alive);
				if (!bHere) return 'No settlement nearby to anchor a rift.';
				const otherPlanets = this.cosmos.u.planets.map((_, i) => i).filter((i) => i !== this.planetIndex);
				const targetPlanetIdx = this.rng.pick(otherPlanets);
				const targetWorld = this.cosmos.u.planets[targetPlanetIdx];
				const targetBurgs = targetWorld.burgs.filter((b) => b.id && b.alive);
				if (!targetBurgs.length) return 'The far world has no settlements to anchor.';
				const bFar = this.rng.pick(targetBurgs);
				this.cosmos.tearRift(this.planetIndex, bHere.id, targetPlanetIdx, bFar.id);
				this.log('god', `The fabric of space tears open! A rift now links ${this.w.name} to ${targetWorld.name}.`, cell);
				break;
			}
			case 'enlighten': {
				this.innovation += 60; // divine act: full effect
				const unlocked = checkNextDiscovery(this.techs, this.era, this.rng);
				if (unlocked) {
					this.techs.add(unlocked.id);
					this.applyTechBonus(unlocked);
					this.log('god', `Divine enlightenment descends: ${unlocked.name} is revealed to the world!`, cell, pol?.id);
				} else {
					this.log('god', `Divine enlightenment inspires scholars across ${this.w.name}!`, cell, pol?.id);
				}
				break;
			}
			case 'chaos': {
				pol.treasury = Math.floor(pol.treasury * 0.4);
				pol.allies = [];
				for (const p of this.polities) p.allies = p.allies.filter((a) => a !== pol.id);
				for (const n of this.neighborsOf(pol.id)) this.addRel(pol.id, n, -40);
				const towns = this.w.burgs.filter((b) => b.id && b.alive && b.state === pol.id && b.id !== pol.capital);
				for (const t of this.rng.shuffle(towns).slice(0, 2)) {
					this.revolt(pol, t.cell);
				}
				pol.stability = Math.min(25, Math.max(5, pol.stability - 50));
				for (const p of this.people.filter((x) => x.alive && x.state === pol.id)) {
					if (!p.traits.includes('Paranoid') && this.rng.chance(0.5)) p.traits.push('Paranoid');
				}
				this.log('god', `Chaos consumes ${pol.fullName}! Riots shatter the cities, mutinous garrisons revolt, and the realm plunges into anarchy.`, cell, pol.id);
				break;
			}
			case 'pandemic': {
				const afflicted = area(4);
				for (const i of afflicted) {
					if (!this.isLand(i)) continue;
					this.plague[i] = 1.0;
					c.pop[i] = Math.max(0.01, c.pop[i] * 0.45);
					const bId = c.burg[i];
					if (bId) {
						const b = this.w.burgs[bId];
						b.pop = Math.max(0.1, b.pop * 0.4);
						const owner = this.polities[b.state];
						if (owner?.alive) owner.stability = clamp(owner.stability - 15, 0, 100);
						for (const p of this.people.filter((x) => x.alive && x.burg === bId)) {
							if (this.rng.chance(0.35)) this.kill(p, 'the Great Pestilence');
						}
					}
				}
				this.log('god', `The Great Pestilence strikes! A virulent black death sweeps across whole provinces, filling mass graves and emptying cities.`, cell, pol?.id);
				break;
			}
			case 'villain': {
				const burgs = this.w.burgs.filter((b) => b.id && b.alive);
				if (!burgs.length) return 'No settlement found to raise a villain.';
				const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));
				const v = this.makePerson(b.culture, 0, b.id, 'villain', this.rng.int(26, 48));
				v.martial = 18; v.intrigue = 16; v.renown = 50; v.gold = 100; v.health = 100;
				v.traits = ['Cruel', 'Ambitious', 'Ruthless', 'Fierce'];
				const epithet = this.rng.pick(['the Despoiler', 'the Scourge', 'the Dread', 'Blood-Drinker', 'the Defiler', 'Shadow-Bane']);
				v.name = `${v.name} ${epithet}`;

				const art = forgeArtifact(this.nextArtifactId++, this.rng, this.year, this.lang(b.culture), 'person', v.id, v.name, 'Forged in malice to conquer the mortal realms.');
				art.fame = 45; art.bonusVal = 4; art.kind = 'weapon'; art.icon = '⚔'; art.name = `Dread Blade of ${v.name.split(' ')[0]}`;
				this.artifacts.push(art);

				const scourge = this.foundState(b.id, 'scourge', v);
				const li = this.burgLayer(b);
				const S = this.st(li);
				for (const j of neighbors(c, b.cell)) if (this.open(li, j)) S[j] = scourge.id;
				scourge.name = `${v.name.split(' ')[0]}'s Horde`;
				scourge.form = 'Dread Host';
				scourge.fullName = `Dread Host of ${v.name}`;
				scourge.color = '#3b0a0a';
				scourge.expansionism = 2.8;
				scourge.army = 65 + this.rng.int(10, 30);
				scourge.stability = 80;

				this.recount();
				const targets = this.neighborsOf(scourge.id).filter((n) => n && n !== scourge.id);
				for (const target of targets.slice(0, 2)) {
					this.declareWar(scourge.id, target, 'apocalyptic conquest');
				}

				this.log('god', `The villain ${v.name} rises in ${b.name}! Wielding the ${art.name}, their Dread Host marches to conquer the world!`, b.cell, scourge.id);
				break;
			}
			case 'apocalypse': {
				const hit = area(5);
				const hitStates = new Set<number>();
				for (const i of hit) {
					if (!this.isLand(i)) continue;
					if (c.state[i]) hitStates.add(c.state[i]);
				}
				const landHits = this.rng.shuffle(hit.filter((i) => this.isLand(i))).slice(0, 8);
				for (const k of landHits) {
					c.h[k] = clamp(c.h[k] + (this.rng() - 0.5) * 25, 8, 92);
					c.pop[k] = Math.max(0.01, c.pop[k] * 0.15);
					if (c.burg[k]) {
						const b = this.w.burgs[c.burg[k]];
						b.pop = Math.max(0.1, b.pop * 0.25);
					}
				}
				for (const sid of hitStates) {
					const p = this.polities[sid];
					if (p?.alive) {
						p.stability = clamp(p.stability - 35, 5, 100);
						p.army = Math.max(1, p.army * 0.65);
						p.treasury = Math.floor(p.treasury * 0.5);
					}
				}
				const burgsInHit = this.w.burgs.filter((b) => b.id && b.alive && hit.includes(b.cell));
				for (const b of this.rng.shuffle(burgsInHit).slice(0, 3)) {
					const owner = this.polities[b.state];
					if (owner?.alive && b.id !== owner.capital) {
						this.revolt(owner, b.cell);
					}
				}
				for (const w of this.wonders) {
					if (!w.destroyed && hit.includes(w.cell)) {
						const res = destroyWonder(w, 'Apocalyptic Calamity', this.year, 'shattered during the apocalyptic blood eclipse');
						this.log('wonder', res.event.text, w.cell, w.stateId);
					}
				}
				this.terraform();
				this.log('god', `DOOMSDAY OMENS: The skies bleed crimson as an apocalyptic cataclysm tears through ${this.w.name}! Mountains buckle, cities burn, and panic grips civilization.`, cell);
				break;
			}
			case 'prophet': {
				const burgs = this.w.burgs.filter((b) => b.id && b.alive);
				if (!burgs.length) return 'No settlement found to anoint a prophet.';
				const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));
				const pr = this.makePerson(b.culture, b.state, b.id, 'prophet', this.rng.int(22, 50));
				pr.diplomacy = 18; pr.martial = 4; pr.stewardship = 12; pr.intrigue = 8; pr.renown = 45; pr.gold = 40;
				pr.traits = ['Zealous', 'Charismatic', 'Wise', 'Honest'];

				const relId = this.w.religions.length;
				const relName = this.rng.pick(['Order of the Sacred Dawn', 'Covenant of the Celestial Star', 'Children of the Eternal Flame', 'Way of the Pure Light', 'Disciples of the Living Cosmos', `${pr.name}ite Revelation`]);
				const newRel: Religion = {
					id: relId,
					name: relName,
					color: '#e8c468',
					type: 'Organized',
					deity: `${pr.name}'s Divine Vision`,
					center: b.cell,
					culture: b.culture
				};
				this.w.religions.push(newRel);
				pr.religion = relId;
				c.religion[b.cell] = relId;
				for (const j of area(2)) {
					if (this.isLand(j)) c.religion[j] = relId;
				}

				const localPol = this.polities[b.state];
				if (localPol?.alive) {
					localPol.religion = relId;
					localPol.stability = clamp(localPol.stability + 20, 0, 100);
					if (this.rng.chance(0.4)) {
						localPol.form = 'Holy Theocracy';
						localPol.fullName = `Holy Theocracy of ${localPol.name}`;
					}
				}

				const tome = forgeArtifact(this.nextArtifactId++, this.rng, this.year, this.lang(b.culture), 'person', pr.id, pr.name, `Penned by the prophet ${pr.name} under divine revelation.`);
				tome.kind = 'tome';
				tome.icon = '📜';
				tome.name = `Holy Scripture of ${relName}`;
				tome.fame = 40;
				tome.bonusVal = 5;
				this.artifacts.push(tome);

				this.log('god', `The Holy Prophet ${pr.name} proclaims the ${relName} in ${b.name}! Miracles and holy visions inspire the populace, sweeping across the provinces.`, b.cell, b.state);
				break;
			}
			case 'species': {
				const burgs = this.w.burgs.filter((b) => b.id && b.alive);
				if (!burgs.length) return 'No settlement found to anchor the new species.';
				const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));

				const specDef = this.rng.pick([
					{ name: 'Saurian Brood', sphere: 'Eldritch', form: 'Brood-Kingdom' },
					{ name: 'Chitin Hive-Folk', sphere: 'Steppe', form: 'Hive-Colony' },
					{ name: 'Gorgon Kin', sphere: 'Hellenic', form: 'Ophidian Dominion' },
					{ name: 'Myconid Sporefolk', sphere: 'Boreal', form: 'Spore-Collective' },
					{ name: 'Star-Elves', sphere: 'Latinate', form: 'Astral Principality' },
					{ name: 'Crystal Golems', sphere: 'Nordic', form: 'Resonant Enclave' },
					{ name: 'Deep Chimera', sphere: 'Eldritch', form: 'Beast-Dominion' }
				]);

				const cultId = this.w.cultures.length;
				const newCulture: Culture = {
					id: cultId,
					name: specDef.name,
					color: palette(this.rng, 1, 65, 50)[0],
					center: b.cell,
					type: 'Generic',
					lang: cultId,
					sphere: specDef.sphere,
					layer: 'surface'
				};
				this.w.cultures.push(newCulture);
				this.langs[cultId] = makeLang(this.w.opts.seed + ':species:' + cultId, specDef.sphere);

				b.culture = cultId;
				for (const j of area(2)) {
					if (this.isLand(j)) c.culture[j] = cultId;
				}

				const leader = this.makePerson(cultId, 0, b.id, 'ruler', this.rng.int(20, 45));
				leader.traits.push('Fierce', 'Tough');

				const realm = this.foundState(b.id, 'species', leader);
				const li = this.burgLayer(b);
				const S = this.st(li);
				for (const j of neighbors(c, b.cell)) if (this.open(li, j)) S[j] = realm.id;
				realm.form = specDef.form;
				realm.name = specDef.name;
				realm.fullName = `${specDef.form} of the ${specDef.name}`;
				realm.color = newCulture.color;
				realm.expansionism = 1.9;
				realm.army = 35;

				newCulture.species = specDef.name.toLowerCase().includes('saurian') ? 'saurian' : specDef.name.toLowerCase().includes('star-elves') ? 'elf' : 'beastman';
				realm.species = newCulture.species;
				this.recount();
				this.log('god', `A new species emerges! The ${specDef.name} awaken in ${b.name}, establishing the ${realm.fullName}!`, b.cell, realm.id);
				break;
			}
			case 'monster': {
				const arch = this.rng.pick(MONSTER_ARCHETYPES);
				const name = this.rng.pick(arch.nameTpl);
				const bId = c.burg[cell];
				const lairName = bId ? `Lair near ${this.w.burgs[bId].name}` : `Wilds of Cell ${cell}`;
				const m: Monster = {
					id: this.monsters.length + 1,
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
				this.monsters.push(m);
				this.log('monster', `PRIMORDIAL AWAKENING: ${m.name} (${m.species}), a legendary ${m.tier} ${m.category} beast, awakens and stalks the territory!`, cell, pol?.id);
				break;
			}
			case 'wonder': {
				const burgs = this.w.burgs.filter((b) => b.id && b.alive);
				const b = burgs.length
					? burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best))
					: null;
				const isCoastal = c.dist[cell] <= 1;
				const isMountain = c.h[cell] > 50;
				let kind: LegendaryPlace['kind'] = 'tower_magic';
				if (isCoastal && this.rng.chance(0.5)) kind = 'giant_harbor';
				else if (isMountain) kind = 'tower_magic';
				else if (this.rng.chance(0.4)) kind = 'tower_trials';
				else if (b && this.rng.chance(0.5)) kind = 'university';
				else kind = 'ancient_forge';

				const builderName = pol?.alive ? pol.name : 'Divine Mandate';
				const nextWdObj = { val: this.nextWonderId };
				const wonder = buildWonder(
					this.w,
					cell,
					layer,
					kind,
					builderName,
					pol?.id ?? 0,
					this.year,
					nextWdObj,
					this.rng
				);
				this.nextWonderId = nextWdObj.val;
				this.wonders.push(wonder);
				if (pol?.alive) {
					pol.stability = clamp(pol.stability + 20, 0, 100);
				}
				this.gainInnovation(30);
				this.log('god', `DIVINE ARCHITECTURE: The heavens consecrate the ${wonder.name} (${wonder.icon}) on the landscape! ${wonder.effect}`, cell, pol?.id);
				break;
			}
			case 'alien': {
				const burgs = this.w.burgs.filter((b) => b.id && b.alive);
				if (!burgs.length) return 'No settlement found to anchor the extraterrestrial invasion.';
				const b = burgs.reduce((best, x) => ((x.x - c.x[cell]) ** 2 + (x.y - c.y[cell]) ** 2 < (best.x - c.x[cell]) ** 2 + (best.y - c.y[cell]) ** 2 ? x : best));

				c.h[cell] = clamp(c.h[cell] - 10, SEA + 5, 90);
				this.innovation += 50; // divine act: full effect

				const xenoCultId = this.w.cultures.length;
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
				this.w.cultures.push(xenoCulture);
				this.langs[xenoCultId] = makeLang('alien-seed:' + this.year, 'Eldritch');

				b.culture = xenoCultId;
				b.name = `Citadel Prime ${this.rng.int(1, 99)}`;
				for (const j of area(2)) {
					if (this.isLand(j)) c.culture[j] = xenoCultId;
				}

				const archon = this.makePerson(xenoCultId, 0, b.id, 'ruler', 120);
				archon.name = `Archon-Vector ${this.rng.int(101, 999)}`;
				archon.martial = 20; archon.intrigue = 18; archon.diplomacy = 4; archon.stewardship = 16;
				archon.renown = 60; archon.gold = 150;
				archon.traits = ['Ambitious', 'Genius', 'Ruthless'];

				const xenoRealm = this.foundState(b.id, 'alien', archon);
				const li = this.burgLayer(b);
				const S = this.st(li);
				for (const j of neighbors(c, b.cell)) if (this.open(li, j)) S[j] = xenoRealm.id;
				xenoRealm.name = 'Xeno Collective';
				xenoRealm.form = 'Starborn Hegemony';
				xenoRealm.fullName = 'Starborn Hegemony';
				xenoRealm.color = '#00e5ff';
				xenoRealm.expansionism = 3.0;
				xenoRealm.army = 85;
				xenoRealm.stability = 95;

				this.recount();
				const victims = this.neighborsOf(xenoRealm.id).filter((n) => n && n !== xenoRealm.id);
				for (const victim of victims.slice(0, 2)) {
					this.declareWar(xenoRealm.id, victim, 'planetary subjugation');
				}

				this.terraform();
				this.log('god', `EXTRATERRESTRIAL DESCENT: An alien star-dreadnought impacts at ${b.name}! The Starborn Hegemony establishes a forward citadel and begins planetary subjugation.`, cell, xenoRealm.id);
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
				this.log('god', `DIVINE MANDATE: The Creator anoints ${pol.name} as the Chosen Realm of the Mortal World! Celestial light bathes the realm, granting supreme divine favor and eternal protection.`, cell, pol.id);
				break;
			}
		}
		spend();
		this.dirty.political = true;
		return null;
	}

	/** re-derive water bodies / biomes after terrain edits (rivers stay put) */
	terraform() {
		const c = this.c;
		const { width: W, height: H } = this.w.opts;
		this.w.features = markFeatures(c, W, H);
		for (let i = 0; i < c.n; i++) {
			c.biome[i] = biomeOf(c.h[i], c.temp[i], c.prec[i], c.flux[i], c.n);
			if (!this.isLand(i)) {
				if (c.state[i]) c.state[i] = 0;
				c.pop[i] = 0;
				if (c.burg[i]) {
					const b = this.w.burgs[c.burg[i]];
					b.alive = false;
					c.burg[i] = 0;
					this.log('disaster', `Surging waters engulf the ramparts: ${b.name} sinks beneath the waves and is lost to the sea.`, i, b.state);
					const owner = this.polities[b.state];
					if (owner?.capital === b.id && !this.relocateCapital(owner)) this.fall(owner);
				}
			} else if (this.basePop[i] === 0 && BIOMES[c.biome[i]].hab) {
				this.basePop[i] = BIOMES[c.biome[i]].hab / 20;
				c.pop[i] = 0.05;
			}
		}
		this.recount();
		this.dirty.terrain = true;
		this.dirty.political = true;
	}

	/** Configure World, live: re-run climate + precipitation + biomes; people rescale to the new carrying capacity. */
	reclimate(cl: Climate, silent = false) {
		const c = this.c;
		const w = this.w;
		w.opts = withDefaults({ ...w.opts, climate: { ...cl, winds: [...cl.winds] } });
		const { width: W, height: H } = w.opts;
		const lat = climate(c, H, w.opts.climate);
		precipitation(makeRng(w.opts.seed + ':clim'), c, W, H, lat, w.opts.climate);
		assignBiomes(c);
		planetBiomes(c, w.opts.planet, makeRng(w.opts.seed + ':pb'));
		const cur = c.pop.slice();
		const old = this.basePop;
		assignPopulation(c, w.features);
		const next = c.pop.slice();
		for (let i = 0; i < c.n; i++) c.pop[i] = old[i] > 0 ? (cur[i] * next[i]) / old[i] : next[i] * 0.3;
		this.basePop = next;
		this.recount();
		if (!silent) this.log('god', `The heavens shift and winds veer: the global climate of ${this.w.name} is permanently remade by divine will.`);
		this.dirty.terrain = true;
		this.dirty.political = true;
	}

	// ───────────────────────────── avatar ─────────────────────────────
	get me(): Person | null {
		const p = this.people[this.avatar];
		return p?.alive ? p : null;
	}

	choose(id: number) {
		this.avatar = id;
		this.travel = null;
		const p = this.people[id];
		this.log('avatar', `You take up the life of ${p.name} ${p.house}, ${p.role}${p.state ? ` of ${this.polities[p.state].name}` : ''}.`);
	}

	/** Dijkstra over burg links (roads + sea lanes) */
	route(from: number, to: number): number[] | null {
		const adj = new Map<number, [number, number][]>();
		for (const [a, b, d] of this.w.links) {
			if (!this.w.burgs[a].alive || !this.w.burgs[b].alive) continue;
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

	linkDays(a: number, b: number) {
		for (const [x, y, d] of this.w.links) if ((x === a && y === b) || (x === b && y === a)) return d;
		return 5;
	}

	startTravel(to: number): string | null {
		const me = this.me;
		if (!me) return 'No avatar.';
		if (me.burg === to) return 'You are already here.';
		const path = this.route(me.burg, to);
		if (!path) return 'No known road leads there.';
		this.travel = { path, leg: 0, days: 0, legDays: this.linkDays(path[0], path[1]) };
		return null;
	}

	private advanceTravel() {
		const me = this.me;
		const t = this.travel;
		if (!me || !t) return;
		t.days += 30;
		while (t.days >= t.legDays && t.leg < t.path.length - 1) {
			t.days -= t.legDays;
			t.leg++;
			me.burg = t.path[t.leg];
			for (const id of me.companions ?? []) if (this.people[id]?.alive) this.people[id].burg = me.burg;
			if (t.leg < t.path.length - 1) t.legDays = this.linkDays(t.path[t.leg], t.path[t.leg + 1]);
		}
		if (t.leg >= t.path.length - 1) {
			this.travel = null;
			const b = this.w.burgs[me.burg];
			this.log('avatar', `You arrive at ${b.name}.`, b.cell);
			if (this.rng.chance(0.55)) this.pending = this.encounter();
		} else if (this.rng.chance(0.12)) this.pending = this.encounter();
	}

	resolve(optIndex: number): { ok: boolean; text: string } {
		const enc = this.pending;
		const me = this.me;
		this.pending = null;
		if (!enc || !me) return { ok: false, text: '' };
		const o = enc.options[optIndex];
		let ok = true;
		if (o.stat) {
			const roll = this.rng.int(1, 10) + me[o.stat] / 2 + (me.traits.includes('Lucky') ? 2 : 0) + companionBonus(this, me, o.stat);
			ok = roll >= (o.dc ?? 10);
		}
		const fx = ok ? o.win : (o.lose ?? o.win);
		this.apply(me, fx);
		this.log('avatar', `${enc.title}: ${fx.text}`);
		return { ok, text: fx.text };
	}

	apply(me: Person, fx: Effects) {
		me.gold = Math.max(0, me.gold + (fx.gold ?? 0));
		me.renown = Math.max(0, me.renown + (fx.renown ?? 0));
		me.health = clamp(me.health + (fx.health ?? 0), 0, 100);
		for (const k of ['martial', 'diplomacy', 'stewardship', 'intrigue'] as const) if (fx[k]) me[k] = clamp(me[k] + fx[k]!, 0, 20);
		if (fx.trait && !me.traits.includes(fx.trait)) me.traits.push(fx.trait);
		if (me.health <= 0) this.kill(me, 'grievous wounds');
	}

	/** Avatar actions; returns a message for the UI. */
	act(action: string, arg?: number): string {
		const me = this.me;
		if (!me) return 'You have no avatar.';
		const here = this.w.burgs[me.burg];
		const pol = this.polities[me.state];
		const local = this.polities[here.state];
		const r = this.rng;
		const say = (t: string) => { this.log('avatar', t, here.cell); return t; };
		switch (action) {
			case 'work': {
				const g = Math.round(5 + me.stewardship * 1.5 + here.pop * 0.5 + r.int(0, 6));
				me.gold += g;
				this.skipMonths(1);
				return say(`You labour a month in ${here.name} and earn ${g} gold.`);
			}
			case 'adventure':
				this.pending = this.encounter();
				return '';
			case 'train': {
				if (me.gold < 25) return 'Training costs 25 gold.';
				me.gold -= 25;
				const stat = r.pick(['martial', 'diplomacy', 'stewardship', 'intrigue'] as const);
				me[stat] = Math.min(20, me[stat] + 1);
				this.skipMonths(2);
				return say(`Months of study sharpen your ${stat}.`);
			}
			case 'research': {
				if (me.gold < 20) return 'Researching innovations requires 20 gold for materials.';
				me.gold -= 20;
				this.innovation += 20; // player deed: full effect
				me.renown += 3;
				const disc = checkNextDiscovery(this.techs, this.era, this.rng);
				if (disc && this.rng.chance(0.4)) {
					this.techs.add(disc.id);
					this.applyTechBonus(disc);
					return say(`Through diligent research, you pioneer a breakthrough: ${disc.name}!`);
				}
				this.skipMonths(2);
				return say(`You devote months to research in ${here.name}, advancing global innovation (+20).`);
			}
			case 'buy': {
				if (me.cargo) return 'You already carry goods.';
				if (me.gold < 30) return 'Goods cost 30 gold.';
				me.gold -= 30;
				me.cargo = { from: here.id, cost: 30 };
				return say(`You load a cart with ${BIOMES[this.c.biome[here.cell]].name.toLowerCase()} goods from ${here.name}.`);
			}
			case 'companion':
				return say(hireCompanion(this) || `Your fellowship grows.`);
			case 'goto': {
				if (arg === undefined) return '';
				return this.startTravel(arg) ?? say(`You set out for ${this.w.burgs[arg].name}.`);
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
				const from = this.w.burgs[me.cargo.from];
				const d = Math.hypot(from.x - here.x, from.y - here.y) / 30;
				const diff = this.c.biome[from.cell] !== this.c.biome[here.cell] ? 1.3 : 1;
				const war = local && this.warsOf(local.id).length ? 1.4 : 1;
				const tip = this.tradeTip && this.tradeTip.burg === here.id && this.year <= this.tradeTip.until ? 2 : 1;
				const price = Math.round(me.cargo.cost * (0.8 + d * 0.12) * diff * war * tip * (0.85 + r() * 0.3) + me.stewardship);
				me.gold += price;
				me.renown += 1;
				me.cargo = undefined;
				return say(`You sell your goods in ${here.name} for ${price} gold.`);
			}
			case 'audience': {
				if (!local?.alive || here.id !== local.capital) return 'There is no court here.';
				const ruler = this.ruler(local);
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
				const rel = this.w.religions[me.religion];
				me.renown += 3;
				me.health = Math.min(100, me.health + 10);
				this.skipMonths(1);
				return say(`You pray at the temples of ${here.name}${rel ? ` to ${rel.deity}` : ''}.`);
			}
			case 'preach': {
				if (me.role !== 'prophet' && me.role !== 'priest') return 'Only prophets or priests can preach the creed.';
				const rel = this.w.religions[me.religion];
				this.c.religion[here.cell] = me.religion;
				const offerings = 15 + Math.round(me.diplomacy * 1.5) + r.int(0, 10);
				me.gold += offerings;
				me.renown += 4;
				this.skipMonths(1);
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
				this.skipMonths(1);
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
				this.skipMonths(1);
				return say(`Dark raiders and bloodthirsty cutthroats rally to your banner in ${here.name}!`);
			}
			case 'hunt': {
				const c = this.c;
				const nearby = [here.cell, ...Array.from(neighbors(c, here.cell))];
				const monster = this.monsters.find((m) => m.alive && nearby.includes(m.cell));
				if (!monster) return `No legendary beasts stalk the wilderness near ${here.name}.`;
				this.skipMonths(1);
				const martialBonus = me.traits.includes('Brave') ? 10 : 0;
				const rawDmg = Math.round(me.martial * 4.5 + martialBonus + r.int(15, 35));
				const res = resolveMonsterCombat(monster, rawDmg, `${me.name} ${me.house}`, this.year, this.rng);
				me.health = Math.max(5, me.health - res.damageTaken);

				if (!res.slain) {
					return say(`${res.summary} You sustained ${res.damageTaken} damage (health: ${me.health}) and retreated.`);
				}

				// Monster slain!
				const art = forgeMonsterRelic(
					this.nextArtifactId++,
					this.rng,
					this.year,
					monster,
					`${me.name} ${me.house}`,
					'person',
					me.id,
					me.name
				);
				this.artifacts.push(art);
				me.gold += 150;
				me.renown += 45;
				if (pol?.alive) pol.stability = clamp(pol.stability + 20, 0, 100);
				if (local?.alive) local.stability = clamp(local.stability + 20, 0, 100);
				this.gainInnovation(40);

				let wonderText = '';
				if (monster.tier === 'cataclysm' || monster.tier === 'legendary') {
					const nextWdObj = { val: this.nextWonderId };
					const shrine = createTitanShrineWonder(this.w, monster.cell, monster.layer, monster, me.name, this.year, nextWdObj);
					this.nextWonderId = nextWdObj.val;
					this.wonders.push(shrine);
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
				this.skipMonths(2);
				const isMountain = this.c.h[here.cell] > 50;
				const kind: LegendaryPlace['kind'] = (isMountain || me.role === 'magician' || r.chance(0.5)) ? 'tower_magic' : 'tower_trials';
				const builderName = isRuler ? `${me.name} of ${pol.name}` : `${me.name} ${me.house}`;
				const nextWdObj = { val: this.nextWonderId };
				const tower = buildWonder(this.w, here.cell, this.burgLayer(here), kind, builderName, me.state || local?.id || 0, this.year, nextWdObj, this.rng);
				this.nextWonderId = nextWdObj.val;
				this.wonders.push(tower);
				me.renown += 15;
				if (local?.alive) local.stability = clamp(local.stability + 10, 0, 100);
				this.gainInnovation(25);
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
				this.skipMonths(3);
				const isCoastal = this.c.dist[here.cell] <= 1;
				let kind: LegendaryPlace['kind'] = 'university';
				if (isCoastal && r.chance(0.5)) kind = 'giant_harbor';
				else if (this.c.river[here.cell] && r.chance(0.4)) kind = 'bridge';
				else if (me.martial > 14 && r.chance(0.4)) kind = 'ancient_forge';
				else kind = 'university';

				const builderName = isRuler ? `${me.name} of ${pol.name}` : `${me.name} ${me.house}`;
				const nextWdObj = { val: this.nextWonderId };
				const wonder = buildWonder(this.w, here.cell, this.burgLayer(here), kind, builderName, me.state || local?.id || 0, this.year, nextWdObj, this.rng);
				this.nextWonderId = nextWdObj.val;
				this.wonders.push(wonder);
				me.renown += 25;
				if (local?.alive) local.stability = clamp(local.stability + 15, 0, 100);
				if (pol?.alive) pol.stability = clamp(pol.stability + 15, 0, 100);
				this.gainInnovation(35);
				return say(`A historic triumph! You complete the construction of ${wonder.name} (${wonder.icon}) in ${here.name}! ${wonder.effect}`);
			}
			case 'invest': {
				if (me.gold < 25) return 'Commercial investment requires 25 gold in capital.';
				me.gold -= 25;
				const profit = Math.round(25 + me.stewardship * 2.2 + (here.pop > 1.5 ? 8 : 2) + r.int(3, 16));
				me.gold += profit;
				me.renown += 2;
				if (me.role === 'wanderer' && r.chance(0.6)) me.role = 'trader';
				this.skipMonths(2);
				return say(`You invest 25 gold in merchant caravans across ${here.name}, securing a return of ${profit} gold!`);
			}
			case 'enterprise': {
				if (me.gold < 75 || me.renown < 15) return 'Establishing a chartered enterprise requires 75 gold and 15 renown.';
				me.gold -= 75;
				me.role = 'entrepreneur';
				me.renown += 12;
				this.gainInnovation(20);
				if (local?.alive) {
					local.treasury += 25;
					local.stability = clamp(local.stability + 6, 0, 100);
				}
				this.skipMonths(3);
				return say(`You charter a grand commercial enterprise in ${here.name}, establishing merchant houses and bank vaults!`);
			}
			case 'infiltrate': {
				if (me.intrigue < 8) return 'Infiltration requires at least 8 intrigue.';
				if (me.gold < 25) return 'Infiltration requires 25 gold for bribes, disguise, and contacts.';
				me.gold -= 25;
				this.skipMonths(1);
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
				const standing = this.wonders.find((w) => w.cell === here.cell && !w.destroyed);
				if (!standing) return 'There is no standing wonder or monument in this city to raze.';
				const res = destroyWonder(standing, me.name, this.year, 'razed and pillaged by personal decree');
				this.log('wonder', res.event.text, here.cell, pol?.id);
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
					const np = this.foundState(here.id, 'avatar', me);
					np.army += me.renown / 10;
					return say(`You proclaim the ${np.fullName} with yourself at its head!`);
				}
				if (here.id === local.capital) return 'You cannot rise in the capital itself.';
				if (me.renown < 40) return 'You need 40 renown to raise a revolt.';
				if (local.stability > 55 && me.intrigue < 12) return `${local.name} is too stable (stability ${local.stability.toFixed(0)}).`;
				const np = this.revolt(local, here.cell, me);
				if (!np) return 'The town will not rise.';
				np.army += me.renown / 10;
				return say(`You raise your banner in ${here.name}: the ${np.fullName} is born!`);
			}
			case 'coup': {
				if (me.role !== 'general' || !pol?.alive) return 'Only a general can seize the throne.';
				const ruler = this.ruler(pol);
				const chance = clamp(0.2 + (me.martial + me.intrigue - ruler.intrigue - 8) * 0.04 + (50 - pol.stability) / 100, 0.05, 0.85);
				if (r.chance(chance)) {
					this.kill(ruler, 'your coup');
					this.crown(pol, me);
					pol.stability -= 15;
					return say(`The palace falls to your soldiers. You are now ruler of ${pol.name}!`);
				}
				me.health -= 40;
				me.state = 0;
				me.role = 'wanderer';
				me.renown = Math.max(0, me.renown - 20);
				if (me.health <= 0) this.kill(me, 'execution');
				return say(`Your coup fails! You flee ${pol.name} with a price on your head.`);
			}
			case 'revolution': {
				if (!local?.alive) return 'There is no organized realm here to overthrow.';
				if (here.id !== local.capital) return 'A revolution against the national government must be sparked in the capital.';
				if (me.renown < 35 && me.intrigue < 10) return 'You need at least 35 renown or 10 intrigue to rally the masses.';
				if (local.stability > 60 && me.intrigue < 14) return `${local.name} is too stable for an uprising (stability ${local.stability.toFixed(0)}).`;
				const targetIdeology: IdeologyKind = local.ideology === 'republic' ? 'communal' : 'republic';
				const res = transitionRegime(local, targetIdeology, 'revolution', this.year, this.rng, this.people, { customLeader: me });
				for (const ev of res.events) this.log(ev.kind, ev.text, ev.cell, ev.state);
				this.dirty.political = true;
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
				this.log('uprising', `${me.name} incites a furious riot in ${here.name}! Mobs storm municipal storehouses and clash with royal bailiffs of ${local.name}.`, here.cell, local.id);
				return say(`You incite a roaring riot in ${here.name}! The crowds ransack storehouses, yielding 25 gold in looted supplies while shaking the realm's order.`);
			}
			case 'found_cult': {
				me.intrigue = Math.min(20, me.intrigue + 2);
				me.renown += 12;
				const cultTitle = `Order of ${me.name}`;
				this.uprisings.push({
					id: this.uprisings.length + 1,
					kind: 'cult',
					subtype: 'eldritch_cult',
					title: cultTitle,
					burgId: here.id,
					burgName: here.name,
					stateId: local?.id ?? 0,
					stateName: local?.name ?? 'Wilds',
					year: this.year,
					cell: here.cell,
					leaderName: me.name,
					leaderId: me.id,
					description: `Clandestine mystery cabal founded by ${me.name}.`,
					active: true
				});
				this.log('uprising', `${me.name} initiates a clandestine esoteric cabal in ${here.name}, drawing initiates into dark subterranean vaults.`, here.cell, local?.id);
				return say(`You initiate a secret esoteric coven in the shadows of ${here.name}!`);
			}
			case 'proclaim_prophecy': {
				me.traits = [...new Set([...me.traits, 'Prophet', 'Visionary'])];
				me.renown += 20;
				if (local?.alive) local.stability = Math.min(100, local.stability + 10);
				here.pop = +(here.pop + 0.3).toFixed(2);
				this.uprisings.push({
					id: this.uprisings.length + 1,
					kind: 'prophet',
					subtype: 'ascetic_reformer',
					title: `Sermons of ${me.name}`,
					burgId: here.id,
					burgName: here.name,
					stateId: local?.id ?? 0,
					stateName: local?.name ?? 'Wilds',
					year: this.year,
					cell: here.cell,
					leaderName: me.name,
					leaderId: me.id,
					description: `Spiritual prophecy and moral revival proclaimed by ${me.name}.`,
					active: true
				});
				this.log('uprising', `${me.name} climbs the temple steps in ${here.name}, proclaiming holy prophecy! Multitudes flock to receive spiritual blessings.`, here.cell, local?.id);
				return say(`You climb the sacred steps of ${here.name} and proclaim divine prophecy! Pilgrims flock from afar.`);
			}
			case 'rally_hero': {
				me.traits = [...new Set([...me.traits, 'Hero', 'Champion'])];
				me.renown += 25;
				if (local?.alive) {
					local.stability = Math.min(100, local.stability + 15);
					local.army = +(local.army * 1.08).toFixed(1);
				}
				this.uprisings.push({
					id: this.uprisings.length + 1,
					kind: 'hero',
					subtype: 'border_paladin',
					title: `Vow of ${me.name}`,
					burgId: here.id,
					burgName: here.name,
					stateId: local?.id ?? 0,
					stateName: local?.name ?? 'Wilds',
					year: this.year,
					cell: here.cell,
					leaderName: me.name,
					leaderId: me.id,
					description: `Sworn folk champion and defender ${me.name}.`,
					active: true
				});
				this.log('uprising', `${me.name} steps forward in ${here.name} as a champion of the common folk, vowing to defend the innocent from all tyrants.`, here.cell, local?.id);
				return say(`You draw your blade and swear a sacred oath as folk champion in ${here.name}!`);
			}
			// ── ruler actions ──
			case 'war': {
				if (me.role !== 'ruler' || arg === undefined) return '';
				const t = this.polities[arg];
				if (!t?.alive || t.id === pol.id) return 'Invalid target.';
				if (this.atWar(pol.id, t.id)) return 'Already at war.';
				this.declareWar(pol.id, t.id, 'by your command');
				return '';
			}
			case 'peace': {
				if (me.role !== 'ruler') return '';
				const ws = this.warsOf(pol.id);
				if (!ws.length) return 'You are at peace.';
				const w = ws[0];
				const mine = w.attackers.includes(pol.id) ? 1 : -1;
				const myScore = w.score * mine;
				const accept = myScore > 0 || r.chance(0.35 + (me.diplomacy - 8) * 0.04);
				if (!accept) return say('Your envoys return with a curt refusal.');
				this.finishWar(w, myScore > 8 ? (mine > 0 ? 'attackers' : 'defenders') : 'white');
				return '';
			}
			case 'ally': {
				if (me.role !== 'ruler' || arg === undefined) return '';
				const t = this.polities[arg];
				if (this.rel(pol.id, t.id) < 25 && !r.chance(me.diplomacy / 40)) return say(`${t.name} declines your alliance (relations ${this.rel(pol.id, t.id).toFixed(0)}).`);
				pol.allies.push(t.id);
				t.allies.push(pol.id);
				return say(`${pol.name} and ${t.name} are now allies.`);
			}
			case 'gift': {
				if (me.role !== 'ruler' || arg === undefined) return '';
				if (pol.treasury < 20) return 'The treasury cannot spare 20.';
				pol.treasury -= 20;
				this.addRel(pol.id, arg, 25);
				return say(`Gifts flow to ${this.polities[arg].name}.`);
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
				pol.secularYear = this.year;
				pol.religion = 0;
				pol.patronDeity = undefined;
				pol.patronFavor = 0;
				pol.treasury += 70;
				me.gold += 30;
				me.renown += 15;
				this.log('faith', `STATE ATHEISM DECREED: Ruler ${me.name} of ${pol.name} formally abolishes official religion! Monasteries and temples are nationalized (+70 gold to treasury), and ecclesiastical privileges are eliminated.`, here.cell, pol.id);
				return say(`You issue a revolutionary decree of State Atheism in ${pol.name}! Temple treasuries are confiscated (+70 treasury, +30 personal gold), and ecclesiastical dogma is suppressed.`);
			}
			case 'proclaim_republic': {
				if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can transform state governance.';
				if (pol.ideology === 'republic') return `${pol.name} is already a republic.`;
				const res = transitionRegime(pol, 'republic', 'avatar', this.year, this.rng, this.people);
				for (const ev of res.events) this.log(ev.kind, ev.text, ev.cell, ev.state);
				this.dirty.political = true;
				me.renown += 20;
				return say(`You promulgate a new constitution! ${pol.name} is now the ${pol.fullName} with an elected assembly.`);
			}
			case 'proclaim_union': {
				if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can transform state governance.';
				if (pol.ideology === 'communal') return `${pol.name} is already a free union.`;
				const res = transitionRegime(pol, 'communal', 'avatar', this.year, this.rng, this.people);
				for (const ev of res.events) this.log(ev.kind, ev.text, ev.cell, ev.state);
				this.dirty.political = true;
				me.renown += 20;
				return say(`You proclaim the ${pol.fullName}! Common lands are granted to the folk moots and communes.`);
			}
			case 'proclaim_monarchy': {
				if (me.role !== 'ruler' || !pol?.alive) return 'Only a reigning ruler can transform state governance.';
				if (pol.ideology === 'monarchy') return `${pol.name} is already a monarchy.`;
				const res = transitionRegime(pol, 'monarchy', 'avatar', this.year, this.rng, this.people);
				for (const ev of res.events) this.log(ev.kind, ev.text, ev.cell, ev.state);
				this.dirty.political = true;
				me.renown += 20;
				return say(`You crown yourself Sovereign of the ${pol.fullName}! Dynastic rule is formally established.`);
			}
			case 'abdicate': {
				if (me.role !== 'ruler') return '';
				const heir = this.people[pol.heir];
				if (!heir?.alive) return 'You have no heir.';
				this.crown(pol, heir);
				me.role = 'wanderer';
				this.avatar = heir.id;
				return say(`You step down. ${heir.name} takes the crown, and you play on as them.`);
			}
		}
		return '';
	}

	/** genre the world is currently narrated in (fixed unless opts.evolve) */
	voice: Genre = 'fantasy';
	updateVoice() {
		const base = this.w.opts.genre;
		if (!this.w.opts.evolve) { this.voice = base; return; }
		const prev = this.voice;
		const byEra: Genre[] = ['mythic', 'fantasy', 'steampunk', 'dieselpunk'];
		if (this.era < byEra.length) this.voice = byEra[this.era];
		else {
			// the final age forks on how the world got there: fractured, warlike worlds go cyber, stable ones solar
			const alive = this.polities.filter((p) => p.alive && p.id);
			const stab = alive.reduce((s, p) => s + p.stability, 0) / Math.max(1, alive.length);
			const wars = this.wars.filter((w) => !w.end).length;
			this.voice = stab < 45 || wars > alive.length / 6 ? 'cyberpunk' : 'solarpunk';
		}
		if (prev !== this.voice && this.year > 1) this.log('tech', `The voice of the age changes: ${this.w.name} now lives in an era of ${GENRES[this.voice].name}.`);
	}

	/** draw from the base deck plus the genre's own deck (weighted ×2 so it feels present) */
	encounter(): Encounter {
		const extra = packEncounters(this.voice);
		const deck = [...ENCOUNTERS, ...extra, ...extra];
		const e = this.rng.pick(deck);
		const g = this.voice;
		return { ...e, title: reskin(g, e.title), text: reskin(g, e.text), options: e.options.map((o) => ({ ...o, label: reskin(g, o.label), win: { ...o.win, text: reskin(g, o.win.text) }, lose: o.lose && { ...o.lose, text: reskin(g, o.lose.text) } })) };
	}

	/** set by Cosmos so time skips advance every planet together */
	skipper: ((n: number) => void) | null = null;
	skipMonths(n: number) {
		if (this.skipper) return this.skipper(n);
		for (let k = 0; k < n && !this.pending; k++) this.tick();
	}

	/** plain snapshot for saving (the World is saved separately) */
	dump() {
		return {
			year: this.year, month: this.month, mana: this.mana, manaMax: this.manaMax, sandbox: this.sandbox,
			people: this.people, polities: this.polities, wars: this.wars, events: this.events,
			allEvents: this.allEvents, letters: this.letters, tradeTip: this.tradeTip, epoch: this.epoch, historySnapshots: this.historySnapshots, uprisings: this.uprisings,
			plague: this.plague, basePop: this.basePop, avatar: this.avatar, travel: this.travel, pending: this.pending,
			nextWar: this.nextWar, rng: this.rng.state(), plagueActive: this.plagueActive,
			era: this.era, innovation: this.innovation, techs: Array.from(this.techs),
			wonders: this.wonders, monsters: this.monsters,
			missions: this.missions, quests: this.quests
		};
	}

	static restore(world: World, d: ReturnType<Simulation['dump']>): Simulation {
		const s = new Simulation(world, true);
		Object.assign(s, { year: d.year, month: d.month, mana: d.mana, manaMax: d.manaMax, sandbox: d.sandbox, people: d.people, polities: d.polities, wars: d.wars, events: d.events, plague: d.plague, basePop: d.basePop, avatar: d.avatar, travel: d.travel, pending: d.pending, plagueActive: d.plagueActive });
		s.allEvents = d.allEvents ?? d.events?.slice() ?? [];
		s.letters = d.letters ?? [];
		s.tradeTip = d.tradeTip ?? null;
		s.epoch = d.epoch ?? null;
		s.historySnapshots = (d.historySnapshots ?? []).map((snap: any) => ({
			...snap,
			surfaceStates: snap.surfaceStates instanceof Uint16Array ? snap.surfaceStates : new Uint16Array(snap.surfaceStates)
		}));
		s.uprisings = d.uprisings ?? [];
		s.nextWar = d.nextWar;
		s.rng = makeRng(d.rng);
		s.era = d.era ?? 0;
		s.innovation = d.innovation ?? 0;
		s.techs = new Set(d.techs ?? []);
		s.wonders = d.wonders ?? [];
		s.monsters = d.monsters ?? [];
		s.missions = d.missions ?? [];
		s.quests = d.quests ?? [];
		s.computeBorders();
		s.updateVoice();
		return s;
	}

	/** people the player could inhabit */
	candidates() {
		return this.people.filter((p) => p.alive && p.id && this.ageOf(p) >= 14);
	}
}
