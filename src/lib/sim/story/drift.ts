/** Place-name drift: once per century a few old towns erode into new forms; the archaic name is kept. */
import type { Simulation } from '../engine';
import { makeRng } from '../../rng';
import { driftName } from '../../gen/names';

export function yearlyDrift(sim: Simulation) {
	if (sim.year < 100 || sim.year % 100 !== 0) return;
	const r = makeRng(`${sim.w.opts.seed}:drift:${sim.planetIndex}:${sim.year}`);
	const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
	const taken = new Set(sim.w.burgs.map((b) => b.name.toLowerCase()));
	let done = 0;
	for (const b of r.shuffle(burgs)) {
		if (done >= 3) break;
		const old = b.name;
		const next = driftName(old, sim.lang(b.culture), 1);
		if (!next || next === old || taken.has(next.toLowerCase())) continue;
		taken.add(next.toLowerCase());
		b.originalName ??= old;
		b.name = next;
		// a realm named for its capital changes with it
		for (const p of sim.polities) {
			if (p.alive && p.capital === b.id && p.name === old) {
				p.fullName = p.fullName.replace(old, next);
				p.name = next;
			}
		}
		sim.log('culture', `Over the centuries ${old} has worn down on the tongue into ${next}; the older name survives only in the chronicles.`, b.cell, b.state, 'rename');
		sim.dirty.political = true;
		done++;
	}
}
