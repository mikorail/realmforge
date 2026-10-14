import type { Rng } from '../rng';
import type { World } from '../gen/types';
import type { ChronEvent, Monster, Person, Polity, Quest, QuestKind, LegendaryPlace } from './types';
import { forgeArtifact, forgeMonsterRelic, type Artifact } from './relics';
import { resolveMonsterCombat } from './monsters';
import { createTitanShrineWonder } from './wonders';

export interface QuestTemplate {
	kind: QuestKind;
	icon: string;
	titleTpl: string[];
	targetType: 'monster' | 'wonder' | 'burg' | 'wilderness';
	rewardType: 'relic' | 'gold' | 'renown';
	scoutingText: (hero: string, target: string) => string;
	confrontationText: (hero: string, target: string) => string;
	triumphText: (hero: string, target: string, reward: string) => string;
}

export const QUEST_TEMPLATES: Record<QuestKind, QuestTemplate> = {
	subjugation: {
		kind: 'subjugation',
		icon: '🐉',
		titleTpl: [
			'Hunt for the Calamity',
			'Subjugation of the Primordial Beast',
			'Bounty on the Dragon-Wyrm',
			'Slaying of the Abyssal Terror'
		],
		targetType: 'monster',
		rewardType: 'renown',
		scoutingText: (h, t) => `${h} tracks claw marks and scorched earth toward the lair of ${t}, preparing wards and weapons.`,
		confrontationText: (h, t) => `${h} confronts ${t} in a fierce duel! Shockwaves shake the cavern as steel clashes with primeval fury.`,
		triumphText: (h, t, r) => `${h} strikes a decisive blow, felling ${t} and claiming ${r} amid roaring cheers!`
	},
	treasure: {
		kind: 'treasure',
		icon: '👑',
		titleTpl: [
			'Search for the Lost Relic',
			'Quest for the Sunken Heirloom',
			'Expedition to the Ancient Vault',
			'Recovery of the Crown Jewels'
		],
		targetType: 'wonder',
		rewardType: 'relic',
		scoutingText: (h, t) => `${h} deciphers faded parchment maps and astrological charts pointing toward the vaults of ${t}.`,
		confrontationText: (h, t) => `${h} bypasses pressure traps and arcane wards guarding the sunken chambers of ${t}.`,
		triumphText: (h, t, r) => `${h} unlocks the sealed adamantine vault, unearthing ${r} to global acclaim!`
	},
	rescue: {
		kind: 'rescue',
		icon: '🗝️',
		titleTpl: [
			'Rescue of the Royal Heir',
			'Liberation of the Captive Sage',
			'Raid on the Shadow Keep',
			'Deliverance of the High Scholar'
		],
		targetType: 'burg',
		rewardType: 'gold',
		scoutingText: (h, t) => `${h} gathers scouts and infiltrates the frontier redoubts near ${t} to pinpoint the captive's cell.`,
		confrontationText: (h, t) => `${h} breaches the dungeon gates, cutting down warden sentries beneath the moon.`,
		triumphText: (h, t, r) => `${h} successfully frees the captive, escorting them to safety and earning ${r} in grateful tribute!`
	},
	expedition: {
		kind: 'expedition',
		icon: '🗺️',
		titleTpl: [
			'Expedition to the World Tree',
			'Ascent of the Tower of Trials',
			'Delve into the Primeval Foundry',
			'Voyage to the Sunken Citadel'
		],
		targetType: 'wonder',
		rewardType: 'renown',
		scoutingText: (h, t) => `${h} outfits an intrepid party of scholars and veterans to map the perilous approaches to ${t}.`,
		confrontationText: (h, t) => `${h} ventures deep into the heart of ${t}, braving mystical anomalies and planar currents.`,
		triumphText: (h, t, r) => `${h} returns triumphant from ${t}, having uncovered forgotten secrets and winning ${r}!`
	}
};

/** Spawn a new story quest */
export function spawnQuest(
	world: World,
	polities: Polity[],
	people: Person[],
	monsters: Monster[],
	rng: Rng,
	year: number,
	nextId: { val: number }
): Quest | null {
	const candidates = people.filter((p) => p.alive && (p.role === 'hero' || p.role === 'wanderer' || p.renown > 30));
	if (!candidates.length) return null;

	const hero = rng.pick(candidates);
	const kind = rng.pick<QuestKind>(['subjugation', 'treasure', 'rescue', 'expedition']);
	const tpl = QUEST_TEMPLATES[kind];

	let targetCell = hero.burg ? world.burgs[hero.burg].cell : rng.int(0, world.cells.n - 1);
	let targetName = 'the Uncharted Wilds';

	if (tpl.targetType === 'monster') {
		const aliveM = monsters.filter((m) => m.alive);
		if (aliveM.length) {
			const m = rng.pick(aliveM);
			targetCell = m.cell;
			targetName = m.name;
		}
	} else if (tpl.targetType === 'wonder') {
		const burgs = world.burgs.filter((b) => b.id && b.alive);
		if (burgs.length) {
			const b = rng.pick(burgs);
			targetCell = b.cell;
			targetName = b.name;
		}
	} else if (tpl.targetType === 'burg') {
		const burgs = world.burgs.filter((b) => b.id && b.alive && b.id !== hero.burg);
		if (burgs.length) {
			const b = rng.pick(burgs);
			targetCell = b.cell;
			targetName = b.name;
		}
	}

	const title = `${rng.pick(tpl.titleTpl)} in ${targetName}`;
	const reward = tpl.rewardType === 'relic' ? 'a Legendary Relic' : tpl.rewardType === 'gold' ? '100 Gold' : 'Immortal Renown';

	return {
		id: nextId.val++,
		title,
		kind,
		icon: tpl.icon,
		heroId: hero.id,
		heroName: hero.name,
		stateId: hero.state,
		targetCell,
		targetName,
		stage: 'scouting',
		progress: 15,
		reward,
		storyLog: [tpl.scoutingText(hero.name, targetName)],
		completed: false,
		year
	};
}

