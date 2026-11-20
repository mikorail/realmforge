/**
 * Material culture for the Wanderer culture pack: cuisine, crafts, trade goods, dress, buildings, music, games and
 * land, per culture. Pure and deterministic (side rngs `seed:cp:mat:<culture>`), read-only on the simulation.
 */
import { makeRng, type Rng } from '../../../rng';
import { makeLang, makeName } from '../../../gen/names';
import type { DoctrineKind } from '../../../gen/types';
import type { Craft, Dish, MaterialPack } from '../../../adventure/culturepack';
import type { Simulation } from '../../engine';
import { cultureProfile } from '../profile';
import {
	COLOR_NAMES, DISH_ADJ, DISH_FORMS, DOC_TEMPLE, DOC_UNCLEAN, DRESS_LINES, ENVS, ENV_BY_BIOME, FALLBACK_MAT, FEAST_DISH, GENERIC_FORMS,
	GENERIC_GAMES, GENERIC_SCALES, GENRE_MAT, MEAL_DAWN, MEAL_EVE, MEAL_MID, SPHERE_MAT, TRAIT_MAT, type CraftT, type DishT, type GameT, type GoodT
} from './material_data';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const uniq = <T>(a: T[]): T[] => Array.from(new Set(a));
const take = <T>(rng: Rng, arr: readonly T[], n: number): T[] => rng.shuffle(arr).slice(0, Math.min(n, arr.length));
const parseList = (s: string): string[] => s.split(/,\s*|\s+and\s+/).map((x) => x.trim()).filter(Boolean);

const GENRE_CLOTH: Record<string, string> = {
	steampunk: 'mill-woven wool and cotton', dieselpunk: 'factory cotton', atompunk: 'nylon and cotton', cyberpunk: 'synth-silk',
	biopunk: 'grown fibre', solarpunk: 'woven bio-fibre', wasteland: 'scavenged cloth', twilight: 'faded wool'
};

function colorName(hex: string): string {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
	if (!m) return 'brown';
	const n = parseInt(m[1], 16);
	const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
	const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
	if (mx < 0.2) return 'black';
	if (d < 0.08) return mx > 0.8 ? 'white' : 'grey';
	let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
	h = (h * 60 + 360) % 360;
	if (mx < 0.45 && h > 15 && h < 50) return 'brown';
	for (const [lim, name] of COLOR_NAMES) if (h < lim) return name;
	return 'red';
}

const DRINK_RE = /^(.*\b)?(tea|coffee|mead|ale|wine|kvass|beer|milk|chocolate drink|sap|cocoa)(\b.*)?$/;

