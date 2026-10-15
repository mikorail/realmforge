import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Simulation } from './engine';
import {
	assignPartyRole,
	getPartyAggregateSkills,
	signMercenaryContract,
	resolveMercenaryContractTick,
	getWarband,
	type PartyRole
} from './party';
import {
	generateDungeon,
	attemptDelveRoom,
	type DelveDungeon,
	type DungeonTheme
} from './delves';

const testOpts = {
	seed: 'delves-unit-test-seed',
	template: 'continents' as const,
	cells: 1000,
	states: 4,
	width: 1000,
	height: 600,
	genre: 'fantasy' as const,
	planet: 'terran' as const,
	spheres: null,
	depth: 1,
	sky: false,
	sea: false
};

function createTestContext() {
	const world = generateUniverse(testOpts, 1).planets[0];
	const sim = new Simulation(world);

	// Find an alive person to be avatar leader
	const leader = sim.people.find((p) => p.alive && p.id > 0)!;
	sim.avatar = leader.id;
	leader.gold = 100;
	leader.health = 100;
	leader.martial = 10;
	leader.diplomacy = 10;
	leader.stewardship = 10;
	leader.intrigue = 10;
	leader.companions = [];

	// Create companions
	const c1 = sim.makePerson(leader.culture, leader.state, leader.burg, 'wanderer', 25);
	c1.martial = 14;
	c1.diplomacy = 8;
	c1.stewardship = 8;
	c1.intrigue = 8;
	c1.health = 100;
	c1.companionOf = leader.id;

	const c2 = sim.makePerson(leader.culture, leader.state, leader.burg, 'wanderer', 28);
	c2.martial = 8;
	c2.diplomacy = 8;
	c2.stewardship = 8;
	c2.intrigue = 14;
	c2.health = 100;
	c2.companionOf = leader.id;

	const c3 = sim.makePerson(leader.culture, leader.state, leader.burg, 'merchant', 30);
	c3.martial = 6;
	c3.diplomacy = 10;
	c3.stewardship = 15;
	c3.intrigue = 8;
	c3.health = 100;
	c3.companionOf = leader.id;

	leader.companions = [c1.id, c2.id, c3.id];

	const employer = sim.polities.find((p) => p.alive && p.id > 0)!;
	employer.treasury = 500;

	return { sim, leader, companions: [c1, c2, c3], employer };
}

