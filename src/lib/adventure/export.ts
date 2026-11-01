/**
 * Snapshot of a live Simulation as a world file for Realmforge Wanderer (the separate Go/WASM roguelike in
 * ../realmforge-wanderer; schema = engine/world.go WorldData). Downloaded from the Export dialog.
 * The Voronoi map is rasterised into parasangs (W×H grid); everything else is plain records.
 * Name pools come from fresh side languages so the sim's own name streams never advance.
 */
import type { Simulation } from '../sim/engine';
import type { Cosmos } from '../sim/cosmos';
import { GENRES } from '../gen/genre';
import { findCell } from '../gen/grid';
import { SPECIES } from '../gen/species';
import { SPHERE_BY_ID } from '../gen/spheres';
import { makeLang, fullPersonName, makeName } from '../gen/names';
import { SPHERE_CULTURE, FALLBACK_CULTURE, FEAST_MONTH, FEAST_TEXT } from '../sim/culture/data';
import { cultureProfile, monthName, realmFeasts } from '../sim/culture/profile';
import { SPHERE_LORE } from '../sim/spherelore';
import { PLANETS } from '../gen/physical';
import { ERAS } from '../sim/tech';
import type { ChronEvent } from '../sim/types';
import { burgMix, SECTORS } from '../sim/sectors';
import { getLeagueState } from '../sim/leagues';
import type { MegastructureState } from '../sim/megastructures';

const NOTABLE = new Set(['ruler', 'heir', 'general', 'hero', 'prophet', 'magician', 'thinker', 'priest', 'villain', 'artist', 'inventor', 'merchant']);

