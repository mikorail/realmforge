/**
 * Natural hazards and named diseases (`GenOptions.hazards`, unset = on). One yearly hook
 * (`yearlyHazards`, after the planet rules) and the monthly disease spread, which `spreadPlague`
 * hands over to while hazards are on. State `sim._hazardsState` (saved via dump()'s `ext`).
 */
import type { Simulation } from '../engine';
import { yearlyDisasters } from './disasters';
import { hazardSeedPlague, spreadDisease, yearlyDisease } from './disease';
import { hz, hzOn } from './state';

export { hz, hzOn, type HzState, type Fault, type Volcano, type Outbreak, type HzEvent } from './state';
export { DISEASES, DISEASE_BY_ID, HAZARD_KINDS, type DiseaseProfile, type HazardKind } from './data';
export { seedOutbreak, pickDisease } from './disease';

export function yearlyHazards(sim: Simulation) {
	if (!hzOn(sim)) return;
	hz(sim);
	yearlyDisasters(sim);
	yearlyDisease(sim);
}

/** `seedPlague` while hazards are on: returns false when off (the caller keeps the old behaviour) */
export function hazardsPlague(sim: Simulation, cell: number, v: number): boolean {
	if (!hzOn(sim)) return false;
	hazardSeedPlague(sim, cell, v);
	return true;
}

/** `spreadPlague` while hazards are on */
export function hazardsSpread(sim: Simulation): boolean {
	if (!hzOn(sim)) return false;
	spreadDisease(sim);
	return true;
}
