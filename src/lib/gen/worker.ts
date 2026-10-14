import { generateUniverse } from './universe';
import type { GenInput } from './types';

self.onmessage = (e: MessageEvent<{ opts: GenInput; planets: number }>) => {
	const universe = generateUniverse(e.data.opts, e.data.planets, (stage, pct) => self.postMessage({ type: 'progress', stage, pct }));
	self.postMessage({ type: 'done', universe });
};
