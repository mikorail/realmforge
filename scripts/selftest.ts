// Lightweight self-test (replaces the removed vitest suite): npx tsx scripts/selftest.ts  (npm run selftest)
// 1. determinism: same seed → same gen stats and the same 50-year 2-planet chronicle hash
// 2. save round trip: encodeBase/encodeSave → decode → restore → +10 years == the original +10 years
// 3. old saves: dumps without w3/so/gf restore and keep simulating
// 4. Wanderer export: runs and carries the fields the Wanderer's WorldData needs
// Exits 1 on any failure.
import { createHash } from 'node:crypto';
import { generateUniverse } from '../src/lib/gen/universe';
import { Cosmos } from '../src/lib/sim/cosmos';
import { snapshotData, encodeBase, decodeBase, encodeSave, decodeSave, cosmosFromData, pack, unpack } from '../src/lib/save';
import { exportAdventureObject, exportUniverse } from '../src/lib/adventure/export';
import type { Universe } from '../src/lib/gen/universe';

const T0 = performance.now();
const OPTS = { seed: 'selftest', template: 'continents' as const, cells: 3000, states: 10, width: 1600, height: 1000, genre: 'fantasy' as const, planet: 'terran' as const, spheres: null, depth: 2, sky: true, sea: true };
const PLANETS = 2;
const fails: string[] = [];
const ms = (t: number) => `${(performance.now() - t).toFixed(0)}ms`;
function check(ok: unknown, what: string) {
	if (!ok) fails.push(what);
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
}
const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);

function genStats(u: Universe) {
	return sha(
		JSON.stringify(
			u.planets.map((w) => {
				let h = 0;
				for (let i = 0; i < w.cells.n; i++) h = (h * 31 + w.cells.h[i] + w.cells.state[i] * 7 + w.cells.culture[i] * 13) >>> 0;
				return [w.name, w.cells.n, h, w.burgs.map((b) => b.name), w.states.map((s) => s.fullName), w.cultures.map((c) => c.name), w.religions.map((r) => r.name), w.layers.length, w.routes.length];
			}).concat([u.rifts.map((r) => [r.a, r.b])] as never)
		)
	);
}
/** chronicle + headline state of every planet */
function simHash(cos: Cosmos, fromYear = -Infinity) {
	return sha(
		JSON.stringify(
			cos.sims.map((s) => [
				s.year,
				s.month,
				s.rng.state(),
				s.allEvents.filter((e) => e.y >= fromYear).map((e) => `${e.y}|${e.kind}|${e.text}`),
				s.polities.filter((p) => p.alive).map((p) => `${p.id}:${p.cells}:${Math.round(p.treasury ?? 0)}`),
				s.people.filter((p) => p.alive).length,
				s.wars.length
			])
		)
	);
}
const run = (cos: Cosmos, years: number) => {
	for (let m = 0; m < years * 12; m++) cos.tick();
};

// ── 1. determinism ──
let t = performance.now();
const u1 = generateUniverse(OPTS, PLANETS);
const u2 = generateUniverse(OPTS, PLANETS);
check(u1.planets.length === PLANETS, `universe has ${PLANETS} planets`);
check(genStats(u1) === genStats(u2), `gen deterministic (${genStats(u1)}, ${ms(t)})`);
const other = generateUniverse({ ...OPTS, seed: 'selftest-other' }, PLANETS);
check(genStats(other) !== genStats(u1), 'different seed → different world');
t = performance.now();
const a = new Cosmos(u1);
const b = new Cosmos(u2);
run(a, 50);
run(b, 50);
const h50 = simHash(a);
check(h50 === simHash(b), `50-year chronicle deterministic (${h50}, ${a.sims.map((s) => s.allEvents.length).join('+')} events, ${ms(t)})`);
check(a.sims.every((s) => s.year >= 50 && s.allEvents.length > 20), 'sims advanced and wrote a chronicle');
const articleBugs = a.sims.flatMap((s) => s.allEvents.filter((e) => /\b(the|The) the\b|\bThe The\b/.test(e.text)).map((e) => e.text));
check(articleBugs.length === 0, `no doubled articles in the chronicle${articleBugs.length ? ': ' + articleBugs.slice(0, 3).join(' / ') : ''}`);

