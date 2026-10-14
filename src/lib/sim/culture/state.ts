/** Persistent culture state hung off `sim.cx` (plain data so saves pack it unchanged). */
export type MovementKind = 'painting' | 'poetry' | 'music' | 'architecture' | 'theatre';
export type OrderKind = 'martial' | 'healing' | 'scholarly' | 'ascetic' | 'mendicant';
export type MoveStatus = 'rising' | 'flourishing' | 'suppressed' | 'faded';

export interface ArtMovement {
	id: number;
	name: string;
	kind: MovementKind;
	founded: number;
	/** culture where it began */
	culture: number;
	homeRealm: number;
	/** realms that currently patronise it */
	realms: number[];
	status: MoveStatus;
	parent?: number;
	ended?: number;
	/** realms that suppressed it once and never take it up again */
	banned?: number[];
}

export interface ReligiousOrder {
	id: number;
	name: string;
	kind: OrderKind;
	faith: number;
	founded: number;
	seat: number;
	homeRealm: number;
	realms: number[];
	status: MoveStatus;
	parent?: number;
	ended?: number;
	/** realms that suppressed it once and never take it up again */
	banned?: number[];
}

export interface LinguaFranca {
	/** burg ids at the ends of the route */
	a: number;
	b: number;
	culture: number;
	since: number;
}

export interface CultureState {
	movements: ArtMovement[];
	orders: ReligiousOrder[];
	lingua: LinguaFranca[];
	/** polity ids that own an end of a lingua-franca route (small trade bonus) */
	francaRealms: number[];
	/** surface cell id → year it last changed hands by war (cultures shift slowly after that) */
	conquered: Record<number, number>;
	nextId: number;
}

export function newCultureState(): CultureState {
	return { movements: [], orders: [], lingua: [], francaRealms: [], conquered: {}, nextId: 1 };
}
