import type { Simulation } from './engine';
import { makeRng } from '../rng';
import type { Commodity } from './trade';

export interface BankingHouse {
	id: number;
	name: string;
	founderHouse: string;
	hqBurg: number;
	capitalGold: number;
	prestige: number;
	controlledMonopolies: Commodity[];
	charterYear: number;
	alive: boolean;
}

export interface SovereignLoan {
	id: number;
	houseId: number;
	borrowerState: number;
	principal: number;
	remainingBalance: number;
	interestRate: number; // e.g. 0.08 (8%)
	originationYear: number;
	termYears: number;
	defaulted: boolean;
}

export interface MercenaryArmada {
	id: number;
	hiredByHouse: number;
	targetState: number;
	name: string;
	strength: number;
	targetBurg: number;
	active: boolean;
	dispatchedYear: number;
}

export interface EconomicTradeWar {
	id: number;
	initiatorState: number;
	targetState: number;
	commodity: Commodity;
	embargoType: 'embargo' | 'currency_debasement' | 'tariff_wall';
	startYear: number;
	active: boolean;
}

export interface BankingState {
	houses: BankingHouse[];
	loans: SovereignLoan[];
	armadas: MercenaryArmada[];
	tradeWars: EconomicTradeWar[];
	nextId: number;
}

const simBankingMap = new WeakMap<Simulation, BankingState>();

export function getBankingState(sim: Simulation): BankingState {
	let state = simBankingMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _bankingState?: BankingState })._bankingState;
		if (raw && Array.isArray(raw.houses)) {
			state = raw;
		} else {
			state = {
				houses: [],
				loans: [],
				armadas: [],
				tradeWars: [],
				nextId: 1
			};
			(sim as unknown as { _bankingState?: BankingState })._bankingState = state;
		}
		simBankingMap.set(sim, state);
	}
	return state;
}

const BANK_NAMES = [
	'Medici Ledger Exchange',
	'Iron Vault Syndicate',
	'Golden Scales Mercantile Bank',
	'Caelum Sovereign Treasury',
	'Fugger Trans-Continental Bank',
	'Obsidian Coin Guild'
];

const ARMADA_NAMES = [
	'The Iron Company of the Sea',
	'The Obsidian Debt Collectors',
	'Corsair Enforcement Flotilla',
	'The Golden Halberd Fleet',
	'Free Vanguard Armada'
];

/** Found a trans-continental merchant banking house */
export function foundBankingHouse(
	sim: Simulation,
	burgId: number,
	houseName?: string,
	dynastyName?: string
): BankingHouse | null {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) return null;

	const st = getBankingState(sim);
	const rng = makeRng(`seed:bank:found:${sim.year}:${burgId}:${sim.w.opts.seed}`);

	const name = houseName ?? rng.pick(BANK_NAMES);
	const founder = dynastyName ?? `${burg.name} Merchant Dynasty`;

	const bank: BankingHouse = {
		id: st.nextId++,
		name,
		founderHouse: founder,
		hqBurg: burgId,
		capitalGold: 250,
		prestige: 60,
		controlledMonopolies: [],
		charterYear: sim.year,
		alive: true
	};

	st.houses.push(bank);

	const pol = sim.polities[burg.state];
	const realmName = pol?.alive ? pol.name : 'the merchant confederacy';

	sim.log(
		'found',
		`Banking dynasty chartered: ${bank.name} opens its grand exchange in ${burg.name}, underwriting commerce and sovereign credit across ${realmName}.`,
		burg.cell,
		burg.state || undefined
	);

	return bank;
}

/** Issue a sovereign loan to a borrower state */
export function issueSovereignLoan(
	sim: Simulation,
	houseId: number,
	borrowerStateId: number,
	amount: number,
	interestRate = 0.08
): SovereignLoan | null {
	const st = getBankingState(sim);
	const bank = st.houses.find((h) => h.id === houseId && h.alive);
	const borrower = sim.polities[borrowerStateId];
	if (!bank || !borrower || !borrower.alive || bank.capitalGold < amount) return null;

	bank.capitalGold -= amount;
	borrower.treasury += amount;

	const principal = amount;
	const loan: SovereignLoan = {
		id: st.nextId++,
		houseId,
		borrowerState: borrowerStateId,
		principal,
		remainingBalance: Math.round(principal * (1 + interestRate)),
		interestRate,
		originationYear: sim.year,
		termYears: 10,
		defaulted: false
	};

	st.loans.push(loan);

	sim.log(
		'found',
		`Sovereign credit issued: ${bank.name} extends a promissory loan of ${amount} gold to ${borrower.name} to finance state mobilization.`,
		sim.w.burgs[borrower.capital]?.cell,
		borrowerStateId
	);

	return loan;
}

