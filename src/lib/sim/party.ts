import type { Simulation } from './engine';
import type { Person } from './types';

export type PartyRole = 'champion' | 'spymaster' | 'quartermaster' | 'lorekeeper';

export interface WarbandContract {
	id: number;
	employerStateId: number;
	targetStateId: number;
	bountyPerCapture: number;
	monthlyPay: number;
	startYear: number;
	durationMonths: number;
}

export interface Warband {
	leaderId: number;
	members: { personId: number; role: PartyRole; equipment?: string }[];
	morale: number;
	renown: number;
	contracts: WarbandContract[];
}

export interface PartyAggregateSkills {
	martial: number;
	diplomacy: number;
	stewardship: number;
	intrigue: number;
	arcana: number;
}

/**
 * Assign an adventuring role to a person in the avatar fellowship or warband.
 * Champion boosts martial (+combat rolls).
 * Spymaster boosts intrigue (+stealth, scouting).
 * Quartermaster boosts stewardship (+party loot, -upkeep).
 * Lorekeeper boosts arcana (+relic identification, ancient wards).
 */
export function assignPartyRole(
	sim: Simulation,
	personId: number,
	role: PartyRole
): { success: boolean; msg: string } {
	const person = sim.people[personId];
	if (!person || !person.alive) {
		return { success: false, msg: 'Person is not available or deceased.' };
	}

	const leaderId = sim.avatar;
	const leader = leaderId >= 0 ? sim.people[leaderId] : null;

	// Verify the person belongs to the avatar party or fellowship
	const isLeader = personId === leaderId;
	const isCompanion = leader && (leader.companions ?? []).includes(personId);
	if (!isLeader && !isCompanion && person.companionOf !== leaderId) {
		return { success: false, msg: 'Person is not a member of your fellowship or warband.' };
	}

	// Reassign previous holder in party if role is unique
	if (leader) {
		if (isLeader && leader.partyRole === role) {
			// Already assigned
		} else {
			if (leader.partyRole === role) {
				leader.partyRole = undefined;
			}
			for (const cid of leader.companions ?? []) {
				if (cid !== personId && sim.people[cid]?.partyRole === role) {
					sim.people[cid].partyRole = undefined;
				}
			}
		}
	}

	person.partyRole = role;

	const roleDescriptions: Record<PartyRole, string> = {
		champion: 'Champion (boosts combat prowess and martial assault)',
		spymaster: 'Spymaster (boosts scouting, stealth, and hazard disarm)',
		quartermaster: 'Quartermaster (boosts supply logistics, loot share, and contract profits)',
		lorekeeper: 'Lorekeeper (boosts ancient deciphering, relic finding, and ward breaking)'
	};

	const msg = `${person.name} is now the ${roleDescriptions[role]}.`;
	if (sim.log) {
		sim.log('avatar', msg);
	}

	return { success: true, msg };
}

/**
 * Calculate the total aggregate capabilities of the adventuring company.
 * Combines the leader baseline stats with companion contributions and specialized role boosts.
 */