export function exportAdventureObject(sim: Simulation) {
	const w = sim.w;
	const c = w.cells;
	const PW = 80;
	const PH = Math.max(20, Math.round((PW * w.opts.height) / w.opts.width));
	const n = PW * PH;
	const sx = w.opts.width / PW;
	const sy = w.opts.height / PH;
	const pOf = (x: number, y: number) => Math.min(PH - 1, Math.max(0, Math.floor(y / sy))) * PW + Math.min(PW - 1, Math.max(0, Math.floor(x / sx)));
	const pOfCell = (cell: number) => pOf(c.x[cell], c.y[cell]);

	const cellOf = new Int32Array(n);
	const biome: number[] = [], height: number[] = [], temp: number[] = [], river: number[] = [], road: number[] = [];
	const state: number[] = [], culture: number[] = [], religion: number[] = [];
	let last = 0;
	for (let py = 0; py < PH; py++) {
		for (let px = 0; px < PW; px++) {
			const i = py * PW + px;
			const cell = findCell(c, (px + 0.5) * sx, (py + 0.5) * sy, last);
			last = cell;
			cellOf[i] = cell;
			biome.push(c.biome[cell]);
			height.push(c.h[cell]);
			temp.push(c.temp[cell]);
			river.push(c.river[cell] ? Math.max(1, Math.min(8, Math.round(Math.log2(1 + c.flux[cell] / 30)))) : 0);
			road.push(c.road[cell]);
			state.push(c.state[cell]);
			culture.push(c.culture[cell]);
			religion.push(c.religion[cell]);
		}
	}

	// settlements: one per parasang per layer (alive and larger wins)
	const burgAt: number[] = new Array(n).fill(0);
	const layerBurgs = w.layers.map(() => new Map<number, number>());
	const ls = getLeagueState(sim);
	const leagues = ls.tradeLeagues;
	const burgs = [];
	for (const b of w.burgs) {
		if (!b.id) continue;
		const p = pOf(b.x, b.y);
		const li = sim.bl[b.id] ?? 0;
		const prev = li === 0 ? burgAt[p] : layerBurgs[li].get(p) ?? 0;
		const pb = prev ? w.burgs[prev] : null;
		const better = !pb || (b.alive && !pb.alive) || (b.alive === pb.alive && b.pop > pb.pop);
		if (better) {
			if (li === 0) burgAt[p] = b.id;
			else layerBurgs[li].set(p, b.id);
		}
		const gov = b.governor ? sim.people[b.governor] : undefined;
		burgs.push({
			id: b.id, name: b.name, kind: b.kind, layer: b.layer, depth: b.depth, state: b.state, culture: b.culture, pop: b.pop,
			capital: b.capital, port: b.port, alive: b.alive, p, districts: b.districts ?? {}, governor: gov?.alive ? gov.name : '',
			bandit: !!(b.banditCove || b.pirateCove), original: b.originalName ?? '',
			// economic sector shares in SECTORS order (empty when the world runs without sectors)
			sectors: (burgMix(sim, b.id) ?? []).map((v) => Math.round(v * 100) / 100),
			garrison: Math.round(b.garrison ?? 0), charter: !!b.charter, league: b.tradeLeague ? (leagues.get(b.tradeLeague)?.name ?? '') : ''
		});
	}

	// a town's parasang takes its terrain from the town's own cell, not whatever the centre point hit
	for (let p = 0; p < n; p++) {
		const b = burgAt[p] ? w.burgs[burgAt[p]] : null;
		if (!b) continue;
		const cell = b.cell;
		cellOf[p] = cell;
		biome[p] = c.biome[cell];
		height[p] = c.h[cell];
		temp[p] = c.temp[cell];
		road[p] = Math.max(1, c.road[cell]);
		state[p] = c.state[cell];
		culture[p] = c.culture[cell];
		religion[p] = c.religion[cell];
	}

	const layers = w.layers.map((L, li) => {
		let open = '';
		for (let i = 0; i < n; i++) open += L.open[cellOf[i]] ? '1' : '0';
		return { kind: L.kind, depth: L.depth, name: L.name, open, burgs: Object.fromEntries(layerBurgs[li]) };
	});

	const atWar = (id: number) => {
		const out: number[] = [];
		for (const wr of sim.wars) {
			if (wr.end !== undefined) continue;
			if (wr.attackers.includes(id)) out.push(...wr.defenders);
			else if (wr.defenders.includes(id)) out.push(...wr.attackers);
		}
		return out;
	};
	const rulerTitle = (cultureId: number) => SPHERE_BY_ID[w.cultures[cultureId]?.sphere ?? '']?.rulers?.[0] ?? 'Ruler';
	const states = sim.polities.map((s) => {
		const r = s.ruler ? sim.people[s.ruler] : undefined;
		return {
			id: s.id, name: s.name, fullName: s.fullName, form: s.form, color: s.color, culture: s.culture, religion: s.religion, alive: s.alive,
			ruler: r?.alive ? `${rulerTitle(s.culture)} ${r.name}` : '', rulerId: r?.id ?? 0, species: s.species ?? '', ideology: s.ideology ?? '',
			relations: Object.fromEntries(Object.entries(s.relations).map(([k, v]) => [k, Math.round(v)])), wars: atWar(s.id), capital: s.capital, founded: Math.round(s.founded), fell: Math.round(s.fell ?? 0),
			// the realm's own feast days (its culture's feasts, month shifted per realm; pure side rng, see realmFeasts)
			feasts: s.alive && s.id ? realmFeasts(w, s).map((f) => ({ name: f.name, kind: f.kind, month: f.month, text: FEAST_TEXT[f.kind] })) : []
		};
	});

	const cultures = w.cultures.map((cu) => {
		const L = makeLang(`${w.opts.seed}:adv:${cu.id}`, cu.sphere || undefined);
		const given: string[] = [];
		for (let i = 0; i < 48; i++) given.push(fullPersonName(L, cu.sphere || null).plain);
		const places: string[] = [];
		for (let i = 0; i < 12; i++) places.push(makeName(L, 'city'));
		const sc = SPHERE_CULTURE[cu.sphere] ?? FALLBACK_CULTURE;
		// calendar: twelve month names from month 0 = the dark of the year (midwinter), the culture's feasts
		// (FEAST_TEXT keeps {realm}/{town} placeholders) and the sphere's festival lore lines
		const prof = cultureProfile(w, cu.id);
		const months: string[] = [];
		for (let m = 0; m < 12; m++) months.push(monthName(w, cu.id, m));
		const feasts = prof.feasts.map(([name, kind]) => ({ name, kind, month: FEAST_MONTH[kind], text: FEAST_TEXT[kind] }));
		return {
			id: cu.id, name: cu.name, sphere: cu.sphere, species: cu.species ?? 'human', layer: cu.layer, given, houses: [], places, food: sc.food, dress: sc.dress,
			months, feasts, festivals: SPHERE_LORE[cu.sphere]?.festivals ?? [], music: sc.music, architecture: sc.architecture, values: sc.values
		};
	});

	const religions = w.religions.map((r) => ({ id: r.id, name: r.name, deity: r.deity, theology: r.theology ?? '', doctrine: r.doctrine ?? '', type: r.type }));

	const titleOf = (role: string, st: number, cu: number) => {
		const pol = sim.polities[st];
		if (role === 'ruler' && pol) return `${rulerTitle(cu)} of ${pol.name}`;
		if (role === 'heir' && pol) return `heir of ${pol.name}`;
		if (role === 'general' && pol) return `general of ${pol.name}`;
		return role;
	};
	const living = sim.people.filter((p) => p.alive && p.id && NOTABLE.has(p.role)).sort((a, b) => b.renown - a.renown).slice(0, 900);
	const deadRulers = sim.people.filter((p) => !p.alive && p.id && (p.role === 'ruler' || p.role === 'hero')).slice(-500);
	const people = [...living, ...deadRulers].map((p) => {
		const b = w.burgs[p.burg];
		return {
			id: p.id, name: p.name, role: p.role, burg: p.burg, state: p.state, culture: p.culture, religion: p.religion, species: p.species ?? '',
			martial: Math.round(p.martial), diplomacy: Math.round(p.diplomacy), stewardship: Math.round(p.stewardship), intrigue: Math.round(p.intrigue), born: Math.round(p.born), died: Math.round(p.died ?? 0),
			cause: p.cause ?? '', alive: p.alive, traits: p.traits, renown: Math.round(p.renown), p: b ? pOf(b.x, b.y) : -1, title: titleOf(p.role, p.state, p.culture)
		};
	});

	const evs: ChronEvent[] = sim.allEvents.length > 4000 ? sim.allEvents.slice(-4000) : sim.allEvents;
	const events = evs.map((e) => ({ y: e.y, kind: e.kind, text: e.text, p: e.cell !== undefined && e.cell >= 0 ? pOfCell(e.cell) : -1, st: e.state ?? 0 }));

	const layerOf = (li: number) => w.layers[li] ?? w.layers[0];
	const monsters = sim.monsters
		.map((m) => ({
			id: m.id, name: m.name, species: m.species, tier: m.tier, cat: m.category, power: Math.round(m.power), hp: Math.round(m.maxHealth), armor: m.armor ?? 0.1,
			lore: m.lore, trophy: m.trophy ?? '', p: pOfCell(m.lairCell >= 0 ? m.lairCell : m.cell), layer: layerOf(m.layer).kind, depth: layerOf(m.layer).depth,
			lair: m.lairName, immortal: !!m.immortal, slain: !m.alive, slainYear: m.slainYear ? Math.round(m.slainYear) : 0, slainBy: m.slayer ?? ''
		}));

	const artifacts = sim.artifacts.map((a) => {
		let p = -1;
		if (a.holderType === 'burg' && w.burgs[a.holderId]) p = pOf(w.burgs[a.holderId].x, w.burgs[a.holderId].y);
		if (a.holderType === 'person') {
			const b = w.burgs[sim.people[a.holderId]?.burg ?? 0];
			if (b) p = pOf(b.x, b.y);
		}
		if (a.holderType === 'polity') {
			const b = w.burgs[sim.polities[a.holderId]?.capital ?? 0];
			if (b) p = pOf(b.x, b.y);
		}
		return { id: a.id, name: a.name, kind: a.kind, fame: Math.round(a.fame), year: Math.round(a.year), origin: a.origin, stat: a.bonusStat, val: Math.round(a.bonusVal), holderType: a.holderType, holderId: a.holderId, holder: a.holderName, lore: a.lore, p };
	});
	// relics of a realm sit in its capital's treasury: hand them to the capital burg
	for (const a of artifacts) {
		if (a.holderType === 'polity') {
			const cap = sim.polities[a.holderId]?.capital;
			if (cap) {
				a.holderType = 'burg';
				a.holderId = cap;
			}
		}
	}

	const wonders = sim.wonders.map((wd) => ({
		id: wd.id, name: wd.name, kind: wd.kind, p: pOfCell(wd.cell), layer: layerOf(wd.layer).kind, destroyed: !!wd.destroyed, lore: wd.lore, builder: wd.builder ?? '', year: Math.round(wd.builtYear), effect: wd.effect
	}));

	// nearly every town grows a camp: keep the strongest ~20% (3..40) so the wild is not saturated
	const camps = [...ls.banditCamps.values()].sort((a, b) => b.strength - a.strength || a.burgId - b.burgId);
	const outlaws = camps.slice(0, Math.min(40, Math.max(3, Math.ceil(camps.length * 0.2)))).map((cmp) => {
		const b = w.burgs[cmp.burgId];
		return { burg: cmp.burgId, kind: cmp.kind, name: cmp.name, strength: Math.round(cmp.strength), gold: Math.round(cmp.lootedGold), p: b ? pOf(b.x, b.y) : pOfCell(cmp.cell) };
	});
	// megastructures exist only once the sim has placed them (cell 0 = never placed)
	const ms = (sim as unknown as { _megastructureState?: MegastructureState })._megastructureState;
	const megastructures = ms
		? [ms.tower, ms.abyss].filter((m) => m.cell > 0).map((m) => ({ kind: m.kind, name: m.name, p: pOfCell(m.cell), cleared: m.highestClearedFloor }))
		: [];

	const speciesCount = new Map<string, number>();
	for (const cu of w.cultures) speciesCount.set(cu.species ?? 'human', (speciesCount.get(cu.species ?? 'human') ?? 0) + 1);
	const species = SPECIES.map((s) => ({
		id: s.id, name: s.name, plural: s.plural, adjective: s.adjective, desc: s.desc, martial: s.mods.martial, diplomacy: s.mods.diplomacy,
		stewardship: s.mods.stewardship, intrigue: s.mods.intrigue, health: s.mods.health, traits: s.traits, layers: s.layers, common: speciesCount.get(s.id) ?? 0
	}));

	const G = GENRES[sim.voice] ?? GENRES[w.opts.genre];
	const out = {
		seed: `${w.opts.seed}:${w.planet}`, name: w.name, genre: sim.voice, planet: PLANETS[w.opts.planet]?.name ?? '', planetKind: w.opts.planet,
		year: sim.year, era: ERAS[sim.era]?.name ?? '', w: PW, h: PH, biome, height, temp, river, road, state, culture, religion, burg: burgAt,
		cell: Array.from(cellOf), layers, burgs, states, cultures, religions, people, events, monsters, artifacts, wonders, species, outlaws, megastructures, sectorNames: SECTORS,
		terms: G.terms, layerNames: G.layerNames
	};
	return out;
}

export function exportAdventure(sim: Simulation): string {
	return JSON.stringify(exportAdventureObject(sim));
}

/** Every planet plus the rifts joining them, as one "wanderer-universe" file. Rift burg ids are sim burg ids, the same ids the planets' `burgs` carry. */
export function exportUniverse(cos: Cosmos): string {
	const planets = cos.sims.map((s) => exportAdventureObject(s));
	const have = planets.map((pl) => new Set(pl.burgs.map((b) => b.id)));
	const rifts = cos.u.rifts
		.filter((r) => have[r.a.planet]?.has(r.a.burg) && have[r.b.planet]?.has(r.b.burg))
		.map((r) => ({
			id: r.id,
			name: r.name || `The ${planets[r.a.planet].name} Rift`,
			a: { planet: r.a.planet, burg: r.a.burg },
			b: { planet: r.b.planet, burg: r.b.burg }
		}));
	return JSON.stringify({ kind: 'wanderer-universe', start: 0, planets, rifts });
}
