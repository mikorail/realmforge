import type { Burg, World } from '../gen/types';
import type { Person } from './types';

const EMPTY: readonly never[] = [];

/**
 * Lazily maintained lookups so yearly/monthly systems stop scanning all-time `people` and every burg.
 *
 * - `living()` is exact without hooks: people never come back to life and new ones are only appended,
 *   so the list drops the dead and ingests the tail of `people` whenever it is asked for.
 * - `inState()` / `burgsIn()` are candidate lists grouped by owning state. They are rebuilt after
 *   `touch()`, which every write to `person.state` or `burg.state` must call (crown, takeCell, fall,
 *   mergeInto, colonize, foundState, syncBurgs, demographics, avatar deeds). Callers re-check
 *   `alive`/`state` on read, so stale entries are harmless; only a missed `touch()` could hide one.
 *   The sim also touches once per tick as a safety net.
 *
 * Every list keeps the original array order (person id / burg index), so iteration order and
 * therefore RNG consumption match a plain `people.filter(...)` / `burgs.filter(...)`.
 */
export class SimIndex {
	private peopleRef: Person[] | null = null;
	private scanned = 0;
	private live: Person[] = [];
	private gen = 0;
	private byStateGen = -1;
	private byStateLive: Person[] | null = null;
	private byState = new Map<number, Person[]>();
	private burgRef: Burg[] | null = null;
	private burgLen = 0;
	private burgGen = -1;
	private burgsByState = new Map<number, Burg[]>();

	/** a person's or burg's owning state changed */
	touch() {
		this.gen++;
	}

	/** living people with id > 0, in id order. Copy-on-write: a returned array is never mutated later. */
	living(people: Person[]): Person[] {
		if (people !== this.peopleRef) {
			this.peopleRef = people;
			this.scanned = 0;
			this.live = [];
		}
		let dead = false;
		for (const p of this.live) if (!p.alive) { dead = true; break; }
		if (dead || this.scanned < people.length) {
			const next = dead ? this.live.filter((p) => p.alive) : this.live.slice();
			for (let i = this.scanned; i < people.length; i++) {
				const p = people[i];
				if (p.alive && p.id) next.push(p);
			}
			this.scanned = people.length;
			this.live = next;
		}
		return this.live;
	}

	/** number of `people` entries already folded into `living()` */
	get scannedLength() {
		return this.scanned;
	}

	/** living people whose state was `id` at the last rebuild; re-check `alive && state === id` */
	inState(people: Person[], id: number): readonly Person[] {
		const live = this.living(people);
		if (this.byStateGen !== this.gen || this.byStateLive !== live) {
			this.byState.clear();
			for (const p of live) {
				const l = this.byState.get(p.state);
				if (l) l.push(p);
				else this.byState.set(p.state, [p]);
			}
			this.byStateGen = this.gen;
			this.byStateLive = live;
		}
		return this.byState.get(id) ?? EMPTY;
	}

	/** burgs (any, in array order) whose state was `id` at the last rebuild; re-check `alive && state === id` */
	burgsIn(burgs: Burg[], id: number): readonly Burg[] {
		if (this.burgGen !== this.gen || this.burgRef !== burgs || this.burgLen !== burgs.length) {
			this.burgsByState.clear();
			for (const b of burgs) {
				const l = this.burgsByState.get(b.state);
				if (l) l.push(b);
				else this.burgsByState.set(b.state, [b]);
			}
			this.burgGen = this.gen;
			this.burgRef = burgs;
			this.burgLen = burgs.length;
		}
		return this.burgsByState.get(id) ?? EMPTY;
	}
}

/** cells of each state on one layer, CSR: cells of s are `cells[start[s] .. start[s+1])`, ascending */
export function cellsByState(st: Uint16Array, nStates: number): { start: Int32Array; cells: Int32Array } {
	const start = new Int32Array(nStates + 2);
	for (let i = 0; i < st.length; i++) if (st[i] <= nStates) start[st[i] + 1]++;
	for (let s = 0; s <= nStates; s++) start[s + 1] += start[s];
	const fill = start.slice(0, nStates + 1);
	const cells = new Int32Array(start[nStates + 1]);
	for (let i = 0; i < st.length; i++) if (st[i] <= nStates) cells[fill[st[i]]++] = i;
	return { start, cells };
}

