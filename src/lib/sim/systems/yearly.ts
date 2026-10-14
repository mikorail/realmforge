/** Thin yearly bridges into politics, intrigue, ecology, pantheon, quests, monster hunts and uprisings modules. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { forgeMonsterRelic } from '../relics';
import { createTitanShrineWonder } from '../wonders';
import { resolveMonsterCombat } from '../monsters';
import { updatePolitics } from '../politics';
import { processAnthropogenicDisasters } from '../ecology';
import { updateIntrigue } from '../intrigue';
import { spawnQuest, updateQuests } from '../quests';
import { processPantheonInterventions } from '../pantheon';
import { processYearlyUprisings } from '../uprisings';

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
		const { events, regimeChanged } = updatePolitics(pol, sim.people, sim.year, sim.rng, hasWars);
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

			pol.army = Math.max(5, +(pol.army - res.damageTaken * 0.15).toFixed(1));

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

				sim.log(
					'monster',
					`EXPEDITION TRIUMPH: ${leaderName} and the hosts of ${pol.name} slay ${targetMonster.name}! Spoils: ${art.name} (${targetMonster.trophy || 'Dragonhide'}), boosting stability (+20) and treasury (+150 gold).`,
					targetMonster.cell,
					pol.id
				);
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
