/**
 * Names for everything on the Wanderer's map: rivers (their sim names), every road / sea lane / tunnel / sky
 * route, geographic features (mountain ranges with their peak, passes, hills, lakes, bays, gulfs, seas, oceans,
 * forests, deserts, marshes, ice, ash and plains) and per-burg size tier, harbour and air-dock names.
 *
 * Feature regions are clustered on the exported parasang grid (what the Wanderer actually shows), split by the
 * owning culture, and named in that culture's naming language. Every language is rebuilt from the culture's own
 * seed (same phonemes and dictionary as its towns) but draws from a side stream `seed:nm:<culture>`, and every
 * format choice hashes `seed:nm:...` too: no sim or generation rng moves, no existing name changes.
 */
import type { Simulation } from '../sim/engine';
import type { Lang } from '../gen/naming/core';
import { cap, spell } from '../gen/naming/core';
import { makeLang, makeName, isGoodWord, tidy } from '../gen/names';
import { langSeed } from '../gen/society';
import { makeRng, hashSeed, type Rng } from '../rng';
import { cellCommodity, type Commodity } from '../sim/trade';
import { GENRES } from '../gen/genre';

export interface NamesGrid {
	PW: number;
	PH: number;
	cellOf: Int32Array;
	height: number[];
	biome: number[];
	culture: number[];
	road: number[];
	burgAt: number[];
}

export interface NamesExport {
	rivers: { id: number; name: string; parasangs: number[] }[];
	routes: { id: number; kind: string; name: string; a: number; b: number; parasangs: number[] }[];
	features: { kind: string; name: string; parasangs: number[]; peak?: number }[];
	burgs: Record<number, { tier: string; harbor?: string; airdock?: string }>;
}

/** road head words per genre (first = the genre's own term) */
const ROAD_WORDS: Record<string, string[]> = {
	fantasy: ['Road', 'Way', 'Road'],
	mythic: ['Way', 'Road', 'Sacred Way'],
	steampunk: ['Turnpike', 'Railway', 'Road'],
	dieselpunk: ['Highway', 'Autobahn', 'Military Road'],
	atompunk: ['Freeway', 'Highway', 'Parkway'],
	cyberpunk: ['Maglev', 'Expressway', 'Skyway'],
	biopunk: ['Vine-road', 'Rootway', 'Way'],
	solarpunk: ['Greenway', 'Cycleway', 'Way'],
	wasteland: ['Trade Track', 'Road', 'Run'],
	twilight: ['Pilgrim Road', 'Way', 'Old Road']
};
const SEA_WORDS = ['Lane', 'Passage', 'Crossing', 'Run'];
const TUNNEL_WORDS: Record<string, string[]> = { fantasy: ['Delve', 'Deepway', 'Tunnel'], steampunk: ['Shaft', 'Tube'], cyberpunk: ['Service Duct', 'Tube'], biopunk: ['Root Tunnel'], mythic: ['Catabasis', 'Descent'] };
const SKY_WORDS: Record<string, string[]> = { fantasy: ['Sky-lane', 'Windway'], steampunk: ['Air Route', 'Aetherway'], dieselpunk: ['Air Corridor'], cyberpunk: ['AV Lane'], mythic: ['Rainbow Bridge'], solarpunk: ['Kite Route'] };
const TRADE: Record<Commodity, string> = { grain: 'Grain', timber: 'Timber', iron: 'Iron', silver: 'Silver', spices: 'Spice', silk: 'Silk', crystals: 'Crystal', petroleum: 'Pitch' };
const EPITHETS = ['Salt', 'Amber', 'Wool', 'Old', 'Great', "King's", "Queen's", "Pilgrims'", 'Drovers\'', 'Low', 'High', 'Long', 'Coast', 'Ridge'];
const EPITHETS_MODERN = ['Coal', 'Oil', 'Iron', 'Old', 'Great', 'Federal', 'Coast', 'Ridge', 'Long', 'Grand Trunk', 'Copper'];

