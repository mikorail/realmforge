import type { Rift, Universe } from '../gen/universe';
import { Simulation } from './engine';

/** Runs every planet's simulation in lock-step and handles rifts between them. */
export class Cosmos {
	u: Universe;
	sims: Simulation[];
	/** planet the avatar lives on (or -1) */
	avatarPlanet = -1;

	constructor(u: Universe) {
		this.u = u;
		this.sims = u.planets.map((w) => new Simulation(w));
		for (let i = 0; i < this.sims.length; i++) {
			this.sims[i].cosmos = this;
			this.sims[i].planetIndex = i;
			this.sims[i].skipper = (n) => this.skip(n);
		}
	}

	get year() {
		return this.sims[0].year;
	}
	get month() {
		return this.sims[0].month;
	}
	get pending() {
		return this.sims.find((s) => s.pending) ?? null;
	}
	get avatarSim(): Simulation | null {
		return this.avatarPlanet >= 0 ? this.sims[this.avatarPlanet] : null;
	}

	tick() {
		if (this.pending) return;
		for (const s of this.sims) s.tick();
		if (this.sims[0].month === 0) this.rifts();
		// avatar may have died on its planet
		if (this.avatarSim && this.avatarSim.avatar < 0) this.avatarPlanet = -1;
	}

	skip(n: number) {
		for (let k = 0; k < n && !this.pending; k++) this.tick();
	}

	/** Run complete simulation forward for targetYears, capturing all annals and snapshots */
	completeSim(targetYears: number, onYear?: (year: number) => void): { startYear: number; endYear: number; yearsSimulated: number } {
		const startYear = this.year;
		const targetYear = startYear + targetYears;
		while (this.year < targetYear && !this.pending) {
			this.tick();
			if (this.sims[0].month === 0 && onYear) {
				onYear(this.year);
			}
		}
		return { startYear, endYear: this.year, yearsSimulated: this.year - startYear };
	}

	choose(planet: number, personId: number) {
		for (const s of this.sims) s.avatar = -1;
		this.avatarPlanet = planet;
		this.sims[planet].choose(personId);
	}

	riftsAt(planet: number, burg: number): { rift: Rift; to: { planet: number; burg: number } }[] {
		const out: { rift: Rift; to: { planet: number; burg: number } }[] = [];
		for (const r of this.u.rifts) {
			if (r.a.planet === planet && r.a.burg === burg) out.push({ rift: r, to: r.b });
			if (r.b.planet === planet && r.b.burg === burg) out.push({ rift: r, to: r.a });
		}
		return out;
	}

	/** walk the avatar through a rift; rulers must abdicate first */
	stepThrough(riftId: number): string {
		const from = this.avatarSim;
		const me = from?.me;
		if (!from || !me) return 'No avatar.';
		const hit = this.riftsAt(this.avatarPlanet, me.burg).find((x) => x.rift.id === riftId);
		if (!hit) return 'There is no rift here.';
		if (me.role === 'ruler') return 'A ruler cannot abandon the realm. Abdicate first.';
		const to = this.sims[hit.to.planet];
		const dest = to.w.burgs[hit.to.burg];
		if (!dest.alive) return 'The far side of the rift has collapsed.';
		// migrate: the person leaves this world's chronicle and appears in the other
		const copy = { ...me, traits: [...me.traits], id: to.people.length, state: 0, burg: dest.id, role: me.role === 'general' ? 'wanderer' : me.role } as typeof me;
		to.people.push(copy);
		me.alive = false;
		me.died = from.year;
		me.cause = `stepped through the ${hit.rift.name}`;
		from.avatar = -1;
		from.travel = null;
		from.log('avatar', `${me.name} vanishes into the ${hit.rift.name}.`);
		this.avatarPlanet = hit.to.planet;
		to.avatar = copy.id;
		to.log('avatar', `${copy.name} emerges from the ${hit.rift.name} at ${dest.name}, on a strange new world.`, dest.cell);
		this.skip(hit.rift.days);
		return '';
	}

