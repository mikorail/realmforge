import { clamp, makeRng, type Rng } from '../rng';
import { makeLang, type Lang } from '../gen/names';
import type { Climate } from '../gen/types';
import { GENRES, type Genre } from '../gen/genre';
import { langSeed } from '../gen/society';
import { setRaces } from '../gen/species';
import { SEA, type World } from '../gen/types';
import { AGES } from './content';
import { forgeArtifact, type Artifact } from './relics';
import { updateCaravans, type CaravanToken } from './trade';
import { lockedEra, type TechDiscovery } from './tech';
import { generateWonders } from './wonders';
import { generateMonsters, updateMonsters } from './monsters';
import { generateFactionsForPolity } from './politics';
import { assignPatronDeity } from './pantheon';
import { yearlyConsolidation } from './consolidation';
import { yearlySphereLore } from './spherelore';
import { monthlyFeasts, newCultureState, yearlyCulture } from './culture';
import { yearlyLayerLife } from './layerlife';
import { yearlyEpochs, type ClimateEpoch } from './epochs';
import { checkAmbition, yearlyLetters, type Letter } from './ambitions';
import type { ArmyToken, ChronEvent, CovertMission, Effects, Encounter, EventKind, HistorySnapshot, IdeologyKind, Monster, LegendaryPlace, Person, Polity, Quest, Role, Travel, UprisingRecord, War } from './types';
import * as history from './systems/history';
import * as economy from './systems/economy';
import * as diplomacy from './systems/diplomacy';
import * as warfare from './systems/warfare';
import * as lifecycle from './systems/lifecycle';
import * as faith from './systems/faith';
import * as realms from './systems/realms';
import * as environment from './systems/environment';
import * as yearly from './systems/yearly';
import * as godpowers from './systems/godpowers';
import * as avatar from './systems/avatar';
import { FrontIndex, OpenCells, SimIndex } from './indexes';
import { armyFx, newSentiment, yearlyPeoples, type SentimentState } from './sentiment';
import { yearlyCrossLayer } from './worldrules/crosslayer';
import { extraColonize, navalMult, yearlyPlanetRules } from './worldrules/planets';
import { newMotiveState, type MotiveState } from './motives';
import { newStory, onCrown, yearlyStory, type StoryState } from './story';
import type { Power } from './systems/godpowers';
import { initSocialOrders, restoreSocialOrders, yearlySocialOrders, type SocialOrderState } from './society/socialorders';
import { initSectors, restoreSectors, sectorNaval, yearlySectors, type SectorState } from './sectors';
import { newW3, restoreW3, yearlySociety, type W3State } from './society';

export { POWERS, type Power } from './systems/godpowers';

/**
 * The living world. Owns and mutates World.cells.state / burgs; everything is deterministic
 * from the world seed + sequence of player actions. State lives here; the systems/ modules hold
 * the behaviour as free functions taking the Simulation, and this class keeps tick/yearly
 * orchestration plus thin delegating methods for the public API.
 */
export class Simulation {
	w: World;
	rng: Rng;
	year = 1;
	month = 0;
	mana = 50;
	manaMax = 100;
	sandbox = false;
	divineTargetIdeology?: IdeologyKind;
	divineTargetPolityId?: number;
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
	/** terrain: surface/global change; layerTerrain: exotic layers (by layer index) whose own map changed */
	dirty: { political: boolean; terrain: boolean; layerTerrain: Set<number> } = { political: true, terrain: false, layerTerrain: new Set() };
	/** border length between polities, refreshed yearly */
	borders = new Map<string, number>();
	nextWar = 1;
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
	/** culture state: movements, orders, lingua franca, conquest assimilation (culture/) */
	cx = newCultureState();
	/** active climate epoch (epochs.ts) */
	epoch: ClimateEpoch | null = null;
	/** story layer state: world moments, contacts (story/) */
	story: StoryState = newStory();
	/** feelings between peoples and per-realm racial effects (sentiment.ts) */
	sx: SentimentState = newSentiment();
	/** ruler motives: grudges per house (motives.ts) */
	mv: MotiveState = newMotiveState();
	/** intermarriage, persecution, reforms, prestige, famine choices (society/) */
	w3: W3State = newW3();
	era = 0;
	innovation = 0;
	techs = new Set<string>();
	cosmos?: import('./cosmos').Cosmos;
	planetIndex = 0;
	nextArtifactId = 1;
	nextQuestId = 1;
	nextMissionId = 1;
	nextWonderId = 1;
	nextEventId = 1;
	plagueActive = false;
	/** genre the world is currently narrated in (fixed unless opts.evolve) */
	voice: Genre = 'fantasy';
	/** set by Cosmos so time skips advance every planet together */
	skipper: ((n: number) => void) | null = null;
	/** living people / per-state people and burgs (indexes.ts); call `idx.touch()` after changing a person's or burg's state */
	idx = new SimIndex();
	/** contested edges per realm pair, synced once per war month */
	fronts = new FrontIndex();
	/** open cells per layer for recount */
	openCells = new OpenCells();
	/** polity id → bordering polity ids, derived from `borders`; reset by computeBorders */
	neighborCache: Map<number, number[]> | null = null;
	/** economic sectors per town/realm (sectors.ts); undefined when opts.sectors === false */
	sectors?: SectorState;
	/** social order per realm (society/socialorders.ts); undefined when opts.socialOrders === false */
	so?: SocialOrderState;

