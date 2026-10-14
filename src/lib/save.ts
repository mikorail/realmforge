import type { Universe } from './gen/universe';
import { Cosmos } from './sim/cosmos';
import { Simulation } from './sim/engine';

/** IndexedDB saves: structured clone keeps typed arrays (and shared references) intact. */
const DB = 'realmforge';
const STORE = 'saves';

function db(): Promise<IDBDatabase> {
	return new Promise((res, rej) => {
		const r = indexedDB.open(DB, 1);
		r.onupgradeneeded = () => r.result.createObjectStore(STORE);
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
}

export async function saveGame(slot: string, cos: Cosmos) {
	const d = await db();
	const data = { u: cos.u, sims: cos.sims.map((s) => s.dump()), avatarPlanet: cos.avatarPlanet };
	const meta: SaveMeta = { slot, name: cos.u.planets[0].name, year: cos.year, genre: cos.u.planets[0].opts.genre, planets: cos.u.planets.length, saved: Date.now() };
	await new Promise<void>((res, rej) => {
		const tx = d.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put({ meta, data }, slot);
		tx.oncomplete = () => res();
		tx.onerror = () => rej(tx.error);
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
				out.push((c.value as { meta: SaveMeta }).meta);
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
	const v = await new Promise<{ data: { u: Universe; sims: ReturnType<Simulation['dump']>[]; avatarPlanet: number } } | undefined>((res) => {
		const r = d.transaction(STORE).objectStore(STORE).get(slot);
		r.onsuccess = () => res(r.result);
		r.onerror = () => res(undefined);
	});
	if (!v) return null;
	const cos = Object.create(Cosmos.prototype) as Cosmos;
	cos.u = v.data.u;
	cos.sims = v.data.u.planets.map((w, i) => Simulation.restore(w, v.data.sims[i]));
	cos.avatarPlanet = v.data.avatarPlanet;
	for (const s of cos.sims) s.skipper = (n) => cos.skip(n);
	return cos;
}

export async function deleteSave(slot: string) {
	const d = await db();
	d.transaction(STORE, 'readwrite').objectStore(STORE).delete(slot);
}
