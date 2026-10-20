import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { SPECIES, SPECIES_BY_ID, pickSpeciesForCulture, type SpeciesDef } from '../gen/species';
import { THEOLOGIES, DOCTRINES, assignReligionIdentity } from '../gen/religions';
import type { TheologyKind, DoctrineKind } from '../gen/types';
import {
	PANTHEON_DEITIES,
	PANTHEON_DEITIES_BY_ID,
	assignPatronDeity,
	applyDeityBlessing,
	applyDeityWrath,
	processPantheonInterventions,
	type DivineSphere
} from './pantheon';
import type { Polity, War, EventKind } from './types';

describe('Warhammer Races & Deep Faith System', () => {
	const newSpeciesIds = [
		'ratfolk',
		'lizardfolk',
		'tomb_undead',
		'ogor',
		'void_elf',
		'warp_fiend',
		'chitin_swarm'
	];

	it('registers all 7 new Warhammer Fantasy & 40k style races in SPECIES with valid properties', () => {
		expect(SPECIES.length).toBeGreaterThanOrEqual(19);

		for (const id of newSpeciesIds) {
			const sp = SPECIES_BY_ID[id];
			expect(sp, `Species ${id} should exist in SPECIES_BY_ID`).toBeDefined();
			expect(sp.id).toBe(id);
			expect(sp.name.length).toBeGreaterThan(0);
			expect(sp.plural.length).toBeGreaterThan(0);
			expect(sp.adjective.length).toBeGreaterThan(0);
			expect(sp.icon.length).toBeGreaterThan(0);
			expect(sp.desc.length).toBeGreaterThan(0);
			expect(sp.desc).not.toContain('—');

			// Validate stat modifiers
			expect(typeof sp.mods.martial).toBe('number');
			expect(typeof sp.mods.diplomacy).toBe('number');
			expect(typeof sp.mods.stewardship).toBe('number');
			expect(typeof sp.mods.intrigue).toBe('number');
			expect(typeof sp.mods.health).toBe('number');

			// Validate lifespan multiplier
			expect(sp.lifespanMult).toBeGreaterThan(0);

			// Validate biomes and layers
			expect(sp.biomes.length).toBeGreaterThan(0);
			expect(sp.layers.length).toBeGreaterThan(0);

			// Validate cultural traits and polity forms
			expect(sp.traits.length).toBeGreaterThanOrEqual(2);
			expect(sp.forms.length).toBeGreaterThanOrEqual(4);

			for (const trait of sp.traits) {
				expect(trait).not.toContain('—');
			}
			for (const form of sp.forms) {
				expect(form).not.toContain('—');
			}
		}

		// Specific stat checks for signature race traits
		expect(SPECIES_BY_ID['ratfolk'].mods.intrigue).toBeGreaterThanOrEqual(5);
		expect(SPECIES_BY_ID['ratfolk'].lifespanMult).toBeCloseTo(0.65, 2);
		expect(SPECIES_BY_ID['ratfolk'].forms).toContain('Council of Thirteen');

		expect(SPECIES_BY_ID['lizardfolk'].mods.martial).toBeGreaterThanOrEqual(3);
		expect(SPECIES_BY_ID['lizardfolk'].mods.stewardship).toBeGreaterThanOrEqual(3);
		expect(SPECIES_BY_ID['lizardfolk'].lifespanMult).toBeCloseTo(2.5, 2);
		expect(SPECIES_BY_ID['lizardfolk'].forms).toContain('Temple-City');

		expect(SPECIES_BY_ID['tomb_undead'].lifespanMult).toBeGreaterThanOrEqual(8.0);
		expect(SPECIES_BY_ID['tomb_undead'].forms).toContain('Tomb Dynasty');

		expect(SPECIES_BY_ID['ogor'].mods.martial).toBeGreaterThanOrEqual(5);
		expect(SPECIES_BY_ID['ogor'].forms).toContain('Mawtribe');

		expect(SPECIES_BY_ID['void_elf'].layers).toContain('sky');
		expect(SPECIES_BY_ID['void_elf'].lifespanMult).toBeGreaterThanOrEqual(4.0);
		expect(SPECIES_BY_ID['void_elf'].forms).toContain('Craft-Realm');

		expect(SPECIES_BY_ID['warp_fiend'].layers).toContain('surface');
		expect(SPECIES_BY_ID['warp_fiend'].layers).toContain('deep');
		expect(SPECIES_BY_ID['warp_fiend'].layers).toContain('sky');
		expect(SPECIES_BY_ID['warp_fiend'].forms).toContain('Chaos Legion');

		expect(SPECIES_BY_ID['chitin_swarm'].lifespanMult).toBeLessThan(1.0);
		expect(SPECIES_BY_ID['chitin_swarm'].forms).toContain('Hive-Colony');
	});

	it('pickSpeciesForCulture weights new species correctly across layers and biomes', () => {
		// Deep layer should pick subterranean races: dwarf, ratfolk, goblin, tomb_undead, chitin_swarm, warp_fiend
		const deepPicks = new Set<string>();
		for (let s = 0; s < 50; s++) {
			const rng = makeRng(`deep-seed-${s}`);
			const sp = pickSpeciesForCulture(rng, 15, 'deep', 'underground');
			deepPicks.add(sp.id);
		}
		expect(deepPicks.has('ratfolk')).toBe(true);
		expect(deepPicks.has('tomb_undead')).toBe(true);

		// Sky layer should pick void_elf, celestial, elf, giant
		const skyPicks = new Set<string>();
		for (let s = 0; s < 50; s++) {
			const rng = makeRng(`sky-seed-${s}`);
			const sp = pickSpeciesForCulture(rng, 14, 'sky', 'celestial');
			skyPicks.add(sp.id);
		}
		expect(skyPicks.has('void_elf')).toBe(true);

		// Surface swamps (biomes 7, 8, 12) should pick lizardfolk, ratfolk, beastman, etc.
		const swampPicks = new Set<string>();
		for (let s = 0; s < 100; s++) {
			const rng = makeRng(`swamp-seed-${s}`);
			const sp = pickSpeciesForCulture(rng, 7, 'surface', 'nature');
			swampPicks.add(sp.id);
		}
		expect(swampPicks.has('lizardfolk')).toBe(true);

		// Volcanic / ashland biomes (13, 15, 16) should pick warp_fiend
		const volcanicPicks = new Set<string>();
		for (let s = 0; s < 100; s++) {
			const rng = makeRng(`volcanic-seed-${s}`);
			const sp = pickSpeciesForCulture(rng, 16, 'surface', 'fire');
			volcanicPicks.add(sp.id);
		}
		expect(volcanicPicks.has('warp_fiend')).toBe(true);

		// Desert / arid biomes (1) should pick tomb_undead
		const desertPicks = new Set<string>();
		for (let s = 0; s < 100; s++) {
			const rng = makeRng(`desert-seed-${s}`);
			const sp = pickSpeciesForCulture(rng, 1, 'surface', 'death');
			desertPicks.add(sp.id);
		}
		expect(desertPicks.has('tomb_undead')).toBe(true);

		// Cold desert / steppes / mountains (2, 3, 10) should pick ogor
		const ogorPicks = new Set<string>();
		for (let s = 0; s < 100; s++) {
			const rng = makeRng(`ogor-seed-${s}`);
			const sp = pickSpeciesForCulture(rng, 2, 'surface', 'nomad');
			ogorPicks.add(sp.id);
		}
		expect(ogorPicks.has('ogor')).toBe(true);

		// Verify every one of the 7 new species can be picked by pickSpeciesForCulture
		const allSelectedSpecies = new Set<string>();
		const biomes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
		const layers = ['surface', 'deep', 'sky', 'sea'] as const;

		for (let i = 0; i < 400; i++) {
			const rng = makeRng(`broad-seed-${i}`);
			const b = biomes[i % biomes.length];
			const l = layers[i % layers.length];
			const sp = pickSpeciesForCulture(rng, b, l, 'any');
			allSelectedSpecies.add(sp.id);
		}

		for (const id of newSpeciesIds) {
			expect(
				allSelectedSpecies.has(id),
				`Species ${id} should be generated by pickSpeciesForCulture in varied worlds`
			).toBe(true);
		}
	});

	it('defines comprehensive theologies and doctrines with zero em dashes', () => {
		const expectedTheologies: TheologyKind[] = [
			'monotheism',
			'polytheism',
			'animism',
			'chaos_cult',
			'eldritch_horror',
			'ancestral',
			'pantheism',
			'dualism'
		];

		for (const tk of expectedTheologies) {
			const th = THEOLOGIES[tk];
			expect(th, `Theology ${tk} must be present in THEOLOGIES`).toBeDefined();
			expect(th.id).toBe(tk);
			expect(th.name.length).toBeGreaterThan(0);
			expect(th.icon.length).toBeGreaterThan(0);
			expect(th.desc.length).toBeGreaterThan(0);
			expect(th.desc).not.toContain('—');
			expect(th.name).not.toContain('—');
		}

		const expectedDoctrines: DoctrineKind[] = [
			'caste',
			'evangelical',
			'militant',
			'liberation',
			'compassion',
			'esoteric',
			'ancestral',
			'blood_offering',
			'mutation_rites',
			'void_whispers',
			'cyclopean_rites',
			'sacred_grove',
			'mountain_pact'
		];

		for (const dk of expectedDoctrines) {
			const doc = DOCTRINES[dk];
			expect(doc, `Doctrine ${dk} must be present in DOCTRINES`).toBeDefined();
			expect(doc.id).toBe(dk);
			expect(doc.name.length).toBeGreaterThan(0);
			expect(doc.icon.length).toBeGreaterThan(0);
			expect(doc.desc.length).toBeGreaterThan(0);
			expect(doc.clergyTitle.length).toBeGreaterThan(0);
			expect(doc.desc).not.toContain('—');
			expect(doc.name).not.toContain('—');
			expect(doc.clergyTitle).not.toContain('—');
		}

		// Verify religion identity generation across Folk, Cult, and Organized
		const folkRng = makeRng('folk-rng-seed');
		const folkRel = assignReligionIdentity(folkRng, 'Folk', 'forest');
		expect(folkRel.theology).toBeDefined();
		expect(folkRel.doctrine).toBeDefined();
		for (const feat of folkRel.features) {
			expect(feat).not.toContain('—');
		}

		const cultRng = makeRng('cult-rng-seed');
		const cultRel = assignReligionIdentity(cultRng, 'Cult', 'chaos');
		expect(cultRel.theology).toBeDefined();
		expect(cultRel.doctrine).toBeDefined();
		for (const feat of cultRel.features) {
			expect(feat).not.toContain('—');
		}

		const orgRng = makeRng('org-rng-seed');
		const orgRel = assignReligionIdentity(orgRng, 'Organized', 'celestial');
		expect(orgRel.theology).toBeDefined();
		expect(orgRel.doctrine).toBeDefined();
		for (const feat of orgRel.features) {
			expect(feat).not.toContain('—');
		}
	});

	it('features all 4 divine spheres in pantheon.ts with distinct deities, blessings, and wrath', () => {
		expect(PANTHEON_DEITIES.length).toBe(15);

		const spheres: DivineSphere[] = ['High', 'Chaos', 'OldGods', 'Nature'];
		for (const s of spheres) {
			const deitiesInSphere = PANTHEON_DEITIES.filter((d) => d.sphere === s);
			expect(
				deitiesInSphere.length,
				`Sphere ${s} should have at least 3 distinct deities`
			).toBeGreaterThanOrEqual(3);
		}

		// Check High sphere
		expect(PANTHEON_DEITIES_BY_ID['solarius']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['omnipotis']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['thalor']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['zephyros']).toBeDefined();

		// Check Chaos sphere
		expect(PANTHEON_DEITIES_BY_ID['khorvath']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['tzannik']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['pestilax']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['luxuria']).toBeDefined();

		// Check OldGods sphere
		expect(PANTHEON_DEITIES_BY_ID['cthulor']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['nyxal']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['shubbog']).toBeDefined();

		// Check Nature sphere
		expect(PANTHEON_DEITIES_BY_ID['sylvanor']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['gorath']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['ignis']).toBeDefined();
		expect(PANTHEON_DEITIES_BY_ID['undina']).toBeDefined();

		// Check zero em dashes in all deity text
		for (const d of PANTHEON_DEITIES) {
			expect(d.name).not.toContain('—');
			expect(d.title).not.toContain('—');
			expect(d.blessing).not.toContain('—');
			expect(d.wrath).not.toContain('—');
		}
	});

	it('assigns patron favor and triggers domain blessings and wrath with zero em dashes', () => {
		function createMockPolity(id: number, name: string): Polity {
			return {
				id,
				name,
				form: 'Kingdom',
				fullName: `Kingdom of ${name}`,
				capital: 1,
				color: '#ff0000',
				culture: 1,
				religion: 1,
				expansionism: 1.0,
				alive: true,
				founded: 1,
				cells: 10,
				pop: 50,
				peak: 10,
				ruler: 1,
				heir: 0,
				tax: 0.1,
				origin: 'founding',
				layer: 0,
				relations: {},
				allies: [],
				treasury: 100,
				army: 10.0,
				stability: 60
			};
		}

		const pol = createMockPolity(1, 'Valoria');
		const testRng = makeRng('patron-test-seed');

		// Assign deity from High sphere
		assignPatronDeity(pol, testRng, 'Omnipotis the Sovereign Architect');
		expect(pol.patronDeity).toBe('Omnipotis the Sovereign Architect');
		expect(pol.patronDomain).toBe('Order');
		expect(pol.patronFavor).toBeGreaterThanOrEqual(50);

		// Test domain blessing
		const logs: string[] = [];
		const logFn = (k: EventKind, t: string) => {
			expect(t).not.toContain('—');
			logs.push(t);
		};

		const omnipotis = PANTHEON_DEITIES_BY_ID['omnipotis'];
		const initialStability = pol.stability;
		applyDeityBlessing(pol, omnipotis, logFn);
		expect(pol.stability).toBeGreaterThan(initialStability);
		expect(logs.length).toBe(1);
		expect(logs[0]).toContain('Sovereign Mandate');

		// Test Chaos blessing (khorvath: high martial power but corrupts stability)
		const polChaos = createMockPolity(2, 'Bloodspire');
		polChaos.stability = 50;
		polChaos.army = 10.0;
		const khorvath = PANTHEON_DEITIES_BY_ID['khorvath'];
		applyDeityBlessing(polChaos, khorvath, logFn);
		expect(polChaos.army).toBeGreaterThan(12.0);
		expect(polChaos.stability).toBeLessThan(50);
		expect(logs[1]).toContain('RUINOUS GIFT');

		// Test OldGods blessing (cthulor: sunken treasure and abyss dread)
		const polOld = createMockPolity(3, 'Abyssal Coast');
		polOld.treasury = 50;
		const cthulor = PANTHEON_DEITIES_BY_ID['cthulor'];
		applyDeityBlessing(polOld, cthulor, logFn);
		expect(polOld.treasury).toBeGreaterThan(50);
		expect(logs[2]).toContain('cyclopean monoliths');

		// Test Nature blessing (sylvanor: forest defenses)
		const polNature = createMockPolity(4, 'Verdant Realm');
		polNature.stability = 60;
		const sylvanor = PANTHEON_DEITIES_BY_ID['sylvanor'];
		applyDeityBlessing(polNature, sylvanor, logFn);
		expect(polNature.stability).toBeGreaterThan(60);
		expect(logs[3]).toContain('ancient canopies');

		// Test divine wrath across all spheres
		const wrathLogs: string[] = [];
		const wrathLogFn = (k: EventKind, t: string) => {
			expect(t).not.toContain('—');
			wrathLogs.push(t);
		};

		applyDeityWrath(pol, omnipotis, wrathLogFn);
		expect(wrathLogs[0]).toContain('DIVINE WRATH');

		applyDeityWrath(polChaos, khorvath, wrathLogFn);
		expect(wrathLogs[1]).toContain('CHAOS WRATH');

		applyDeityWrath(polOld, cthulor, wrathLogFn);
		expect(wrathLogs[2]).toContain('ELDRITCH WRATH');

		applyDeityWrath(polNature, sylvanor, wrathLogFn);
		expect(wrathLogs[3]).toContain('NATURE WRATH');

		// Verify processPantheonInterventions functions properly without throwing and produces clean logs
		const interventionPolities = [pol, polChaos, polOld, polNature];
		const interventionWars: War[] = [
			{
				id: 1,
				name: 'War of the Blood Altar',
				attackers: [polChaos.id],
				defenders: [pol.id],
				start: 10,
				score: 0,
				months: 5,
				startArmy: [10, 10]
			}
		];

		const interventionLogs: string[] = [];
		for (let year = 1; year <= 10; year++) {
			processPantheonInterventions(
				interventionPolities,
				interventionWars,
				year,
				makeRng(`intervention-${year}`),
				(k, t) => {
					expect(t).not.toContain('—');
					interventionLogs.push(t);
				}
			);
		}
		expect(interventionLogs.length).toBeGreaterThan(0);
	});
});
