/**
 * Astral Sea, Dreamlands & Celestial Horoscopes (astral_cosmos.ts).
 * 1. 12 ancient zodiac constellations and procedural annual horoscopes.
 * 2. Celestial astrological omens (Blood Moon Eclipse, Twin Comets, Void Convergence, Solar Apex, Dream Tide).
 * 3. Astral Sea & Dreamlands stratum: petrified dead god husks, ethereal dream nodes, and astral voyages.
 * 4. Integration with Apotheosis: mortal ascendants inscribing star constellations in the firmament.
 */

import type { Simulation } from './engine';
import { clamp } from '../rng';

export interface ZodiacConstellation {
	id: string;
	name: string;
	title: string;
	glyph: string;
	domain: 'war' | 'arcana' | 'fate' | 'harvest' | 'void' | 'sea' | 'cinders' | 'beasts';
	stars: [number, number][]; // normalized coords [-1..1]
	lines: [number, number][]; // indices of connecting stars
	desc: string;
	myth: string;
}

export interface AstrologicalEvent {
	id: string;
	name: string;
	symbol: string;
	desc: string;
	effect: string;
	startYear: number;
	durationYears: number;
	statModifier: {
		magicSurge?: number;
		titanAwakening?: boolean;
		stabilityModifier?: number;
		harvestBonus?: number;
	};
}

export interface DeadGodHusk {
	id: string;
	name: string;
	title: string;
	stratumDepth: number; // 1 to 5
	relicName: string;
	salvaged: boolean;
	discoveredYear: number;
	desc: string;
}

export interface AstralCosmosData {
	activeHouseId: string;
	currentOmen: AstrologicalEvent | null;
	astralHusks: DeadGodHusk[];
	dreamTidesYear: number;
	voyagesCompleted: number;
}

export const ZODIAC_CONSTELLATIONS: ZodiacConstellation[] = [
	{
		id: 'dragon',
		name: 'The Weeping Dragon',
		title: 'Constellation of Cataclysm',
		glyph: '🐉',
		domain: 'cinders',
		stars: [[-0.6, -0.7], [-0.4, -0.5], [-0.2, -0.3], [0.1, -0.4], [0.3, -0.2], [0.6, -0.5], [0.7, -0.7]],
		lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
		desc: 'Coiled serpentine stars that bleed rubies across the northern sky.',
		myth: 'The primordial fire drake that wept incandescent embers upon the cold world.'
	},
	{
		id: 'citadel',
		name: 'The Astral Citadel',
		title: 'Bastion of the Seraphim',
		glyph: '🏰',
		domain: 'war',
		stars: [[-0.3, 0.4], [0.3, 0.4], [0.4, -0.2], [-0.4, -0.2], [0, -0.6], [0, 0.6]],
		lines: [[0, 1], [1, 2], [2, 4], [4, 3], [3, 0], [0, 5], [1, 5]],
		desc: 'Four adamant parapets anchored by a central soaring spire.',
		myth: 'Refuge of the first immortals who stood sentinel during the Great Shattering.'
	},
	{
		id: 'scales',
		name: 'The Equinox Scales',
		title: 'Balances of Mortal Fate',
		glyph: '⚖️',
		domain: 'fate',
		stars: [[0, -0.5], [-0.5, -0.2], [0.5, -0.2], [-0.6, 0.3], [-0.4, 0.3], [0.4, 0.3], [0.6, 0.3]],
		lines: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]],
		desc: 'Two swinging brass pans suspended from an ethereal silver fulcrum.',
		myth: 'Where deeds of kings and vagabonds are weighed against the feather of truth.'
	},
	{
		id: 'scythe',
		name: 'The Obsidian Scythe',
		title: 'Harvester of Eras',
		glyph: '🌾',
		domain: 'harvest',
		stars: [[-0.4, 0.6], [-0.1, 0.2], [0.2, -0.2], [0.4, -0.5], [0.2, -0.7], [-0.1, -0.6]],
		lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
		desc: 'A curved arc of cold stellar diamond cutting through the golden grain of the sky.',
		myth: 'Swung by the Autumn Queen at the turning of centuries to clear dead empires.'
	},
	{
		id: 'void_serpent',
		name: 'The Void Leviathan',
		title: 'Abyssal World-Devourer',
		glyph: '🌌',
		domain: 'void',
		stars: [[-0.7, 0.2], [-0.4, 0.4], [0, 0.2], [0.4, 0.5], [0.7, 0.2], [0.5, -0.1], [0.1, -0.2]],
		lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]],
		desc: 'Black stars that swallow light, opening a portal into the dark between worlds.',
		myth: 'The celestial leviathan slumbering until the stars burn cold.'
	},
	{
		id: 'hammer',
		name: 'The Titan Forge-Hammer',
		title: 'Great Anvil of Creation',
		glyph: '🔨',
		domain: 'arcana',
		stars: [[-0.2, 0.6], [0.1, 0.1], [0.3, -0.3], [0.6, -0.2], [0.6, -0.5], [0.1, -0.4]],
		lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
		desc: 'A massive haft of blue giant stars tipped with a blinding diamond head.',
		myth: 'Used by the world-smith to strike the sparks that ignited mortal souls.'
	},
	{
		id: 'chalice',
		name: 'The Sunken Grail',
		title: 'Fountain of Ethereal Wisdom',
		glyph: '🏆',
		domain: 'sea',
		stars: [[-0.4, -0.3], [0.4, -0.3], [0.3, 0.2], [-0.3, 0.2], [0, 0.5], [0, 0.7]],
		lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 4], [4, 5]],
		desc: 'A goblet brimming with bioluminescent astral nectar that spills down the Milky Way.',
		myth: 'He who drinks of the celestial chalice dreams of futures three centuries hence.'
	},
	{
		id: 'beast',
		name: 'The Primeval Manticore',
		title: 'Lord of the Starlit Wilds',
		glyph: '🦁',
		domain: 'beasts',
		stars: [[-0.5, -0.2], [-0.2, -0.3], [0.1, -0.1], [0.4, -0.2], [0.6, 0.1], [0.4, 0.4], [0.1, 0.3]],
		lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]],
		desc: 'Prowling golden stars with venomous tail curved over its leonine back.',
		myth: 'Patron of untamed beasts and the wilderness that swallows deserted citadels.'
	}
];