export function genMaterial(sim: Simulation, cu: number): MaterialPack {
	const w = sim.w;
	const c = w.cultures[cu];
	if (!c) return {};
	const seed = w.opts.seed;
	const rng = makeRng(`${seed}:cp:mat:${cu}`);
	const prof = cultureProfile(w, cu);
	const genreId = sim.voice;
	const G = GENRE_MAT[genreId] ?? GENRE_MAT.fantasy;
	const S = SPHERE_MAT[c.sphere] ?? FALLBACK_MAT;
	const L = makeLang(`${seed}:cp:matlang:${cu}`, c.sphere || undefined);
	const coin = () => makeName(L, '');

	// environment: the biome most of the culture's land has, or its layer
	let envKey = 'grassland';
	let mountain = false;
	if (c.layer === 'deep' || c.layer === 'sky' || c.layer === 'sea') envKey = c.layer;
	else {
		const cells = w.cells;
		const hist = new Map<number, number>();
		let hi = 0, tot = 0;
		const stride = Math.max(1, Math.floor(cells.n / 5000));
		for (let i = 0; i < cells.n; i += stride) {
			if (cells.culture[i] !== cu || cells.h[i] < 20) continue;
			hist.set(cells.biome[i], (hist.get(cells.biome[i]) ?? 0) + 1);
			if (cells.h[i] > 62) hi++;
			tot++;
		}
		let bestB = c.center >= 0 ? cells.biome[c.center] : 4, bestN = -1;
		for (const [b, n] of hist) if (n > bestN) { bestB = b; bestN = n; }
		envKey = ENV_BY_BIOME[bestB] ?? 'grassland';
		if (envKey === 'sea') envKey = 'coast';
		mountain = tot > 0 && hi / tot >= 0.25;
	}
	const E = ENVS[envKey] ?? ENVS.grassland;
	const coastal = prof.coastal && !['coast', 'sea', 'deep', 'sky'].includes(envKey);
	const CO = ENVS.coast;

	// faith of the culture's home, for the unclean foods
	const relId = c.layer === 'surface' && c.center >= 0 ? w.cells.religion[c.center] : 0;
	const rel = w.religions[relId] ?? w.religions.find((r) => r.culture === cu);
	const doctrine: DoctrineKind = rel?.doctrine ?? (rel?.type === 'Folk' ? 'ancestral' : rel?.type === 'Cult' ? 'esoteric' : 'caste');

	// ---------- cuisine ----------
	let food = prof.food.replace(/, plus the daily catch/, ', fresh fish').replace(/ and travel rations/, ', travel rations');
	food = food.replace(/\bplus\b/, 'and');
	const items = parseList(food);
	const baseFood: string[] = [], drinks0: string[] = [];
	for (const it of items) (DRINK_RE.test(it) ? drinks0 : baseFood).push(it);
	const staples = uniq([
		...baseFood.slice(0, 2),
		...(genreIsPlain(genreId) ? [] : take(rng, G.staples, 1)),
		...take(rng, E.staples, 1),
		...(coastal ? take(rng, CO.staples, 1) : []),
		...baseFood.slice(2),
		...E.staples
	]).slice(0, 5);
	while (staples.length < 5) staples.push(rng.pick(['salt', 'onions', 'dried fruit', 'beans', 'cheese']));

	const grainRe = /(rice|maize|millet|wheat|oat|barley|rye|bread|porridge|meal|bun|quinoa|sorghum|teff|noodle|loaf|cake|wafer|biscuit|hardtack|cassava|paste)/;
	const meatRe = /(mutton|lamb|pork|beef|venison|llama|goat|meat|kebab|seal|whale|lizard|fowl|duck|sausage|blubber|protein)/;
	const fishRe = /(fish|eel|salmon|shell|kelp|seaweed|herring|squid)/;
	const vegRe = /(green|bean|lentil|squash|potato|yam|taro|plantain|root|tuber|fruit|date|mushroom|fungi|beet|cabbage|pickle|berr|apple|melon|olive|pomegranate|onion|moss|dried)/;
	const pool = (kind: string): string[] => {
		const re = kind === 'grain' ? grainRe : kind === 'meat' ? meatRe : kind === 'fish' ? fishRe : kind === 'veg' ? vegRe : null;
		const all = uniq([...staples, ...E.staples]);
		const f = re ? all.filter((s) => re.test(s)) : all;
		return f.length ? f : all;
	};
	const herbs = uniq([...E.herbs, ...(/spice/.test(prof.food) ? ['spice'] : []), 'salt']);
	const used = new Set<string>();
	const unique = (name: string): string => { let n = name, i = 2; while (used.has(n)) n = `${name} ${i++}`; used.add(n); return n; };
	const ingr = (kind: string): string[] => {
		const mp = pool(kind);
		const clean = mp.filter((x) => !/butter|curd|cheese|milk|paste|oil/.test(x));
		const main = rng.pick(clean.length ? clean : mp);
		const other = rng.pick(uniq([...staples, ...E.staples]).filter((s) => s !== main));
		return uniq([main, other, rng.pick(herbs)]).slice(0, 3);
	};
	const local = (n: string, p = 0.5): string => (rng.chance(p) ? `${coin()} ${n}` : cap(n));

	const dishes: Dish[] = [];
	const mk = (name: string, tag: string, withs: string[], extra: Partial<Dish> = {}) => dishes.push({ name: unique(name), with: withs, tag, ...extra });
	// feasts first
	for (const [fname, kind] of prof.feasts) {
		const [n, tag, k] = rng.pick(FEAST_DISH[kind] ?? FEAST_DISH.harvest);
		mk(local(n, 0.4), tag, ingr(k), { feast: kind, note: `Made for ${fname}.` });
	}
	// sphere, genre, trait dishes
	const sd: DishT = S.dish, gd: DishT = G.dish;
	mk(local(sd[0], 0.5), sd[1], sd[2]);
	mk(local(gd[0], 0.4), gd[1], gd[2]);
	const traitKeys = prof.traits.slice(0, 2);
	const td = TRAIT_MAT[traitKeys[0]]?.dish;
	if (td) mk(local(td[0], 0.4), td[1], td[2]);
	// generic dishes to reach 10 to 12
	const target = rng.int(10, 12);
	const forms = rng.shuffle(DISH_FORMS);
	for (let i = 0; dishes.length < target && i < forms.length; i++) {
		const [form, tag, kind] = forms[i];
		const withs = ingr(kind);
		const pat = rng.int(0, 3);
		let name: string;
		if (pat === 0) name = `${coin()} ${form}`;
		else if (pat === 1) name = `${cap(form)} of ${makeName(L, 'city')}`;
		else if (pat === 2) name = `${cap(rng.pick(DISH_ADJ))} ${form}`;
		else {
			const overlap = withs[0].split(' ').some((x) => form.includes(x)) || form.split(' ').some((x) => withs[0].includes(x));
			name = overlap ? `${cap(rng.pick(DISH_ADJ))} ${form}` : `${cap(withs[0])} ${form}`;
		}
		mk(name, tag, withs);
	}
	// one bitter delicacy where the land allows, kept as a rare venom dish
	if (['fungal', 'wetland', 'ashland', 'deep', 'crystal'].includes(envKey) && dishes.length < 12) mk(local('bitter-cap salad', 0.5), 'venom', ['bitter fungi', rng.pick(herbs), 'oil'], { note: 'Prepared by those who know the safe cut.' });

	// drinks
	const dpool = uniq([
		...drinks0.map((d) => d.replace(/^and /, '')),
		E.drink,
		...(coastal ? [CO.drink] : []),
		...G.drinks
	]);
	const drinks = dpool.slice(0, 4);
	while (drinks.length < 4) drinks.push(rng.pick(['spring water', 'sour milk', 'barley water', 'weak ale', 'herb water']));
	const udrinks = uniq(drinks);
	if (/^(ale|mead|wine|tea|beer|cider|coffee)$/.test(udrinks[0])) udrinks[0] = `${coin()} ${udrinks[0]}`;
	while (udrinks.length < 4) udrinks.push('plain water');

	// meals
	const dishName = dishes[dishes.length - 1].name;
	const mealFill = (t: string) => t
		.replace('{s0}', staples[0]).replace('{s1}', staples[1]).replace('{s2}', staples[2])
		.replace('{d0}', udrinks[0]).replace('{d1}', udrinks[1]).replace('{dish}', dishName.toLowerCase());
	const meals = [`Dawn: ${mealFill(rng.pick(MEAL_DAWN))}`, `Midday: ${mealFill(rng.pick(MEAL_MID))}`, `Evening: ${mealFill(rng.pick(MEAL_EVE))}`];
	if (!genreIsPlain(genreId) && rng.chance(0.6)) meals[1] = `Midday: ${G.meal}`;

	// unclean foods, from the faith's doctrine plus the totem beast
	const unclean = take(rng, DOC_UNCLEAN[doctrine], 2);
	if (c.totem) unclean.push(`the flesh of the ${c.totem.toLowerCase()}`);
	if (rng.chance(0.4)) unclean.push(G.unclean);
	const cuisine = { staples, dishes: dishes.slice(0, 12), drinks: udrinks.slice(0, 4), meals, unclean: uniq(unclean).slice(0, 4) };

	// ---------- crafts ----------
	const cpick = (arr: CraftT[]): CraftT => rng.pick(arr);
	const craftSet: CraftT[] = [cpick(S.crafts), cpick(E.craft), cpick(G.crafts)];
	if (coastal) craftSet.push(cpick(CO.craft));
	for (const t of traitKeys) craftSet.push(TRAIT_MAT[t].craft);
	const leftovers = [...S.crafts, ...E.craft, ...G.crafts].filter((x) => !craftSet.includes(x));
	craftSet.push(...rng.shuffle(leftovers));
	const nCraft = rng.int(4, 6);
	const seenC = new Set<string>();
	const crafts: Craft[] = [];
	for (const [name, goods, mark] of craftSet) {
		if (seenC.has(name) || crafts.length >= nCraft) continue;
		seenC.add(name);
		crafts.push({ name, goods: goods.slice(), mark });
	}

	// ---------- trade goods ----------
	const burgs = w.burgs.filter((b) => b && b.id && b.culture === cu);
	const burgIds = new Set(burgs.map((b) => b.id));
	const partners = new Map<number, number>();
	let seaRoutes = 0;
	for (const r of w.routes) {
		const aIn = burgIds.has(r.a), bIn = burgIds.has(r.b);
		if (aIn === bIn) continue;
		if (r.kind === 'sea') seaRoutes++;
		const other = w.burgs[aIn ? r.b : r.a]?.culture;
		if (other && other !== cu) partners.set(other, (partners.get(other) ?? 0) + 1);
	}
	const goodsPool: GoodT[] = [...E.goods, ...S.goods, ...G.goods];
	if (coastal || seaRoutes > 1) goodsPool.push(...CO.goods.slice(0, 2));
	if (mountain) goodsPool.push(['iron ore', 'metal', 45], ['quarried stone', 'tool', 30]);
	for (const t of traitKeys) goodsPool.push(TRAIT_MAT[t].good);
	const goods: { name: string; kind: string; value: number }[] = [];
	const seenG = new Set<string>();
	const addGood = ([name, kind, v]: GoodT) => {
		if (seenG.has(name)) return;
		seenG.add(name);
		goods.push({ name, kind, value: Math.max(5, Math.min(400, Math.round(v * (0.85 + rng() * 0.3)))) });
	};
	// two imports from the best trade partners, named for where they come from
	const top = [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
	const imports: GoodT[] = [];
	for (const [pc] of top) {
		const pcu = w.cultures[pc];
		if (!pcu) continue;
		const ps = SPHERE_MAT[pcu.sphere] ?? FALLBACK_MAT;
		const g = rng.pick(ps.goods);
		imports.push([`${g[0]} of ${pcu.name}`, g[1], g[2] * 1.15]);
	}
	const nGoods = rng.int(6, 8);
	// guarantee a spread: one local, one genre, one sphere good first
	addGood(rng.pick(E.goods)); addGood(rng.pick(G.goods)); addGood(rng.pick(S.goods));
	for (const g of imports) addGood(g);
	for (const g of rng.shuffle(goodsPool)) if (goods.length < nGoods) addGood(g);

	// ---------- dress ----------
	const segs = parseList(prof.dress);
	const garmentRe = /(robe|coat|kimono|wrap|sarong|tunic|toga|mantle|poncho|parka|shirt|cloak|shawl|wool|silk|cotton|skin|huipil|fur|felt|bark cloth|cloth|linen|buckskin|dress)/;
	const garment = segs.find((x) => garmentRe.test(x)) ?? segs[0];
	const accent = segs.find((x) => x !== garment) ?? 'plain trim';
	const cname = colorName(c.color);
	const cloth = GENRE_CLOTH[genreId] ?? E.cloth;
	const dfill = (t: string) => t.replace(/\{G\}/g, garment).replace(/\{A\}/g, accent).replace(/\{C\}/g, cname).replace(/\{cloth\}/g, cloth);
	const dress: Record<string, string> = {};
	for (const rank of ['low', 'common', 'high', 'ritual', 'mourning', 'wedding', 'war'] as const) {
		let line = cap(dfill(rng.pick(DRESS_LINES[rank])));
		if (!genreIsPlain(genreId) && ['common', 'high', 'war'].includes(rank)) {
			const extra = ` Plus ${rng.pick(G.acc)}.`;
			if (line.length + extra.length < 118) line += extra;
		}
		if (line.length > 118) line = line.slice(0, 117).replace(/[ ,;]+\S*$/, '') + '.';
		dress[rank] = line;
	}

	// ---------- buildings ----------
	const archTerms = Array.from(prof.architecture.matchAll(/\b(timber|stone|brick|mud|felt|thatch|paper|tile|tiled|bamboo|turf|snow|cob|adobe|basalt|limestone|marble|wooden)\b/g)).map((m) => m[1]);
	const materials = uniq([...E.mat, ...archTerms, ...(genreIsPlain(genreId) ? [] : G.mat)]).slice(0, 5);
	let archLead = prof.architecture.split(', ')[0];
	if (archLead.length > 70) archLead = archLead.split(' and ')[0];
	const faithHall = hallFor(genreId);
	const docT = DOC_TEMPLE[doctrine];
	const docTemple = docT.startsWith('with') ? `A ${faithHall} ${docT}.` : `The ${faithHall} is ${docT}.`;
	const gate = TRAIT_MAT[traitKeys[0]]?.gate ?? rng.pick(['a plain arch with a bar', 'a timber gate between two squat towers']);
	const buildings = {
		materials,
		house: rng.pick(E.house),
		hall: `${cap(archLead)} set the pattern; the great hall is the largest, near the market.`,
		temple: rng.chance(0.6) ? docTemple : cap(S.temple) + '.',
		gate: cap(gate) + '.',
		roof: rng.chance(0.45) && !genreIsPlain(genreId) ? G.roof : E.roof,
		color: `${cname} trim over ${E.pig} walls`,
		ornament: rng.chance(0.5) ? S.ornament : G.ornament
	};
	if (buildings.hall.length > 118) buildings.hall = `${cap(archLead)} set the pattern here.`;
	if (buildings.temple.length > 118) buildings.temple = cap(S.temple) + '.';

	// ---------- music ----------
	const inst = uniq([...parseList(prof.music), ...(genreIsPlain(genreId) ? [] : G.inst)]).slice(0, 5);
	const mforms = uniq([...S.forms, ...(traitKeys[0] ? [TRAIT_MAT[traitKeys[0]].form] : []), ...G.forms, ...take(rng, GENERIC_FORMS, 2)]).slice(0, rng.int(3, 5));
	const music = { instruments: inst, forms: mforms, scale: S.scale === FALLBACK_MAT.scale ? rng.pick(GENERIC_SCALES) : S.scale };

	// ---------- games ----------
	const gp: GameT[] = [S.game, G.game];
	for (const t of traitKeys) gp.push(TRAIT_MAT[t].game);
	const gen = take(rng, GENERIC_GAMES, 2).map(([n, r]) => [`${coin()} ${n.toLowerCase()}`, r] as GameT);
	const gset = rng.shuffle([...take(rng, gp, 3), ...gen]);
	const games: { name: string; rule: string }[] = [];
	const seenGm = new Set<string>();
	for (const [name, rule] of gset) {
		if (seenGm.has(name) || games.length >= rng.int(2, 3)) continue;
		seenGm.add(name);
		games.push({ name, rule });
	}
	while (games.length < 2) games.push({ name: gen[0][0] + ' II', rule: gen[0][1] });

	// ---------- land ----------
	const roll = rng();
	let land: string;
	if (roll < 0.5) land = rng.pick(E.land);
	else if (roll < 0.8 && !genreIsPlain(genreId)) land = G.land.replace('{env}', E.short);
	else if (coastal && roll < 0.9) land = rng.pick(CO.land);
	else land = rng.pick(E.land);

	return {
		cuisine,
		crafts,
		tradeGoods: goods.slice(0, 8),
		dress,
		buildings,
		music,
		games: games.slice(0, 3),
		land
	};
}

/** fantasy, mythic and twilight keep the sphere's own nouns; other genres reskin them */
function genreIsPlain(g: string): boolean {
	return g === 'fantasy' || g === 'mythic';
}

function hallFor(g: string): string {
	const m: Record<string, string> = {
		fantasy: 'temple', mythic: 'sanctuary', steampunk: 'chapel', dieselpunk: 'chapel', atompunk: 'meeting hall', cyberpunk: 'shrine room',
		biopunk: 'grow-chapel', solarpunk: 'garden shrine', wasteland: 'ruin shrine', twilight: 'chapel'
	};
	return m[g] ?? 'temple';
}