	constructor(world: World, restoring = false) {
		this.w = world;
		setRaces(world.opts.races);
		this.rng = makeRng(world.opts.seed + ':sim');
		this.voice = world.opts.genre;
		// age lock: the world begins in its locked era; innovate() never leaves it, so discoveries stay within it
		const locked = lockedEra(world.opts.ageLock);
		if (locked !== null) this.era = locked;
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
		this.sectors = initSectors(this);
		this.so = initSocialOrders(this);
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
	log(kind: EventKind, text: string, cell?: number, state?: number, tag?: string, cause?: number) {
		return history.log(this, kind, text, cell, state, tag, cause);
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
		return lifecycle.makePerson(this, culture, state, burg, role, age, parent);
	}
	crown(pol: Polity, person: Person) {
		if (person.role !== 'villain') person.role = 'ruler';
		person.state = pol.id;
		person.burg = pol.capital;
		pol.ruler = person.id;
		onCrown(this, pol, person);
		if (pol.heir === person.id) pol.heir = 0;
		this.idx.touch();
	}
	ruler(p: Polity) {
		return this.people[p.ruler];
	}
	general(p: Polity) {
		for (const x of this.idx.inState(this.people, p.id)) if (x.alive && x.state === p.id && x.role === 'general') return x;
		return undefined;
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
		this.idx.touch();
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
		if (!this.neighborCache) {
			const m = new Map<number, number[]>();
			const add = (x: number, y: number) => {
				const l = m.get(x);
				if (l) l.push(y);
				else m.set(x, [y]);
			};
			for (const k of this.borders.keys()) {
				const [a, b] = k.split('-').map(Number);
				add(a, b);
				add(b, a);
			}
			this.neighborCache = m;
		}
		return this.neighborCache.get(id)?.slice() ?? [];
	}
	strength(ids: number[]) {
		let s = 0;
		for (const id of ids) {
			const p = this.polities[id];
			if (!p.alive) continue;
			const g = this.general(p);
			const lead = Math.max(this.ruler(p)?.martial ?? 0, g?.martial ?? 0);
			s += p.army * (1 + lead * 0.04) * (0.6 + p.stability / 250) * navalMult(this, id) * armyFx(this, id) * sectorNaval(this, id);
		}
		return s;
	}
	recount() {
		const c = this.c, P = this.polities, np = P.length;
		// typed accumulators, same summation order as counting into each polity (identical floats)
		const cells = new Int32Array(np), pop = new Float64Array(np), valid = new Uint8Array(np);
		for (let k = 0; k < np; k++) valid[k] = P[k].id ? 1 : 0;
		const layers = this.w.layers;
		for (let li = 0; li < layers.length; li++) {
			const st = layers[li].state, list = this.openCells.of(li, layers[li].open);
			for (let k = 0; k < list.length; k++) {
				const i = list[k], s = st[i];
				if (s >= np || !valid[s]) continue;
				cells[s]++;
				// surface folk live off the land; other planes count their settlements + cavern/isle hinterland
				pop[s] += li === 0 ? c.pop[i] : 0.35;
			}
		}
		for (let k = 0; k < np; k++) { P[k].cells = cells[k]; P[k].pop = pop[k]; }
		for (const b of this.w.burgs) if (b.id && b.alive && this.burgLayer(b) > 0 && b.state) this.polities[b.state].pop += b.pop * 2;
		for (const p of this.polities) p.peak = Math.max(p.peak, p.cells);
	}
	computeBorders() {
		return diplomacy.computeBorders(this);
	}

	// ───────────────────────────── tick ─────────────────────────────
	tick() {
		if (this.pending) return; // waiting for the player to resolve an encounter
		this.idx.touch(); // safety net for ownership edits made between ticks (UI, other planets)
		this.month++;
		if (this.month >= 12) {
			this.month = 0;
			this.year++;
			this.yearly();
			if (this.year % 5 === 0) this.takeHistorySnapshot();
		}
		this.mana = Math.min(this.manaMax, this.mana + 1.5);
		warfare.monthlyWars(this);
		environment.spreadPlague(this);
		if (this.month % 3 === 0) { realms.colonize(this); extraColonize(this); }
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
		monthlyFeasts(this);
		avatar.advanceTravel(this);
		checkAmbition(this);
	}

	takeHistorySnapshot() {
		return history.takeHistorySnapshot(this);
	}

	updateArmyTokens() {
		return warfare.updateArmyTokens(this);
	}

	private yearly() {
		this.recount();
		this.computeBorders();
		yearlyPeoples(this);
		economy.demographics(this);
		economy.economy(this);
		diplomacy.diplomacy(this);
		diplomacy.aiWars(this);
		diplomacy.endWars(this);
		lifecycle.lifecycle(this);
		faith.faiths(this);
		realms.rebellions(this);
		realms.tribes(this);
		realms.randomEvents(this);
		economy.innovate(this);
		economy.updateWonders(this);
		lifecycle.updateLuminaries(this);
		yearly.yearlyPolitics(this);
		yearly.yearlyIntrigue(this);
		yearly.yearlyEcology(this);
		yearly.yearlyQuests(this);
		economy.yearlyWonderConstruction(this);
		yearly.yearlyMonsterHunts(this);
		yearly.yearlyBeastWrath(this);
		yearly.yearlyRoadConstruction(this);
		yearly.yearlyPantheon(this);
		yearly.yearlyUprisings(this);
		yearly.yearlyBurgs(this);
		yearly.yearlyLeagues(this);
		yearly.yearlyMegastructures(this);
		yearly.yearlyApotheosis(this);
		yearly.yearlyCrises(this);
		yearly.yearlyCongress(this);
		yearlySphereLore(this);
		yearlyCulture(this);
		yearlySectors(this);
		yearlySociety(this);
		yearlySocialOrders(this);
		yearlyLayerLife(this);
		yearlyLetters(this);
		yearlyEpochs(this);
		yearlyConsolidation(this);
		yearlyCrossLayer(this);
		yearlyPlanetRules(this);
		yearlyStory(this);
		lifecycle.pruneMinorPeople(this);
		history.compactArchive(this);
		this.recount();
	}

	applyTechBonus(disc: TechDiscovery) {
		return economy.applyTechBonus(this, disc);
	}

	/** event-driven breakthroughs count for less than they claim; keeps era pacing sane */
	gainInnovation(x: number) {
		this.innovation += x * 0.16;
	}

	castRandom(power: Power, layer = 0): { text: string; cell: number } {
		return godpowers.castRandom(this, power, layer);
	}

	playerState(): number {
		const a = this.people[this.avatar];
		return a && a.alive && (a.role === 'ruler' || a.role === 'villain') ? a.state : -1;
	}

	declareWar(a: number, b: number, reason?: string) {
		return diplomacy.declareWar(this, a, b, reason);
	}

	takeCell(cell: number, taker: number, war?: War, layer = 0) {
		return warfare.takeCell(this, cell, taker, war, layer);
	}

	relocateCapital(p: Polity) {
		return warfare.relocateCapital(this, p);
	}

	fall(p: Polity) {
		return warfare.fall(this, p);
	}

	finishWar(w: War, winner: War['winner']) {
		return diplomacy.finishWar(this, w, winner);
	}

	kill(p: Person, cause: string) {
		return lifecycle.kill(this, p, cause);
	}

	revolt(pol: Polity, nearCell?: number, leader?: Person): Polity | null {
		return realms.revolt(this, pol, nearCell, leader);
	}

	foundState(burgId: number, origin: string, leader?: Person): Polity {
		return realms.foundState(this, burgId, origin, leader);
	}

	// ───────────────────────────── plague ─────────────────────────────
	seedPlague(cell: number, v = 1) {
		return environment.seedPlague(this, cell, v);
	}

	// ───────────────────────────── god powers ─────────────────────────────
	canCast(p: Power) {
		return godpowers.canCast(this, p);
	}

	cast(power: Power, cell: number, layer = 0): string | null {
		return godpowers.cast(this, power, cell, layer);
	}

	terraform() {
		return environment.terraform(this);
	}

	reclimate(cl: Climate, silent = false) {
		return environment.reclimate(this, cl, silent);
	}

	// ───────────────────────────── avatar ─────────────────────────────
	get me(): Person | null {
		const p = this.people[this.avatar];
		return p?.alive ? p : null;
	}

	choose(id: number) {
		return avatar.choose(this, id);
	}

	route(from: number, to: number): number[] | null {
		return avatar.route(this, from, to);
	}

	linkDays(a: number, b: number) {
		return avatar.linkDays(this, a, b);
	}

	startTravel(to: number): string | null {
		return avatar.startTravel(this, to);
	}

	resolve(optIndex: number): { ok: boolean; text: string } {
		return avatar.resolve(this, optIndex);
	}

	apply(me: Person, fx: Effects) {
		return avatar.apply(this, me, fx);
	}

	act(action: string, arg?: number): string {
		return avatar.act(this, action, arg);
	}

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

	encounter(): Encounter {
		return avatar.encounter(this);
	}

	skipMonths(n: number) {
		if (this.skipper) return this.skipper(n);
		for (let k = 0; k < n && !this.pending; k++) this.tick();
	}

	/** plain snapshot for saving (the World is saved separately) */
	dump() {
		return {
			year: this.year, month: this.month, mana: this.mana, manaMax: this.manaMax, sandbox: this.sandbox,
			people: this.people, polities: this.polities, wars: this.wars, events: this.events,
			allEvents: this.allEvents, story: this.story, letters: this.letters, tradeTip: this.tradeTip, epoch: this.epoch, historySnapshots: this.historySnapshots, uprisings: this.uprisings,
			plague: this.plague, basePop: this.basePop, avatar: this.avatar, travel: this.travel, pending: this.pending,
			nextWar: this.nextWar, rng: this.rng.state(), plagueActive: this.plagueActive,
			era: this.era, innovation: this.innovation, techs: Array.from(this.techs),
			wonders: this.wonders, monsters: this.monsters,
			missions: this.missions, quests: this.quests, cx: this.cx, sx: this.sx, mv: this.mv,
			divineTargetIdeology: this.divineTargetIdeology,
			sectors: this.sectors,
			w3: this.w3,
			so: this.so
		};
	}

	static restore(world: World, d: ReturnType<Simulation['dump']>): Simulation {
		const s = new Simulation(world, true);
		Object.assign(s, { year: d.year, month: d.month, mana: d.mana, manaMax: d.manaMax, sandbox: d.sandbox, people: d.people, polities: d.polities, wars: d.wars, events: d.events, plague: d.plague, basePop: d.basePop, avatar: d.avatar, travel: d.travel, pending: d.pending, plagueActive: d.plagueActive });
		s.divineTargetIdeology = d.divineTargetIdeology;
		s.allEvents = d.allEvents ?? d.events?.slice() ?? [];
		s.story = d.story ?? newStory();
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
		s.era = lockedEra(world.opts.ageLock) ?? d.era ?? 0;
		s.innovation = d.innovation ?? 0;
		s.techs = new Set(d.techs ?? []);
		s.wonders = d.wonders ?? [];
		s.monsters = d.monsters ?? [];
		s.missions = d.missions ?? [];
		s.quests = d.quests ?? [];
		s.cx = { ...newCultureState(), ...(d.cx ?? {}) };
		s.sx = { ...newSentiment(), ...((d as { sx?: Partial<SentimentState> }).sx ?? {}) };
		s.mv = { ...newMotiveState(), ...((d as { mv?: MotiveState }).mv ?? {}) };
		s.sectors = restoreSectors(s, d.sectors);
		s.w3 = restoreW3((d as { w3?: Partial<W3State> }).w3);
		s.so = restoreSocialOrders(s, d.so);
		s.computeBorders();
		s.updateVoice();
		return s;
	}

	/** people the player could inhabit */
	candidates() {
		return this.idx.living(this.people).filter((p) => this.ageOf(p) >= 14);
	}
}
