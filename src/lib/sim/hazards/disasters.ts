/**
 * Natural disasters, rolled once a year with a side rng (`seed:hz:y:<year>`): earthquakes on faults
 * (tsunamis after offshore quakes), volcanic eruptions (ash ring, later fertility, volcanic winter),
 * hurricanes over warm seas, tornadoes on plains, river floods (floodplain fertility), landslides and
 * avalanches, locust swarms (famine) and natural wildfires. Never draws `sim.rng`.
 */
import type { Rng } from '../../rng';
import { makeName } from '../../gen/names';
import { destroyWonder, isWonderStanding } from '../wonders';
import type { Burg } from '../../gen/types';
import type { Simulation } from '../engine';
import { MONTHS_SEASON } from './data';
import { cellsNear, damageDistricts, famineAfter, hitRealm, hitTown, line, logHz, record, ringOf, scaleOf, surfaceTowns, townsNear } from './common';
import { seedOutbreak } from './disease';
import { hz, hzLang, hzRng, type Fault, type Volcano } from './state';

const expo = (r: Rng, k: number) => -Math.log(1 - r() * 0.999) * k;
const realmName = (sim: Simulation, s: number) => sim.polities[s]?.name ?? 'the wild country';
const month = (r: Rng, a: number, b: number) => MONTHS_SEASON[r.int(a, b)];

export function yearlyDisasters(sim: Simulation) {
	const st = hz(sim);
	const r = hzRng(sim, 'y', sim.year);
	const towns = surfaceTowns(sim);
	if (!towns.length) return;
	for (const f of st.faults) if (r.chance(0.055 * f.activity)) quake(sim, r, f);
	const volc = sim.w.opts.planet === 'volcanic' ? 1.5 : 1;
	for (const v of st.volcanoes) if (r.chance((v.active ? 0.011 : 0.0015) * volc)) erupt(sim, r, v);
	if (r.chance(0.13)) storm(sim, r);
	if (r.chance(0.08)) tornado(sim, r, towns);
	if (r.chance(0.16)) flood(sim, r, towns);
	if (r.chance(0.09)) slide(sim, r, towns);
	if (r.chance(0.05)) locusts(sim, r, towns);
	const dry = sim.epoch && (sim.epoch.kind === 'drought' || sim.epoch.kind === 'warm') ? 2.5 : 1;
	if (r.chance(0.09 * dry)) wildfire(sim, r, towns);
	afterEffects(sim);
}


function quake(sim: Simulation, r: Rng, f: Fault) {
	const c = sim.c;
	const mag = Math.min(9.4, 5 + expo(r, 0.85));
	f.last = sim.year;
	if (mag < 6) { hz(sim).counts.tremor = (hz(sim).counts.tremor ?? 0) + 1; return; }
	const epi = r.pick(f.cells);
	const R = (mag - 5.5) * 55 * scaleOf(sim);
	const hit = townsNear(sim, epi, R);
	if (!hit.length) { hz(sim).counts.tremor = (hz(sim).counts.tremor ?? 0) + 1; return; }
	const m = mag.toFixed(1);
	const first = hit[0].b;
	const state = first.state;
	for (const { b, d } of hit) {
		const loss = 0.035 * (mag - 5.5) * (1 - d / R);
		hitTown(sim, b, loss);
		if (loss > 0.05) damageDistricts(b, loss > 0.1);
	}
	for (const i of cellsNear(sim, epi, R * 0.7)) if (sim.isLand(i)) c.pop[i] *= 1 - 0.02 * (mag - 5.5);
	const affected = [...new Set(hit.map((h) => h.b.state).filter(Boolean))];
	for (const s of affected) hitRealm(sim, s, 2 * (mag - 5.5), 5 * (mag - 5.5));
	const ev = logHz(sim, 'quake', line(sim, mag >= 7 ? 'quake' : 'quakeSmall', r, { fault: f.name.replace(/^the /, ''), mag: m, town: first.name, realm: realmName(sim, state) }), epi, state);
	record(sim, { kind: 'quake', name: f.name, year: sim.year, cell: epi, severity: +m, towns: hit.slice(0, 8).map((h) => h.b.id), ev: ev.id });
	// wonders crack or fall
	if (mag >= 7) {
		for (const wd of sim.wonders) {
			if (!isWonderStanding(wd) || wd.layer !== 0) continue;
			const d = Math.hypot(wd.x - c.x[epi], wd.y - c.y[epi]);
			if (d > R * 0.6) continue;
			if (mag >= 7.8 && r.chance(0.25)) {
				const { event } = destroyWonder(wd, f.name, sim.year, 'earthquake');
				sim.log('wonder', line(sim, 'wonderFall', r, { name: wd.name }) + ' ' + event.text.split('!')[0] + '!', wd.cell, wd.stateId, 'quake', ev.id);
			} else if (r.chance(0.5)) {
				wd.fame = Math.max(0, wd.fame - 5);
				sim.log('wonder', line(sim, 'wonderCrack', r, { name: wd.name }), wd.cell, wd.stateId, undefined, ev.id);
			}
		}
	}
	// tsunami
	if (f.offshore && mag >= 7.3 && c.dist[epi] <= 2) {
		const TR = R * 1.8;
		const coast = townsNear(sim, epi, TR, (b) => b.port || c.dist[b.cell] === 1);
		if (coast.length) {
			for (const { b, d } of coast) { hitTown(sim, b, 0.05 + 0.13 * (1 - d / TR)); damageDistricts(b, true); }
			const area = cellsNear(sim, epi, TR).filter((i) => c.dist[i] === 1);
			for (const i of area) c.pop[i] *= 0.9;
			const t0 = coast[0].b;
			const tev = logHz(sim, 'tsunami', line(sim, 'tsunami', r, { fault: f.name.replace(/^the /, ''), town: t0.name, realm: realmName(sim, t0.state) }), t0.cell, t0.state, ev.id);
			record(sim, { kind: 'tsunami', name: f.name, year: sim.year, cell: t0.cell, severity: +m, towns: coast.slice(0, 10).map((h) => h.b.id), area: area.slice(0, 60), ev: tev.id });
		}
	}
	if (mag >= 7.5 && state && r.chance(0.3)) famineAfter(sim, state, r, ev.id, first.name);
	if (mag >= 7 && r.chance(0.12)) seedOutbreak(sim, first.cell, 0.5, r.chance(0.5) ? 'flux' : 'pestilence', ev.id);
	sim.dirty.political = true;
}

