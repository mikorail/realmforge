import type { Rng } from '../rng';
import type { ChronEvent, EventKind, Polity, War } from './types';

export interface PantheonDeity {
	id: string;
	name: string;
	domain: 'Sun' | 'War' | 'Seas' | 'Shadow' | 'Earth' | 'Storms' | 'Wisdom' | 'Death';
	title: string;
	icon: string;
	color: string;
	blessing: string;
}

export const PANTHEON_DEITIES: PantheonDeity[] = [
	{
		id: 'solarius',
		name: 'Solarius the Dawn-Bringer',
		domain: 'Sun',
		title: 'Lord of the Radiant Firmament',
		icon: '☀️',
		color: '#f59e0b',
		blessing: 'Bountiful harvest, population prosperity, and high realm stability'
	},
	{
		id: 'kaelok',
		name: 'Kaelok the Iron Warlord',
		domain: 'War',
		title: 'The Blood-Forged King',
		icon: '⚔️',
		color: '#ef4444',
		blessing: 'Surging martial discipline, siege resilience, and martial fury'
	},
	{
		id: 'nerida',
		name: 'Nerida of the Abyssal Depths',
		domain: 'Seas',
		title: 'Queen of Tides and Tempests',
		icon: '🌊',
		color: '#06b6d4',
		blessing: 'Maritime trade prosperity and protection from oceanic disasters'
	},
	{
		id: 'vaelith',
		name: 'Vaelith the Shadow-Weaver',
		domain: 'Shadow',
		title: 'Mistress of Whispers and Secrets',
		icon: '👁️',
		color: '#8b5cf6',
		blessing: 'Deadly spymasters, intrigue mastery, and court infiltration immunity'
	},
	{
		id: 'ilyra',
		name: 'Ilyra the Earth-Mother',
		domain: 'Earth',
		title: 'Architect of Living Soil',
		icon: '🌿',
		color: '#10b981',
		blessing: 'Abundant agriculture, famine immunity, and rapid reconstruction'
	},
	{
		id: 'zephyros',
		name: 'Zephyros the Sky-Sovereign',
		domain: 'Storms',
		title: 'Ruler of Gales and Thunderbolts',
		icon: '⚡',
		color: '#3b82f6',
		blessing: 'Lightning smites against invading foes and wind-blessed trade fleets'
	},
	{
		id: 'thalor',
		name: 'Thalor the All-Seeing Mind',
		domain: 'Wisdom',
		title: 'Keeper of Ancient Truths',
		icon: '📜',
		color: '#6366f1',
		blessing: 'Accelerated innovation, scholarly breakthroughs, and wise governance'
	},
	{
		id: 'morvath',
		name: 'Morvath the Soul-Shepherd',
		domain: 'Death',
		title: 'Warden of the Stygian Gates',
		icon: '💀',
		color: '#64748b',
		blessing: 'Pestilence resilience, dread aura against invaders, and ancestral protection'
	}
];

/** Assign an initial celestial patron deity to a mortal realm */
export function assignPatronDeity(pol: Polity, rng: Rng, preferredDeityName?: string): void {
	if (pol.secularized) return;
	const deity = preferredDeityName
		? PANTHEON_DEITIES.find((d) => d.name === preferredDeityName) ?? rng.pick(PANTHEON_DEITIES)
		: rng.pick(PANTHEON_DEITIES);

	pol.patronDeity = deity.name;
	pol.patronDomain = deity.domain;
	pol.patronFavor = 50 + rng.int(5, 25);
}