/** Progress active quests each year */
export function updateQuests(
	quests: Quest[],
	people: Person[],
	artifacts: Artifact[],
	year: number,
	rng: Rng,
	nextArtifactId: { val: number },
	lang: any,
	monsters?: Monster[],
	polities?: Polity[],
	world?: World,
	wonders?: LegendaryPlace[],
	nextWonderId?: { val: number }
): ChronEvent[] {
	const events: ChronEvent[] = [];

	for (const q of quests) {
		if (q.completed) continue;
		const hero = people[q.heroId];
		if (!hero || !hero.alive) {
			q.completed = true;
			q.stage = 'failed';
			continue;
		}

		const tpl = QUEST_TEMPLATES[q.kind];

		if (q.stage === 'scouting') {
			q.stage = 'confrontation';
			q.progress = 55;
			const txt = tpl.confrontationText(hero.name, q.targetName);
			q.storyLog.push(txt);
		} else if (q.stage === 'confrontation') {
			// Subjugation quests fight the monster
			if (q.kind === 'subjugation' && monsters) {
				const monster = monsters.find((m) => m.name === q.targetName && m.alive);
				if (monster) {
					const rawDmg = Math.round(hero.martial * 3.5 + rng.int(10, 35));
					const res = resolveMonsterCombat(monster, rawDmg, hero.name, year, rng);
					hero.health = Math.max(15, hero.health - res.damageTaken);

					if (!res.slain) {
						// Beast is hard to kill and survived!
						q.storyLog.push(res.summary);
						events.push({
							y: year,
							m: rng.int(0, 11),
							kind: 'monster',
							text: `HUNT IN PROGRESS: ${hero.name} duels ${monster.name}! The titan endures with ${res.monsterHpRemaining}/${monster.maxHealth} HP.`,
							cell: q.targetCell,
							state: q.stateId
						});
						continue;
					}

					// Beast was slain!
					q.stage = 'completed';
					q.progress = 100;
					q.completed = true;

					// Forge legendary relic weapon from beast remains
					const art = forgeMonsterRelic(
						nextArtifactId.val++,
						rng,
						year,
						monster,
						hero.name,
						'person',
						hero.id,
						hero.name
					);
					artifacts.push(art);

					// Material bounty
					hero.gold += 120;
					hero.renown += 50;

					// Stability and morale surge
					if (q.stateId && polities && polities[q.stateId]?.alive) {
						polities[q.stateId].stability = Math.min(100, polities[q.stateId].stability + 20);
					}

					// Wonder: Consecrate titan shrine if cataclysm or legendary beast
					if ((monster.tier === 'cataclysm' || monster.tier === 'legendary') && world && wonders && nextWonderId) {
						const shrine = createTitanShrineWonder(
							world,
							q.targetCell,
							monster.layer,
							monster,
							hero.name,
							year,
							nextWonderId
						);
						wonders.push(shrine);
					}

					const victoryMsg = `${hero.name} slays the legendary ${monster.name}! The carcass yields ${art.name} (${monster.trophy || 'Beast Carapace'}), boosting realm stability (+20).`;
					q.storyLog.push(victoryMsg);

					events.push({
						y: year,
						m: rng.int(0, 11),
						kind: 'quest',
						text: `BEAST SLAIN: ${victoryMsg}`,
						cell: q.targetCell,
						state: q.stateId
					});
					continue;
				}
			}

			q.stage = 'completed';
			q.progress = 100;
			q.completed = true;

			let rewardDesc = q.reward;
			if (tpl.rewardType === 'relic') {
				const art = forgeArtifact(
					nextArtifactId.val++,
					rng,
					year,
					lang,
					'person',
					hero.id,
					hero.name,
					`Recovered during the ${q.title} in year ${year}.`
				);
				artifacts.push(art);
				rewardDesc = `the sacred relic ${art.name}`;
			} else if (tpl.rewardType === 'gold') {
				hero.gold += 80;
			}
			hero.renown += 25;

			const txt = tpl.triumphText(hero.name, q.targetName, rewardDesc);
			q.storyLog.push(txt);

			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'quest',
				text: `QUEST COMPLETED: ${q.title}! ${txt}`,
				cell: q.targetCell,
				state: q.stateId
			});
		}
	}

	return events;
}
