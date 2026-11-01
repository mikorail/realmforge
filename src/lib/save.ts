import { deflateSync, inflateSync } from 'fflate';
import type { Universe } from './gen/universe';
import { Cosmos } from './sim/cosmos';
import { Simulation } from './sim/engine';

/**
 * Saves (format v2): a compressed, reference-preserving binary pack.
 * - The Universe as first saved is stored once per world seed (shared by all its slots) in the `bases` store.
 * - Each save stores the whole mutable graph, except that typed arrays whose
 *   contents still equal the base copy at the same path become a back-reference.
 *   So per save only changed arrays (cells.state/pop/culture/religion/h/biome,
 *   layer states, open masks, …) plus sim state travel, deflated.
 * - History snapshots' border arrays are XOR-chained to the previous snapshot
 *   (mostly zeros) before compression.
 * v1 records ({ meta, data: { u, sims, avatarPlanet } }) still load.
 */
const DB = 'realmforge';
const STORE = 'saves';
const BASES = 'bases';

function db(): Promise<IDBDatabase> {
	return new Promise((res, rej) => {
		const r = indexedDB.open(DB, 2);
		r.onupgradeneeded = () => {
			const d = r.result;
			if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
			if (!d.objectStoreNames.contains(BASES)) d.createObjectStore(BASES);
		};
		r.onsuccess = () => res(r.result);
		r.onerror = () => rej(r.error);
	});
}

export interface SaveMeta {
	slot: string;
	name: string;
	year: number;
	genre: string;
	planets: number;
	saved: number;
	/** user name, 'Autosave' or 'Quicksave'; absent on older records */
	label?: string;
}

export interface SaveData {
	u: Universe;
	sims: ReturnType<Simulation['dump']>[];
	avatarPlanet: number;
}

// ───────────────────────── reference-preserving binary pack ─────────────────────────

type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
type TypedCtor = { new (buf: ArrayBuffer, off: number, len: number): TypedArray; BYTES_PER_ELEMENT: number; name: string };
const TYPED: TypedCtor[] = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
const TYPED_BY_NAME = new Map(TYPED.map((t) => [t.name, t]));

function typedName(v: object): string | null {
	if (!ArrayBuffer.isView(v) || v instanceof DataView) return null;
	const n = v.constructor.name;
	return TYPED_BY_NAME.has(n) ? n : null;
}