export function getPartyAggregateSkills(sim: Simulation, avatarId: number): PartyAggregateSkills {
	const avatar = sim.people[avatarId];
	if (!avatar || !avatar.alive) {
		return { martial: 0, diplomacy: 0, stewardship: 0, intrigue: 0, arcana: 0 };
	}

	// Derive base arcana from traits and mental stats if not explicitly defined
	const deriveArcana = (p: Person): number => {
		const raw = (p as unknown as { arcana?: number }).arcana;
		if (typeof raw === 'number') return raw;
		let base = Math.max(1, Math.round((p.intrigue + p.stewardship) / 2));
		if (p.traits.includes('Mystic')) base += 3;
		if (p.traits.includes('Scholar')) base += 2;
		if (p.traits.includes('Wise')) base += 2;
		if (p.role === 'priest' || p.role === 'prophet') base += 3;
		return base;
	};

	let martial = avatar.martial;
	let diplomacy = avatar.diplomacy;
	let stewardship = avatar.stewardship;
	let intrigue = avatar.intrigue;
	let arcana = deriveArcana(avatar);

	const companions = (avatar.companions ?? [])
		.map((id) => sim.people[id])
		.filter((p): p is Person => Boolean(p && p.alive));

	// Companions contribute half their relevant skills
	for (const c of companions) {
		martial += Math.floor(c.martial / 2);
		diplomacy += Math.floor(c.diplomacy / 2);
		stewardship += Math.floor(c.stewardship / 2);
		intrigue += Math.floor(c.intrigue / 2);
		arcana += Math.floor(deriveArcana(c) / 2);
	}

	// Specialized role boosts
	const allMembers = [avatar, ...companions];
	for (const m of allMembers) {
		if (!m.partyRole) continue;
		switch (m.partyRole) {
			case 'champion':
				martial += Math.max(5, Math.floor(m.martial * 0.4));
				break;
			case 'spymaster':
				intrigue += Math.max(5, Math.floor(m.intrigue * 0.4));
				break;
			case 'quartermaster':
				stewardship += Math.max(5, Math.floor(m.stewardship * 0.4));
				break;
			case 'lorekeeper':
				arcana += Math.max(5, Math.floor(deriveArcana(m) * 0.4));
				break;
		}
	}

	// Artifact boosts held by the avatar
	if (sim.artifacts) {
		for (const art of sim.artifacts) {
			if (art.holderType === 'person' && art.holderId === avatar.id) {
				if (art.bonusStat === 'martial') martial += art.bonusVal;
				if (art.bonusStat === 'diplomacy') diplomacy += art.bonusVal;
				if (art.bonusStat === 'stewardship') stewardship += art.bonusVal;
				if (art.bonusStat === 'intrigue') intrigue += art.bonusVal;
			}
		}
	}

	return {
		martial: Math.max(0, martial),
		diplomacy: Math.max(0, diplomacy),
		stewardship: Math.max(0, stewardship),
		intrigue: Math.max(0, intrigue),
		arcana: Math.max(0, arcana)
	};
}

/**
 * Sign a formal mercenary charter with an employer realm.
 * The warband agrees to fight against the realm's enemies for monthly pay and bounties.
 */
export function signMercenaryContract(
	sim: Simulation,
	avatarId: number,
	employerStateId: number
): { success: boolean; contract?: WarbandContract; msg: string } {
	const avatar = sim.people[avatarId];
	if (!avatar || !avatar.alive) {
		return { success: false, msg: 'Warband leader is unavailable or deceased.' };
	}

	const employer = sim.polities[employerStateId];
	if (!employer || !employer.alive || employer.id === 0) {
		return { success: false, msg: 'Invalid or fallen employer realm.' };
	}

	// Identify target enemy: active war enemy or most hostile rival
	const activeWars = sim.warsOf ? sim.warsOf(employerStateId) : sim.wars.filter((w) => !w.end && (w.attackers.includes(employerStateId) || w.defenders.includes(employerStateId)));
	let targetStateId = 0;
	if (activeWars.length > 0) {
		const w = activeWars[0];
		targetStateId = w.attackers.includes(employerStateId) ? (w.defenders[0] ?? 0) : (w.attackers[0] ?? 0);
	} else {
		let lowestRel = 999;
		for (const [stIdStr, rel] of Object.entries(employer.relations ?? {})) {
			const stId = Number(stIdStr);
			if (stId && stId !== employerStateId && sim.polities[stId]?.alive && rel < lowestRel) {
				lowestRel = rel;
				targetStateId = stId;
			}
		}
		if (targetStateId === 0) {
			const other = sim.polities.find((p) => p.alive && p.id > 0 && p.id !== employerStateId);
			targetStateId = other ? other.id : 0;
		}
	}

	const skills = getPartyAggregateSkills(sim, avatarId);
	const monthlyPay = Math.max(15, Math.floor(15 + skills.martial * 0.8 + (avatar.renown || 0) * 0.3));
	const bountyPerCapture = Math.max(25, Math.floor(25 + skills.intrigue * 0.6 + skills.martial * 0.5));
	const durationMonths = 12;

	const contractId = sim.rng ? sim.rng.int(1000, 99999) : Math.floor(1000 + Date.now() % 90000);
	const contract: WarbandContract = {
		id: contractId,
		employerStateId,
		targetStateId,
		bountyPerCapture,
		monthlyPay,
		startYear: sim.year,
		durationMonths
	};

	const targetName = sim.polities[targetStateId]?.name ?? 'hostile raiders';
	const msg = `Signed mercenary contract with ${employer.name} against ${targetName} for ${monthlyPay} gold/month and ${bountyPerCapture} gold per capture.`;

	if (sim.log) {
		sim.log('avatar', msg);
	}

	return { success: true, contract, msg };
}

