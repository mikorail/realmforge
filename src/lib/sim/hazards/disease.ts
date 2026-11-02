/**
 * Named diseases. `sim.plague` stays the per-cell intensity field (renderer, lifecycle and other systems
 * read and write it); hazards add which outbreak each cell carries (`ob`), immunity memory per cell, and
 * per-realm responses by era, ideology and faith: quarantine (towns closed, trade hit, roads stop carrying
 * it), physicians and hospitals (lower lethality), vaccination (immunity), prayer processions (faster
 * spread) and scapegoating (persecution through society/). Monthly spread and yearly responses use side rngs.
 */
import { clamp, type Rng } from '../../rng';
import { cultureProfile } from '../culture/profile';
import { startPersecution } from '../society/persecution';
import { w3On } from '../society/state';
import type { Simulation } from '../engine';
import type { Polity } from '../types';
import { DISEASES, DISEASE_BY_ID, diseaseIndex, type DiseaseProfile } from './data';
import { famineAfter, line, logHz } from './common';
import { hz, hzRng, type Outbreak, type Response } from './state';

const realmName = (sim: Simulation, s: number) => sim.polities[s]?.name ?? 'the borderlands';
const townAt = (sim: Simulation, cell: number) => (sim.c.burg[cell] ? sim.w.burgs[sim.c.burg[cell]] : null);

/** the most fitting disease for a place and age */
export function pickDisease(sim: Simulation, cell: number, r: Rng): string {
	const c = sim.c, g = sim.voice;
	const b = townAt(sim, cell);
	const wet = c.temp[cell] >= 19 && [5, 7, 12].includes(c.biome[cell]);
	const farm = [3, 4, 5, 6].includes(c.biome[cell]);
	const w: Record<string, number> = {
		pestilence: 3 * (b?.port || c.road[cell] ? 1.5 : 1),
		flux: 1 + (c.river[cell] || b?.port ? 2 : 0),
		pox: 1.5,
		fever: wet ? 3 : 0.15,
		consumption: 0.6 + (b && b.pop > 15 ? 1 : 0),
		blight: farm ? 1.1 : 0,
		miasma: g === 'steampunk' || g === 'dieselpunk' ? 3 : 0,
		radiation: g === 'atompunk' || g === 'wasteland' ? 2 : 0,
		strain: g === 'biopunk' || g === 'cyberpunk' ? 3 : 0,
		hollowing: g === 'fantasy' || g === 'mythic' || g === 'twilight' ? 0.7 : 0
	};
	return r.weighted(DISEASES.map((d) => d.id), DISEASES.map((d) => w[d.id] ?? 0));
}

/** disease for plague written straight into `sim.plague` by other systems (pandemic power, crises, gene vats) */
const strayDisease = (sim: Simulation) => (sim.voice === 'biopunk' || sim.voice === 'cyberpunk' ? 'strain' : 'pestilence');

function outbreakName(sim: Simulation, d: DiseaseProfile, cell: number, r: Rng): string {
	const t = townAt(sim, cell);
	const used = new Set(hz(sim).outbreaks.map((o) => o.name));
	for (let k = 0; k < 6; k++) {
		const nm = t && r.chance(0.35) ? `the ${t.name} ${r.pick(d.noun)}` : `the ${r.pick(d.adj)} ${r.pick(d.noun)}`;
		if (!used.has(nm)) return nm;
	}
	return `the ${r.pick(d.adj)} ${r.pick(d.noun)} of Y${sim.year}`;
}

function newOutbreak(sim: Simulation, cell: number, disease: string, r: Rng): Outbreak {
	const st = hz(sim);
	const d = DISEASE_BY_ID[disease] ?? DISEASES[0];
	const o: Outbreak = { id: st.nextOb++, disease: d.id, name: outbreakName(sim, d, cell, r), since: sim.year, cell, state: sim.c.state[cell], months: 0, quarantined: [], answered: [], deaths: 0 };
	if (st.nextOb > 65000) st.nextOb = 1;
	st.outbreaks.push(o);
	const ended = st.outbreaks.filter((x) => x.ended !== undefined);
	if (ended.length > 30) { const drop = new Set(ended.slice(0, ended.length - 30)); st.outbreaks = st.outbreaks.filter((x) => !drop.has(x)); }
	return o;
}

