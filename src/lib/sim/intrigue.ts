import type { Rng } from '../rng';
import type { ChronEvent, CovertMission, CovertOpKind, Person, Polity } from './types';

export interface CovertOpDef {
	kind: CovertOpKind;
	name: string;
	icon: string;
	difficulty: number; // 0..100
	desc: string;
}

export const COVERT_OPS: Record<CovertOpKind, CovertOpDef> = {
	sabotage: {
		kind: 'sabotage',
		name: 'Sabotage Armories',
		icon: '🔥',
		difficulty: 45,
		desc: 'Infiltrate weapon depots and powder magazines to destroy war material.'
	},
	incite_revolt: {
		kind: 'incite_revolt',
		name: 'Incite Sedition',
		icon: '✊',
		difficulty: 55,
		desc: 'Fund provincial dissidents and supply weapons to rebel cells.'
	},
	assassinate: {
		kind: 'assassinate',
		name: 'Court Assassination',
		icon: '🗡️',
		difficulty: 65,
		desc: 'Poison or ambush a key general, heir, or court dignitary.'
	},
	siphon: {
		kind: 'siphon',
		name: 'Siphon Treasury',
		icon: '💰',
		difficulty: 40,
		desc: 'Embezzle gold from trade customs and customs houses into state coffers.'
	},
	sow_distrust: {
		kind: 'sow_distrust',
		name: 'Sow Diplomatic Paranoia',
		icon: '📜',
		difficulty: 50,
		desc: 'Forge treasonous letters to poison alliances between foreign courts.'
	}
};

/** Conduct yearly covert espionage and sabotage operations between rival realms */
export function updateIntrigue(
	polities: Polity[],
	people: Person[],
	year: number,
	rng: Rng,
	nextMissionId: { val: number }
): { events: ChronEvent[]; missions: CovertMission[] } {
	const events: ChronEvent[] = [];
	const missions: CovertMission[] = [];

	const alivePolities = polities.filter((p) => p.alive && p.id);
	if (alivePolities.length < 2) return { events, missions };

	// 1 to 3 covert operations occur each year
	const attempts = rng.int(1, 3);
	for (let i = 0; i < attempts; i++) {
		const source = rng.pick(alivePolities);
		// Pick a target with poor relations or at war
		const possibleTargets = alivePolities.filter((p) => p.id !== source.id && ((source.relations[p.id] ?? 0) < 10));
		if (!possibleTargets.length) continue;

		const target = rng.pick(possibleTargets);
		const kind = rng.pick<CovertOpKind>(['sabotage', 'incite_revolt', 'assassinate', 'siphon', 'sow_distrust']);
		const opDef = COVERT_OPS[kind];

		// Source spymaster or high-intrigue agent
		const agentIntrigue = rng.int(8, 16);
		const targetDefense = rng.int(6, 14);

		const success = agentIntrigue + rng.int(1, 10) > targetDefense + (opDef.difficulty / 10);
		const discovered = !success ? rng.chance(0.65) : rng.chance(0.35);

		const operativeName = `Agent ${rng.pick(['Shadow-Weaver', 'Night-Blade', 'Whisper', 'Falcon', 'Ghost', 'Viper'])}`;
		let summary = '';

		if (success) {
			if (kind === 'sabotage') {
				target.army = +(target.army * 0.85).toFixed(1);
				summary = `Covert saboteurs from ${source.name} detonate powder stores in ${target.name}, gutting frontline regiments!`;
			} else if (kind === 'incite_revolt') {
				target.stability = Math.max(5, target.stability - 14);
				summary = `Agitators dispatched by ${source.name} stir mutiny among garrison troops in ${target.name}!`;
			} else if (kind === 'assassinate') {
				const victims = people.filter((p) => p.alive && p.state === target.id && p.id !== target.ruler);
				if (victims.length) {
					const victim = rng.pick(victims);
					victim.alive = false;
					victim.died = year;
					victim.cause = `poisoned by spies of ${source.name}`;
					summary = `Assassins from ${source.name} strike in the dead of night, slaying ${victim.name} in the court of ${target.name}!`;
				} else {
					summary = `An assassination attempt orchestrated by ${source.name} strikes fear into the court of ${target.name}.`;
				}
			} else if (kind === 'siphon') {
				const loot = Math.min(25, target.treasury * 0.3);
				target.treasury = Math.max(0, target.treasury - loot);
				source.treasury += loot;
				summary = `Shadow agents from ${source.name} divert ${loot.toFixed(0)} gold from the tax vaults of ${target.name}!`;
			} else if (kind === 'sow_distrust') {
				if (target.allies.length) {
					const betrayedAllyId = rng.pick(target.allies);
					const ally = polities[betrayedAllyId];
					if (ally) {
						target.relations[betrayedAllyId] = (target.relations[betrayedAllyId] ?? 0) - 35;
						ally.relations[target.id] = (ally.relations[target.id] ?? 0) - 35;
						summary = `Counterfeit letters planted by ${source.name} rupture trust between ${target.name} and their ally ${ally.name}!`;
					}
				} else {
					summary = `Clandestine agents from ${source.name} sow suspicion in the frontier councils of ${target.name}.`;
				}
			}

			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'intrigue',
				text: `COVERT INTRIGUE: ${summary}`,
				state: target.id
			});
		} else {
			summary = `A covert operation by agents of ${source.name} attempting to ${opDef.name.toLowerCase()} against ${target.name} is thwarted.`;
		}

		if (discovered) {
			source.relations[target.id] = (source.relations[target.id] ?? 0) - 40;
			target.relations[source.id] = (target.relations[source.id] ?? 0) - 40;
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'intrigue',
				text: `DIPLOMATIC SCANDAL: Envoys of ${source.name} are expelled after their covert spies are unmasked in ${target.name}!`,
				state: target.id
			});
		}

		missions.push({
			id: nextMissionId.val++,
			sourceState: source.id,
			targetState: target.id,
			kind,
			operativeName,
			success,
			discovered,
			year,
			summary
		});
	}

	return { events, missions };
}