/** typed arrays of a base value by path (every path, so aliases resolve too) */
export function indexTypedArrays(root: unknown, prefix = ''): Map<string, TypedArray> {
	const out = new Map<string, TypedArray>();
	const seen = new Set<object>();
	const walk = (v: unknown, path: string) => {
		if (!v || typeof v !== 'object') return;
		if (typedName(v)) { out.set(path, v as TypedArray); return; }
		if (seen.has(v)) return;
		seen.add(v);
		if (v instanceof Map || v instanceof Set) return;
		if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${i}`));
		else for (const k of Object.keys(v)) walk((v as Record<string, unknown>)[k], `${path}.${k}`);
	};
	walk(root, prefix);
	return out;
}

function sameArray(a: TypedArray, b: TypedArray) {
	if (a === b) return true;
	if (a.constructor !== b.constructor || a.length !== b.length) return false;
	// compare raw bytes (also handles NaN payloads in float arrays)
	const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength), y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
	for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
	return true;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * Serialise an arbitrary graph (plain objects, arrays, typed arrays, Map, Set,
 * undefined, NaN/±Infinity, shared + cyclic references) to bytes. Typed arrays that
 * equal `base` at the same path are written as a path reference instead of data.
 */
export function pack(value: unknown, base?: Map<string, TypedArray>): Uint8Array {
	// pass 1: which objects are reachable more than once (only those need an id)
	const multi = new Set<object>();
	const seen1 = new Set<object>();
	const count = (v: unknown) => {
		if (!v || typeof v !== 'object') return;
		if (seen1.has(v)) { multi.add(v); return; }
		seen1.add(v);
		if (typedName(v) || v instanceof Date) return;
		if (v instanceof Map) for (const [k, x] of v) { count(k); count(x); }
		else if (v instanceof Set || Array.isArray(v)) for (const x of v) count(x);
		else for (const k of Object.keys(v)) count((v as Record<string, unknown>)[k]);
	};
	count(value);
	seen1.clear();
	const ids = new Map<object, number>();
	const chunks: Uint8Array[] = [];
	let binLen = 0;
	const blob = (ta: TypedArray) => {
		const pad = (8 - (binLen % 8)) % 8;
		if (pad) { chunks.push(new Uint8Array(pad)); binLen += pad; }
		const off = binLen;
		chunks.push(new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength));
		binLen += ta.byteLength;
		return off;
	};
	const enc1 = (v: unknown, path: string): unknown => {
		if (v === undefined) return { $u: 1 };
		if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
		if (typeof v === 'bigint') return { $g: v.toString() };
		if (v === null || typeof v !== 'object') return typeof v === 'function' || typeof v === 'symbol' ? { $u: 1 } : v;
		const seen = ids.get(v);
		if (seen !== undefined) return { $r: seen };
		let id: number | undefined;
		if (multi.has(v)) { id = ids.size; ids.set(v, id); }
		const tn = typedName(v);
		if (tn) {
			const ta = v as TypedArray;
			const b = base?.get(path);
			if (b && sameArray(ta, b)) return { $b: path, i: id };
			return { $t: tn, i: id, o: blob(ta), n: ta.length };
		}
		if (v instanceof Map) return { $m: [...v].map(([k, x], j) => [enc1(k, `${path}.$k${j}`), enc1(x, `${path}.${j}`)]), i: id };
		if (v instanceof Set) return { $s: [...v].map((x, j) => enc1(x, `${path}.${j}`)), i: id };
		if (v instanceof Date) return { $d: v.getTime(), i: id };
		if (Array.isArray(v)) return { $a: v.map((x, j) => enc1(x, `${path}.${j}`)), i: id };
		const o: Record<string, unknown> = {};
		for (const k of Object.keys(v)) o[k] = enc1((v as Record<string, unknown>)[k], `${path}.${k}`);
		return { $o: o, i: id };
	};
	const json = enc.encode(JSON.stringify(enc1(value, '')));
	const head = 4 + json.length;
	const pad = (8 - (head % 8)) % 8;
	const out = new Uint8Array(head + pad + binLen);
	new DataView(out.buffer).setUint32(0, json.length, true);
	out.set(json, 4);
	let p = head + pad;
	for (const c of chunks) { out.set(c, p); p += c.length; }
	return out;
}

export function unpack(bytes: Uint8Array, base?: Map<string, TypedArray>): unknown {
	const len = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
	const tree = JSON.parse(dec.decode(bytes.subarray(4, 4 + len)));
	const head = 4 + len;
	const bin = head + ((8 - (head % 8)) % 8);
	const byId: unknown[] = [];
	const dec1 = (t: any): unknown => {
		if (t === null || typeof t !== 'object') return t;
		if ('$r' in t) return byId[t.$r];
		if ('$u' in t) return undefined;
		if ('$n' in t) return Number(t.$n);
		if ('$g' in t) return BigInt(t.$g);
		if ('$b' in t) {
			const b = base?.get(t.$b);
			if (!b) throw new Error(`save references missing base array ${t.$b}`);
			const copy = b.slice();
			if (t.i !== undefined) byId[t.i] = copy;
			return copy;
		}
		if ('$t' in t) {
			const C = TYPED_BY_NAME.get(t.$t)!;
			const src = bytes.subarray(bin + t.o, bin + t.o + t.n * C.BYTES_PER_ELEMENT);
			const buf = new ArrayBuffer(src.length);
			new Uint8Array(buf).set(src);
			const ta = new C(buf, 0, t.n);
			if (t.i !== undefined) byId[t.i] = ta;
			return ta;
		}
		if ('$m' in t) {
			const m = new Map();
			if (t.i !== undefined) byId[t.i] = m;
			for (const [k, x] of t.$m) m.set(dec1(k), dec1(x));
			return m;
		}
		if ('$s' in t) {
			const s = new Set();
			if (t.i !== undefined) byId[t.i] = s;
			for (const x of t.$s) s.add(dec1(x));
			return s;
		}
		if ('$d' in t) { const dt = new Date(t.$d); if (t.i !== undefined) byId[t.i] = dt; return dt; }
		if ('$a' in t) {
			const a: unknown[] = [];
			if (t.i !== undefined) byId[t.i] = a;
			for (const x of t.$a) a.push(dec1(x));
			return a;
		}
		const o: Record<string, unknown> = {};
		if (t.i !== undefined) byId[t.i] = o;
		for (const k of Object.keys(t.$o)) o[k] = dec1(t.$o[k]);
		return o;
	};
	return dec1(tree);
}

// ───────────────────────── save encode / decode (pure) ─────────────────────────

/** what a save holds; the dump arrays are live references, encode does not mutate them */
export function snapshotData(cos: Cosmos): SaveData {
	return { u: cos.u, sims: cos.sims.map((s) => s.dump()), avatarPlanet: cos.avatarPlanet };
}

/** XOR each history snapshot's border array with the previous one (copies; inverse of unchainHistory) */
function chainHistory(sims: SaveData['sims']): SaveData['sims'] {
	return sims.map((d) => {
		let prev: Uint16Array | null = null;
		const hs = (d.historySnapshots ?? []).map((snap) => {
			const cur = snap.surfaceStates;
			let out = cur;
			if (prev && cur instanceof Uint16Array && prev.length === cur.length) {
				out = new Uint16Array(cur.length);
				for (let i = 0; i < cur.length; i++) out[i] = cur[i] ^ prev[i];
			}
			prev = cur instanceof Uint16Array ? cur : null;
			return { ...snap, surfaceStates: out };
		});
		return { ...d, historySnapshots: hs };
	});
}

function unchainHistory(sims: SaveData['sims']) {
	for (const d of sims) {
		let prev: Uint16Array | null = null;
		for (const snap of d.historySnapshots ?? []) {
			const cur = snap.surfaceStates;
			if (prev && cur instanceof Uint16Array && prev.length === cur.length) for (let i = 0; i < cur.length; i++) cur[i] ^= prev[i];
			prev = cur instanceof Uint16Array ? cur : null;
		}
	}
}

/** compressed static World/Universe (written once per slot) */
export function encodeBase(u: Universe): Uint8Array {
	return deflateSync(pack(u), { level: 6 });
}

export function decodeBase(bytes: Uint8Array): Universe {
	return unpack(inflateSync(bytes)) as Universe;
}

const baseIndex = (base: Universe | null | undefined) => (base ? indexTypedArrays({ u: base }) : undefined);

/** compressed mutable state; typed arrays unchanged since `base` become references */
export function encodeSave(data: SaveData, base?: Universe | null): Uint8Array {
	const body = { u: data.u, sims: chainHistory(data.sims), avatarPlanet: data.avatarPlanet, hx: 1 };
	return deflateSync(pack(body, baseIndex(base)), { level: 6 });
}

export function decodeSave(bytes: Uint8Array, base?: Universe | null): SaveData {
	const body = unpack(inflateSync(bytes), baseIndex(base)) as SaveData & { hx?: number };
	if (body.hx) unchainHistory(body.sims);
	return { u: body.u, sims: body.sims, avatarPlanet: body.avatarPlanet };
}

export function cosmosFromData(data: SaveData): Cosmos {
	const cos = Object.create(Cosmos.prototype) as Cosmos;
	cos.u = data.u;
	cos.sims = data.u.planets.map((w, i) => Simulation.restore(w, data.sims[i]));
	cos.avatarPlanet = data.avatarPlanet;
	// same wiring as the Cosmos constructor: planetIndex seeds the story side rngs, cosmos backs rift powers
	cos.sims.forEach((s, i) => {
		s.cosmos = cos;
		s.planetIndex = i;
		s.skipper = (n) => cos.skip(n);
	});
	return cos;
}

/** same generated geometry? (a slot reused for a different world must rewrite its base) */
export function baseMatches(base: Universe, u: Universe) {
	if (base.seed !== u.seed || base.planets.length !== u.planets.length) return false;
	return base.planets.every((w, i) => {
		const c = u.planets[i].cells;
		return w.cells.n === c.n && sameArray(w.cells.x, c.x) && sameArray(w.cells.y, c.y);
	});
}

// ───────────────────────── slots (pure) ─────────────────────────

export type SlotKind = 'legacy' | 'manual' | 'auto' | 'quick';
export const AUTO_SLOTS = 3;

/** slot ids: `${seed}#${n}` manual, `${seed}#auto1..3` autosave ring, `${seed}#quick`; a bare seed is a legacy slot */
export function parseSlot(slot: string): { seed: string; kind: SlotKind; n: number } {
	const m = /^([\s\S]*)#(\d+|auto\d+|quick)$/.exec(slot);
	if (!m) return { seed: slot, kind: 'legacy', n: 0 };
	const t = m[2];
	if (t === 'quick') return { seed: m[1], kind: 'quick', n: 0 };
	if (t.startsWith('auto')) return { seed: m[1], kind: 'auto', n: +t.slice(4) };
	return { seed: m[1], kind: 'manual', n: +t };
}

export const slotId = (seed: string, n: number | string) => `${seed}#${n}`;

export function nextSlotId(seed: string, slots: string[]): string {
	let max = 0;
	for (const s of slots) {
		const p = parseSlot(s);
		if (p.seed === seed && p.kind === 'manual') max = Math.max(max, p.n);
	}
	return slotId(seed, max + 1);
}

/** ring slot to write next: a free one, else the oldest */
export function nextAutoSlot(seed: string, existing: { slot: string; saved: number }[]): string {
	const ring = Array.from({ length: AUTO_SLOTS }, (_, i) => slotId(seed, `auto${i + 1}`));
	const have = new Map(existing.filter((e) => ring.includes(e.slot)).map((e) => [e.slot, e.saved]));
	const free = ring.find((s) => !have.has(s));
	if (free) return free;
	return ring.reduce((a, b) => (have.get(b)! < have.get(a)! ? b : a));
}

export interface SaveGroup { seed: string; name: string; latest: number; saves: SaveMeta[] }

export function groupSaves(metas: SaveMeta[]): SaveGroup[] {
	const by = new Map<string, SaveGroup>();
	for (const m of metas) {
		const seed = parseSlot(m.slot).seed;
		let g = by.get(seed);
		if (!g) by.set(seed, (g = { seed, name: m.name, latest: 0, saves: [] }));
		g.saves.push(m);
		if (m.saved >= g.latest) { g.latest = m.saved; g.name = m.name; }
	}
	for (const g of by.values()) g.saves.sort((a, b) => b.saved - a.saved);
	return [...by.values()].sort((a, b) => b.latest - a.latest);
}

// ───────────────────────── .rfsave export / import (pure) ─────────────────────────

const MAGIC = enc.encode('RFSAVE\x01\n'); // 8 bytes

export interface ExportParts { seed: string; meta: SaveMeta; baseId: string; base: Uint8Array; blob: Uint8Array }

/** container: magic, then three length-prefixed parts (JSON header, base blob, save blob) exactly as stored */
export function encodeExport(p: ExportParts): Uint8Array {
	const head = enc.encode(JSON.stringify({ v: 1, seed: p.seed, meta: p.meta, baseId: p.baseId }));
	const out = new Uint8Array(MAGIC.length + 12 + head.length + p.base.length + p.blob.length);
	const dv = new DataView(out.buffer);
	let o = 0;
	out.set(MAGIC, o); o += MAGIC.length;
	for (const part of [head, p.base, p.blob]) {
		dv.setUint32(o, part.length, true); o += 4;
		out.set(part, o); o += part.length;
	}
	return out;
}

/** throws an Error with a user-readable message on anything that is not a valid, loadable save */
export function decodeExport(bytes: Uint8Array, deep = true): ExportParts {
	const bad = (why: string) => new Error(`Not a valid Realmforge save: ${why}`);
	if (bytes.length < MAGIC.length + 12 || MAGIC.some((b, i) => bytes[i] !== b)) throw bad('missing .rfsave header');
	const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let o = MAGIC.length;
	const parts: Uint8Array[] = [];
	for (let i = 0; i < 3; i++) {
		if (o + 4 > bytes.length) throw bad('file is truncated');
		const n = dv.getUint32(o, true); o += 4;
		if (o + n > bytes.length) throw bad('file is truncated');
		parts.push(bytes.slice(o, o + n)); o += n;
	}
	if (o !== bytes.length) throw bad('unexpected trailing data');
	let h: any;
	try { h = JSON.parse(dec.decode(parts[0])); } catch { throw bad('unreadable header'); }
	const m = h?.meta;
	if (h?.v !== 1 || typeof h.seed !== 'string' || typeof h.baseId !== 'string' || !m || typeof m.name !== 'string' || typeof m.year !== 'number' || typeof m.genre !== 'string' || typeof m.planets !== 'number' || typeof m.saved !== 'number' || (m.label !== undefined && typeof m.label !== 'string')) throw bad('unsupported or damaged header');
	if (!parts[1].length || !parts[2].length) throw bad('empty world or save data');
	if (deep) {
		try {
			const d = decodeSave(parts[2], decodeBase(parts[1]));
			if (!d?.u?.planets?.length || !Array.isArray(d.sims)) throw new Error('shape');
		} catch {
			throw bad('the save data is corrupt');
		}
	}
	return { seed: h.seed, meta: m as SaveMeta, baseId: h.baseId, base: parts[1], blob: parts[2] };
}

// ───────────────────────── storage ─────────────────────────

/** a warning message when the browser says < 10% of the storage quota is left, else null */
export async function lowStorageWarning(): Promise<string | null> {
	try {
		const e = await navigator.storage?.estimate?.();
		if (!e?.quota || e.usage === undefined) return null;
		const free = e.quota - e.usage;
		if (free / e.quota < 0.1) return `Browser storage is almost full (${Math.max(0, free / 1048576).toFixed(0)} MB free). Delete old saves or export them.`;
	} catch { /* unsupported */ }
	return null;
}

// ───────────────────────── IndexedDB ─────────────────────────

interface BaseRecord { id: string; blob: Uint8Array }
/** baseKey: key in `bases`; absent on records written before shared bases (then it equals the slot, a bare seed) */
interface V2Record { v: 2; meta: SaveMeta; baseId: string; baseKey?: string; blob: Uint8Array }
interface V1Record { meta: SaveMeta; data: SaveData }
export interface BaseRef { slot: string; baseKey: string; baseId: string }

const refOf = (slot: string, v: V1Record | V2Record): BaseRef | null => ('data' in v ? null : { slot, baseKey: v.baseKey ?? slot, baseId: v.baseId });

/** decoded bases by base key, so repeat saves skip re-reading the static world */
const baseCache = new Map<string, { id: string; u: Universe }>();

/** one save-ish operation at a time (saves, deletes, imports never overlap) */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
	const run = chain.then(fn, fn);
	chain = run.catch(() => {});
	return run;
}

function get<T>(d: IDBDatabase, store: string, key: string): Promise<T | undefined> {
	return new Promise((res) => {
		const r = d.transaction(store).objectStore(store).get(key);
		r.onsuccess = () => res(r.result as T | undefined);
		r.onerror = () => res(undefined);
	});
}

function done(tx: IDBTransaction) {
	return new Promise<void>((res, rej) => {
		tx.oncomplete = () => res();
		tx.onerror = () => rej(tx.error);
		tx.onabort = () => rej(tx.error);
	});
}

async function slotBase(d: IDBDatabase, key: string): Promise<{ id: string; u: Universe } | null> {
	const hit = baseCache.get(key);
	if (hit) return hit;
	const rec = await get<BaseRecord>(d, BASES, key);
	if (!rec) return null;
	const b = { id: rec.id, u: decodeBase(rec.blob) };
	baseCache.set(key, b);
	return b;
}

/** base references of every stored slot */
function allRefs(d: IDBDatabase): Promise<BaseRef[]> {
	return new Promise((res) => {
		const out: BaseRef[] = [];
		const cur = d.transaction(STORE).objectStore(STORE).openCursor();
		cur.onsuccess = () => {
			const c = cur.result;
			if (!c) return res(out);
			const r = refOf(String(c.key), c.value as V1Record | V2Record);
			if (r) out.push(r);
			c.continue();
		};
		cur.onerror = () => res(out);
	});
}

/** stored base keys that no remaining slot references */
export function unusedBaseKeys(keys: string[], refs: BaseRef[]) {
	const used = new Set(refs.map((r) => r.baseKey));
	return keys.filter((k) => !used.has(k));
}

/** bases no slot points to any more (deleted with the last slot that used them) */
async function pruneBases(d: IDBDatabase) {
	const refs = await allRefs(d);
	const keys = await new Promise<string[]>((res) => {
		const r = d.transaction(BASES).objectStore(BASES).getAllKeys();
		r.onsuccess = () => res(r.result.map(String));
		r.onerror = () => res([]);
	});
	const dead = unusedBaseKeys(keys, refs);
	if (!dead.length) return;
	const tx = d.transaction(BASES, 'readwrite');
	for (const k of dead) { tx.objectStore(BASES).delete(k); baseCache.delete(k); }
	await done(tx);
}

/** key for a new base of `seed`: the plain seed unless another slot still uses that key */
export function newBaseKey(refs: BaseRef[], seed: string, slot: string, id: string) {
	return refs.some((r) => r.slot !== slot && r.baseKey === seed) ? `${seed}@${id}` : seed;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function saveGame(slot: string, cos: Cosmos, opts: { label?: string } = {}) {
	return serial(async () => {
		const d = await db();
		const seed = `${cos.u.seed}`;
		const own = await get<V1Record | V2Record>(d, STORE, slot);
		const ownRef = own ? refOf(slot, own) : null;
		let key = ownRef?.baseKey ?? seed;
		let base = await slotBase(d, key).catch(() => null);
		let newBase: (BaseRecord & { key: string }) | null = null;
		if (!base || !baseMatches(base.u, cos.u)) {
			const id = newId();
			key = newBaseKey(await allRefs(d), seed, slot, id);
			const blob = encodeBase(cos.u);
			newBase = { id, blob, key };
			base = { id, u: decodeBase(blob) };
		}
		const blob = encodeSave(snapshotData(cos), base.u);
		const label = opts.label ?? own?.meta.label;
		const meta: SaveMeta = { slot, name: cos.u.planets[0].name, year: cos.year, genre: cos.u.planets[0].opts.genre, planets: cos.u.planets.length, saved: Date.now(), ...(label ? { label } : {}) };
		const rec: V2Record = { v: 2, meta, baseId: base.id, baseKey: key, blob };
		const tx = d.transaction([STORE, BASES], 'readwrite');
		if (newBase) tx.objectStore(BASES).put({ id: newBase.id, blob: newBase.blob } satisfies BaseRecord, newBase.key);
		tx.objectStore(STORE).put(rec, slot);
		await done(tx);
		baseCache.set(key, base);
		if (newBase) await pruneBases(d);
	});
}

export async function listSaves(): Promise<SaveMeta[]> {
	try {
		const d = await db();
		return await new Promise((res) => {
			const out: SaveMeta[] = [];
			const cur = d.transaction(STORE).objectStore(STORE).openCursor();
			cur.onsuccess = () => {
				const c = cur.result;
				if (!c) return res(out.sort((a, b) => b.saved - a.saved));
				const m = (c.value as { meta?: SaveMeta }).meta;
				if (m) out.push(m);
				c.continue();
			};
			cur.onerror = () => res(out);
		});
	} catch {
		return [];
	}
}

export async function loadGame(slot: string): Promise<Cosmos | null> {
	const d = await db();
	const v = await get<V1Record | V2Record>(d, STORE, slot);
	if (!v) return null;
	if ('data' in v) return cosmosFromData(v.data); // v1: plain structured clone
	const key = v.baseKey ?? slot;
	baseCache.delete(key);
	const base = await slotBase(d, key);
	if (!base || base.id !== v.baseId) {
		console.warn(`save ${slot}: world data missing or mismatched`);
		return null;
	}
	try {
		return cosmosFromData(decodeSave(v.blob, base.u));
	} catch (e) {
		console.warn(`save ${slot} could not be decoded`, e);
		return null;
	}
}

/** deletes the slot; its base goes only when no other slot still uses it */
export function deleteSave(slot: string) {
	return serial(async () => {
		const d = await db();
		const tx = d.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).delete(slot);
		await done(tx);
		await pruneBases(d);
	});
}

export function renameSave(slot: string, label: string) {
	return serial(async () => {
		const d = await db();
		const v = await get<V1Record | V2Record>(d, STORE, slot);
		if (!v) return;
		const l = label.trim().slice(0, 80);
		const meta = { ...v.meta };
		if (l) meta.label = l; else delete meta.label;
		const tx = d.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put({ ...v, meta }, slot);
		await done(tx);
	});
}

/** the .rfsave bytes for a slot (null if missing) */
export async function exportSave(slot: string): Promise<{ filename: string; bytes: Uint8Array } | null> {
	const d = await db();
	const v = await get<V1Record | V2Record>(d, STORE, slot);
	if (!v) return null;
	let parts: ExportParts;
	if ('data' in v) {
		const base = encodeBase(v.data.u);
		parts = { seed: `${v.data.u.seed}`, meta: v.meta, baseId: newId(), base, blob: encodeSave(v.data, decodeBase(base)) };
	} else {
		const b = await get<BaseRecord>(d, BASES, v.baseKey ?? slot);
		if (!b || b.id !== v.baseId) throw new Error('This save’s world data is missing, so it cannot be exported.');
		parts = { seed: parseSlot(slot).seed, meta: v.meta, baseId: v.baseId, base: b.blob, blob: v.blob };
	}
	const safe = (v.meta.label ?? v.meta.name).replace(/[^\w.-]+/g, '_').slice(0, 40) || 'world';
	return { filename: `${safe}-y${v.meta.year}.rfsave`, bytes: encodeExport(parts) };
}

/** validates and stores an exported save as a fresh slot of its world; throws a readable Error on bad files */
export function importSave(bytes: Uint8Array): Promise<SaveMeta> {
	const p = decodeExport(bytes);
	return serial(async () => {
		const d = await db();
		const refs = await allRefs(d);
		const same = refs.find((r) => r.baseId === p.baseId);
		const key = same?.baseKey ?? newBaseKey(refs, p.seed, '', p.baseId);
		const writeBase = !same || !(await get(d, BASES, key));
		const slot = nextSlotId(p.seed, refs.map((r) => r.slot));
		const meta: SaveMeta = { ...p.meta, slot, label: p.meta.label ?? 'Imported' };
		const tx = d.transaction([STORE, BASES], 'readwrite');
		if (writeBase) tx.objectStore(BASES).put({ id: p.baseId, blob: p.base } satisfies BaseRecord, key);
		tx.objectStore(STORE).put({ v: 2, meta, baseId: p.baseId, baseKey: key, blob: p.blob } satisfies V2Record, slot);
		await done(tx);
		baseCache.delete(key);
		return meta;
	});
}
