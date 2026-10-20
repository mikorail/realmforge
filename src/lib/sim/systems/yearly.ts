/** Thin yearly bridges into politics, intrigue, ecology, pantheon, quests, monster hunts and uprisings modules. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { forgeMonsterRelic } from '../relics';
import { createTitanShrineWonder } from '../wonders';
import { processMonsterWrath, resolveMonsterCombat } from '../monsters';
import { buildRealmRoads } from '../roads';
import { updatePolitics } from '../politics';
import { processAnthropogenicDisasters } from '../ecology';
import { updateIntrigue } from '../intrigue';
import { spawnQuest, updateQuests } from '../quests';
import { applySphereQuest } from '../culture/spherequests';
import { processPantheonInterventions } from '../pantheon';
import { processYearlyUprisings } from '../uprisings';
import { cultureMod } from '../culture';
import { processYearlyBurgs } from '../burgs';
import { processYearlyLeagues } from '../leagues';
import { processYearlyMegastructures } from '../megastructures';
import { processYearlyApotheosis } from '../apotheosis';
import { processYearlyCrisis } from '../crises';
import { conveneWorldCongress, enactCongressSummit } from '../congress';

export function yearlyUprisings(sim: Simulation) {
	const upEvents = processYearlyUprisings(sim);
	for (const ev of upEvents) {
		sim.log('uprising', ev.text, ev.cell, ev.state);
	}
}

export function yearlyPolitics(sim: Simulation) {
	for (const pol of sim.polities) {
		if (!pol.alive || !pol.id) continue;
		const hasWars = sim.warsOf(pol.id).length > 0;
		const { events, regimeChanged } = updatePolitics(pol, sim.people, sim.year, sim.rng, hasWars, cultureMod(sim, pol, 'reform'));
		for (const ev of events) {
			sim.log(ev.kind, ev.text, ev.cell, ev.state);
		}
		if (regimeChanged) {
			sim.dirty.political = true;
		}
	}
}

export function yearlyIntrigue(sim: Simulation) {
	const nextMissionObj = { val: sim.nextMissionId };
	const { events, missions } = updateIntrigue(sim.polities, sim.people, sim.year, sim.rng, nextMissionObj);
	sim.nextMissionId = nextMissionObj.val;
	for (const ev of events) {
		sim.log(ev.kind, ev.text, ev.cell, ev.state);
	}
	sim.missions.push(...missions);
	if (sim.missions.length > 50) sim.missions.splice(0, sim.missions.length - 50);
}

export function yearlyEcology(sim: Simulation) {
	const ecoEvents = processAnthropogenicDisasters(sim.w, sim.polities, sim.year, sim.rng, sim.wonders, sim.innovation);
	for (const ev of ecoEvents) {
		sim.log(ev.kind, ev.text, ev.cell, ev.state);
		sim.dirty.terrain = true;
	}
}

export function yearlyPantheon(sim: Simulation) {
	processPantheonInterventions(sim.polities, sim.wars, sim.year, sim.rng, (k, t, c, s) => sim.log(k, t, c, s));
}

export function yearlyQuests(sim: Simulation) {
	const nextArtObj = { val: sim.nextArtifactId };
	const nextWdObj = { val: sim.nextWonderId };
	const questEvents = updateQuests(
		sim.quests,
		sim.people,
		sim.artifacts,
		sim.year,
		sim.rng,
		nextArtObj,
		sim.lang(1),
		sim.monsters,
		sim.polities,
		sim.w,
		sim.wonders,
		nextWdObj
	);
	sim.nextArtifactId = nextArtObj.val;
	sim.nextWonderId = nextWdObj.val;
	for (const ev of questEvents) {
		sim.log(ev.kind, ev.text, ev.cell, ev.state);
	}

	// Spawn new quest periodically if under cap
	const activeQuests = sim.quests.filter((q) => !q.completed);
	if (activeQuests.length < 4 && sim.rng.chance(0.45)) {
		const nextQObj = { val: sim.nextQuestId };
		const q = spawnQuest(sim.w, sim.polities, sim.people, sim.monsters, sim.rng, sim.year, nextQObj);
		sim.nextQuestId = nextQObj.val;
		if (q) {
			applySphereQuest(sim, q);
			sim.quests.push(q);
			sim.log('quest', `QUEST UNDERTAKEN: ${q.heroName} embarks upon the ${q.title}! ${q.storyLog[0]}`, q.targetCell, q.stateId);
		}
	}
}

export function yearlyMonsterHunts(sim: Simulation) {
	const aliveMonsters = sim.monsters.filter((m) => m.alive);
	if (!aliveMonsters.length) return;
	const aliveRealms = sim.polities.filter((p) => p.id && p.alive && p.army >= 28);
	if (!aliveRealms.length) return;

	for (const pol of aliveRealms) {
		if (sim.rng.chance(0.20)) {
			// Target monster within or near realm
			const targetMonster =
				aliveMonsters.find((m) => {
					const cellState = sim.w.layers[m.layer]?.state[m.cell];
					return cellState === pol.id;
				}) || (sim.rng.chance(0.3) ? sim.rng.pick(aliveMonsters) : null);

			if (!targetMonster || !targetMonster.alive) continue;

			const ruler = sim.people[pol.ruler];
			const leaderName = ruler?.alive ? ruler.name : `${pol.name} Royal Host`;
			const rawDmg = Math.round(pol.army * 1.6 + sim.rng.int(15, 40));
			const res = resolveMonsterCombat(targetMonster, rawDmg, leaderName, sim.year, sim.rng);

			const casualtyFactor = targetMonster.power >= 85 ? 0.35 : 0.15;
			pol.army = Math.max(0, +(pol.army - res.damageTaken * casualtyFactor).toFixed(1));

			if (res.slain) {
				// Forge monster relic for the realm
				const art = forgeMonsterRelic(
					sim.nextArtifactId++,
					sim.rng,
					sim.year,
					targetMonster,
					leaderName,
					'polity',
					pol.id,
					pol.name
				);
				sim.artifacts.push(art);

				pol.treasury += 150;
				pol.stability = clamp(pol.stability + 20, 0, 100);
				sim.gainInnovation(35);
				if (ruler?.alive) ruler.renown += 40;

				if (targetMonster.tier === 'cataclysm' || targetMonster.tier === 'legendary') {
					const nextWdObj = { val: sim.nextWonderId };
					const shrine = createTitanShrineWonder(
						sim.w,
						targetMonster.cell,
						targetMonster.layer,
						targetMonster,
						leaderName,
						sim.year,
						nextWdObj
					);
					sim.nextWonderId = nextWdObj.val;
					sim.wonders.push(shrine);
				}

				const triumphText = targetMonster.immortal
					? `EXPEDITION TRIUMPH: ${leaderName} and the hosts of ${pol.name} defeat ${targetMonster.name}, banishing the immortal titan into deep slumber in ${targetMonster.lairName}! Spoils: ${art.name} (${targetMonster.trophy || 'Dragonhide'}), boosting stability (+20) and treasury (+150 gold).`
					: `EXPEDITION TRIUMPH: ${leaderName} and the hosts of ${pol.name} slay ${targetMonster.name}! Spoils: ${art.name} (${targetMonster.trophy || 'Dragonhide'}), boosting stability (+20) and treasury (+150 gold).`;

				sim.log('monster', triumphText, targetMonster.cell, pol.id);
			} else {
				sim.log(
					'monster',
					`TITAN CLASH: The armies of ${pol.name} clash with ${targetMonster.name} in cell ${targetMonster.cell}! The beast resists with ${res.monsterHpRemaining}/${targetMonster.maxHealth} HP.`,
					targetMonster.cell,
					pol.id
				);
			}
			break;
		}
	}
}

export function yearlyBeastWrath(sim: Simulation) {
	const events = processMonsterWrath(sim);
	for (const ev of events) {
		sim.log(ev.kind, ev.text, ev.cell, ev.state);
	}
}

export function yearlyRoadConstruction(sim: Simulation) {
	buildRealmRoads(sim);
}

export function yearlyBurgs(sim: Simulation) {
	processYearlyBurgs(sim);
}

export function yearlyLeagues(sim: Simulation) {
	processYearlyLeagues(sim);
}

export function yearlyMegastructures(sim: Simulation) {
	processYearlyMegastructures(sim);
}

export function yearlyApotheosis(sim: Simulation) {
	const res = processYearlyApotheosis(sim);
	for (const ev of res.events) {
		sim.log('faith', ev.text, ev.cell, ev.state);
	}
}

export function yearlyCrises(sim: Simulation) {
	const res = processYearlyCrisis(sim);
	for (const ev of res.events) {
		sim.log('disaster', ev.text, ev.cell, ev.state);
	}
}

export function yearlyCongress(sim: Simulation) {
	if (sim.year > 1 && sim.year % 25 === 0) {
		const summit = conveneWorldCongress(sim);
		const outcome = enactCongressSummit(sim, summit);
		for (const ev of outcome.events) {
			sim.log('misc', ev.text, undefined, ev.state);
		}
	}
}


