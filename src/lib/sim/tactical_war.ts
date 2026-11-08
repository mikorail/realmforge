/**
 * Tactical Warfare & Citadel Siege Operations (tactical_war.ts).
 * 1. Tactical battlefield simulation: regiment formations (phalanxes, cavalry flanking wedges, archer volleys, siege engines).
 * 2. Elevation, river chokepoints, forest ambushes, and morale routs.
 * 3. Multi-stage citadel sieges: outer bastion sappers, battering rams, portcullis breaches, boiling pitch, and courtyard storms.
 * 4. Resolves casualties and records epic annals into the world chronicle.
 */

import type { Simulation } from './engine';
import { clamp } from '../rng';

export type RegimentType = 'infantry' | 'cavalry' | 'archers' | 'siege_engine' | 'war_beast';

export interface TacticalRegiment {
	id: string;
	realmId: number;
	name: string;
	type: RegimentType;
	hp: number;
	maxHp: number;
	morale: number; // 0..100
	attack: number;
	defense: number;
	range: number;
	x: number; // 0..10 on battle canvas
	y: number; // 0..6
	isAttacker: boolean;
	status: 'ready' | 'charging' | 'firing' | 'braced' | 'routed';
}

export interface TacticalBattle {
	id: string;
	warId?: number;
	attackerRealmId: number;
	defenderRealmId: number;
	attackerName: string;
	defenderName: string;
	cellId: number;
	terrain: 'plains' | 'hills' | 'forest' | 'river' | 'mountain';
	turn: number;
	regiments: TacticalRegiment[];
	log: string[];
	winner: 'attacker' | 'defender' | null;
	casualtiesA: number;
	casualtiesD: number;
}

export interface CitadelSiege {
	burgId: number;
	burgName: string;
	attackerRealmId: number;
	defenderRealmId: number;
	attackerName: string;
	defenderName: string;
	wallsHP: number;
	maxWallsHP: number;
	gateHP: number;
	maxGateHP: number;
	breaches: number;
	sapperProgress: number; // 0..100
	boiledPitchCount: number;
	phase: 'bombardment' | 'assault' | 'breached' | 'citadel_storm' | 'sacked' | 'repelled';
	log: string[];
	turn: number;
}

