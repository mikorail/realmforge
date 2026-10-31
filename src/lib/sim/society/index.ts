/**
 * W3 social depth: intermarriage and mixed peoples (mixing.ts), pogroms / expulsions / refugees (persecution.ts),
 * reform movements (reforms.ts), cultural prestige (prestige.ts) and famine ethics (famine.ts).
 * One yearly hook (`yearlySociety`) plus `onFamine` from the famine event in systems/realms.ts.
 * Every roll uses a side rng (`seed:w3:...`); `GenOptions.socialLife === false` makes all of it a no-op.
 */
import type { Simulation } from '../engine';
import type { Polity } from '../types';
import { sharesOf } from './common';
import { famineLine, yearlyLeanYears } from './famine';
import { yearlyMixing } from './mixing';
import { persecutionLines, yearlyPersecution } from './persecution';
import { yearlyPrestige } from './prestige';
import { reformLines, yearlyReforms } from './reforms';
import { w3On } from './state';

export { newW3, restoreW3, w3On, type W3State } from './state';
export { onFamine } from './famine';
export { prestigeMult, prestigeView, type PrestigeView } from './prestige';

export function yearlySociety(sim: Simulation) {
	if (!w3On(sim)) return;
	const shares = sharesOf(sim);
	const SK: string = (globalThis as any).__w3skip ?? ''; // TEMP
	if (!SK.includes('mix')) yearlyMixing(sim, shares);
	if (!SK.includes('pers')) yearlyPersecution(sim, shares);
	if (!SK.includes('ref')) yearlyReforms(sim, shares);
	if (!SK.includes('lean')) yearlyLeanYears(sim, shares);
	if (!SK.includes('pres')) yearlyPrestige(sim);
}

export interface RealmSocietyView {
	persecutions: string[];
	reforms: string[];
	enacted: string[];
	mixed: string[];
	famine: string | null;
}

/** lines for the realm card (InfoPanel) */
export function realmSociety(sim: Simulation, pol: Polity): RealmSocietyView | null {
	if (!sim.w3 || !w3On(sim)) return null;
	const rf = reformLines(sim, pol.id);
	const mixed = Object.values(sim.w3.pairs)
		.filter((p) => p.realm === pol.id && p.unions > 0)
		.sort((a, b) => b.unions - a.unions)
		.slice(0, 2)
		.map((p) => `${sim.w.cultures[p.a]?.name ?? '?'} and ${sim.w.cultures[p.b]?.name ?? '?'} intermarry${p.house ? ` (house of ${p.house})` : ''}`);
	for (const m of sim.w3.peoples) if (m.realm === pol.id) mixed.push(`the ${sim.w.cultures[m.culture]?.name} were born here of the ${sim.w.cultures[m.a]?.name} and ${sim.w.cultures[m.b]?.name} (year ${m.year})`);
	return { persecutions: persecutionLines(sim, pol.id), reforms: rf.active, enacted: rf.enacted, mixed, famine: famineLine(sim, pol.id) };
}

/** origin of a mixed people, for the culture card */
export function mixedOrigin(sim: Simulation, culture: number): string | null {
	const m = sim.w3?.peoples.find((x) => x.culture === culture);
	return m ? `Born in year ${m.year} of the ${sim.w.cultures[m.a]?.name} and the ${sim.w.cultures[m.b]?.name}` : null;
}