function erupt(sim: Simulation, r: Rng, v: Volcano) {
	const c = sim.c, st = hz(sim);
	const vei = Math.min(7, 2 + expo(r, 1.3));
	v.last = sim.year;
	v.active = true;
	const near = townsNear(sim, v.cell, 140 * scaleOf(sim));
	const t0 = near[0]?.b;
	const state = c.state[v.cell] || t0?.state || 0;
	const vars = { volcano: v.name, town: t0?.name ?? 'the high valleys', realm: realmName(sim, state) };
	if (vei < 4) {
		if (t0 && near[0].d < 60 * scaleOf(sim)) hitTown(sim, t0, 0.02);
		const ev = logHz(sim, 'eruption', line(sim, 'eruptionSmall', r, vars), v.cell, state);
		record(sim, { kind: 'eruption', name: v.name, year: sim.year, cell: v.cell, severity: +vei.toFixed(1), towns: t0 ? [t0.id] : [], ev: ev.id });
		return;
	}
	const hops = vei >= 6 ? 3 : 2;
	const ring = ringOf(sim, v.cell, hops);
	const ash = { cells: [] as number[], biomes: [] as number[], until: sim.year + r.int(25, 45) };
	for (const i of ring) {
		if (!c.biome[i] || c.h[i] < 20) continue;
		ash.cells.push(i);
		ash.biomes.push(c.biome[i]);
		c.biome[i] = i === v.cell && vei >= 5 ? 16 : 13;
		c.pop[i] *= i === v.cell ? 0.4 : 0.7;
	}
	if (ash.cells.length) st.ash.push(ash);
	const set = new Set(ring);
	const hitT: Burg[] = [];
	for (const { b, d } of near) {
		if (set.has(b.cell)) { hitTown(sim, b, 0.18 + 0.04 * (vei - 4)); hitT.push(b); }
		else if (d < 90 * scaleOf(sim)) { hitTown(sim, b, 0.04); hitT.push(b); }
	}
	if (state) hitRealm(sim, state, 3 + vei, 8 * (vei - 3));
	const ev = logHz(sim, 'eruption', line(sim, 'eruption', r, vars), v.cell, state);
	record(sim, { kind: 'eruption', name: v.name, year: sim.year, cell: v.cell, severity: +vei.toFixed(1), towns: hitT.slice(0, 8).map((b) => b.id), area: ash.cells.slice(0, 60), ev: ev.id });
	st.pending.push({ year: ash.until, kind: 'ash', cells: ash.cells.slice(), name: v.name, town: t0?.id ?? 0, state });
	if (vei >= 5 && state && r.chance(0.5)) famineAfter(sim, state, r, ev.id, vars.town);
	if (vei >= 6 && !st.veil) {
		const dT = -0.5 * (vei - 5);
		st.veil = { dT, until: sim.year + r.int(3, 6), volcano: v.name };
		shiftClimate(sim, dT);
		sim.log('disaster', line(sim, 'darkSky', r, { volcano: v.name }), v.cell, undefined, 'epoch', ev.id).detail = 'volcanic winter';
	}
	sim.dirty.terrain = true;
	sim.dirty.political = true;
}