/** Process yearly pantheon deity backing, miracles, favor shifts, and divine proxy wars */
export function processPantheonInterventions(
	polities: Polity[],
	wars: War[],
	year: number,
	rng: Rng,
	logFn: (kind: EventKind, text: string, cell?: number, state?: number) => void
): void {
	// 1. Process active divine proxy wars between realms backed by different deities
	for (const war of wars) {
		if (war.end) continue;
		if (!rng.chance(0.22)) continue;

		const attState = polities[war.attackers[0]];
		const defState = polities[war.defenders[0]];

		if (!attState?.alive || !defState?.alive) continue;
		if (attState.secularized || defState.secularized) continue;
		if (!attState.patronDeity || !defState.patronDeity) continue;
		if (attState.patronDeity === defState.patronDeity) continue;

		// Divine proxy war flares up!
		const attDeity = attState.patronDeity;
		const defDeity = defState.patronDeity;
		attState.army = +(attState.army * 1.08).toFixed(1);
		defState.army = +(defState.army * 1.08).toFixed(1);
		attState.patronFavor = Math.min(100, (attState.patronFavor ?? 50) + 6);
		defState.patronFavor = Math.min(100, (defState.patronFavor ?? 50) + 6);

		logFn(
			'god',
			`DIVINE PROXY WAR: The war between ${attState.name} and ${defState.name} escalates into a celestial proxy duel! ${attDeity} rallies the hosts of ${attState.name}, while ${defDeity} unleashes sacred omens to shield ${defState.name}.`,
			undefined,
			attState.id
		);
	}

	// 2. Individual realm patron deity favor updates and divine interventions
	for (const pol of polities) {
		if (!pol.id || !pol.alive || pol.secularized) continue;

		// If realm has no patron deity, small chance to adopt one
		if (!pol.patronDeity) {
			if (rng.chance(0.12)) {
				assignPatronDeity(pol, rng);
				if (pol.patronDeity) {
					logFn(
						'god',
						`DIVINE PATRONAGE: ${pol.name} dedicates its high altars to ${pol.patronDeity} (${pol.patronDomain}), receiving celestial favor and divine protection!`,
						undefined,
						pol.id
					);
				}
			}
			continue;
		}

		let favor = pol.patronFavor ?? 50;

		// High stability and wealth slightly improve favor; collapse reduces it
		if (pol.stability > 70) favor = Math.min(100, favor + 1);
		else if (pol.stability < 25) favor = Math.max(10, favor - 2);

		// Divine Intervention check when realm is in peril
		const isAtWar = wars.some((w) => !w.end && (w.attackers.includes(pol.id) || w.defenders.includes(pol.id)));
		const isChosen = pol.isChosenRealm;

		if (favor >= 40 && (isAtWar || pol.stability < 35 || isChosen) && rng.chance(isChosen ? 0.35 : 0.18)) {
			// Trigger a divine miracle based on domain
			const domain = pol.patronDomain ?? 'War';
			if (domain === 'War' || (isAtWar && rng.chance(0.5))) {
				pol.army = +(pol.army * 1.15 + 3).toFixed(1);
				pol.stability = Math.min(100, pol.stability + 10);
				favor = Math.min(100, favor + 4);
				logFn(
					'god',
					`PATRON MIRACLE: ${pol.patronDeity} intervenes to aid ${pol.name}! Sacred war banners ignite with celestial fire, filling mortal ranks with indomitable martial fervor (+15% army power).`,
					undefined,
					pol.id
				);
			} else if (domain === 'Sun' || domain === 'Earth') {
				pol.stability = Math.min(100, pol.stability + 18);
				pol.treasury += 20;
				favor = Math.min(100, favor + 5);
				logFn(
					'god',
					`PATRON MIRACLE: ${pol.patronDeity} bestows a celestial blessing upon ${pol.name}! Granaries overflow with miraculous golden grain, soothing civil unrest (+18 stability).`,
					undefined,
					pol.id
				);
			} else if (domain === 'Seas') {
				pol.treasury += 35;
				pol.stability = Math.min(100, pol.stability + 8);
				favor = Math.min(100, favor + 5);
				logFn(
					'god',
					`PATRON MIRACLE: ${pol.patronDeity} parts the ocean swells for the fleets of ${pol.name}, guiding fabled merchant argosies safely into port (+35 treasury).`,
					undefined,
					pol.id
				);
			} else if (domain === 'Storms') {
				pol.army = +(pol.army * 1.1 + 2).toFixed(1);
				favor = Math.min(100, favor + 4);
				logFn(
					'god',
					`PATRON MIRACLE: ${pol.patronDeity} hurls deafening thunderbolts across the frontiers of ${pol.name}, scattering hostile vanguard scouts and striking terror into enemies!`,
					undefined,
					pol.id
				);
			} else if (domain === 'Wisdom') {
				pol.treasury += 15;
				pol.stability = Math.min(100, pol.stability + 12);
				favor = Math.min(100, favor + 6);
				logFn(
					'god',
					`PATRON MIRACLE: ${pol.patronDeity} whispers lost epics and architectural secrets to the council of ${pol.name}, ushering in an era of enlightened harmony.`,
					undefined,
					pol.id
				);
			} else {
				pol.stability = Math.min(100, pol.stability + 14);
				pol.treasury += 15;
				favor = Math.min(100, favor + 4);
				logFn(
					'god',
					`PATRON MIRACLE: Luminous manifestations of ${pol.patronDeity} descend upon the shrines of ${pol.name}, answering prayers and shielding the realm.`,
					undefined,
					pol.id
				);
			}
		}

		pol.patronFavor = favor;
	}
}
