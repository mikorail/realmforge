/**
 * Event chains: events may carry a `cause` (an earlier event id) and a `tag` naming what sort of
 * event they are. Causes are found by looking back through the archive for a fitting predecessor in
 * the same realm, so famine -> riot -> coup -> new ruler, capital lost -> fall, war lost -> vassalage
 * and climate epoch -> migration read as stories in the annals.
 */
import type { Simulation } from '../engine';
import type { ChronEvent, EventKind } from '../types';

interface Rule {
	/** earlier tags that can explain this one */
	from: string[];
	/** how many years back to look */
	window: number;
	/** causes need not be in the same realm (climate epochs) */
	global?: boolean;
}

const RULES: Record<string, Rule> = {
	famine: { from: ['epoch'], window: 60, global: true },
	riot: { from: ['famine', 'plague', 'capital'], window: 3 },
	revolt: { from: ['riot', 'famine', 'plague', 'capital'], window: 6 },
	coup: { from: ['riot', 'revolt', 'famine', 'plague', 'capital'], window: 8 },
	reign: { from: ['coup', 'revolt'], window: 1 },
	fall: { from: ['capital'], window: 6 },
	migration: { from: ['epoch'], window: 120, global: true }
};

/** kinds that imply a tag when the caller did not name one */
const KIND_TAG: Partial<Record<EventKind, string>> = { uprising: 'riot', coup: 'coup', fall: 'fall', war: 'war' };

/** most recent event matching one of the rule's tags in realm `state` within the rule's window */
export function findCause(sim: Simulation, tag: string, state: number | undefined, before?: number): number | undefined {
	const rule = RULES[tag];
	if (!rule) return undefined;
	const all = sim.allEvents;
	const cutoff = sim.year - rule.window;
	for (let i = all.length - 1; i >= 0; i--) {
		const e = all[i];
		if (e.y < cutoff) break;
		if (!e.tag || e.id === undefined || (before !== undefined && e.id >= before)) continue;
		if (!rule.from.includes(e.tag)) continue;
		if (rule.global || (state !== undefined && e.state === state)) return e.id;
	}
	return undefined;
}

/** called by `log()` for every new event: assigns the tag and finds the cause */
export function linkEvent(sim: Simulation, ev: ChronEvent, tag?: string, cause?: number) {
	const t = tag ?? KIND_TAG[ev.kind];
	if (t) ev.tag = t;
	if (cause !== undefined) ev.cause = cause;
	else if (t && ev.id !== undefined) {
		let c = findCause(sim, t, ev.state, ev.id);
		// a fall is explained by the war that ended the realm if no capital was lost
		if (c === undefined && t === 'fall') c = warCause(sim, ev.state);
		if (c !== undefined) ev.cause = c;
	}
}

/** the declaration event of the latest war a realm fought (any side), within 40 years */
export function warCause(sim: Simulation, state: number | undefined): number | undefined {
	if (state === undefined) return undefined;
	for (let i = sim.wars.length - 1; i >= 0; i--) {
		const w = sim.wars[i];
		if (w.ev === undefined) continue;
		if ((w.end ?? sim.year) < sim.year - 40) continue;
		if (w.attackers.includes(state) || w.defenders.includes(state)) return w.ev;
	}
	return undefined;
}

const PHRASES: Record<string, string[]> = {
	famine: ['in the wake of the famine of Y{y}', 'as the hunger of Y{y} still lingered', 'after the famine of Y{y}'],
	plague: ['in the wake of the plague of Y{y}', 'while the dead of the pestilence of Y{y} were still mourned', 'after the plague of Y{y}'],
	riot: ['after the unrest of Y{y}', 'as the unrest of Y{y} spread', 'in the wake of the riots of Y{y}'],
	revolt: ['following the revolt of Y{y}', 'in the shadow of the revolt of Y{y}'],
	coup: ['in the wake of the coup of Y{y}', 'following the seizure of power in Y{y}'],
	reign: ['after the crowning of Y{y}'],
	capital: ['after the loss of the capital in Y{y}', 'in the wake of the fall of the capital in Y{y}'],
	war: ['in the aftermath of the war of Y{y}', 'after the war declared in Y{y}', 'in the wake of the war of Y{y}'],
	epoch: ['in the wake of the {label} of Y{y}', 'after the {label} began in Y{y}'],
	crusade: ['in the wake of the crusade of Y{y}'],
	council: ['after the council of Y{y}']
};

/** "in the wake of the famine of Y112" for an event whose cause is `cause` */
export function causePhrase(cause: ChronEvent, effect: ChronEvent): string {
	const list = PHRASES[cause.tag ?? ''] ?? ['in the aftermath of the events of Y{y}'];
	const phrase = list[(effect.id ?? effect.y) % list.length];
	return phrase.replace('{y}', String(cause.y)).replace('{label}', (cause.detail ?? 'turning of the age').toLowerCase());
}

/** an event's text with its cause cited before the closing punctuation */
export function eventTextWithCause(e: ChronEvent, byId: ReadonlyMap<number, ChronEvent>): string {
	const text = e.text.trim();
	const cause = e.cause !== undefined ? byId.get(e.cause) : undefined;
	if (!cause) return text;
	const m = text.match(/^([\s\S]*?)([.!?]?)$/)!;
	return `${m[1]}, ${causePhrase(cause, e)}${m[2] || '.'}`;
}

export function indexEvents(events: readonly ChronEvent[]): Map<number, ChronEvent> {
	const m = new Map<number, ChronEvent>();
	for (const e of events) if (e.id !== undefined) m.set(e.id, e);
	return m;
}

/** walk causes back to the root: [root, ..., event] */
export function chainOf(e: ChronEvent, byId: ReadonlyMap<number, ChronEvent>): ChronEvent[] {
	const out = [e];
	const seen = new Set<number>();
	let cur = e;
	while (cur.cause !== undefined && !seen.has(cur.cause)) {
		seen.add(cur.cause);
		const prev = byId.get(cur.cause);
		if (!prev) break;
		out.unshift(prev);
		cur = prev;
	}
	return out;
}