/** Repay an ongoing sovereign loan */
export function repaySovereignLoan(
	sim: Simulation,
	loanId: number,
	amount?: number
): boolean {
	const st = getBankingState(sim);
	const loan = st.loans.find((l) => l.id === loanId);
	if (!loan || loan.defaulted || loan.remainingBalance <= 0) return false;

	const borrower = sim.polities[loan.borrowerState];
	const bank = st.houses.find((h) => h.id === loan.houseId);
	if (!borrower || !borrower.alive || !bank) return false;

	const payment = amount ?? Math.min(borrower.treasury, loan.remainingBalance);
	if (payment <= 0) return false;

	borrower.treasury -= payment;
	bank.capitalGold += payment;
	loan.remainingBalance -= payment;

	if (loan.remainingBalance <= 0) {
		borrower.stability = Math.min(100, borrower.stability + 4);
		sim.log(
			'found',
			`Sovereign debt retired: ${borrower.name} pays its final installments to ${bank.name}, elevating its international financial credit.`,
			sim.w.burgs[borrower.capital]?.cell,
			borrower.id
		);
	}

	return true;
}

/** Trigger sovereign debt default and dispatch mercenary debt collectors */
export function defaultSovereignLoan(
	sim: Simulation,
	loanId: number
): MercenaryArmada | null {
	const st = getBankingState(sim);
	const loan = st.loans.find((l) => l.id === loanId);
	if (!loan || loan.defaulted) return null;

	const borrower = sim.polities[loan.borrowerState];
	const bank = st.houses.find((h) => h.id === loan.houseId);
	if (!borrower || !borrower.alive || !bank) return null;

	loan.defaulted = true;
	borrower.stability = Math.max(10, borrower.stability - 25);

	const rng = makeRng(`seed:default:${sim.year}:${loanId}:${sim.w.opts.seed}`);
	const armadaName = rng.pick(ARMADA_NAMES);

	const targetBurg = borrower.capital;

	const armada: MercenaryArmada = {
		id: st.nextId++,
		hiredByHouse: bank.id,
		targetState: borrower.id,
		name: armadaName,
		strength: 85,
		targetBurg,
		active: true,
		dispatchedYear: sim.year
	};

	st.armadas.push(armada);

	sim.log(
		'war',
		`SOVEREIGN DEFAULT: ${borrower.name} repudiates its promissory obligations to ${bank.name}; the bank dispatches ${armada.name} to seize collateral by steel!`,
		sim.w.burgs[targetBurg]?.cell,
		borrower.id
	);

	return armada;
}

/** Declare a commodity monopoly for a banking house */
export function declareCommodityMonopoly(
	sim: Simulation,
	houseId: number,
	commodity: Commodity
): boolean {
	const st = getBankingState(sim);
	const bank = st.houses.find((h) => h.id === houseId && h.alive);
	if (!bank) return false;

	if (!bank.controlledMonopolies.includes(commodity)) {
		bank.controlledMonopolies.push(commodity);
	}

	sim.log(
		'found',
		`Trade monopoly secured: ${bank.name} corners the trans-continental exchange of ${commodity}, dictating merchant prices.`,
		sim.w.burgs[bank.hqBurg]?.cell
	);

	return true;
}

/** Initiate an economic trade war / tariff embargo between rival states */
export function startEconomicTradeWar(
	sim: Simulation,
	initiatorStateId: number,
	targetStateId: number,
	commodity: Commodity = 'spices'
): EconomicTradeWar | null {
	const init = sim.polities[initiatorStateId];
	const target = sim.polities[targetStateId];
	if (!init || !init.alive || !target || !target.alive) return null;

	const st = getBankingState(sim);
	const embargoTypes: EconomicTradeWar['embargoType'][] = ['embargo', 'currency_debasement', 'tariff_wall'];
	const rng = makeRng(`seed:tradewar:${sim.year}:${initiatorStateId}:${targetStateId}`);
	const embargoType = rng.pick(embargoTypes);

	const war: EconomicTradeWar = {
		id: st.nextId++,
		initiatorState: initiatorStateId,
		targetState: targetStateId,
		commodity,
		embargoType,
		startYear: sim.year,
		active: true
	};

	st.tradeWars.push(war);

	const typeDesc =
		embargoType === 'currency_debasement'
			? 'currency debasement'
			: embargoType === 'tariff_wall'
				? 'punitive tariff walls'
				: 'total maritime trade embargo';

	sim.log(
		'war',
		`Economic trade war: ${init.name} levies ${typeDesc} against ${target.name}, embargoing shipments of ${commodity}.`,
		sim.w.burgs[init.capital]?.cell,
		initiatorStateId
	);

	return war;
}