	/** Tear open a new rift connecting two planets */
	tearRift(planetA: number, burgA: number, planetB: number, burgB: number, name?: string): Rift {
		const bA = this.u.planets[planetA].burgs[burgA];
		const bB = this.u.planets[planetB].burgs[burgB];
		const riftName = name ?? `Rift of ${bA.name}:${bB.name}`;
		const newRift: Rift = {
			id: this.u.rifts.length + 1,
			name: riftName,
			a: { planet: planetA, burg: burgA },
			b: { planet: planetB, burg: burgB },
			days: 3
		};
		this.u.rifts.push(newRift);
		const sA = this.sims[planetA], sB = this.sims[planetB];
		sA.log('god', `The cosmic heavens tear open! The ${riftName} connects to ${this.u.planets[planetB].name}.`, bA.cell, bA.state);
		sB.log('god', `A celestial gateway erupts! The ${riftName} connects to ${this.u.planets[planetA].name}.`, bB.cell, bB.state);
		sA.dirty.political = true;
		sB.dirty.political = true;
		return newRift;
	}

	/** Process rift expeditions, cross-planet invasions and colonization */
	private rifts() {
		for (const r of this.u.rifts) {
			const A = this.sims[r.a.planet], B = this.sims[r.b.planet];
			for (const [src, dst, sEnd, dEnd] of [[A, B, r.a, r.b], [B, A, r.b, r.a]] as const) {
				const sb = src.w.burgs[sEnd.burg], db = dst.w.burgs[dEnd.burg];
				const owner = src.polities[sb.state];
				if (!owner?.alive || !db.alive || owner.army < 3) continue;

				const targetState = dst.polities[db.state];
				const isHostile = targetState && targetState.alive && (targetState.color !== owner.color || targetState.origin !== 'rift');

				// Cross-planet invasion attempt when hostile or expansionist
				if (isHostile && src.rng.chance(0.04)) {
					const invaderPower = owner.army * 0.3 * (1 + (owner.expansionism ?? 1) * 0.2);
					const defenderPower = targetState.army * 0.2 + (db.capital ? 3 : 1);
					owner.army *= 0.85;

					if (invaderPower > defenderPower) {
						// Successful planetary invasion
						dst.takeCell(db.cell, owner.id, undefined, dst.burgLayer(db));
						const colony = dst.foundState(db.id, 'rift');
						const base = owner.name.replace(/ Beyond$/, '');
						colony.name = `${base} Beyond`;
						colony.form = 'Rift-Dominion';
						colony.fullName = `Rift-Dominion of ${base}`;
						colony.color = owner.color;
						colony.army = invaderPower + 2;

						src.log('war', `${owner.name} marches an army across the ${r.name} into ${dst.w.name}, storming ${db.name}!`, sb.cell, owner.id);
						dst.log('war', `Interplanetary vanguard from ${src.w.name} emerges through the ${r.name}! The ${colony.fullName} seizes ${db.name}.`, db.cell, colony.id);
						dst.dirty.political = true;
						src.dirty.political = true;
					} else {
						// Repelled
						src.log('war', `${owner.name}'s invasion through the ${r.name} into ${dst.w.name} was repulsed at ${db.name}.`, sb.cell, owner.id);
						dst.log('war', `Garrison at ${db.name} repels a cross-planet invasion pouring through the ${r.name}!`, db.cell, targetState.id);
					}
					continue;
				}

				// Peaceful expedition or colony founding on unclaimed or neutral rift burgs
				if (!src.rng.chance(0.015)) continue;
				owner.army *= 0.85;
				const colony = dst.foundState(db.id, 'rift');
				const base = owner.name.replace(/ Beyond$/, '');
				colony.name = `${base} Beyond`;
				colony.form = 'Rift-Colony';
				colony.fullName = `Rift-Colony of ${base}`;
				colony.color = owner.color;
				colony.army = owner.army * 0.2 + 2;
				src.log('misc', `${owner.name} sends an expedition through the ${r.name}.`, sb.cell, owner.id);
				dst.log('found', `Strangers pour from the ${r.name}: the ${colony.fullName} settles ${db.name}!`, db.cell, colony.id);
				dst.dirty.political = true;
			}
		}
	}
}
