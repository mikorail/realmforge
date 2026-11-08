import type { Simulation } from '../engine';
import { settlementArchitecture } from './settlement_arch';

export function livingWorldTick(sim: Simulation) {
	const r = sim.rng;
	const aliveRealms = sim.polities.filter((p) => p.alive && p.id);
	if (!aliveRealms.length) return;

	// 1. Living Simulation Spectacles (Executions, Honor Duels, Market Days, Trade Festivals)
	if (r.chance(0.35)) {
		const p = r.pick(aliveRealms);
		const burgs = sim.idx.burgsIn(sim.w.burgs, p.id).filter((b) => b.alive);
		if (burgs.length) {
			const b = r.pick(burgs);
			const roll = r();
			const arch = settlementArchitecture(sim, b);

			if (roll < 0.25) {
				p.stability = Math.min(100, p.stability + 2);
				sim.log(
					'misc',
					`A public scaffold execution in ${b.name}'s plaza draws murmuring crowds beneath the ${arch.monument}; royal decree enforces order.`,
					b.cell,
					p.id,
					'spectacle'
				);
			} else if (roll < 0.5) {
				sim.log(
					'misc',
					`Two rival champions cross steel in an honor duel before cheering onlookers outside ${b.name}'s ${arch.gateType}.`,
					b.cell,
					p.id,
					'spectacle'
				);
			} else if (roll < 0.75) {
				p.treasury += Math.round(5 + (b.pop || 1) * 1.5);
				sim.log(
					'misc',
					`Bustling market stalls and foreign merchants pack ${b.name}'s squares, bartering goods under ${arch.silhouette}.`,
					b.cell,
					p.id,
					'spectacle'
				);
			} else {
				p.treasury += Math.round(10 + (b.pop || 1) * 2.5);
				p.stability = Math.min(100, p.stability + 3);
				sim.log(
					'misc',
					`Lanterns and flagons herald a seasonal trade festival in ${b.name}, filling every inn and tavern to the rafters.`,
					b.cell,
					p.id,
					'spectacle'
				);
			}
		}
	}

	// 2. Urban Labor & Economy Dynamics (Farming, Timber felling, Mining, Guard Patrols)
	for (const p of aliveRealms) {
		const burgs = sim.idx.burgsIn(sim.w.burgs, p.id).filter((b) => b.alive);
		if (!burgs.length) continue;
		const b = burgs[sim.year % burgs.length];
		const dists = b.districts ?? { market: 0, temple: 0, granary: 0, walls: 0, academy: 0 };

		const farmGain = ((dists.granary ?? 0) + 1) * 1.2;
		const mineGain = ((dists.walls ?? 0) + 1) * 0.8;
		const patrolStability = (b.garrison ?? 1) >= 2 ? 0.3 : 0.1;

		p.treasury += Math.round(farmGain + mineGain);
		p.stability = Math.min(100, p.stability + patrolStability);
	}

	// 3. Nomadic Migrations (Mobile pastoral tribes migrating between pastures)
	if (r.chance(0.2)) {
		const nomadicBurgs = sim.w.burgs.filter((b) => {
			if (!b.alive || b.pop <= 0.4 || b.pop >= 4.0) return false;
			const cult = sim.w.cultures[b.culture];
			const sp = cult?.species ?? 'human';
			return (
				sp === 'orc' ||
				sp === 'beastman' ||
				sp === 'ogor' ||
				(cult?.sphere && (cult.sphere.includes('sahel') || cult.sphere.includes('steppe') || cult.sphere.includes('boreal')))
			);
		});

		if (nomadicBurgs.length) {
			const nb = r.pick(nomadicBurgs);
			const cells = sim.w.cells;
			const start = cells.nStart[nb.cell];
			const end = cells.nStart[nb.cell + 1];
			let validTarget = -1;
			for (let k = start; k < end; k++) {
				const nc = cells.nList[k];
				if (cells.h[nc] >= 20 && sim.w.burgs.every((ob) => ob.cell !== nc)) {
					validTarget = nc;
					break;
				}
			}
			if (validTarget >= 0) {
				nb.cell = validTarget;
				nb.x = cells.x[validTarget];
				nb.y = cells.y[validTarget];
				sim.log(
					'misc',
					`The pastoral clans of ${nb.name} strike their yurts and migrate seasonal herds across open pastures to fresh foraging grounds.`,
					nb.cell,
					nb.state,
					'migration'
				);
			}
		}
	}
}
