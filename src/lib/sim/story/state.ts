/** Persistent story-layer state, one per Simulation (dumped and restored with saves). */
export interface WorldMoment {
	y: number;
	kind: 'council' | 'crusade' | 'contact';
	text: string;
}

export interface StoryState {
	/** year the next council or crusade may happen (0 = not scheduled yet) */
	nextMoment: number;
	/** layer pairs that have already met: "0-1" */
	contacts: string[];
	/** the first meeting of two planets has happened */
	planetContact: boolean;
	moments: WorldMoment[];
}

export const newStory = (): StoryState => ({ nextMoment: 0, contacts: [], planetContact: false, moments: [] });