function shiftClimate(sim: Simulation, dT: number) {
	const cl = sim.w.opts.climate;
	sim.reclimate({ ...cl, tEq: cl.tEq + dT, tN: cl.tN + dT * 1.5, tS: cl.tS + dT * 1.5, winds: [...cl.winds] }, true);
}

function storm(sim: Simulation, r: Rng) {
	const c = sim.c;
	const coast: number[] = [];
	for (let i = 0; i < c.n; i++) if (c.dist[i] === 1 && c.temp[i] >= 21 && c.h[i] >= 20) coast.push(i);
	if (!coast.length) return;
	const land = r.pick(coast);
	const R = 110 * scaleOf(sim);
	const hit = townsNear(sim, land, R, (b) => b.port || c.dist[b.cell] <= 2);
	if (!hit.length) return;
	const t0 = hit[0].b;
	for (const { b, d } of hit) { hitTown(sim, b, 0.03 + 0.07 * (1 - d / R)); if (d < R / 3) damageDistricts(b, false); }
	for (const s of new Set(hit.map((h) => h.b.state).filter(Boolean))) hitRealm(sim, s, 2, 10);
	const nm = makeName(hzLang(sim, t0.culture, 'storm', sim.year), '');
	const ev = logHz(sim, 'storm', line(sim, 'storm', r, { town: t0.name, realm: realmName(sim, t0.state), name: nm, month: month(r, 6, 9) }), t0.cell, t0.state);
	record(sim, { kind: 'storm', name: nm, year: sim.year, cell: land, severity: hit.length, towns: hit.slice(0, 8).map((h) => h.b.id), area: cellsNear(sim, land, R * 0.6).filter((i) => c.dist[i] === 1).slice(0, 60), ev: ev.id });
	if (r.chance(0.12)) seedOutbreak(sim, t0.cell, 0.4, 'flux', ev.id);
}

function tornado(sim: Simulation, r: Rng, towns: Burg[]) {
	const c = sim.c;
	const plain = towns.filter((b) => (c.biome[b.cell] === 4 || c.biome[b.cell] === 3) && c.temp[b.cell] >= 4 && c.temp[b.cell] <= 24);
	if (!plain.length) return;
	const b = r.pick(plain);
	hitTown(sim, b, 0.04 + r() * 0.06);
	const ev = logHz(sim, 'tornado', line(sim, 'tornado', r, { town: b.name, realm: realmName(sim, b.state), month: month(r, 3, 7) }), b.cell, b.state);
	record(sim, { kind: 'tornado', year: sim.year, cell: b.cell, severity: 1, towns: [b.id], area: [b.cell], ev: ev.id });
}

function flood(sim: Simulation, r: Rng, towns: Burg[]) {
	const c = sim.c;
	const wet = towns.filter((b) => c.river[b.cell] && c.flux[b.cell] > 40);
	if (!wet.length) return;
	const b = r.weighted(wet, wet.map((x) => Math.sqrt(c.flux[x.cell])));
	const rid = c.river[b.cell];
	const river = sim.w.rivers[rid]?.name || 'river';
	const R = 90 * scaleOf(sim);
	const area = cellsNear(sim, b.cell, R).filter((i) => c.river[i] === rid || (c.river[i] && c.flux[i] > 40));
	for (const i of area) c.pop[i] *= 0.95;
	const hit = townsNear(sim, b.cell, R, (t) => !!c.river[t.cell]);
	for (const { b: t, d } of hit) hitTown(sim, t, 0.03 + 0.06 * (1 - d / R));
	hitRealm(sim, b.state, 2, 8);
	const ev = logHz(sim, 'flood', line(sim, 'flood', r, { town: b.name, realm: realmName(sim, b.state), name: river, month: month(r, 2, 5) }), b.cell, b.state);
	record(sim, { kind: 'flood', name: river, year: sim.year, cell: b.cell, severity: hit.length, towns: hit.slice(0, 8).map((h) => h.b.id), area: area.slice(0, 60), ev: ev.id });
	hz(sim).pending.push({ year: sim.year + r.int(2, 4), kind: 'silt', cells: area.slice(0, 80), name: river, town: b.id, state: b.state });
	if (r.chance(0.18)) seedOutbreak(sim, b.cell, 0.45, 'flux', ev.id);
}