export const ASTROLOGICAL_OMENS: Omit<AstrologicalEvent, 'startYear'>[] = [
	{
		id: 'blood_moon',
		name: 'The Blood Moon Eclipse',
		symbol: '🔴',
		desc: 'A copper shadow cloaks the celestial lunar disc, bathing mountain crags in bloody light.',
		effect: 'Beasts and titans stir from slumber; warfare fervor +25%; spellcraft volatility doubles.',
		durationYears: 3,
		statModifier: { magicSurge: 1.5, titanAwakening: true, stabilityModifier: -10 }
	},
	{
		id: 'twin_comets',
		name: 'Conjunction of the Twin Comets',
		symbol: '☄️',
		desc: 'Paired cyan comets trace fiery braids across the night zenith for three winters.',
		effect: 'Prophets emerge in every realm; great works gain +50% construction progress; innovation surges.',
		durationYears: 4,
		statModifier: { magicSurge: 1.25, harvestBonus: 15, stabilityModifier: 10 }
	},
	{
		id: 'void_convergence',
		name: 'Great Alignment of the Void',
		symbol: '🕳️',
		desc: 'Three black planets align behind the sun, opening invisible rifts in the fabric of thought.',
		effect: 'Schisms and secret cults multiply; occult relics reveal lost formulas; dark omens recorded.',
		durationYears: 5,
		statModifier: { magicSurge: 1.4, stabilityModifier: -15 }
	},
	{
		id: 'solar_apex',
		name: 'The Solar Grand Apex',
		symbol: '☀️',
		desc: 'The golden sun blazes at perihelion, dispelling pestilence and casting brilliant halos.',
		effect: 'Agricultural bounties fill granaries; plagues dissipate; realms enjoy an era of celebration.',
		durationYears: 3,
		statModifier: { harvestBonus: 25, stabilityModifier: 15 }
	},
	{
		id: 'dream_tide',
		name: 'The Astral Dream Tide',
		symbol: '🌊',
		desc: 'Metaphysical currents swell from the Dreamlands, causing shared visions across nations.',
		effect: 'Avatars and rulers gain prophetic clarity; diplomatic peace pacts are formed in dreams.',
		durationYears: 4,
		statModifier: { magicSurge: 1.2, stabilityModifier: 5 }
	}
];

const simAstralMap = new WeakMap<Simulation, AstralCosmosData>();

