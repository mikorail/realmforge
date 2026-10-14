/** Culture card data (shared by CultureCard.svelte and the Markdown dossier export). */
import type { Simulation } from '../engine';
import { FEAST_MONTH } from './data';
import { TRAITS, cultureProfile, monthName } from './profile';

export interface CultureCardData {
	id: number;
	name: string;
	sphere: string;
	type: string;
	food: string;
	dress: string;
	architecture: string;
	music: string;
	values: string[];
	traits: { icon: string; name: string; blurb: string }[];
	holidays: { name: string; month: string }[];
	realms: string[];
	lingua: string[];
	movements: string[];
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
		music: p.music,
		values: p.values,
		traits: p.traits.map((t) => ({ icon: TRAITS[t].icon, name: TRAITS[t].name, blurb: TRAITS[t].blurb })),
		holidays: p.feasts.map(([name, kind]) => ({ name, month: monthName(sim.w, id, FEAST_MONTH[kind]) })),
		realms: sim.polities.filter((x) => x.alive && x.id && x.culture === id).map((x) => x.name),
		lingua: sim.cx.lingua.filter((l) => l.culture === id).map((l) => `${sim.w.burgs[l.a]?.name} to ${sim.w.burgs[l.b]?.name} (since year ${l.since})`),
		movements: sim.cx.movements.filter((m) => m.culture === id && (m.status === 'rising' || m.status === 'flourishing')).map((m) => m.name)
	};
}

export function cultureCardMarkdown(card: CultureCardData): string[] {
	const out = [
		`#### ${card.name}`,
		`- **Sphere**: ${card.sphere} (${card.type})`,
		`- **Food**: ${card.food}`,
		`- **Dress**: ${card.dress}`,
		`- **Architecture**: ${card.architecture}`,
		`- **Music**: ${card.music}`,
		`- **Values**: ${card.values.join(', ')}`,
		`- **Traits**: ${card.traits.map((t) => `${t.name} (${t.blurb})`).join('; ')}`,
		`- **Holidays**: ${card.holidays.map((h) => `${h.name} (${h.month})`).join('; ')}`
	];
	if (card.lingua.length) out.push(`- **Lingua franca on**: ${card.lingua.join('; ')}`);
	if (card.movements.length) out.push(`- **Art movements**: ${card.movements.join('; ')}`);
	return out;
}