/** Yearly simulation pass for trans-continental banking, loans, armadas, and trade wars */
export function yearlyBanking(sim: Simulation) {
	const st = getBankingState(sim);
	const rng = makeRng(`seed:banking:yearly:${sim.year}:${sim.w.opts.seed}`);

	// 1. Process active loans and interest
	for (const loan of st.loans) {
		if (loan.defaulted || loan.remainingBalance <= 0) continue;

		const borrower = sim.polities[loan.borrowerState];
		const bank = st.houses.find((h) => h.id === loan.houseId);

		if (!borrower?.alive || !bank?.alive) {
			loan.defaulted = true;
			continue;
		}

		// Service debt payments
		const annualService = Math.round(loan.principal * (loan.interestRate + 0.05));
		if (borrower.treasury >= annualService) {
			repaySovereignLoan(sim, loan.id, annualService);
		} else if (borrower.treasury < 0 && borrower.stability < 30) {
			// Realm defaults on bankrupt conditions
			defaultSovereignLoan(sim, loan.id);
		}
	}

	// 2. Process mercenary debt armadas
	for (const armada of st.armadas) {
		if (!armada.active) continue;
		const targetState = sim.polities[armada.targetState];
		const bank = st.houses.find((h) => h.id === armada.hiredByHouse);

		if (!targetState?.alive || !bank) {
			armada.active = false;
			continue;
		}

		// Armadas raid burgs and seize reparations
		if (rng.chance(0.4)) {
			const seized = rng.int(15, 30);
			bank.capitalGold += seized;
			targetState.stability = Math.max(10, targetState.stability - 6);

			sim.log(
				'war',
				`Debt enforcement: ${armada.name} sacks outlying storehouses of ${targetState.name}, transferring ${seized} gold in recovered collateral to ${bank.name}.`,
				sim.w.burgs[armada.targetBurg]?.cell,
				targetState.id
			);

			// Armada concludes after collecting reparations
			armada.active = false;
		}
	}

	// 3. Process economic trade wars
	for (const tw of st.tradeWars) {
		if (!tw.active) continue;
		const init = sim.polities[tw.initiatorState];
		const target = sim.polities[tw.targetState];

		if (!init?.alive || !target?.alive) {
			tw.active = false;
			continue;
		}

		// Mutual trade bleed
		target.treasury = Math.max(0, target.treasury - 4);
		init.treasury = Math.max(0, init.treasury - 2);

		if (rng.chance(0.25)) {
			tw.active = false;
			sim.log(
				'peace',
				`Trade conciliation: ${init.name} and ${target.name} repeal punitive merchant tariffs and restore bilateral commerce.`,
				sim.w.burgs[init.capital]?.cell,
				tw.initiatorState
			);
		}
	}

	// 4. Auto-found banking houses in rich merchant centers
	if (sim.year % 15 === 0 && st.houses.filter((h) => h.alive).length < 4) {
		const commercialBurgs = sim.w.burgs.filter(
			(b) => b.id && b.alive && b.pop > 10 && !st.houses.some((h) => h.hqBurg === b.id)
		);
		if (commercialBurgs.length && rng.chance(0.35)) {
			const picked = rng.pick(commercialBurgs);
			foundBankingHouse(sim, picked.id);
		}
	}

	// 5. Warring realms take sovereign loans
	if (sim.year % 4 === 0) {
		const warringNeedyRealms = sim.polities.filter(
			(p) => p.alive && sim.warsOf(p.id).length > 0 && p.treasury < 40 && !st.loans.some((l) => l.borrowerState === p.id && !l.defaulted && l.remainingBalance > 0)
		);
		const solventBanks = st.houses.filter((h) => h.alive && h.capitalGold >= 80);

		if (warringNeedyRealms.length && solventBanks.length && rng.chance(0.4)) {
			const borrower = rng.pick(warringNeedyRealms);
			const bank = rng.pick(solventBanks);
			issueSovereignLoan(sim, bank.id, borrower.id, 60);
		}
	}
}
