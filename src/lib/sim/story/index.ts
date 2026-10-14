/**
 * Story layer: turns the raw event stream into history. Event chains (chains.ts), named eras per
 * realm (eras.ts), biographies and regnal names (people.ts), rare world moments and perspective war
 * names (moments.ts), place-name drift (drift.ts). The engine calls `yearlyStory` once a year.
 */
import type { Simulation } from '../engine';
import { yearlyEras } from './eras';
import { yearlyDrift } from './drift';
import { nameWars, yearlyMoments } from './moments';
import { biography } from './people';

export { newStory, type StoryState } from './state';
export { findCause, linkEvent, causePhrase, eventTextWithCause, indexEvents, chainOf } from './chains';
export { biography, onCrown, onRulerDeath, rulerName, personLabel, type Biography } from './people';
export { eraTitle, yearlyEras } from './eras';
export { cosmosMoments, nameWars, yearlyMoments } from './moments';
export { yearlyDrift } from './drift';

export function yearlyStory(sim: Simulation) {
	yearlyMoments(sim);
	yearlyEras(sim);
	nameWars(sim);
	yearlyDrift(sim);
}

/** extra Markdown for the annals book: eras per realm, war names, rulers' lives, renamed towns */
export function annalsAppendix(sim: Simulation): string {
	const out: string[] = [];
	const realms = sim.polities.filter((p) => p.id && p.eras?.length);
	if (realms.length) {
		out.push('## Eras of the Realms', '');
		for (const p of realms) out.push(`- **${p.fullName}**: ${p.eras!.map((e) => `${e.name} (${e.from}-${e.to})`).join('; ')}`);
		out.push('');
	}
	const named = sim.wars.filter((w) => w.aliases);
	if (named.length) {
		out.push('## Wars by Many Names', '');
		for (const w of named) {
			const [ca, na, cb, nb] = w.aliases!;
			out.push(`- **${w.name}** (${w.start}${w.end ? `-${w.end}` : ''}): "${na}" to the ${ca}; "${nb}" to the ${cb}.`);
		}
		out.push('');
	}
	const renamed = sim.w.burgs.filter((b) => b.originalName);
	if (renamed.length) {
		out.push('## Names Worn Down by Time', '');
		for (const b of renamed) out.push(`- ${b.originalName} is now called ${b.name}.`);
		out.push('');
	}
	const ids: number[] = [];
	for (const p of sim.polities) {
		if (!p.id || !p.reigns) continue;
		for (const r of p.reigns.slice(-3)) if (!ids.includes(r.id)) ids.push(r.id);
	}
	const lives = ids.slice(-40).map((id) => biography(sim, id)).filter((b) => b);
	if (lives.length) {
		out.push('## Lives of the Rulers', '');
		for (const b of lives) out.push(b!.markdown, '');
	}
	return out.join('\n');
}
