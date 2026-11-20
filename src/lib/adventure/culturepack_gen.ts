/**
 * Builds the culture pack for the Wanderer export: one `CulturePack` per culture, one `FaithPack` per religion
 * and a `PersonVoice` per notable. Pure (side rngs only inside the generators), so the sim never moves.
 * Old consumers ignore the extra keys; empty parts are dropped so a pack only holds what exists.
 */
import type { Simulation } from '../sim/engine';
import type { Person } from '../sim/types';
import { PACK_VERSION, type CulturePack, type FaithPack, type PersonVoice, type Work } from './culturepack';
import { genCustoms } from '../sim/culture/pack/customs';
import { genVoice, genPersonVoice } from '../sim/culture/pack/voice';
import { genLiterature } from '../sim/culture/pack/literature';
import { genLanguage } from '../sim/culture/pack/language';
import { genFaithLore } from '../sim/culture/pack/faith';
import { genMaterial } from '../sim/culture/pack/material';

/** a part is kept when it has any content */
function nonEmpty(v: unknown): boolean {
	if (v == null) return false;
	if (Array.isArray(v)) return v.length > 0;
	if (typeof v === 'object') return Object.keys(v as object).length > 0;
	return v !== '';
}

/**
 * `eventOffset`: the export ships only the last N chronicle events, so a work's `event` (an index into
 * `sim.allEvents`) is shifted to the exported list, and dropped when the event was cut.
 */
export function culturePackOf(sim: Simulation, cu: number, eventOffset = 0): CulturePack | undefined {
	const parts: Omit<CulturePack, 'v'> = {};
	const customs = genCustoms(sim, cu);
	if (nonEmpty(customs)) parts.customs = customs;
	const voice = genVoice(sim, cu);
	if (nonEmpty(voice)) parts.voice = voice;
	const lit = genLiterature(sim, cu);
	if (nonEmpty(lit)) {
		if (lit.works) {
			lit.works = lit.works.map((w: Work) => {
				if (w.event === undefined) return w;
				const e = w.event - eventOffset;
				const { event: _drop, ...rest } = w;
				return e >= 0 ? { ...rest, event: e } : rest;
			});
		}
		parts.literature = lit;
	}
	const material = genMaterial(sim, cu);
	if (nonEmpty(material)) parts.material = material;
	const lang = genLanguage(sim, cu);
	if (nonEmpty(lang)) parts.lang = lang;
	return Object.keys(parts).length ? { v: PACK_VERSION, ...parts } : undefined;
}

export function faithLoreOf(sim: Simulation, religionId: number): FaithPack | undefined {
	const f = genFaithLore(sim, religionId);
	return nonEmpty(f) ? f : undefined;
}

export function personVoiceOf(sim: Simulation, p: Person): PersonVoice | undefined {
	const v = genPersonVoice(sim, p);
	return v && nonEmpty(v) ? v : undefined;
}