// ── 2. save round trip ──
t = performance.now();
const pristine = generateUniverse(OPTS, PLANETS); // what the app stores as the base: the Universe as first saved
const baseBytes = encodeBase(pristine);
const saveBytes = encodeSave(snapshotData(a), pristine);
const loaded = cosmosFromData(decodeSave(saveBytes, decodeBase(baseBytes)));
check(simHash(loaded) === h50, `restored save matches the saved state (save ${(saveBytes.length / 1024).toFixed(0)} KB + base ${(baseBytes.length / 1024).toFixed(0)} KB)`);
check(loaded.sims.every((s, i) => s.planetIndex === i && s.cosmos === loaded), 'restored sims know their planet index and cosmos');
run(a, 10);
run(loaded, 10);
check(simHash(loaded) === simHash(a), `restore + 10 years == original + 10 years (${ms(t)})`);
// pack/unpack keeps shared refs, Map/Set and odd numbers
const shared = { k: 1 };
const odd = unpack(pack({ m: new Map([[1, 'a']]), s: new Set([2]), n: [NaN, Infinity, -Infinity, undefined], x: shared, y: shared, f: new Float32Array([1.5, 2]) })) as any;
check(odd.m.get(1) === 'a' && odd.s.has(2) && Number.isNaN(odd.n[0]) && odd.n[1] === Infinity && odd.n[2] === -Infinity && odd.n.length === 4 && odd.x === odd.y && odd.f instanceof Float32Array && odd.f[0] === 1.5, 'pack/unpack keeps Map, Set, NaN/±Infinity, undefined, shared refs, typed arrays');

// ── 3. old saves without the newer state keys (w3/so/gf and the keys added with the save fix) ──
t = performance.now();
const old = decodeSave(encodeSave(snapshotData(a), pristine), pristine);
for (const d of old.sims) for (const k of ['w3', 'so', 'gf', 'ext', 'langs', 'artifacts', 'caravans', 'armyTokens', 'unrestUntil', 'ids']) delete (d as Record<string, unknown>)[k];
let oldOk = true;
try {
	const oc = cosmosFromData(old);
	check(oc.sims.every((s) => s.w3 && s.so && s.gf), 'old save: w3/so/gf rebuilt on restore');
	run(oc, 5);
	check(oc.sims.every((s) => s.year >= 65), `old save keeps simulating (${ms(t)})`);
	const again = cosmosFromData(decodeSave(encodeSave(snapshotData(oc), pristine), pristine));
	check(simHash(again) === simHash(oc), 'old save re-saves cleanly');
} catch (e) {
	oldOk = false;
	console.error(e);
}
check(oldOk, 'old save restore does not throw');

// ── 4. Wanderer export ──
t = performance.now();
try {
	const w = exportAdventureObject(a.sims[0]) as Record<string, any>;
	const need = ['seed', 'name', 'genre', 'year', 'w', 'h', 'biome', 'height', 'temp', 'river', 'road', 'state', 'culture', 'religion', 'burg', 'cell', 'layers', 'burgs', 'states', 'cultures', 'religions', 'people', 'events', 'monsters', 'artifacts', 'wonders', 'species', 'terms', 'layerNames'];
	const missing = need.filter((k) => w[k] === undefined);
	check(missing.length === 0, `export has required fields${missing.length ? ' (missing ' + missing.join(', ') + ')' : ''}`);
	const n = w.w * w.h;
	check(w.w === 80 && w.h > 0 && ['biome', 'height', 'state', 'culture'].every((k) => w[k].length === n), `export rasters are ${w.w}×${w.h}`);
	check(w.burgs.length > 0 && w.states.length > 0 && w.cultures.length > 0 && w.events.length > 0, `export lists ${w.burgs.length} burgs, ${w.states.length} states, ${w.cultures.length} cultures, ${w.events.length} events`);
	check(w.cultures.every((c: any) => Array.isArray(c.months) && c.months.length === 12 && Array.isArray(c.feasts)), 'cultures carry 12 months and feasts');
	check(w.burgs.every((b: any) => typeof b.id === 'number' && typeof b.name === 'string' && b.p !== undefined), 'burgs have id/name/position');
	const uni = JSON.parse(exportUniverse(a));
	check(uni.kind === 'wanderer-universe' && uni.planets.length === PLANETS && Array.isArray(uni.rifts), `universe export: ${uni.planets.length} planets, ${uni.rifts.length} rifts (${ms(t)})`);
} catch (e) {
	console.error(e);
	check(false, 'Wanderer export runs');
}

console.log(`\n${fails.length ? `selftest FAILED (${fails.length})` : 'selftest ok'} in ${ms(T0)}`);
if (fails.length) {
	for (const f of fails) console.log(' - ' + f);
	process.exit(1);
}