/** copy `cur` into `known`, calling `changed(i)` for every differing index; compares 32 bits at a time */
function diffInto(cur: Uint16Array | Uint8Array, known: Uint16Array | Uint8Array, changed: (i: number) => void) {
	const n = cur.length, per = 4 / cur.BYTES_PER_ELEMENT;
	let i0 = 0;
	if (cur.byteOffset % 4 === 0 && known.byteOffset % 4 === 0) {
		const words = Math.floor(n / per);
		const a = new Uint32Array(cur.buffer, cur.byteOffset, words), b = new Uint32Array(known.buffer, known.byteOffset, words);
		for (let q = 0; q < words; q++) {
			if (a[q] === b[q]) continue;
			for (let i = q * per; i < q * per + per; i++) if (cur[i] !== known[i]) { known[i] = cur[i]; changed(i); }
		}
		i0 = words * per;
	}
	for (let i = i0; i < n; i++) if (cur[i] !== known[i]) { known[i] = cur[i]; changed(i); }
}

/** ascending list of open cells per layer, re-derived only when that layer's open mask changed */
export class OpenCells {
	private masks: Uint8Array[] = [];
	private lists: Int32Array[] = [];

	of(li: number, open: Uint8Array): Int32Array {
		let mask = this.masks[li];
		let dirty = !mask || mask.length !== open.length;
		if (!dirty) diffInto(open, mask, () => (dirty = true));
		if (dirty) {
			mask = this.masks[li] = open.slice();
			let n = 0;
			for (let i = 0; i < mask.length; i++) n += mask[i] ? 1 : 0;
			const list = new Int32Array(n);
			for (let i = 0, k = 0; i < mask.length; i++) if (mask[i]) list[k++] = i;
			this.lists[li] = list;
		}
		return this.lists[li];
	}
}

const NONE = 0xffffffff;
const pairKey = (a: number, b: number) => (a < b ? a * 65536 + b : b * 65536 + a);

/**
 * Contested edges (both cells open, owned by two different realms) on every layer, maintained
 * incrementally and bucketed by the unordered pair of owners, so a war only visits its own fronts.
 *
 * `sync()` runs at the start of a war month: it diffs each layer's state/open arrays against the
 * copy taken last time and refreshes only edges touching changed cells (no hooks needed).
 * The month's set of edges is then frozen, matching the old "scan once per month" semantics:
 * conquests during the month only re-key existing entries (`rekey`), they never add new fronts.
 * Edge id g = layer * edges.n + edge, so ascending ids are the old scan order.
 */
export class FrontIndex {
	private nL = 0;
	private nE = 0;
	private nC = 0;
	private edges: World['edges'] | null = null;
	private key = new Uint32Array(0);
	private known: Uint16Array[] = [];
	private knownOpen: Uint8Array[] = [];
	private buckets = new Map<number, number[]>();
	private pushes = 0;
	private incStart = new Int32Array(0);
	private incList = new Int32Array(0);
	/** layer * cells + cell for every rekey() since the last sync */
	private rekeyed: number[] = [];

	private init(w: World) {
		const E = w.edges, n = w.cells.n;
		this.nL = w.layers.length;
		this.nE = E.n;
		this.nC = n;
		this.edges = E;
		this.key = new Uint32Array(this.nL * E.n).fill(NONE);
		this.known = w.layers.map(() => new Uint16Array(n));
		this.knownOpen = w.layers.map(() => new Uint8Array(n));
		this.buckets.clear();
		this.pushes = 0;
		this.rekeyed = [];
		const start = new Int32Array(n + 1);
		for (let e = 0; e < E.n; e++) { start[E.a[e] + 1]++; start[E.b[e] + 1]++; }
		for (let i = 0; i < n; i++) start[i + 1] += start[i];
		const fill = start.slice(0, n);
		const list = new Int32Array(E.n * 2);
		for (let e = 0; e < E.n; e++) { list[fill[E.a[e]]++] = e; list[fill[E.b[e]]++] = e; }
		this.incStart = start;
		this.incList = list;
	}

