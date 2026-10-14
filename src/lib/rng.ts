/** Seeded PRNG (mulberry32): every world + simulation is reproducible from its seed. */
export interface Rng {
	(): number;
	/** integer in [min, max] */
	int(min: number, max: number): number;
	pick<T>(arr: readonly T[]): T;
	shuffle<T>(arr: readonly T[]): T[];
	chance(p: number): boolean;
	/** gaussian-ish via 3-sample average, mean m, spread s */
	gauss(m: number, s: number): number;
	/** weighted pick by parallel weights */
	weighted<T>(arr: readonly T[], w: readonly number[]): T;
	state(): number;
}

export function hashSeed(s: string): number {
	let h = 1779033703 ^ s.length;
	for (let i = 0; i < s.length; i++) {
		h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	h = Math.imul(h ^ (h >>> 16), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	return (h ^= h >>> 16) >>> 0;
}

export function makeRng(seed: string | number): Rng {
	let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
	const r = (() => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}) as Rng;
	r.int = (min, max) => min + Math.floor(r() * (max - min + 1));
	r.pick = (arr) => arr[Math.floor(r() * arr.length)];
	r.shuffle = <T>(arr: readonly T[]) => {
		const res = arr.slice();
		for (let i = res.length - 1; i > 0; i--) {
			const j = Math.floor(r() * (i + 1));
			const tmp = res[i];
			res[i] = res[j];
			res[j] = tmp;
		}
		return res;
	};
	r.chance = (p) => r() < p;
	r.gauss = (m, s) => m + ((r() + r() + r()) / 3 - 0.5) * 2 * s;
	r.weighted = (arr, w) => {
		let total = 0;
		for (const x of w) total += x;
		let t = r() * total;
		for (let i = 0; i < arr.length; i++) if ((t -= w[i]) <= 0) return arr[i];
		return arr[arr.length - 1];
	};
	r.state = () => a >>> 0;
	return r;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** max of a large array without spreading (spread overflows the call stack at ~100k items in browsers) */
export function maxOf(a: ArrayLike<number>): number {
	let m = -Infinity;
	for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i];
	return m;
}