export function createTacticalBattle(
	sim: Simulation,
	attackerRealmId: number,
	defenderRealmId: number,
	cellId: number
): TacticalBattle {
	const att = sim.polities[attackerRealmId]?.name || 'Invader Army';
	const def = sim.polities[defenderRealmId]?.name || 'Defending Legion';

	// Determine battlefield terrain
	const elev = (sim.w.cells.h[cellId] || 50) / 100;
	let terrain: TacticalBattle['terrain'] = 'plains';
	if (elev > 0.75) terrain = 'mountain';
	else if (elev > 0.6) terrain = 'hills';
	else if (sim.w.cells.river[cellId]) terrain = 'river';
	else if (sim.w.cells.biome[cellId] === 6 || sim.w.cells.biome[cellId] === 7) terrain = 'forest';

	const regs: TacticalRegiment[] = [];

	// Build Attacker regiments (deploy left: x = 1..2)
	const attTypes: { name: string; type: RegimentType; atk: number; def: number; hp: number; rng: number }[] = [
		{ name: `${att} Royal Vanguard`, type: 'infantry', atk: 18, def: 15, hp: 120, rng: 1 },
		{ name: `${att} Iron Phalanx`, type: 'infantry', atk: 16, def: 18, hp: 130, rng: 1 },
		{ name: `${att} Winged Cuirassiers`, type: 'cavalry', atk: 24, def: 12, hp: 100, rng: 1 },
		{ name: `${att} Composite Longbows`, type: 'archers', atk: 20, def: 8, hp: 80, rng: 3 },
		{ name: `${att} Heavy Catapult`, type: 'siege_engine', atk: 30, def: 6, hp: 70, rng: 4 }
	];

	attTypes.forEach((t, i) => {
		regs.push({
			id: `att_${i}`,
			realmId: attackerRealmId,
			name: t.name,
			type: t.type,
			hp: t.hp,
			maxHp: t.hp,
			morale: 100,
			attack: t.atk,
			defense: t.def,
			range: t.rng,
			x: t.type === 'cavalry' ? 1 : t.type === 'archers' ? 0 : 2,
			y: i + 1,
			isAttacker: true,
			status: 'ready'
		});
	});

	// Build Defender regiments (deploy right: x = 8..9)
	const defTypes: { name: string; type: RegimentType; atk: number; def: number; hp: number; rng: number }[] = [
		{ name: `${def} Citadel Guard`, type: 'infantry', atk: 17, def: 17, hp: 125, rng: 1 },
		{ name: `${def} Mountain Pikemen`, type: 'infantry', atk: 15, def: 19, hp: 135, rng: 1 },
		{ name: `${def} Heavy Knights`, type: 'cavalry', atk: 22, def: 14, hp: 105, rng: 1 },
		{ name: `${def} Marksmen Corps`, type: 'archers', atk: 19, def: 9, hp: 85, rng: 3 },
		{ name: `${def} Armored War Beasts`, type: 'war_beast', atk: 26, def: 16, hp: 140, rng: 1 }
	];

	defTypes.forEach((t, i) => {
		regs.push({
			id: `def_${i}`,
			realmId: defenderRealmId,
			name: t.name,
			type: t.type,
			hp: t.hp,
			maxHp: t.hp,
			morale: 100,
			attack: t.atk,
			defense: t.def,
			range: t.rng,
			x: t.type === 'cavalry' ? 9 : t.type === 'archers' ? 10 : 8,
			y: i + 1,
			isAttacker: false,
			status: 'ready'
		});
	});

	const battle: TacticalBattle = {
		id: `battle_${attackerRealmId}_${defenderRealmId}_${cellId}_${sim.year}`,
		attackerRealmId,
		defenderRealmId,
		attackerName: att,
		defenderName: def,
		cellId,
		terrain,
		turn: 1,
		regiments: regs,
		log: [
			`Battle Lines Formed: ${att} confronts ${def} across the ${terrain} terrain. Horns sound across the line!`
		],
		winner: null,
		casualtiesA: 0,
		casualtiesD: 0
	};

	return battle;
}