export function getAstralCosmos(sim: Simulation): AstralCosmosData {
	let data = simAstralMap.get(sim);
	if (!data) {
		const raw = (sim as unknown as { _astralData?: AstralCosmosData })._astralData;
		if (raw) {
			data = raw;
		} else {
			const houseIdx = Math.abs(sim.year) % ZODIAC_CONSTELLATIONS.length;
			data = {
				activeHouseId: ZODIAC_CONSTELLATIONS[houseIdx].id,
				currentOmen: null,
				astralHusks: [
					{
						id: 'sol_husk',
						name: 'Kael-Vath the First Dawn',
						title: 'Petrified Solar Demiurge',
						stratumDepth: 2,
						relicName: 'Cinder of the Primordial Dawn',
						salvaged: false,
						discoveredYear: sim.year - 42,
						desc: 'A colossal monolith of molten crystal and star-iron floating in the silent ethereal void.'
					},
					{
						id: 'void_husk',
						name: 'Ouroboros-Nox',
						title: 'Slain Serpent of the Dark Sea',
						stratumDepth: 4,
						relicName: 'Spine of the Null Leviathan',
						salvaged: false,
						discoveredYear: sim.year - 85,
						desc: 'Black bone ribs stretching three leagues across, encrusted with glowing stardust crystals.'
					}
				],
				dreamTidesYear: sim.year,
				voyagesCompleted: 0
			};
			(sim as unknown as { _astralData?: AstralCosmosData })._astralData = data;
		}
		simAstralMap.set(sim, data);
	}
	return data;
}

/** Check and update yearly horoscopes and active astrological omens */
export function updateAstralYearly(sim: Simulation) {
	const data = getAstralCosmos(sim);
	// Cycle active zodiac house by epoch year
	const houseIdx = Math.abs(sim.year) % ZODIAC_CONSTELLATIONS.length;
	data.activeHouseId = ZODIAC_CONSTELLATIONS[houseIdx].id;

	// Check if current omen expired
	if (data.currentOmen) {
		if (sim.year >= data.currentOmen.startYear + data.currentOmen.durationYears) {
			data.currentOmen = null;
		}
	}

	// Chance for a new astrological omen every 12 to 20 years
	if (!data.currentOmen && (sim.year % 14 === 0 || sim.rng.chance(0.08))) {
		const pick = sim.rng.pick(ASTROLOGICAL_OMENS);
		data.currentOmen = {
			...pick,
			startYear: sim.year
		};
		// Log omen to chronicle
		sim.log(
			'misc',
			`Celestial Omen: ${data.currentOmen.name} blazes in the firmament. ${data.currentOmen.desc}`
		);
	}
}

/** Embark on an Astral Sea expedition to salvage dead god relics */
export function embarkAstralVoyage(sim: Simulation): { success: boolean; log: string; relic?: string } {
	const data = getAstralCosmos(sim);
	data.voyagesCompleted++;

	// Find unsalvaged husk
	const husk = data.astralHusks.find((h) => !h.salvaged);
	if (husk) {
		husk.salvaged = true;
		const msg = `Astral Expedition: Scholars navigate an ethereal caravel to the petrified husk of ${husk.name}. They salvage the legendary artifact: ${husk.relicName}!`;
		sim.log('misc', msg);
		return { success: true, log: msg, relic: husk.relicName };
	}

	// Discover new husk in deep stratum
	const newDepth = clamp(data.voyagesCompleted + 1, 1, 6);
	const names = ['Xylarion the Infinite Eye', 'Mor-Gatha of the Obsidian Loom', 'Theron the Star-Shatterer'];
	const relics = ['Crown of Ethereal Vision', 'Shuttle of the World-Thread', 'Fragment of the World-Pillar'];
	const idx = data.voyagesCompleted % names.length;

	const newHusk: DeadGodHusk = {
		id: `husk_${data.voyagesCompleted}`,
		name: names[idx],
		title: `Ancient Slumbering Deity (Depth ${newDepth})`,
		stratumDepth: newDepth,
		relicName: relics[idx],
		salvaged: false,
		discoveredYear: sim.year,
		desc: 'A newly charted astral derelict floating amid nebula clouds, shimmering with ancient miracles.'
	};
	data.astralHusks.push(newHusk);

	const logMsg = `Astral Discovery: Navigators chart uncharted ethereal currents and locate ${newHusk.name} drifting in stratum depth ${newDepth}!`;
	sim.log('misc', logMsg);
	return { success: true, log: logMsg };
}
