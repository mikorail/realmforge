/**
 * Transport for the Wanderer world file: rail lines (stations in line order + the parasangs the track crosses),
 * air routes between docks and the dock towns. Read-only view of `sim._railState` (sim/rail.ts); the key is
 * omitted when the world has no transport, so older output stays byte-identical.
 */
import type { Simulation } from '../sim/engine';
import type { RailState } from '../sim/rail';

export function transportExport(sim: Simulation, pOfCell: (cell: number) => number) {
	const S = (sim as unknown as { _railState?: RailState })._railState;
	if (!S || (!S.lines.length && !S.air.length && !S.docks.length)) return {};
	const alive = (id: number) => !!sim.w.burgs[id]?.alive;
	const rail = S.lines
		.map((l) => {
			const parasangs: number[] = [];
			for (const c of l.cells) {
				const p = pOfCell(c);
				if (parasangs[parasangs.length - 1] !== p) parasangs.push(p);
			}
			const stations = l.stations.filter(alive);
			return { id: l.id, ...(l.name ? { name: l.name } : {}), kind: l.kind, stations, parasangs, owner: l.owner, built: l.built, ...(l.cut ? { cut: l.cut } : {}) };
		})
		.filter((l) => l.stations.length >= 2);
	const air = S.air.filter((r) => alive(r.a) && alive(r.b)).map((r) => ({ a: r.a, b: r.b, kind: r.kind }));
	const docks = S.docks.filter(alive);
	return { transport: { rail, air, docks } };
}
