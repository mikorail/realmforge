/**
 * Hazards for the Wanderer (`WorldData.hazards`): named faults (parasangs), volcanoes, recent disasters
 * (last 60 years, with the area they marked), live outbreaks (parasangs, quarantined towns) and the disease
 * profiles. Read-only view of `sim._hazardsState`; never draws `sim.rng`. Empty object when hazards are off.
 */
import type { Simulation } from '../sim/engine';
import { DISEASES, hz, hzOn } from '../sim/hazards';

export function hazardsExport(sim: Simulation, pOfCell: (cell: number) => number): { hazards?: unknown } {
	if (!hzOn(sim)) return {};
	const st = hz(sim);
	const ps = (cells: readonly number[]) => [...new Set(cells.map(pOfCell))].sort((a, b) => a - b);
	const faults = st.faults.map((f) => ({ name: f.name, parasangs: ps(f.cells), ...(f.last ? { last: f.last } : {}) }));
	const volcanoes = st.volcanoes.map((v) => ({ p: pOfCell(v.cell), name: v.name, active: v.active, last: v.last }));
	const recent = st.recent
		.filter((e) => e.year >= sim.year - 60)
		.map((e) => ({ kind: e.kind, ...(e.name ? { name: e.name } : {}), year: e.year, p: pOfCell(e.cell), severity: Math.round(e.severity * 10) / 10, towns: e.towns, ...(e.area?.length ? { area: ps(e.area) } : {}) }));
	const cellsOf = new Map<number, number[]>();
	for (let i = 0; i < sim.c.n; i++) {
		if (sim.plague[i] <= 0.02 || !st.ob[i]) continue;
		let a = cellsOf.get(st.ob[i]);
		if (!a) cellsOf.set(st.ob[i], (a = []));
		a.push(i);
	}
	const outbreaks = st.outbreaks
		.filter((o) => o.ended === undefined && cellsOf.has(o.id))
		.map((o) => ({ disease: o.disease, name: o.name, since: o.since, parasangs: ps(cellsOf.get(o.id)!), quarantined: o.quarantined.slice() }));
	const diseases = DISEASES.map((d) => ({ id: d.id, name: d.label, vector: d.vector, trans: d.trans, lethal: d.lethal, immunity: d.immunity, incubation: d.incubation, duration: d.duration, hits: d.hits, symptoms: d.symptoms, cures: d.cures, desc: d.desc }));
	return { hazards: { faults, volcanoes, recent, outbreaks, diseases } };
}