/** tier words per genre: hamlet, village, town, city, metropolis */
const TIER_WORDS: Record<string, [string, string, string, string, string]> = {
	fantasy: ['hamlet', 'village', 'town', 'city', 'metropolis'],
	mythic: ['hamlet', 'village', 'town', 'polis', 'great polis'],
	steampunk: ['hamlet', 'village', 'mill town', 'city', 'metropolis'],
	dieselpunk: ['settlement', 'village', 'factory town', 'city', 'metropolis'],
	atompunk: ['outpost', 'township', 'town', 'city', 'atomic metropolis'],
	cyberpunk: ['outpost', 'enclave', 'district', 'sprawl', 'megacity'],
	biopunk: ['hamlet', 'grove-village', 'town', 'hive city', 'bloom metropolis'],
	solarpunk: ['hamlet', 'village', 'eco-town', 'garden city', 'arcology'],
	wasteland: ['camp', 'shanty', 'township', 'city', 'last metropolis'],
	twilight: ['hamlet', 'village', 'town', 'fading city', 'old metropolis']
};
const HARBOR_STYLES = ['Port of {N}', '{N} Haven', '{N} Harbour', '{N} Quay', 'the {N} Docks', '{N} Wharf'];
const HARBOR_MODERN = ['Port of {N}', '{N} Docks', '{N} Harbour', '{N} Terminal', '{N} Container Port'];
const AIRDOCK: Record<string, string[]> = {
	fantasy: ['{N} Skyhaven', '{N} Aerie Dock', 'the {N} Windquay'],
	mythic: ['{N} Cloud Gate', 'the {N} Sky Stair'],
	steampunk: ['{N} Airship Mast', '{N} Aerodrome', '{N} Zeppelin Dock'],
	dieselpunk: ['{N} Airfield', '{N} Zeppelin Field'],
	atompunk: ['{N} Rocketport', '{N} Skyport'],
	cyberpunk: ['{N} Skyport', '{N} AV Pad', '{N} Vertiport'],
	biopunk: ['{N} Spore Roost', '{N} Wing Dock'],
	solarpunk: ['{N} Kite Field', '{N} Sky Garden Dock'],
	wasteland: ['{N} Glider Strip', '{N} Wreck Field'],
	twilight: ['{N} Grace Pier', 'the {N} Sky Steps']
};

/** biome → region kind (null = not named as a region) */
const BIOME_KIND: Record<number, string> = { 1: 'desert', 2: 'barrens', 3: 'plain', 4: 'plain', 5: 'forest', 6: 'forest', 7: 'jungle', 8: 'forest', 9: 'taiga', 10: 'tundra', 11: 'ice', 12: 'marsh', 13: 'ash', 14: 'crystal', 15: 'fungal', 16: 'lava' };
const MIN_SIZE: Record<string, number> = { desert: 5, barrens: 5, plain: 14, forest: 5, jungle: 5, taiga: 5, tundra: 6, ice: 4, marsh: 3, ash: 3, crystal: 3, fungal: 3, lava: 3, hills: 4, range: 3, bay: 3, gulf: 3, sea: 12, ocean: 12, lake: 1 };
const FORMATS: Record<string, string[]> = {
	range: ['the {N} Mountains', 'the {N} Mountains', 'the {N} Range', 'the {N} Heights', 'the {N} Spine'],
	peak: ['Mount {N}', 'Mount {N}', '{N} Peak', 'the {N} Horn', '{N} Spire'],
	pass: ['the {N} Pass', '{N} Pass', '{N} Gap', 'the {N} Saddle'],
	hills: ['the {N} Hills', 'the {N} Hills', 'the {N} Downs', 'the {N} Fells', 'the {N} Uplands'],
	lake: ['Lake {N}', 'Lake {N}', '{N} Mere', '{N} Water', 'the {N} Lake'],
	bay: ['{N} Bay', '{N} Bay', 'the Bay of {N}', '{N} Sound', '{N} Cove'],
	gulf: ['the Gulf of {N}', 'the {N} Gulf', 'the {N} Bight'],
	sea: ['the {N} Sea', 'the Sea of {N}', 'the {N} Sea', 'the {N} Strait'],
	ocean: ['the {N} Ocean', 'the {N} Ocean', 'the Endless {N}'],
	forest: ['the {N} Forest', '{N} Wood', 'the {N} Weald', 'the {N} Woods'],
	jungle: ['the {N} Jungle', 'the {N} Rainwood', 'the {N} Green'],
	taiga: ['the {N} Taiga', 'the {N} Pinewood', 'the {N} Firs'],
	tundra: ['the {N} Tundra', 'the {N} Barrows', 'the {N} Cold Plain'],
	desert: ['the {N} Desert', 'the {N} Sands', 'the {N} Waste', 'the {N} Dunes'],
	barrens: ['the {N} Barrens', 'the {N} Steppe', 'the {N} Flats'],
	plain: ['the {N} Plains', 'the {N} Steppe', 'the {N} Grasslands', 'the {N} Prairie'],
	marsh: ['the {N} Marshes', 'the {N} Fens', 'the {N} Bog', 'the {N} Mire', 'the {N} Wetlands'],
	ice: ['the {N} Ice', 'the {N} Glacier', 'the {N} Icefield'],
	ash: ['the {N} Ashlands', 'the {N} Cinders', 'the {N} Burnt Lands'],
	crystal: ['the {N} Glass Fields', 'the {N} Crystal Fields', 'the {N} Shards'],
	fungal: ['the {N} Mycelia', 'the {N} Shroomwood', 'the {N} Sporewood'],
	lava: ['the {N} Burning Flats', 'the {N} Lava Fields', 'the {N} Firewaste']
};
/** dictionary root (naming/lexicon MEANINGS) that heads a native compound for each kind */
const HEAD: Record<string, string> = {
	range: 'mountain', peak: 'mountain', pass: 'valley', hills: 'hill', lake: 'lake', bay: 'sea', gulf: 'sea', sea: 'sea', ocean: 'sea',
	forest: 'forest', jungle: 'forest', taiga: 'forest', fungal: 'forest', marsh: 'marsh', desert: 'field', barrens: 'field', plain: 'field',
	tundra: 'field', ice: 'stone', ash: 'stone', crystal: 'stone', lava: 'stone'
};
const MODS = ['new', 'old', 'white', 'black', 'red', 'green', 'great', 'little', 'holy', 'high', 'deep', 'gold', 'east', 'west', 'north', 'south', 'stone', 'oak', 'spring'];

