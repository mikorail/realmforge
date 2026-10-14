import type { Person, Polity } from './types';
import type { Simulation } from './engine';

export interface DynastyNode {
	id: number;
	name: string;
	house: string;
	born: number;
	died?: number;
	cause?: string;
	alive: boolean;
	role: string;
	traits: string[];
	martial: number;
	diplomacy: number;
	stewardship: number;
	intrigue: number;
	isRuler: boolean;
	isHeir: boolean;
	realmName: string;
	realmColor: string;
	children: DynastyNode[];
}

/** Recursively assemble a family tree downward from an ancestor */
export function buildLineageTree(sim: Simulation, personId: number, maxDepth = 4, visited = new Set<number>()): DynastyNode | null {
	if (!personId || visited.has(personId) || maxDepth <= 0) return null;
	visited.add(personId);
	const p = sim.people[personId];
	if (!p) return null;

	const pol = sim.polities[p.state];
	const isRuler = !!pol && pol.alive && pol.ruler === p.id;
	const isHeir = !!pol && pol.alive && pol.heir === p.id;

	const children = sim.people
		.filter((c) => c.parent === p.id && c.id !== p.id)
		.map((c) => buildLineageTree(sim, c.id, maxDepth - 1, visited))
		.filter((node): node is DynastyNode => node !== null);

	return {
		id: p.id,
		name: p.name,
		house: p.house,
		born: p.born,
		died: p.died,
		cause: p.cause,
		alive: p.alive,
		role: p.role,
		traits: p.traits,
		martial: p.martial,
		diplomacy: p.diplomacy,
		stewardship: p.stewardship,
		intrigue: p.intrigue,
		isRuler,
		isHeir,
		realmName: pol?.name ?? 'Wilds',
		realmColor: pol?.color ?? '#888',
		children
	};
}

/** Find the founding ancestor or oldest traceable progenitor of a person */
export function findOldestAncestor(sim: Simulation, personId: number, visited = new Set<number>()): number {
	let curr = personId;
	while (curr && !visited.has(curr)) {
		visited.add(curr);
		const p = sim.people[curr];
		if (!p || !p.parent) break;
		curr = p.parent;
	}
	return curr || personId;
}

/** Get all living and historical members of a given house */
export function getHouseMembers(sim: Simulation, houseName: string): Person[] {
	if (!houseName) return [];
	return sim.people.filter((p) => p.house.toLowerCase() === houseName.toLowerCase());
}
