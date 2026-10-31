/** Culture card data (shared by CultureCard.svelte and the Markdown dossier export). */
import type { Simulation } from '../engine';
import { archStyleOf } from '../../gen/spheres';
import { FEAST_MONTH } from './data';
import { TRAITS, cultureProfile, monthName } from './profile';
import { mixedOrigin, prestigeView } from '../society';

export interface CultureCardData {
	id: number;
	name: string;
	sphere: string;
	type: string;
	food: string;
	dress: string;
	architecture: string;
	/** short style tag (map glyph family), empty for unclassed cultures */
	archStyle: string;
	music: string;
	values: string[];
	traits: { icon: string; name: string; blurb: string }[];
	holidays: { name: string; month: string }[];
	realms: string[];
	lingua: string[];
	movements: string[];
	/** cultural prestige (sim/society/prestige.ts): score, world rank, pull multiplier and where it comes from */
	prestige: { score: number; rank: number; of: number; mult: number; sources: string } | null;
	/** mixed people: who they were born of */
	origin: string | null;
}

export function cultureCard(sim: Simulation, id: number): CultureCardData | null {
	const cu = sim.w.cultures[id];
	if (!cu || !cu.id) return null;
	const p = cultureProfile(sim.w, id);
	return {
		id,
		name: cu.name,
		sphere: cu.sphere || 'unclassed',
		type: cu.type,
		food: p.food,
		dress: p.dress,
		architecture: p.architecture,
		archStyle: archStyleOf(cu.sphere)?.tag ?? '',
		music: p.music,
		values: p.values,
		traits: p.traits.map((t) => ({ icon: TRAITS[t].icon, name: TRAITS[t].name, blurb: TRAITS[t].blurb })),
		holidays: p.feasts.map(([name, kind]) => ({ name, month: monthName(sim.w, id, FEAST_MONTH[kind]) })),
		realms: sim.polities.filter((x) => x.alive && x.id && x.culture === id).map((x) => x.name),
		lingua: sim.cx.lingua.filter((l) => l.culture === id).map((l) => `${sim.w.burgs[l.a]?.name} to ${sim.w.burgs[l.b]?.name} (since year ${l.since})`),
		movements: sim.cx.movements.filter((m) => m.culture === id && (m.status === 'rising' || m.status === 'flourishing')).map((m) => m.name),
		prestige: prestigeCard(sim, id),
		origin: mixedOrigin(sim, id)
	};
}

function prestigeCard(sim: Simulation, id: number): CultureCardData['prestige'] {
	const v = prestigeView(sim, id);
	if (!v) return null;
	const p = v.parts;
	const src = p ? ([['wonders', p.wonders], ['luminaries', p.luminaries], ['art movements', p.arts], ['great works', p.works], ['trade tongue', p.trade], ['realms', p.realms]] as [string, number][]).filter(([, x]) => x >= 1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(', ') : '';
	return { score: v.score, rank: v.rank, of: v.of, mult: v.mult, sources: src };
}

export function cultureCardMarkdown(card: CultureCardData): string[] {
	const out = [
		`#### ${card.name}`,
		`- **Sphere**: ${card.sphere} (${card.type})`,
		`- **Food**: ${card.food}`,
		`- **Dress**: ${card.dress}`,
		`- **Architecture**: ${card.architecture}${card.archStyle ? ` (map style: ${card.archStyle})` : ''}`,
		`- **Music**: ${card.music}`,
		`- **Values**: ${card.values.join(', ')}`,
		`- **Traits**: ${card.traits.map((t) => `${t.name} (${t.blurb})`).join('; ')}`,
		`- **Holidays**: ${card.holidays.map((h) => `${h.name} (${h.month})`).join('; ')}`
	];
	if (card.lingua.length) out.push(`- **Lingua franca on**: ${card.lingua.join('; ')}`);
	if (card.movements.length) out.push(`- **Art movements**: ${card.movements.join('; ')}`);
	if (card.prestige) out.push(`- **Prestige**: ${card.prestige.score} (rank ${card.prestige.rank} of ${card.prestige.of}${card.prestige.sources ? `; from ${card.prestige.sources}` : ''})`);
	if (card.origin) out.push(`- **Origin**: ${card.origin}`);
	return out;
}