describe('Party Retinue and Warband Company', () => {
	it('assigns party roles and correctly boosts aggregate skills', () => {
		const { sim, leader, companions } = createTestContext();
		const [c1, c2, c3] = companions;

		const baseSkills = getPartyAggregateSkills(sim, leader.id);

		// Assign Champion to c1
		const r1 = assignPartyRole(sim, c1.id, 'champion');
		expect(r1.success).toBe(true);
		expect(c1.partyRole).toBe('champion');
		expect(r1.msg).not.toContain('—');

		const skillsAfterChampion = getPartyAggregateSkills(sim, leader.id);
		expect(skillsAfterChampion.martial).toBeGreaterThan(baseSkills.martial);

		// Assign Spymaster to c2
		const r2 = assignPartyRole(sim, c2.id, 'spymaster');
		expect(r2.success).toBe(true);
		expect(c2.partyRole).toBe('spymaster');
		expect(r2.msg).not.toContain('—');

		const skillsAfterSpymaster = getPartyAggregateSkills(sim, leader.id);
		expect(skillsAfterSpymaster.intrigue).toBeGreaterThan(baseSkills.intrigue);

		// Assign Quartermaster to c3
		const r3 = assignPartyRole(sim, c3.id, 'quartermaster');
		expect(r3.success).toBe(true);
		expect(c3.partyRole).toBe('quartermaster');
		expect(r3.msg).not.toContain('—');

		const skillsAfterQuartermaster = getPartyAggregateSkills(sim, leader.id);
		expect(skillsAfterQuartermaster.stewardship).toBeGreaterThan(baseSkills.stewardship);

		// Assign Lorekeeper to leader
		const r4 = assignPartyRole(sim, leader.id, 'lorekeeper');
		expect(r4.success).toBe(true);
		expect(leader.partyRole).toBe('lorekeeper');
		expect(r4.msg).not.toContain('—');

		const skillsAfterLorekeeper = getPartyAggregateSkills(sim, leader.id);
		expect(skillsAfterLorekeeper.arcana).toBeGreaterThan(baseSkills.arcana);

		// Verify Warband structure retrieval
		const warband = getWarband(sim, leader.id);
		expect(warband.leaderId).toBe(leader.id);
		expect(warband.members.length).toBe(4);
		expect(warband.morale).toBeGreaterThanOrEqual(20);
	});

	it('rejects assigning roles to deceased persons or strangers', () => {
		const { sim, leader } = createTestContext();

		// Dead person
		const deadPerson = sim.makePerson(leader.culture, leader.state, leader.burg, 'wanderer', 40);
		deadPerson.alive = false;
		const rDead = assignPartyRole(sim, deadPerson.id, 'champion');
		expect(rDead.success).toBe(false);

		// Stranger not in companions
		const stranger = sim.makePerson(leader.culture, leader.state, leader.burg, 'wanderer', 22);
		const rStranger = assignPartyRole(sim, stranger.id, 'champion');
		expect(rStranger.success).toBe(false);
	});

	it('signs mercenary contracts and resolves monthly ticks', () => {
		const { sim, leader, companions, employer } = createTestContext();
		assignPartyRole(sim, companions[2].id, 'quartermaster');

		const initialGold = leader.gold;
		const initialTreasury = employer.treasury;

		const res = signMercenaryContract(sim, leader.id, employer.id);
		expect(res.success).toBe(true);
		expect(res.contract).toBeDefined();
		expect(res.msg).not.toContain('—');

		const contract = res.contract!;
		expect(contract.employerStateId).toBe(employer.id);
		expect(contract.monthlyPay).toBeGreaterThan(0);
		expect(contract.bountyPerCapture).toBeGreaterThan(0);
		expect(contract.durationMonths).toBe(12);

		// Resolve first monthly tick
		const tick1 = resolveMercenaryContractTick(sim, contract, leader.id);
		expect(tick1.payout).toBeGreaterThanOrEqual(contract.monthlyPay);
		expect(tick1.active).toBe(true);
		expect(tick1.text).not.toContain('—');
		expect(contract.durationMonths).toBe(11);
		expect(leader.gold).toBe(initialGold + tick1.payout);
		expect(employer.treasury).toBe(initialTreasury - tick1.payout);

		// Complete remaining 11 ticks
		for (let m = 0; m < 10; m++) {
			const tick = resolveMercenaryContractTick(sim, contract, leader.id);
			expect(tick.active).toBe(true);
		}

		// 12th tick should finish the contract
		const finalTick = resolveMercenaryContractTick(sim, contract, leader.id);
		expect(finalTick.active).toBe(false);
		expect(contract.durationMonths).toBe(0);

		// Attempting further tick on concluded contract
		const expiredTick = resolveMercenaryContractTick(sim, contract, leader.id);
		expect(expiredTick.active).toBe(false);
		expect(expiredTick.payout).toBe(0);
	});
});