	private push(k: number, g: number) {
		const l = this.buckets.get(k);
		if (l) l.push(g);
		else this.buckets.set(k, [g]);
		this.pushes++;
	}

	/** recompute the contested status of every edge around one cell */
	private refresh(w: World, li: number, i: number) {
		const E = w.edges, L = w.layers[li], st = L.state, op = L.open, key = this.key;
		for (let k = this.incStart[i]; k < this.incStart[i + 1]; k++) {
			const e = this.incList[k], a = E.a[e], b = E.b[e], g = li * this.nE + e;
			const sa = st[a], sb = st[b];
			const nk = op[a] && op[b] && sa !== sb && sa && sb ? pairKey(sa, sb) : NONE;
			if (nk !== key[g]) {
				key[g] = nk;
				if (nk !== NONE) this.push(nk, g);
			}
		}
	}

	/** bring every edge's contested status up to date (start of a war month) */
	sync(w: World) {
		if (this.edges !== w.edges || this.nL !== w.layers.length || this.nC !== w.cells.n) this.init(w);
		const key = this.key;
		// cells re-keyed since the last sync may have changed back before now, invisible to the diff
		for (const d of this.rekeyed) this.refresh(w, Math.floor(d / this.nC), d % this.nC);
		this.rekeyed = [];
		for (let li = 0; li < this.nL; li++) {
			const L = w.layers[li];
			const changed = (i: number) => this.refresh(w, li, i);
			diffInto(L.state, this.known[li], changed);
			diffInto(L.open, this.knownOpen[li], changed);
		}
		// buckets keep stale entries until gathered; rebuild them all once they bloat
		if (this.pushes > key.length) {
			this.buckets.clear();
			this.pushes = 0;
			for (let g = 0; g < key.length; g++) if (key[g] !== NONE) this.push(key[g], g);
		}
	}

	/** a cell changed owner mid-month: re-key this month's edges around it (never adds new ones) */
	rekey(w: World, cell: number, li: number) {
		if (this.edges !== w.edges) return;
		const E = w.edges, st = w.layers[li].state, key = this.key;
		this.rekeyed.push(li * this.nC + cell);
		for (let k = this.incStart[cell]; k < this.incStart[cell + 1]; k++) {
			const e = this.incList[k], g = li * this.nE + e;
			if (key[g] === NONE) continue;
			const nk = pairKey(st[E.a[e]], st[E.b[e]]);
			if (nk !== key[g]) {
				key[g] = nk;
				this.push(nk, g);
			}
		}
	}

	/** owners may have changed outside takeCell mid-month (e.g. a merge after a war ended): re-key them */
	resync(w: World) {
		if (this.edges !== w.edges) return;
		for (const d of this.rekeyed.slice()) this.rekey(w, d % this.nC, Math.floor(d / this.nC));
		for (let li = 0; li < this.nL; li++) {
			const st = w.layers[li].state, K = this.known[li];
			for (let i = 0; i < this.nC; i++) if (st[i] !== K[i]) this.rekey(w, i, li);
		}
	}

	/** this month's edges whose current owners are one attacker and one defender, ascending edge id */
	gather(att: Set<number>, def: Set<number>): Int32Array {
		const key = this.key;
		const seen = new Set<number>();
		const parts: number[][] = [];
		let total = 0;
		for (const a of att) for (const d of def) {
			const k = pairKey(a, d);
			if (seen.has(k)) continue;
			seen.add(k);
			const l = this.buckets.get(k);
			if (!l) continue;
			let m = 0;
			for (let r = 0; r < l.length; r++) if (key[l[r]] === k) l[m++] = l[r];
			l.length = m;
			if (!m) { this.buckets.delete(k); continue; }
			parts.push(l);
			total += m;
		}
		const out = new Int32Array(total);
		let o = 0;
		for (const l of parts) for (const g of l) out[o++] = g;
		out.sort();
		// an edge can sit in its bucket twice if it moved away and back; drop repeats
		let u = 0;
		for (let r = 0; r < out.length; r++) if (r === 0 || out[r] !== out[r - 1]) out[u++] = out[r];
		return out.subarray(0, u);
	}

	get edgeCount() {
		return this.nE;
	}
}