const MODERN = new Set(['steampunk', 'dieselpunk', 'atompunk', 'cyberpunk', 'biopunk', 'solarpunk', 'wasteland']);

/** a pick that hashes a key (never a shared rng) */
const hpick = <T>(key: string, arr: readonly T[]): T => arr[hashSeed(key) % arr.length];

/** Exported names for the Wanderer. Pure: reads the sim and world, draws only side streams. */
export function exportNames(sim: Simulation, g: NamesGrid, pOfCell: (cell: number) => number): NamesExport {
	const w = sim.w;
	const c = w.cells;
	const seed = String(w.opts.seed);
	const genre = (GENRES[sim.voice] ? sim.voice : w.opts.genre) as string;
	const { PW, PH } = g;
	const n = PW * PH;

	// one naming language per culture: the culture's own inventory and dictionary, a side name stream
	const langs = new Map<number, Lang>();
	const lang = (cu: number): Lang => {
		let L = langs.get(cu);
		if (!L) {
			const def = w.cultures[cu] ?? w.cultures[1] ?? w.cultures[0];
			L = makeLang(langSeed(seed, def.id || 1), def.sphere || undefined);
			L.rng = makeRng(`${seed}:nm:${def.id}`);
			for (const b of w.burgs) if (b.name) L.used.add(b.name);
			for (const r of w.rivers) if (r.name) L.used.add(r.name);
			langs.set(cu, L);
		}
		return L;
	};
	/** a native word: 45% a dictionary compound (white + mountain…), else a fresh place word */
	const nativeWord = (cu: number, kind: string): string => {
		const L = lang(cu);
		const head = HEAD[kind];
		if (head && L.lexicon[head] && L.rng() < 0.45) {
			for (let t = 0; t < 8; t++) {
				const mod = L.lexicon[L.rng.pick(MODS)];
				if (!mod) continue;
				const raw = L.headFirst ? L.lexicon[head] + mod : mod + L.lexicon[head];
				const nm = tidy(cap(spell(L, raw)));
				if (isGoodWord(nm) && !L.used.has(nm)) {
					L.used.add(nm);
					return nm;
				}
			}
		}
		// prefer short words (≤ 9 letters); a long one is kept after a few tries
		let nm = makeName(L, '');
		for (let t = 0; t < 5 && nm.length > 9; t++) nm = makeName(L, '');
		return nm;
	};
	const fmt = (pattern: string, name: string) => pattern.replace('{N}', name);
	const named = (cu: number, kind: string, key: string) => fmt(hpick(`${seed}:nm:f:${kind}:${key}`, FORMATS[kind]), nativeWord(cu, kind));

	// nearest-town culture for wild parasangs (culture 0)
	const towns = w.burgs.filter((b) => b.id && b.alive && b.layer === 'surface');
	const nearCulture = (p: number): number => {
		const px = p % PW, py = Math.floor(p / PW);
		let best = 0, bd = Infinity;
		for (const b of towns) {
			const q = pOfCell(b.cell);
			const d = (q % PW - px) ** 2 + (Math.floor(q / PW) - py) ** 2;
			if (d < bd) { bd = d; best = b.culture; }
		}
		return best || 1;
	};
	const owner = (ps: number[]): number => {
		const cnt = new Map<number, number>();
		for (const p of ps) if (g.culture[p]) cnt.set(g.culture[p], (cnt.get(g.culture[p]) ?? 0) + 1);
		let best = 0, bc = 0;
		for (const [k, v] of cnt) if (v > bc || (v === bc && k < best)) { best = k; bc = v; }
		return best || nearCulture(ps[0]);
	};
	const nbrs = (p: number): number[] => {
		const x = p % PW, y = Math.floor(p / PW);
		const out: number[] = [];
		if (x > 0) out.push(p - 1);
		if (x < PW - 1) out.push(p + 1);
		if (y > 0) out.push(p - PW);
		if (y < PH - 1) out.push(p + PW);
		return out;
	};
	/** connected components of parasangs with the same non-null label */
	const components = (label: (p: number) => string | null): { label: string; ps: number[] }[] => {
		const seen = new Uint8Array(n);
		const out: { label: string; ps: number[] }[] = [];
		for (let p = 0; p < n; p++) {
			if (seen[p]) continue;
			const l = label(p);
			if (l === null) continue;
			const ps: number[] = [];
			const stack = [p];
			seen[p] = 1;
			while (stack.length) {
				const q = stack.pop()!;
				ps.push(q);
				for (const r of nbrs(q)) if (!seen[r] && label(r) === l) { seen[r] = 1; stack.push(r); }
			}
			ps.sort((a, b) => a - b);
			out.push({ label: l, ps });
		}
		return out;
	};

	/** split a big region into contiguous parts of about `size` parasangs (farthest-point seeds, BFS growth) */
	const split = (ps: number[], size: number): number[][] => {
		const k = Math.ceil(ps.length / size);
		if (k <= 1) return [ps];
		const inside = new Set(ps);
		const bfs = (src: number[]) => {
			const d = new Map<number, number>(), lab = new Map<number, number>();
			const q: number[] = [];
			src.forEach((s, i) => { d.set(s, 0); lab.set(s, i); q.push(s); });
			for (let i = 0; i < q.length; i++) for (const r of nbrs(q[i])) if (inside.has(r) && !d.has(r)) { d.set(r, d.get(q[i])! + 1); lab.set(r, lab.get(q[i])!); q.push(r); }
			return { d, lab };
		};
		const seeds = [ps[0]];
		while (seeds.length < k) {
			const { d } = bfs(seeds);
			let far = ps[0], fd = -1;
			for (const p of ps) if ((d.get(p) ?? 0) > fd) { fd = d.get(p) ?? 0; far = p; }
			if (fd <= 0) break;
			seeds.push(far);
		}
		const { lab } = bfs(seeds);
		const parts: number[][] = seeds.map(() => []);
		for (const p of ps) parts[lab.get(p) ?? 0].push(p);
		return parts.filter((x) => x.length);
	};
	const water = (p: number) => g.height[p] < 20;
	const featType = (p: number) => w.features[c.feature[g.cellOf[p]]]?.type ?? 'ocean';
	const features: NamesExport['features'] = [];
	const add = (kind: string, ps: number[], key: string, cu = owner(ps)) => {
		const f: NamesExport['features'][number] = { kind, name: named(cu, kind, key), parasangs: ps };
		features.push(f);
		return f;
	};

	// mountains (h ≥ 70) with their highest peak; hills (50..69) split by culture; passes where roads cross high ground
	for (const comp of components((p) => (!water(p) && g.height[p] >= 70 ? 'm' : null))) {
		if (comp.ps.length < MIN_SIZE.range) continue;
		for (const ps of split(comp.ps, 70)) {
			let peak = ps[0];
			for (const p of ps) if (g.height[p] > g.height[peak]) peak = p;
			const cu = owner(ps);
			const f = add('range', ps, `r${ps[0]}`, cu);
			f.peak = peak;
			features.push({ kind: 'peak', name: named(cu, 'peak', `k${peak}`), parasangs: [peak] });
		}
	}
	for (const comp of components((p) => (!water(p) && g.height[p] >= 50 && g.height[p] < 70 ? 'h' + (g.culture[p] || 0) : null))) {
		if (comp.ps.length >= MIN_SIZE.hills) for (const ps of split(comp.ps, 50)) add('hills', ps, `h${ps[0]}`);
	}
	for (const comp of components((p) => (!water(p) && g.road[p] > 0 && g.height[p] >= 60 && !g.burgAt[p] ? 'pass' : null))) {
		if (comp.ps.length > 6) continue; // a long high road is a highland road, not a pass
		if (!comp.ps.some((p) => g.height[p] >= 70 || nbrs(p).some((q) => g.height[q] >= 70))) continue;
		add('pass', comp.ps, `p${comp.ps[0]}`);
	}
	// biome regions, split by culture
	for (const comp of components((p) => (water(p) || !BIOME_KIND[g.biome[p]] ? null : BIOME_KIND[g.biome[p]] + ':' + (g.culture[p] || 0)))) {
		const kind = comp.label.split(':')[0];
		if (comp.ps.length >= (MIN_SIZE[kind] ?? 5)) for (const ps of split(comp.ps, 90)) add(kind, ps, `b${ps[0]}`);
	}
	// lakes
	for (const comp of components((p) => (water(p) && featType(p) === 'lake' ? 'l' + c.feature[g.cellOf[p]] : null))) add('lake', comp.ps, `l${comp.ps[0]}`);
	// coastal waters: bays / gulfs where land wraps the water, then seas by nearest coast culture, open ocean beyond
	const ocean = (p: number) => water(p) && featType(p) !== 'lake';
	const enclosed = new Uint8Array(n);
	for (let p = 0; p < n; p++) {
		if (!ocean(p)) continue;
		const x = p % PW, y = Math.floor(p / PW);
		let land = 0, tot = 0;
		for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
			const xx = x + dx, yy = y + dy;
			if (xx < 0 || yy < 0 || xx >= PW || yy >= PH) continue;
			tot++;
			if (!water(yy * PW + xx)) land++;
		}
		if (land / tot >= 0.5) enclosed[p] = 1;
	}
	for (const comp of components((p) => (enclosed[p] ? 'b' : null))) {
		if (comp.ps.length < MIN_SIZE.bay) continue;
		add(comp.ps.length > 14 ? 'gulf' : 'bay', comp.ps, `w${comp.ps[0]}`, owner(comp.ps.flatMap(nbrs).filter((q) => !water(q))));
	}
	// multi-source BFS from coastal water: each open-water parasang takes the culture of its nearest coast
	const coastCu = new Int32Array(n).fill(-1);
	const dist = new Int32Array(n).fill(-1);
	const queue: number[] = [];
	for (let p = 0; p < n; p++) {
		if (!ocean(p) || enclosed[p]) continue;
		for (const q of nbrs(p)) if (!water(q)) { coastCu[p] = g.culture[q] || nearCulture(q); dist[p] = 0; queue.push(p); break; }
	}
	for (let i = 0; i < queue.length; i++) {
		const p = queue[i];
		for (const q of nbrs(p)) if (ocean(q) && !enclosed[q] && dist[q] < 0) { dist[q] = dist[p] + 1; coastCu[q] = coastCu[p]; queue.push(q); }
	}
	for (const comp of components((p) => (ocean(p) && !enclosed[p] ? (dist[p] >= 0 && dist[p] <= 7 ? 's' + coastCu[p] : 'o') : null))) {
		const kind = comp.label === 'o' ? 'ocean' : 'sea';
		if (comp.ps.length < MIN_SIZE[kind]) continue;
		const cu = kind === 'sea' ? +comp.label.slice(1) : nearCulture(comp.ps[comp.ps.length >> 1]);
		for (const ps of split(comp.ps, kind === 'ocean' ? 400 : 200)) add(kind, ps, `s${ps[0]}`, cu);
	}

	// rivers: their sim names, traced through parasangs
	const trace = (cells: number[]) => {
		const out: number[] = [];
		for (const cell of cells) {
			if (cell < 0 || cell >= c.n) continue;
			const p = pOfCell(cell);
			if (out[out.length - 1] !== p) out.push(p);
		}
		return out;
	};
	const rivers = w.rivers
		.filter((r) => r.id && r.name)
		.map((r) => ({ id: r.id, name: r.name, parasangs: trace(r.cells) }))
		.filter((r) => r.parasangs.length >= 2);

	// routes: keep a name the sim gave, else name it in the culture of its first town
	const roadWords = ROAD_WORDS[genre] ?? ROAD_WORDS.fantasy;
	const modern = MODERN.has(genre);
	const routes: NamesExport['routes'] = [];
	w.routes.forEach((rt, id) => {
		if (rt.kind === 'shaft') return;
		const a = w.burgs[rt.a], b = w.burgs[rt.b];
		if (!a || !b) return;
		const ps = trace(rt.cells);
		if (ps.length < 2) return;
		let name = rt.name ?? '';
		if (!name) {
			const k = `${seed}:nm:rt:${id}`;
			const r: Rng = makeRng(k);
			const cu = a.culture || b.culture || 1;
			if (rt.kind === 'sea') {
				const word = r.pick(SEA_WORDS);
				const roll = r();
				name = roll < 0.4 ? `the ${a.name}–${b.name} ${word}` : roll < 0.7 ? `the ${nativeWord(cu, 'sea')} ${word}` : `the ${b.name} ${word}`;
			} else if (rt.kind === 'tunnel' || rt.kind === 'sky') {
				const words = (rt.kind === 'tunnel' ? TUNNEL_WORDS : SKY_WORDS)[genre] ?? [rt.kind === 'tunnel' ? GENRES[genre as keyof typeof GENRES]?.terms.tunnel ?? 'Tunnel' : GENRES[genre as keyof typeof GENRES]?.terms.skylane ?? 'Sky-lane'];
				name = r() < 0.5 ? `the ${b.name} ${r.pick(words)}` : `the ${nativeWord(cu, 'pass')} ${r.pick(words)}`;
			} else {
				const word = r.pick(roadWords);
				const roll = r();
				if (roll < 0.3) name = `the ${b.name} ${word}`;
				else if (roll < 0.6) name = `${nativeWord(cu, 'pass')} ${word}`;
				else if (roll < 0.8) name = `the ${TRADE[cellCommodity(c.biome[b.cell], c.h[b.cell])]} ${word}`;
				else name = `the ${r.pick(modern ? EPITHETS_MODERN : EPITHETS)} ${word}`;
			}
		}
		routes.push({ id, kind: rt.kind, name, a: rt.a, b: rt.b, parasangs: ps });
	});

	// burgs: size tier by rank among the living, harbour names for ports, air docks for sky towns
	const tiers = TIER_WORDS[genre] ?? TIER_WORDS.fantasy;
	const alive = w.burgs.filter((b) => b.id && b.alive).sort((x, y) => y.pop - x.pop || x.id - y.id);
	const rank = new Map<number, number>();
	alive.forEach((b, i) => rank.set(b.id, alive.length > 1 ? i / (alive.length - 1) : 0));
	const burgs: NamesExport['burgs'] = {};
	for (const b of w.burgs) {
		if (!b.id) continue;
		const f = rank.get(b.id) ?? 1;
		const tier = tiers[f < 0.04 ? 4 : f < 0.2 ? 3 : f < 0.55 ? 2 : f < 0.85 ? 1 : 0];
		const o: NamesExport['burgs'][number] = { tier };
		if (b.port && b.layer === 'surface') {
			const L = lang(b.culture);
			const portRoot = L.lexicon.port ? cap(spell(L, L.lexicon.port)) : '';
			const roll = hashSeed(`${seed}:nm:hb:${b.id}`) % 10;
			// 1 in 5 ports take the native word for "port": "Kalvik Tarsa" (or "Tarsa Kalvik" for head-first tongues)
			o.harbor = roll < 2 && portRoot ? (L.headFirst ? `${portRoot} ${b.name}` : `${b.name} ${portRoot}`) : fmt(hpick(`${seed}:nm:hs:${b.id}`, modern ? HARBOR_MODERN : HARBOR_STYLES), b.name);
		}
		if (b.layer === 'sky') o.airdock = fmt(hpick(`${seed}:nm:ad:${b.id}`, AIRDOCK[genre] ?? AIRDOCK.fantasy), b.name);
		burgs[b.id] = o;
	}
	return { rivers, routes, features, burgs };
}