export function commandBattle(
	sim: Simulation,
	battle: TacticalBattle,
	action: 'advance' | 'cavalry_flank' | 'archer_volley' | 'shield_wall' | 'rally'
): string {
	if (battle.winner) return 'Battle concluded.';
	battle.turn++;
	let turnReport = '';

	const attAlive = battle.regiments.filter((r) => r.isAttacker && r.hp > 0 && r.status !== 'routed');
	const defAlive = battle.regiments.filter((r) => !r.isAttacker && r.hp > 0 && r.status !== 'routed');

	if (!attAlive.length || !defAlive.length) {
		battle.winner = attAlive.length ? 'attacker' : 'defender';
		const vict = battle.winner === 'attacker' ? battle.attackerName : battle.defenderName;
		const endMsg = `Decisive Victory: ${vict} breaks enemy lines and claims the battlefield!`;
		battle.log.unshift(endMsg);
		sim.log('war', endMsg);
		return endMsg;
	}

	// Player/Attacker command resolution
	switch (action) {
		case 'advance': {
			for (const r of attAlive) {
				if (r.x < 4) r.x++;
				r.status = 'ready';
			}
			// Clash with adjacent defenders
			const target = defAlive[0];
			const dmg = Math.floor(22 + sim.rng.int(5, 15));
			target.hp = Math.max(0, target.hp - dmg);
			target.morale = Math.max(0, target.morale - 12);
			battle.casualtiesD += dmg;
			turnReport = `Infantry Advance: Vanguard presses forward! Deals ${dmg} damage to ${target.name}.`;
			break;
		}
		case 'cavalry_flank': {
			const cav = attAlive.find((r) => r.type === 'cavalry');
			if (cav) {
				cav.status = 'charging';
				const archerTarget = defAlive.find((r) => r.type === 'archers') || defAlive[defAlive.length - 1];
				const flankBonus = battle.terrain === 'plains' ? 1.4 : 1.0;
				const dmg = Math.floor((30 + sim.rng.int(10, 20)) * flankBonus);
				archerTarget.hp = Math.max(0, archerTarget.hp - dmg);
				archerTarget.morale = Math.max(0, archerTarget.morale - 25);
				battle.casualtiesD += dmg;
				turnReport = `Cavalry Flank: Winged Cuirassiers thunder into ${archerTarget.name}'s flank for ${dmg} shock damage!`;
			} else {
				turnReport = 'No active cavalry regiment available for flanking.';
			}
			break;
		}
		case 'archer_volley': {
			const arch = attAlive.filter((r) => r.type === 'archers' || r.type === 'siege_engine');
			let totalDmg = 0;
			for (const a of arch) {
				a.status = 'firing';
				const target = sim.rng.pick(defAlive);
				const hit = Math.floor(18 + sim.rng.int(5, 12));
				target.hp = Math.max(0, target.hp - hit);
				totalDmg += hit;
			}
			battle.casualtiesD += totalDmg;
			turnReport = `Ranged Volley: Clouds of arrows and catapult stones rain down, inflicting ${totalDmg} casualties.`;
			break;
		}
		case 'shield_wall': {
			for (const r of attAlive.filter((r) => r.type === 'infantry')) {
				r.defense += 4;
				r.status = 'braced';
			}
			turnReport = 'Shield Wall: Infantry lock shields and ground spears (+4 Defense against cavalry charges).';
			break;
		}
		case 'rally': {
			for (const r of attAlive) {
				r.morale = Math.min(100, r.morale + 20);
			}
			turnReport = 'Battle Horn Sounded: Inspiring heraldry restores +20 Morale to all regiments!';
			break;
		}
	}

	// Defender AI Turn Counter-Attack
	const defAttacker = sim.rng.pick(defAlive);
	const attTarget = sim.rng.pick(attAlive);
	if (defAttacker && attTarget) {
		const defDmg = Math.floor(16 + sim.rng.int(4, 12) * (battle.terrain === 'mountain' ? 1.25 : 1.0));
		attTarget.hp = Math.max(0, attTarget.hp - defDmg);
		attTarget.morale = Math.max(0, attTarget.morale - 10);
		battle.casualtiesA += defDmg;
		turnReport += ` Enemy ${defAttacker.name} counters fiercely, dealing ${defDmg} damage to ${attTarget.name}.`;
	}

	// Morale check & routs
	for (const reg of battle.regiments) {
		if (reg.hp <= 0 && reg.status !== 'routed') {
			reg.status = 'routed';
			battle.log.unshift(`${reg.name} has suffered devastating casualties and shattered!`);
		} else if (reg.morale < 20 && reg.status !== 'routed') {
			reg.status = 'routed';
			battle.log.unshift(`${reg.name} panics under heavy fire and breaks ranks in a rout!`);
		}
	}

	battle.log.unshift(turnReport);

	// Check victory condition
	const attRemaining = battle.regiments.some((r) => r.isAttacker && r.hp > 0 && r.status !== 'routed');
	const defRemaining = battle.regiments.some((r) => !r.isAttacker && r.hp > 0 && r.status !== 'routed');

	if (!defRemaining) {
		battle.winner = 'attacker';
		const winMsg = `Decisive Victory: ${battle.attackerName} shatters the defender's army on the field!`;
		battle.log.unshift(winMsg);
		sim.log('war', winMsg);
	} else if (!attRemaining) {
		battle.winner = 'defender';
		const loseMsg = `Defeat: ${battle.defenderName} successfully repels the invasion forces!`;
		battle.log.unshift(loseMsg);
		sim.log('war', loseMsg);
	}

	return turnReport;
}

