/** People in the story layer: regnal numbers, epithets, and biographies assembled from the archive. */
import type { Simulation } from '../engine';
import { makeRng } from '../../rng';
import { epithet, nextRegnalNumber, regnalName, withEpithet } from '../../gen/names';
import { SPHERE_BY_ID } from '../../gen/spheres';
import { motiveLine, rollOnCrown } from '../motives';
import type { ChronEvent, Person, Polity } from '../types';

/** a ruler enters a realm's roll of rulers and gets a regnal number (1 + earlier rulers with the same given name) */
export function onCrown(sim: Simulation, pol: Polity, person: Person) {
	const reigns = (pol.reigns ??= []);
	if (reigns.length && reigns[reigns.length - 1].id === person.id) return;
	person.regnal = nextRegnalNumber(reigns.map((r) => r.given), person.name);
	const prevId = reigns.length ? reigns[reigns.length - 1].id : undefined;
	reigns.push({ id: person.id, given: person.name, from: sim.year });
	rollOnCrown(sim, pol, person, prevId); // ruler motive (no-op when GenOptions.motives is false)
}

/** a dead ruler is remembered by an epithet drawn from their traits and sphere (own rng: never shifts the sim stream) */
export function onRulerDeath(sim: Simulation, p: Person) {
	if (p.epithet !== undefined) return;
	const r = makeRng(`${sim.w.opts.seed}:epithet:${sim.planetIndex}:${p.id}`);
	const sphere = SPHERE_BY_ID[sim.w.cultures[p.culture]?.sphere ?? ''] ?? null;
	p.epithet = epithet(r, p.traits, sphere);
}

/** "Kofi III the Bold": regnal number shown from II upward, epithet once the ruler has died */
export function rulerName(p: Person): string {
	return withEpithet(p.regnal && p.regnal >= 2 ? regnalName(p.name, p.regnal) : p.name, p.epithet ?? '');
}

/** everyday full name in the sphere's order, falling back to "given house" */
export function personLabel(p: Person): string {
	return p.plain ?? `${p.name} ${p.house}`.trim();
}

export interface Biography {
	id: number;
	/** "Kofi III the Bold, ruler of Akanland" */
	title: string;
	born: number;
	died?: number;
	/** the life in one paragraph */
	summary: string;
	/** dated notable events */
	entries: { y: number; text: string; id?: number }[];
	/** markdown block for the annals export */
	markdown: string;
}

const NOTABLE = new Set(['war', 'peace', 'capture', 'fall', 'coup', 'rebel', 'death', 'found', 'disaster', 'faith', 'wonder', 'quest', 'luminary', 'monster', 'tech', 'intrigue', 'uprising', 'culture']);
// motive lines carry the tag 'motive' and are picked up through `e.tag`

/** first index in the (year-sorted) archive with y >= year */
function firstFrom(all: readonly ChronEvent[], year: number): number {
	let lo = 0, hi = all.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (all[mid].y < year) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

/** events that mention this person: by name + house anywhere, or by name within their own realm during their life */
export function eventsAbout(sim: Simulation, p: Person): ChronEvent[] {
	const all = sim.allEvents;
	const out: ChronEvent[] = [];
	const full = `${p.name} ${p.house}`;
	const end = p.died ?? Infinity;
	const realms = new Set<number>();
	if (p.state) realms.add(p.state);
	for (const pol of sim.polities) if (pol.reigns?.some((r) => r.id === p.id)) realms.add(pol.id);
	for (let i = firstFrom(all, p.born); i < all.length; i++) {
		const e = all[i];
		if (e.y > end) break;
		if (!e.text.includes(p.name)) continue;
		if (e.text.includes(full) || (e.state !== undefined && realms.has(e.state))) out.push(e);
	}
	return out;
}

/** the life of a person, written from the events that mention them */
export function biography(sim: Simulation, personId: number): Biography | null {
	const p = sim.people[personId];
	if (!p || !p.id) return null;
	const pol = p.state ? sim.polities[p.state] : undefined;
	const reign = pol?.reigns?.find((r) => r.id === p.id);
	const ruled = sim.polities.filter((q) => q.reigns?.some((r) => r.id === p.id));
	const label = p.role === 'ruler' || p.regnal || p.epithet ? rulerName(p) : p.name;
	const where = ruled.length ? ruled[ruled.length - 1].name : pol?.name;
	const title = `${label}${p.house ? ` of House ${p.house}` : ''}, ${p.role === 'ruler' ? 'ruler' : p.role}${where ? ` of ${where}` : ''}`;

	const mentions = eventsAbout(sim, p);
	const notable = mentions.filter((e) => NOTABLE.has(e.kind) || e.tag);
	// keep the early and late ones when a long life has many entries
	const picks = notable.length > 8 ? [...notable.slice(0, 4), ...notable.slice(-4)] : notable;
	const entries = picks.map((e) => ({ y: e.y, text: e.text.trim(), id: e.id }));

	const parts: string[] = [];
	const trait = p.traits.length ? `, ${p.traits.slice(0, 2).join(' and ').toLowerCase()} by nature` : '';
	parts.push(`${p.name} was born in the year ${p.born} to the house of ${p.house || 'no great name'}${trait}.`);
	if (reign) {
		const reignEnd = p.died ?? sim.year;
		parts.push(`${p.name} took the throne of ${(ruled[0] ?? pol)?.name ?? 'the realm'} in ${reign.from} and held it ${reignEnd - reign.from <= 0 ? 'only briefly' : `for ${reignEnd - reign.from} years`}.`);
	}
	const mline = motiveLine(sim, p);
	if (mline) parts.push(mline);
	const wars = mentions.filter((e) => e.kind === 'war' || e.tag === 'war').length;
	const lost = mentions.some((e) => e.tag === 'capital' || e.kind === 'fall');
	if (wars) parts.push(`Their days were marked by ${wars === 1 ? 'a war' : `${wars} wars`}${lost ? ' and the loss of cities' : ''}.`);
	const unrest = mentions.filter((e) => e.tag === 'riot' || e.tag === 'coup' || e.tag === 'revolt').length;
	if (unrest) parts.push(`They faced ${unrest === 1 ? 'unrest' : 'unrest and conspiracy'} at home.`);
	if (p.alive) parts.push(`${p.name} lives still.`);
	else parts.push(`${p.name} died in ${p.died ?? '?'} of ${p.cause ?? 'unknown causes'}${p.epithet ? ` and is remembered as ${p.name} ${p.epithet}` : ''}.`);
	const summary = parts.join(' ');

	const md = [`#### ${title}`, `*b. ${p.born}${p.died !== undefined ? `, d. ${p.died}` : ''}*`, '', summary, ''];
	for (const e of entries) md.push(`- **Y${e.y}**: ${e.text}`);
	return { id: p.id, title, born: p.born, died: p.died, summary, entries, markdown: md.join('\n') };
}
