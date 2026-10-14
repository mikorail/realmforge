import type { Genre } from '../gen/genre';

export interface MapTheme {
	oceanDeep: string;
	oceanShallow: string;
	lake: string;
	/** biome colours are mixed toward this tint by `tintAmt` */
	tint: string;
	tintAmt: number;
	coast: string;
	river: string;
	road: string;
	label: string;
	labelHalo: string;
	border: string;
	/** neon-ish glow on borders */
	glow: number;
	font: string;
	bodyFont: string;
	paper: boolean;
	deep: [string, string];
	sky: [string, string];
	sea: [string, string];
}

const fantasy: MapTheme = {
	oceanDeep: '#2c4f7c', oceanShallow: '#6f9cc4', lake: '#7fb0d6', tint: '#e8d9b0', tintAmt: 0.22, coast: '#2b2116', river: '#4c7fb5', road: '#7a5232',
	label: '#2b2116', labelHalo: 'rgba(245,235,210,0.85)', border: '#3a2a1a', glow: 0, font: 'Cinzel, serif', bodyFont: '"EB Garamond", Georgia, serif', paper: true,
	deep: ['#3a2c22', '#8a6a4a'], sky: ['#cfe3f5', '#ffffff'], sea: ['#0f4f5c', '#3fa0a8']
};

export const THEMES: Record<Genre, MapTheme> = {
	fantasy,
	mythic: { ...fantasy, tint: '#f2e2b8', tintAmt: 0.3, oceanDeep: '#1f5a7a', oceanShallow: '#5fa8c4' },
	steampunk: { ...fantasy, tint: '#c9a46a', tintAmt: 0.5, oceanDeep: '#3b4a4f', oceanShallow: '#7f8f86', coast: '#2a1a0e', river: '#5a6f72', road: '#3b2414', label: '#2a1a0e', labelHalo: 'rgba(230,205,160,0.85)', deep: ['#2a1d12', '#a0703a'], sky: ['#e8d8b0', '#fff3d6'], sea: ['#1f3b3a', '#5f8a7a'] },
	dieselpunk: { ...fantasy, tint: '#8f8a6a', tintAmt: 0.55, oceanDeep: '#2a3236', oceanShallow: '#59666a', coast: '#14130e', river: '#4b5a5e', road: '#262218', label: '#14130e', labelHalo: 'rgba(210,205,180,0.85)', paper: false, deep: ['#1e1d18', '#6b6650'], sky: ['#c9c9b8', '#eeeedd'], sea: ['#1a2a2c', '#45605f'] },
	atompunk: { ...fantasy, tint: '#f4e2c0', tintAmt: 0.35, oceanDeep: '#16608a', oceanShallow: '#52b6d8', coast: '#1a1b22', road: '#c05a2a', label: '#1a1b22', labelHalo: 'rgba(255,248,230,0.9)', font: 'Orbitron, sans-serif', bodyFont: '"Share Tech Mono", monospace', paper: false, deep: ['#2a2a35', '#e0a83a'], sky: ['#dff4ff', '#ffffff'], sea: ['#0b4a66', '#38c8e0'] },
	cyberpunk: { oceanDeep: '#05060f', oceanShallow: '#0d1630', lake: '#123060', tint: '#141824', tintAmt: 0.8, coast: '#29f0ff', river: '#1f6fff', road: '#ff3fa4', label: '#e9f7ff', labelHalo: 'rgba(5,6,15,0.85)', border: '#ff3fa4', glow: 8, font: 'Orbitron, sans-serif', bodyFont: '"Share Tech Mono", monospace', paper: false, deep: ['#10051a', '#7a2bff'], sky: ['#1b2440', '#5ff0ff'], sea: ['#021018', '#00b3a4'] },
	biopunk: { ...fantasy, tint: '#20331f', tintAmt: 0.45, oceanDeep: '#0b2a24', oceanShallow: '#2f6f5a', coast: '#b6ff6a', river: '#2fbf8f', road: '#d6a5ff', label: '#e8ffd8', labelHalo: 'rgba(10,25,12,0.8)', border: '#7ccf5a', glow: 5, font: 'Orbitron, sans-serif', paper: false, deep: ['#1a0f22', '#9a6fb0'], sky: ['#2a3a30', '#c8ffd0'], sea: ['#05201c', '#3fdcb0'] },
	solarpunk: { ...fantasy, tint: '#fff2c8', tintAmt: 0.18, oceanDeep: '#1b6fa0', oceanShallow: '#7fd0e8', coast: '#1f3a2a', river: '#2f9fd0', road: '#d89a2a', label: '#13201a', labelHalo: 'rgba(255,252,235,0.9)', border: '#1f4a30', paper: false, deep: ['#2a2a1a', '#c8b060'], sky: ['#fff6d8', '#ffffff'], sea: ['#0a5a6a', '#5fe0d0'] }
};

// ── colour helpers ──
const cache = new Map<string, [number, number, number]>();
export function rgb(col: string): [number, number, number] {
	const hit = cache.get(col);
	if (hit) return hit;
	let out: [number, number, number] = [128, 128, 128];
	if (col.startsWith('#')) {
		const h = col.length === 4 ? col.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : col;
		out = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
	} else if (col.startsWith('hsl')) {
		const m = col.match(/hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/);
		if (m) {
			const hh = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
			const f = (n: number) => {
				const k = (n + hh * 12) % 12;
				const a = s * Math.min(l, 1 - l);
				return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
			};
			out = [f(0), f(8), f(4)];
		}
	}
	cache.set(col, out);
	return out;
}
export function mix(a: string, b: string, t: number): string {
	const A = rgb(a), B = rgb(b);
	return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
export function alpha(col: string, a: number): string {
	const [r, g, b] = rgb(col);
	return `rgba(${r},${g},${b},${a})`;
}
export function shade(col: string, f: number): string {
	const [r, g, b] = rgb(col);
	const k = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
	return `rgb(${k(r)},${k(g)},${k(b)})`;
}