export function autoResolveBattle(sim: Simulation, battle: TacticalBattle): string {
	while (!battle.winner && battle.turn < 20) {
		const action = sim.rng.pick(['advance', 'cavalry_flank', 'archer_volley'] as const);
		commandBattle(sim, battle, action);
	}
	return battle.log[0] || 'Battle resolved.';
}

export function createCitadelSiege(sim: Simulation, burgId: number, attackerRealmId: number): CitadelSiege {
	const burg = sim.w.burgs[burgId];
	const bName = burg?.name || 'Citadel';
	const defRealmId = burg?.state || 0;
	const attName = sim.polities[attackerRealmId]?.name || 'Besieging Host';
	const defName = sim.polities[defRealmId]?.name || 'Garrison Defenders';

	const wallsHP = 250;
	const gateHP = 150;

	return {
		burgId,
		burgName: bName,
		attackerRealmId,
		defenderRealmId: defRealmId,
		attackerName: attName,
		defenderName: defName,
		wallsHP,
		maxWallsHP: wallsHP,
		gateHP,
		maxGateHP: gateHP,
		breaches: 0,
		sapperProgress: 0,
		boiledPitchCount: 3,
		phase: 'bombardment',
		log: [
			`Siege Encampment Established: ${attName} invests the stone walls of ${bName}. Catapults and sappers deployed.`
		],
		turn: 1
	};
}

export function commandSiege(
	sim: Simulation,
	siege: CitadelSiege,
	action: 'bombard' | 'sapper' | 'ram_gate' | 'pour_pitch' | 'storm_citadel'
): string {
	siege.turn++;
	let report = '';

	switch (action) {
		case 'bombard': {
			const dmg = Math.floor(25 + sim.rng.int(10, 20));
			siege.wallsHP = Math.max(0, siege.wallsHP - dmg);
			report = `Trebuchet Barrage: Massive stone projectiles crash into the ramparts, inflicting ${dmg} structural damage!`;
			if (siege.wallsHP <= 0 && siege.breaches < 3) {
				siege.breaches++;
				siege.phase = 'breached';
				report += ' The curtain wall collapses into rubble, creating a viable assault breach!';
			}
			break;
		}
		case 'sapper': {
			siege.sapperProgress = Math.min(100, siege.sapperProgress + 35);
			report = `Sapper Tunnels: Miners dig beneath the gatehouse towers (${siege.sapperProgress}% progress).`;
			if (siege.sapperProgress >= 100) {
				siege.gateHP = Math.max(0, siege.gateHP - 90);
				report += ' Timber supports ignited! The bastion foundation crumbles with a thunderous roar!';
			}
			break;
		}
		case 'ram_gate': {
			const dmg = Math.floor(30 + sim.rng.int(10, 25));
			siege.gateHP = Math.max(0, siege.gateHP - dmg);
			report = `Iron Battering Ram: Iron-shod ram hammers against the portcullis for ${dmg} damage.`;
			if (siege.gateHP <= 0) {
				siege.phase = 'citadel_storm';
				report += ' The iron portcullis splinters wide open! The inner plaza lies exposed!';
			}
			break;
		}
		case 'pour_pitch': {
			if (siege.boiledPitchCount > 0) {
				siege.boiledPitchCount--;
				report = 'Boiled Pitch Defense: Garrison pours burning oil from machicolations, scorching enemy assault ladders!';
			} else {
				report = 'Garrison cauldron oil stores are exhausted!';
			}
			break;
		}
		case 'storm_citadel': {
			if (siege.breaches > 0 || siege.gateHP <= 0) {
				siege.phase = 'sacked';
				report = `Citadel Breached: Troops flood through the collapsed bastions and storm the palace! ${siege.burgName} has fallen!`;
				sim.log('war', report);
			} else {
				report = 'Assault repelled! The walls and gatehouse still hold firm against direct infantry storming.';
			}
			break;
		}
	}

	siege.log.unshift(report);
	return report;
}