describe('Procedural Dungeon Delving', () => {
	it('generates dungeons deterministically with consistent chambers', () => {
		const seed = 'dungeon-seed-404';
		const cell = 120;
		const layer = 0;

		const d1 = generateDungeon(seed, cell, layer);
		const d2 = generateDungeon(seed, cell, layer);

		expect(d1.id).toBe(d2.id);
		expect(d1.name).toBe(d2.name);
		expect(d1.theme).toBe(d2.theme);
		expect(d1.rooms.length).toBe(d2.rooms.length);
		expect(d1.rooms.length).toBeGreaterThanOrEqual(4);
		expect(d1.rooms.length).toBeLessThanOrEqual(6);

		for (let i = 0; i < d1.rooms.length; i++) {
			expect(d1.rooms[i].name).toBe(d2.rooms[i].name);
			expect(d1.rooms[i].type).toBe(d2.rooms[i].type);
			expect(d1.rooms[i].dc).toBe(d2.rooms[i].dc);
			expect(d1.rooms[i].gold).toBe(d2.rooms[i].gold);
			expect(d1.rooms[i].challengeStat).toBe(d2.rooms[i].challengeStat);
		}

		// The final chamber is always a boss chamber
		expect(d1.rooms[d1.rooms.length - 1].type).toBe('boss');
	});

	it('supports all 5 procedural themes', () => {
		const themes: DungeonTheme[] = [
			'ancient_catacomb',
			'sunken_vault',
			'arcane_labyrinth',
			'underdark_chasm',
			'titan_barrow'
		];

		for (const theme of themes) {
			const d = generateDungeon('theme-seed', 55, 0, theme);
			expect(d.theme).toBe(theme);
			expect(d.name).toBeTruthy();
			expect(d.rooms.length).toBeGreaterThanOrEqual(4);
			expect(d.rooms[d.rooms.length - 1].type).toBe('boss');

			// Zero em dashes in room names and descriptions
			for (const r of d.rooms) {
				expect(r.name).not.toContain('—');
				expect(r.description).not.toContain('—');
			}
		}
	});

	it('resolves room attempts with success and failure outcomes', () => {
		const { sim, leader, companions } = createTestContext();
		const dungeon = generateDungeon('resolution-seed', 15, 0, 'ancient_catacomb');

		// Give party very high stats for guaranteed success
		leader.martial = 40;
		leader.intrigue = 40;
		leader.stewardship = 40;
		companions[0].martial = 40;
		assignPartyRole(sim, companions[0].id, 'champion');

		const initialGold = leader.gold;
		const room0 = dungeon.rooms[0];
		const resSuccess = attemptDelveRoom(sim, dungeon, leader.id, 'assault');

		expect(resSuccess.success).toBe(true);
		expect(resSuccess.damage).toBe(0);
		expect(resSuccess.gold).toBeGreaterThanOrEqual(room0.gold);
		expect(room0.cleared).toBe(true);
		expect(dungeon.currentRoom).toBe(1);
		expect(dungeon.lootEarned.gold).toBe(resSuccess.gold);
		expect(leader.gold).toBe(initialGold + resSuccess.gold);
		expect(resSuccess.text).not.toContain('—');

		// Now test failure outcome with extremely weak stats and high DC
		leader.martial = 0;
		leader.intrigue = 0;
		leader.stewardship = 0;
		companions[0].martial = 0;
		companions[0].partyRole = undefined;

		const currentRoom = dungeon.rooms[dungeon.currentRoom];
		currentRoom.dc = 999; // Impassable DC to guarantee failure

		const prevHealth = leader.health;
		const resFail = attemptDelveRoom(sim, dungeon, leader.id, 'assault');

		expect(resFail.success).toBe(false);
		expect(resFail.gold).toBe(0);
		expect(resFail.damage).toBeGreaterThan(0);
		expect(leader.health).toBe(prevHealth - resFail.damage);
		expect(currentRoom.cleared).toBe(false);
		expect(resFail.text).not.toContain('—');
	});

	it('completes the entire dungeon upon conquering all chambers', () => {
		const { sim, leader } = createTestContext();
		const dungeon = generateDungeon('conquer-seed', 88, 0, 'titan_barrow');

		// Set super stats to sweep the dungeon
		leader.martial = 50;
		leader.intrigue = 50;
		leader.stewardship = 50;

		let finished = false;
		while (!finished) {
			const res = attemptDelveRoom(sim, dungeon, leader.id, 'assault');
			expect(res.text).not.toContain('—');
			finished = res.finished;
		}

		expect(dungeon.cleared).toBe(true);
		expect(dungeon.currentRoom).toBe(dungeon.rooms.length);
		expect(dungeon.lootEarned.gold).toBeGreaterThan(0);

		// Subsequent attempt after completion
		const postAttempt = attemptDelveRoom(sim, dungeon, leader.id, 'assault');
		expect(postAttempt.finished).toBe(true);
		expect(postAttempt.text).not.toContain('—');
	});

	it('strictly ensures zero em dashes across all procedural outputs', () => {
		const { sim, leader, companions, employer } = createTestContext();
		const dungeon = generateDungeon('em-dash-audit-seed', 101, 0);

		// Check dungeon and room text
		expect(dungeon.name).not.toContain('—');
		for (const room of dungeon.rooms) {
			expect(room.name).not.toContain('—');
			expect(room.description).not.toContain('—');
		}

		// Check role assignment strings
		for (const role of ['champion', 'spymaster', 'quartermaster', 'lorekeeper'] as PartyRole[]) {
			const r = assignPartyRole(sim, leader.id, role);
			expect(r.msg).not.toContain('—');
		}

		// Check contract text
		const contractRes = signMercenaryContract(sim, leader.id, employer.id);
		expect(contractRes.msg).not.toContain('—');
		const tickRes = resolveMercenaryContractTick(sim, contractRes.contract!, leader.id);
		expect(tickRes.text).not.toContain('—');

		// Check room attempts
		const attempt = attemptDelveRoom(sim, dungeon, leader.id, 'assault');
		expect(attempt.text).not.toContain('—');
	});
});