function slide(sim: Simulation, r: Rng, towns: Burg[]) {
	const c = sim.c;
	const high = towns.filter((b) => c.h[b.cell] >= 48);
	if (!high.length) return;
	const b = r.pick(high);
	const kind = c.temp[b.cell] <= 3 ? 'avalanche' : 'landslide';
	hitTown(sim, b, 0.03 + r() * 0.06);
	const ev = logHz(sim, kind, line(sim, kind, r, { town: b.name, realm: realmName(sim, b.state), month: month(r, 0, 3) }), b.cell, b.state);
	record(sim, { kind, year: sim.year, cell: b.cell, severity: 1, towns: [b.id], area: ringOf(sim, b.cell, 1), ev: ev.id });
}

function locusts(sim: Simulation, r: Rng, towns: Burg[]) {
	const c = sim.c;
	const dry = towns.filter((b) => [1, 3, 4].includes(c.biome[b.cell]) && c.temp[b.cell] >= 14 && b.state);
	if (!dry.length) return;
	const b = r.pick(dry);
	const R = 150 * scaleOf(sim);
	const area = cellsNear(sim, b.cell, R).filter((i) => c.state[i] === b.state && [3, 4, 5].includes(c.biome[i]));
	for (const i of area) c.pop[i] *= 0.96;
	hitRealm(sim, b.state, 3, 15);
	const ev = logHz(sim, 'locust', line(sim, 'locust', r, { town: b.name, realm: realmName(sim, b.state), month: month(r, 5, 8) }), b.cell, b.state);
	record(sim, { kind: 'locust', year: sim.year, cell: b.cell, severity: area.length, towns: townsNear(sim, b.cell, R, (t) => t.state === b.state).slice(0, 8).map((h) => h.b.id), area: area.slice(0, 60), ev: ev.id });
	if (r.chance(0.55)) famineAfter(sim, b.state, r, ev.id, b.name);
}

function wildfire(sim: Simulation, r: Rng, towns: Burg[]) {
	const c = sim.c;
	const FOREST = [5, 6, 9];
	const woods = towns.filter((b) => c.temp[b.cell] >= 8 && FOREST.some((f) => ringOf(sim, b.cell, 1).some((i) => c.biome[i] === f)));
	if (!woods.length) return;
	const b = r.pick(woods);
	const area = ringOf(sim, b.cell, 3, (i) => FOREST.includes(c.biome[i])).filter((i) => i !== b.cell || FOREST.includes(c.biome[i]));
	for (const i of area) c.pop[i] *= 0.95;
	hitTown(sim, b, 0.02 + r() * 0.04);
	const ev = logHz(sim, 'wildfire', line(sim, 'wildfire', r, { town: b.name, realm: realmName(sim, b.state), month: month(r, 6, 8) }), b.cell, b.state);
	record(sim, { kind: 'wildfire', year: sim.year, cell: b.cell, severity: area.length, towns: [b.id], area: area.slice(0, 60), ev: ev.id });
}

/** fertile ash and silt, ash rings kept through reclimate, the volcanic veil lifting */
function afterEffects(sim: Simulation) {
	const st = hz(sim), c = sim.c;
	const r = hzRng(sim, 'ya', sim.year);
	for (const a of st.ash) {
		if (a.until <= sim.year) {
			a.cells.forEach((i, k) => { if (c.biome[i] === 13 || c.biome[i] === 16) c.biome[i] = a.biomes[k]; });
			sim.dirty.terrain = true;
		} else for (const i of a.cells) if (c.biome[i] && c.biome[i] !== 13 && c.biome[i] !== 16) { c.biome[i] = 13; sim.dirty.terrain = true; }
	}
	st.ash = st.ash.filter((a) => a.until > sim.year);
	const due = st.pending.filter((p) => p.year <= sim.year);
	st.pending = st.pending.filter((p) => p.year > sim.year);
	for (const p of due) {
		for (const i of p.cells) if (sim.isLand(i)) c.pop[i] = Math.min(c.pop[i] * 1.12, Math.max(c.pop[i], sim.basePop[i] * 1.25));
		const t = sim.w.burgs[p.town];
		if (t?.alive && t.state) sim.log('misc', line(sim, p.kind === 'ash' ? 'fertileAsh' : 'fertileSilt', r, { name: p.name, town: t.name, realm: realmName(sim, t.state) }), t.cell, t.state);
	}
	if (st.veil && st.veil.until <= sim.year) {
		shiftClimate(sim, -st.veil.dT);
		sim.log('misc', line(sim, 'skyClears', r, { volcano: st.veil.volcano }));
		st.veil = null;
	}
}