/** start an outbreak at `cell` (logged); `disease` unset = picked from the place and age */
export function seedOutbreak(sim: Simulation, cell: number, v: number, disease?: string, cause?: number, quiet = false): Outbreak {
	const st = hz(sim);
	const r = hzRng(sim, 'ob', sim.year, sim.month, cell, st.nextOb);
	const o = newOutbreak(sim, cell, disease ?? pickDisease(sim, cell, r), r);
	const d = DISEASE_BY_ID[o.disease];
	sim.plagueActive = true;
	sim.plague[cell] = Math.max(sim.plague[cell], v);
	st.ob[cell] = o.id;
	if (!quiet) {
		const t = townAt(sim, cell);
		const vars = { disease: o.name, desc: d.desc, town: t?.name ?? 'the frontier', realm: realmName(sim, sim.c.state[cell]) };
		const ev = logHz(sim, 'plague', cap(line(sim, o.disease === 'blight' ? 'blight' : 'outbreak', r, vars)), cell, sim.c.state[cell], cause);
		o.ev = ev.id;
	}
	sim.dirty.political = true;
	return o;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `sim.seedPlague` with hazards on: the god powers' plague is the flea-borne pestilence, lesser seeds pick by place */
export function hazardSeedPlague(sim: Simulation, cell: number, v: number) {
	const r = hzRng(sim, 'sp', sim.year, sim.month, cell);
	seedOutbreak(sim, cell, v, v >= 1 ? 'pestilence' : pickDisease(sim, cell, r));
}

const MED = [1, 0.8, 0.6, 0.45, 0.35];

function susceptible(st: ReturnType<typeof hz>, j: number, k: number) {
	const im = st.imm[j];
	if (!im) return 1;
	return 1 - (st.immK[j] === k + 1 ? im / 100 : im / 400);
}

/** monthly spread (replaces the generic plague spread when hazards are on) */
export function spreadDisease(sim: Simulation) {
	if (!sim.plagueActive) return;
	const st = hz(sim), c = sim.c, pl = sim.plague;
	const r = hzRng(sim, 'm', sim.year, sim.month);
	const live = new Map<number, Outbreak>();
	for (const o of st.outbreaks) if (o.ended === undefined) live.set(o.id, o);
	let stray: Outbreak | null = null;
	const next = pl.slice();
	const nob = st.ob.slice();
	const seen = new Set<number>();
	let any = false;
	for (let i = 0; i < c.n; i++) {
		if (pl[i] <= 0.02) {
			if (pl[i]) {
				next[i] = 0;
				const o = live.get(st.ob[i]);
				if (o) {
					const d = DISEASE_BY_ID[o.disease];
					if (d.immunity > 0) { const k = diseaseIndex(d.id); const v = Math.round(100 * d.immunity); if (st.immK[i] !== k + 1 || st.imm[i] < v) { st.imm[i] = v; st.immK[i] = k + 1; } }
				}
				nob[i] = 0;
			}
			continue;
		}
		any = true;
		let o = live.get(st.ob[i]);
		if (!o) {
			if (!stray) { stray = newOutbreak(sim, i, strayDisease(sim), r); live.set(stray.id, stray); }
			o = stray;
			nob[i] = o.id;
		}
		seen.add(o.id);
		const d = DISEASE_BY_ID[o.disease] ?? DISEASES[0];
		const k = diseaseIndex(d.id);
		const resp: Response = st.resp[c.state[i]] ?? {};
		const loss = c.pop[i] * pl[i] * d.lethal * MED[resp.med ?? 0];
		c.pop[i] -= loss;
		o.deaths += loss;
		next[i] = Math.min(next[i], pl[i] * d.decay);
		const procM = resp.proc ? 1.3 : 1;
		const base = d.trans / 0.3;
		for (let q = c.nStart[i]; q < c.nStart[i + 1]; q++) {
			const j = c.nList[q];
			const land = sim.isLand(j);
			if (!land && !c.road[i]) continue;
			const road = !!c.road[j];
			let m = road ? 0.35 : 0.18;
			switch (d.vector) {
				case 'flea': m *= road ? 1.2 : 1; break;
				case 'water': m *= c.river[j] && c.river[i] ? 2 : road ? 1 : 0.6; break;
				case 'mosquito': m *= c.temp[j] >= 18 && [5, 7, 12].includes(c.biome[j]) ? 1.5 : 0.15; break;
				case 'air': m *= c.pop[j] > 1 ? 1.3 : 0.8; break;
				case 'crop': m *= [3, 4, 5, 6].includes(c.biome[j]) ? 1.2 : 0.3; break;
				case 'engineered': m *= road ? 1.6 : 1; break;
			}
			if (resp.q && road) m *= 0.35;
			const amt = pl[i] * base * m * procM * susceptible(st, j, k) * (c.pop[j] > 1 ? 1.2 : 0.6);
			if (amt > next[j] && amt > 0.025 && r.chance(0.3)) { next[j] = Math.min(1, amt); nob[j] = o.id; }
		}
	}
	sim.plague = next;
	st.ob = nob;
	for (const o of live.values()) {
		if (seen.has(o.id)) { o.months++; continue; }
		o.ended = sim.year;
		o.quarantined = [];
		if (o.ev !== undefined || o.months >= 6) {
			const rr = hzRng(sim, 'end', o.id);
			sim.log('misc', cap(line(sim, 'outbreakEnd', rr, { disease: o.name, realm: realmName(sim, o.state), n: Math.max(1, o.months) })), o.cell, o.state || undefined);
		}
	}
	if (any) sim.dirty.political = true;
	sim.plagueActive = any;
}

/** yearly: immunity fades, natural outbreaks, realm responses */
export function yearlyDisease(sim: Simulation) {
	const st = hz(sim), c = sim.c;
	for (let i = 0; i < c.n; i++) if (st.imm[i]) st.imm[i] = Math.max(0, st.imm[i] - 2);
	const r = hzRng(sim, 'dz', sim.year);
	if (r.chance(0.035)) {
		const towns = sim.w.burgs.filter((b) => b.id && b.alive && sim.burgLayer(b) === 0);
		if (towns.length) {
			const b = r.weighted(towns, towns.map((t) => 1 + t.pop));
			if (sim.plague[b.cell] < 0.1) seedOutbreak(sim, b.cell, 0.5);
		}
	}
	responses(sim, r);
}

function responses(sim: Simulation, r: Rng) {
	const st = hz(sim), c = sim.c;
	st.resp = {};
	if (!sim.plagueActive) return;
	const live = st.outbreaks.filter((o) => o.ended === undefined);
	if (!live.length) return;
	const byOb = new Map<number, Map<number, number>>();
	for (let i = 0; i < c.n; i++) {
		if (sim.plague[i] <= 0.05 || !st.ob[i] || !c.state[i]) continue;
		let m = byOb.get(st.ob[i]);
		if (!m) byOb.set(st.ob[i], (m = new Map()));
		m.set(c.state[i], (m.get(c.state[i]) ?? 0) + 1);
	}
	for (const o of live) {
		const d = DISEASE_BY_ID[o.disease];
		const realms = byOb.get(o.id);
		o.quarantined = o.quarantined.filter((id) => { const b = sim.w.burgs[id]; return b?.alive && sim.plague[b.cell] > 0.05; });
		if (!realms) continue;
		for (const [sid, n] of realms) {
			const pol = sim.polities[sid];
			if (!pol?.alive || !sid) continue;
			const resp = (st.resp[sid] ??= {});
			const first = !o.answered.includes(sid) && n >= 3;
			if (first) o.answered.push(sid);
			answer(sim, pol, o, d, resp, n, first, r);
		}
	}
}

function answer(sim: Simulation, pol: Polity, o: Outbreak, d: DiseaseProfile, resp: Response, n: number, first: boolean, r: Rng) {
	const st = hz(sim), c = sim.c;
	const era = sim.era;
	const ideo = pol.ideology ?? 'monarchy';
	const doctrine = sim.w.religions[pol.religion]?.doctrine;
	const pious = ideo === 'theocracy' || cultureProfile(sim.w, pol.culture).traits.includes('pious');
	const zealot = ideo === 'theocracy' || doctrine === 'militant';
	const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.alive && b.state === pol.id && sim.plague[b.cell] > 0.08);
	const t0 = towns[0] ?? sim.w.burgs[pol.capital];
	const vars = { disease: o.name, realm: pol.name, town: t0?.name ?? pol.name };
	const say = (key: string) => { if (first) logHz(sim, 'plague', cap(line(sim, key, r, vars)), t0?.cell ?? o.cell, pol.id, o.ev); };
	if (d.vector === 'crop') {
		// blight kills by hunger: one famine per realm per outbreak
		if (first && n >= 4) famineAfter(sim, pol.id, r, o.ev, sim.w.burgs[pol.capital]?.name ?? pol.name);
		return;
	}
	resp.med = Math.min(4, Math.max(0, era));
	const quarantine = era >= 1 && (era >= 2 || ['autocracy', 'technocracy', 'oligarchy', 'republic'].includes(ideo)) && r.chance(0.65);
	if (quarantine && towns.length) {
		resp.q = true;
		for (const b of towns.slice(0, 6)) if (!o.quarantined.includes(b.id)) o.quarantined.push(b.id);
		pol.treasury -= 3 * Math.min(6, towns.length);
		pol.stability = clamp(pol.stability - 1, 0, 100);
		say('quarantine');
	} else if (resp.med >= 2 && first) say('physicians');
	if (pious && era <= 2 && r.chance(0.5)) { resp.proc = true; say('procession'); }
	if (era >= 3 && d.immunity >= 0.5) {
		resp.vax = true;
		const k = diseaseIndex(d.id);
		for (let i = 0; i < c.n; i++) if (c.state[i] === pol.id && (st.immK[i] !== k + 1 || st.imm[i] < 85)) { st.imm[i] = 85; st.immK[i] = k + 1; }
		say('vaccination');
	}
	if (first && zealot && pol.stability < 65 && w3On(sim) && sim.w3 && r.chance(0.3)) scapegoat(sim, pol, o, r, vars);
}

function scapegoat(sim: Simulation, pol: Polity, o: Outbreak, r: Rng, vars: Record<string, string>) {
	const c = sim.c;
	const fa = new Map<number, number>();
	let n = 0;
	for (let i = 0; i < c.n; i++) {
		if (c.state[i] !== pol.id || !sim.isLand(i)) continue;
		n++;
		fa.set(c.religion[i], (fa.get(c.religion[i]) ?? 0) + 1);
	}
	let target = -1, best = 0;
	for (const [id, k] of fa) if (id !== pol.religion && k / n >= 0.05 && k / n <= 0.45 && k > best) { best = k; target = id; }
	if (target < 0) return;
	const tname = sim.w.religions[target]?.name ?? 'the heretics';
	const ev = logHz(sim, 'plague', cap(line(sim, 'scapegoat', r, { ...vars, target: `the ${tname.replace(/^the /i, '')}` })), sim.w.burgs[pol.capital]?.cell ?? o.cell, pol.id, o.ev);
	hz(sim).counts.scapegoat = (hz(sim).counts.scapegoat ?? 0) + 1;
	startPersecution(sim, pol, 'f', target, 'pogrom', r, ev.id);
}