/**
 * Process a monthly cycle of an active mercenary contract.
 * Grants regular retainer pay, applies Quartermaster logistics savings, and rolls for bounties.
 */
export function resolveMercenaryContractTick(
	sim: Simulation,
	contract: WarbandContract,
	avatarId: number
): { payout: number; active: boolean; text: string } {
	const avatar = sim.people[avatarId];
	if (!avatar || !avatar.alive) {
		return { payout: 0, active: false, text: 'The warband leader has fallen. Contract terminated.' };
	}

	const employer = sim.polities[contract.employerStateId];
	if (!employer || !employer.alive) {
		return { payout: 0, active: false, text: 'Employer realm has fallen into ruin. Contract dissolved.' };
	}

	if (contract.durationMonths <= 0) {
		return { payout: 0, active: false, text: `The mercenary contract with ${employer.name} has concluded.` };
	}

	// Quartermaster reduces supply costs and boosts retained profit
	const companions = (avatar.companions ?? [])
		.map((id) => sim.people[id])
		.filter((p): p is Person => Boolean(p && p.alive));
	const hasQuartermaster = avatar.partyRole === 'quartermaster' || companions.some((c) => c.partyRole === 'quartermaster');
	const quartermasterBonus = hasQuartermaster ? Math.round(contract.monthlyPay * 0.25) : 0;

	// Skirmish engagement and prisoner capture check
	const skills = getPartyAggregateSkills(sim, avatarId);
	const captureChance = Math.min(0.7, 0.2 + skills.martial * 0.01 + skills.intrigue * 0.01);
	let captures = 0;
	if (sim.rng.chance(captureChance)) {
		captures = sim.rng.int(1, 2);
	}

	const bountyTotal = captures * contract.bountyPerCapture;
	const payout = contract.monthlyPay + quartermasterBonus + bountyTotal;

	avatar.gold += payout;
	avatar.renown += 1 + captures;
	employer.treasury = Math.max(0, employer.treasury - payout);

	contract.durationMonths--;
	const active = contract.durationMonths > 0;

	const targetName = sim.polities[contract.targetStateId]?.name ?? 'hostile forces';
	let text = `${employer.name} disbursed ${payout} gold in monthly stipends to ${avatar.name}'s warband.`;
	if (captures > 0) {
		text += ` The company captured ${captures} high-value ${targetName} scouts, earning ${bountyTotal} gold in bounties.`;
	}
	if (hasQuartermaster) {
		text += ` Quartermaster supply logistics saved ${quartermasterBonus} gold in company upkeep.`;
	}
	if (!active) {
		text += ` The mercenary term has concluded in full standing.`;
	}

	return { payout, active, text };
}

/**
 * Retrieve the current warband composition for a leader.
 */
export function getWarband(sim: Simulation, leaderId: number): Warband {
	const leader = sim.people[leaderId];
	const companions = (leader?.companions ?? [])
		.map((id) => sim.people[id])
		.filter((p): p is Person => Boolean(p && p.alive));

	const members: { personId: number; role: PartyRole; equipment?: string }[] = [];
	if (leader?.partyRole) {
		members.push({ personId: leader.id, role: leader.partyRole });
	}
	for (const c of companions) {
		if (c.partyRole) {
			members.push({ personId: c.id, role: c.partyRole });
		}
	}

	const morale = Math.min(100, Math.max(20, 75 + (leader?.renown ?? 0) / 4));

	return {
		leaderId,
		members,
		morale,
		renown: leader?.renown ?? 0,
		contracts: []
	};
}
