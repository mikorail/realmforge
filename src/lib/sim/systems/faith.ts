/** Faith spread and conversion, heresies, the Great Reformation. */
import { motiveMod } from '../motives';
import type { Simulation } from '../engine';
import { cellsByState } from '../indexes';
import { neighbors } from '../../gen/grid';
import { personName } from '../../gen/names';
import { palette } from '../../gen/society';
import { narrateConversion, narrateProphet } from '../chronicle';
import { destroyWonder } from '../wonders';
import { cultureMod } from '../culture';

export function faiths(sim: Simulation) {
	const c = sim.c;
	const r = sim.rng;
	const changes: [number, number][] = [];
	for (let k = 0; k < c.n / 6; k++) {
		const i = r.int(0, c.n - 1);
		if (!sim.isLand(i)) continue;
		const pol = sim.polities[c.state[i]];
		const nb = neighbors(c, i);
		const j = nb[r.int(0, nb.length - 1)];
		if (!sim.isLand(j) || c.religion[j] === c.religion[i]) continue;
		let p = 0.15;
		if (pol?.alive && c.religion[j] === pol.religion) p += 0.35;
		if (pol?.alive && c.religion[i] === pol.religion) p -= 0.12;
		if (sim.w.religions[c.religion[j]]?.type !== 'Folk') p += 0.08;
		if (r.chance(p)) changes.push([i, c.religion[j]]);
	}
	for (const [i, rel] of changes) c.religion[i] = rel;
	// state conversion when the realm's majority faith differs
	let own: ReturnType<typeof cellsByState> | null = null; // built on first use; ownership is fixed in this loop
	for (const pol of sim.polities) {
		if (!pol.alive || pol.secularized || r() > 0.15 * cultureMod(sim, pol, 'conversion') * motiveMod(sim, pol, 'conversion')) continue;
		own ??= cellsByState(c.state, sim.polities.length);
		const counts = new Map<number, number>();
		for (let k = own.start[pol.id], end = own.start[pol.id + 1]; k < end; k++) {
			const i = own.cells[k];
			if (i % 2 === 0) counts.set(c.religion[i], (counts.get(c.religion[i]) ?? 0) + 1);
		}
		let best = pol.religion, bestN = counts.get(pol.religion) ?? 0;
		for (const [rel, n] of counts) if (n > bestN * 1.5) { best = rel; bestN = n; }
		if (best !== pol.religion) {
			const convText = narrateConversion(sim.rng, pol.name, sim.w.religions[best].name);
			sim.log('faith', convText, sim.w.burgs[pol.capital].cell, pol.id);
			pol.religion = best;
			pol.stability -= 10;
		}
	}
	// heresy
	if (r.chance(0.04)) {
		const burgs = sim.w.burgs.filter((b) => b.id && b.alive && b.pop > 2);
		if (burgs.length) {
			const b = r.pick(burgs);
			const parent = sim.w.religions[c.religion[b.cell]];
			const L = sim.lang(b.culture);
			const prophet = personName(L);
			const id = sim.w.religions.length;
			const relName = `${prophet}ite ${parent?.type === 'Folk' ? 'Cult' : 'Heresy'}`;
			sim.w.religions.push({ id, name: relName, color: palette(r, 1, 55, 55)[0], type: 'Cult', deity: parent?.deity ?? '', center: b.cell, culture: b.culture });
			c.religion[b.cell] = id;
			for (const j of neighbors(c, b.cell)) if (sim.isLand(j) && r.chance(0.5)) c.religion[j] = id;
			const prophText = narrateProphet(sim.rng, prophet, b.name, relName);
			sim.log('faith', prophText, b.cell, b.state);
		}
	}
	// The Great Reformation (occurs when innovation > 40 or era >= 2)
	if ((sim.innovation > 40 || sim.era >= 2) && r.chance(0.08)) {
		const candidateBurgs = sim.w.burgs.filter(
			(b) => b.id && b.alive && b.pop > 1.0 && sim.polities[b.state]?.alive && !sim.polities[b.state]?.secularized && !sim.polities[b.state]?.reformed
		);
		if (candidateBurgs.length) {
			const b = r.pick(candidateBurgs);
			const pol = sim.polities[b.state];
			const oldRel = sim.w.religions[pol.religion];
			const reformer = sim.makePerson(b.culture, pol.id, b.id, 'priest', r.int(28, 55));
			reformer.traits.push('Zealous');
			const id = sim.w.religions.length;
			const relName = `Reformed Covenant of ${b.name}`;
			sim.w.religions.push({
				id,
				name: relName,
				color: '#60a5fa',
				type: 'Organized',
				deity: oldRel?.deity ? `Reformed ${oldRel.deity}` : 'The Divine Word',
				center: b.cell,
				culture: b.culture
			});
			c.religion[b.cell] = id;
			for (const j of neighbors(c, b.cell)) if (sim.isLand(j) && r.chance(0.6)) c.religion[j] = id;

			pol.reformed = true;
			pol.religion = id;
			pol.stability = Math.max(10, pol.stability - 15);

			sim.log(
				'faith',
				`THE GREAT REFORMATION: In ${b.name}, ${reformer.name} nails ninety-five theses condemning clerical indulgence! Proclaiming the ${relName}, reformers split from ancient dogma. Riots break out as iconoclasts smash old idols.`,
				b.cell,
				pol.id
			);

			// Iconoclasm: chance to deface or ruin old religious monuments / titan shrines in the area
			const localWonder = sim.wonders.find((w) => w.cell === b.cell && !w.destroyed);
			if (localWonder && (localWonder.kind === 'titan_shrine' || r.chance(0.45))) {
				const res = destroyWonder(localWonder, 'Iconoclast Reformers', sim.year, 'smashed and stripped of idols during the Reformation');
				sim.log('wonder', res.event.text, b.cell, pol.id);
			}
		}
	}
}
