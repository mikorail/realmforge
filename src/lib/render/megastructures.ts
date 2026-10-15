import { clamp } from '../rng';

export interface MegastructureSite {
	id: string | number;
	kind: 'tower' | 'abyss' | 'spire' | 'bottomless_abyss' | 'tower_trials' | string;
	name: string;
	cell: number;
	layer?: number;
	x?: number;
	y?: number;
	floorBreakRisk?: number; // 0..100
	currentFloorBreakRisk?: number;
	highestClearedFloor?: number;
	currentFloor?: number;
	maxFloors?: number;
	currentDepth?: number;
	deepestLayer?: number;
	maxDepth?: number;
	active?: boolean;
	destroyed?: boolean;
	[key: string]: any;
}

export interface AbyssLayerInfo {
	depth: number;
	name: string;
	range: string;
	strain: string;
	strainDesc: string;
	desc: string;
	whistle: string;
	whistleColor: string;
}

export const ABYSS_LAYERS: AbyssLayerInfo[] = [
	{
		depth: 1,
		name: 'Edge of the Abyss',
		range: '0m to 1,350m',
		strain: 'Light Dizziness and Mild Vertigo',
		strainDesc: 'Ascent produces brief disorientation and subtle nausea like rocking sea waves.',
		desc: 'Moss-slicked basalt cliffs where sunlight still penetrates. Ancient stone bell shrines and prayer wind-chimes line the upper ledges.',
		whistle: 'Bell (Apprentice)',
		whistleColor: '#94a3b8'
	},
	{
		depth: 2,
		name: 'Forest of Temptation',
		range: '1,350m to 2,600m',
		strain: 'Severe Nausea, Headaches, and Limb Numbness',
		strainDesc: 'Climbing upward triggers intense sickness and throbbing pressure behind the eyes.',
		desc: 'A subterranean jungle of inverted petrified trees and predatory botanical traps, housing fortified Delver waystations.',
		whistle: 'Red Whistle (Novice)',
		whistleColor: '#ef4444'
	},
	{
		depth: 3,
		name: 'The Great Fault',
		range: '2,600m to 7,000m',
		strain: 'Auditory Hallucinations and Loss of Equilibrium',
		strainDesc: 'Voices echo from the rock face, and balance fails completely without safety harnesses.',
		desc: 'A sheer 4,000m vertical drop of razor-sharp stalactites and cavernous updrafts where wingless beasts hunt.',
		whistle: 'Blue Whistle (Adept)',
		whistleColor: '#3b82f6'
	},
	{
		depth: 4,
		name: 'Goblet of Giants',
		range: '7,000m to 12,000m',
		strain: 'Intense Full-Body Pain and Hemorrhaging',
		strainDesc: 'Every upward meter feels like crushing iron bands across the chest, causing bleeding from the mouth and ears.',
		desc: 'Towering translucent chalice-stalks rising through sulfuric steam and golden spores, inhabited by primeval dreadbeasts.',
		whistle: 'Moon Whistle (Master)',
		whistleColor: '#a855f7'
	},
	{
		depth: 5,
		name: 'Sea of Corpses',
		range: '12,000m to 13,000m',
		strain: 'Sensory Deprivation and Memory Fracturing',
		strainDesc: 'Ascent strips away mortal senses and scrambles memories of the surface realm.',
		desc: 'A colossal subterranean sea of crystallized skeletons and petrified titan carcasses beneath a freezing bioluminescent vault.',
		whistle: 'Black Whistle (High Delver)',
		whistleColor: '#1e293b'
	},
	{
		depth: 6,
		name: 'Capital of the Unreturned / The Last Dive',
		range: '13,000m and deeper',
		strain: 'Irreversible Biological Transmutation or Death',
		strainDesc: 'The Strain of the Unreturned. Upward movement strips mortal humanity forever or proves fatal.',
		desc: 'Crystalline geometric ruins hovering in utter silence above an unfathomable cosmic vortex. Those who enter this depth never return.',
		whistle: 'White Whistle (Sovereign of the Deep)',
		whistleColor: '#f8fafc'
	}
];

export const LIFE_ECHO_TITLES = [
	'Sovereign of Dawn',
	'Lord of the Deep Void',
	'Lady of Annihilation',
	'Seeker of the Far Horizon',
	'Herald of the Abyss',
	'Guardian of the Unreturned'
];

export function getTowerFloorDetails(floor: number) {
	const floorNames = [
		'The Celestial Threshold',
		'Court of Quicksilver Mirrors',
		'The Astral Promenade',
		'Sanctum of the Iron Nebula',
		'Hall of Resonant Spheres',
		'The Chronos Labyrinth',
		'Crucible of the Starforged Knight',
		'The Sovereign Observatory',
		'Apex of the Ascended Pantheon'
	];
	const floorTitle = floorNames[(floor - 1) % floorNames.length];

	const bossNames = [
		'Aethelgard the Astral Warden',
		'Vaelok the Mirrorblade',
		'Caelia Star-Singer',
		'Ignis the Solar Sovereign',
		'Xythor the Void Drake',
		'Arbiter Thalor of the Scales',
		'Morvath the Unyielding Titan'
	];
	const bossTitles = [
		`Keeper of the ${floor}th Constellation`,
		'Warden of the Eternal Leyline',
		'Champion of the Astral Ring',
		'Guardian of the Sun-Core',
		'Lord of the Skyway Bastion'
	];
	const bossIcons = ['⚔️', '👑', '🐉', '👁️', '🗿', '⚡', '✨'];

	const name = bossNames[(floor + 2) % bossNames.length];
	const title = bossTitles[(floor + 1) % bossTitles.length];
	const icon = bossIcons[(floor + 3) % bossIcons.length];
	const maxHp = 80 + floor * 12;
	const power = 25 + Math.floor(floor * 1.5);
	const dc = 11 + Math.floor(floor * 0.35);

	return {
		floorTitle,
		name,
		title,
		icon,
		maxHp,
		power,
		dc
	};
}

/**
 * Compute a smooth icon size based on zoom factor k.
 * Scales smoothly from 16px (far out) to 36px (close up).
 */
export function getMegastructureIconSize(k: number): number {
	const minSize = 16;
	const maxSize = 36;
	if (k <= 0.6) return minSize;
	if (k >= 3.6) return maxSize;
	const t = (k - 0.6) / 3.0;
	return Math.round(minSize + t * (maxSize - minSize));
}

/**
 * Draw a pulsing crimson warning aura when floorBreakRisk exceeds 75%.
 */
function drawWarningAura(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	risk: number,
	time: number
): void {
	if (risk <= 75) return;

	const r = size / 2;
	const pulse = Math.sin(time * 0.25) * 0.15;
	const outerR = r * (1.6 + pulse);

	ctx.save();
	ctx.beginPath();
	ctx.arc(x, y, outerR, 0, Math.PI * 2);

	// Safe fallback if createRadialGradient is not implemented in mock environments
	if (ctx.createRadialGradient) {
		const grad = ctx.createRadialGradient(x, y, r * 0.8, x, y, outerR);
		grad.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
		grad.addColorStop(0.65, 'rgba(220, 38, 38, 0.35)');
		grad.addColorStop(1, 'rgba(185, 28, 28, 0.7)');
		ctx.fillStyle = grad;
	} else {
		ctx.fillStyle = 'rgba(220, 38, 38, 0.3)';
	}
	ctx.fill();

	// Hazard warning ring
	ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
	ctx.lineWidth = Math.max(1.5, size * 0.06);
	if (ctx.setLineDash) {
		ctx.setLineDash([4, 4]);
	}
	ctx.stroke();

	// Concentric alert ripple
	const rippleR = r * (1.25 + (Math.sin(time * 0.4) + 1) * 0.2);
	ctx.beginPath();
	ctx.arc(x, y, rippleR, 0, Math.PI * 2);
	ctx.strokeStyle = 'rgba(248, 113, 113, 0.75)';
	ctx.lineWidth = 1;
	if (ctx.setLineDash) {
		ctx.setLineDash([2, 3]);
	}
	ctx.stroke();

	ctx.restore();
}

/**
 * Render The Bottomless Abyss marker:
 * A dark spiraling vortex with pulsing concentric abyssal rings,
 * faint purple/crimson eldritch particle glow, and depth tier marks.
 */
export function drawBottomlessAbyssMarker(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	options?: { floorBreakRisk?: number; depth?: number; time?: number }
): void {
	const risk = options?.floorBreakRisk ?? 0;
	const depth = options?.depth ?? 1;
	const time = options?.time ?? 0;
	const r = size / 2;

	ctx.save();

	// 1. High risk alert aura (>75%)
	drawWarningAura(ctx, x, y, size, risk, time);

	// 2. Faint purple/crimson eldritch particle glow
	const glowR = r * 1.35;
	ctx.beginPath();
	ctx.arc(x, y, glowR, 0, Math.PI * 2);
	if (ctx.createRadialGradient) {
		const glowGrad = ctx.createRadialGradient(x, y, r * 0.3, x, y, glowR);
		glowGrad.addColorStop(0, 'rgba(88, 28, 135, 0.45)');
		glowGrad.addColorStop(0.5, 'rgba(112, 26, 117, 0.3)');
		glowGrad.addColorStop(0.85, 'rgba(159, 18, 57, 0.2)');
		glowGrad.addColorStop(1, 'rgba(159, 18, 57, 0)');
		ctx.fillStyle = glowGrad;
	} else {
		ctx.fillStyle = 'rgba(88, 28, 135, 0.3)';
	}
	ctx.fill();

	// Eldritch motes orbiting the abyssal mouth
	const particleCount = 8;
	const particleBaseR = r * 1.1;
	for (let i = 0; i < particleCount; i++) {
		const angle = (i * Math.PI * 2) / particleCount + time * 0.04;
		const wobble = Math.sin(time * 0.15 + i) * (r * 0.08);
		const px = x + Math.cos(angle) * (particleBaseR + wobble);
		const py = y + Math.sin(angle) * (particleBaseR + wobble);
		const pColor = i % 2 === 0 ? 'rgba(192, 132, 252, 0.85)' : 'rgba(244, 63, 94, 0.85)';

		ctx.beginPath();
		ctx.arc(px, py, Math.max(1, size * 0.04), 0, Math.PI * 2);
		ctx.fillStyle = pColor;
		ctx.fill();
	}

	// 3. Concentric abyssal rings with breathing pulse
	const pulse = Math.sin(time * 0.18) * (r * 0.05);
	const ringTiers = [
		{ radius: r * 0.95, color: 'rgba(76, 29, 149, 0.85)', width: 1.8 },
		{ radius: r * 0.72 + pulse, color: 'rgba(112, 26, 117, 0.8)', width: 1.5 },
		{ radius: r * 0.48 - pulse * 0.5, color: 'rgba(49, 46, 129, 0.85)', width: 1.4 },
		{ radius: r * 0.28, color: 'rgba(131, 24, 67, 0.9)', width: 1.2 }
	];

	for (const ring of ringTiers) {
		ctx.beginPath();
		ctx.arc(x, y, ring.radius, 0, Math.PI * 2);
		ctx.strokeStyle = ring.color;
		ctx.lineWidth = ring.width;
		ctx.stroke();
	}

	// 4. Dark spiraling vortex arms
	const arms = 5;
	const armSteps = 14;
	ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
	ctx.lineWidth = Math.max(1.2, size * 0.055);
	ctx.lineCap = 'round';

	for (let a = 0; a < arms; a++) {
		const baseAngle = (a * Math.PI * 2) / arms - time * 0.035;
		ctx.beginPath();
		for (let s = 0; s <= armSteps; s++) {
			const prog = s / armSteps;
			const spiralR = r * 0.95 * (1 - prog * 0.72);
			const spiralAngle = baseAngle + prog * 2.8;
			const sx = x + Math.cos(spiralAngle) * spiralR;
			const sy = y + Math.sin(spiralAngle) * spiralR;
			if (s === 0) ctx.moveTo(sx, sy);
			else ctx.lineTo(sx, sy);
		}
		ctx.stroke();
	}

	// 5. Depth tier marks (6 radial ticks representing the 6 Abyssal Layers)
	const maxDepths = 6;
	for (let d = 1; d <= maxDepths; d++) {
		const tickAngle = ((d - 1) * Math.PI * 2) / maxDepths - Math.PI / 2;
		const innerD = r * 0.88;
		const outerD = r * 1.05;
		const tx1 = x + Math.cos(tickAngle) * innerD;
		const ty1 = y + Math.sin(tickAngle) * innerD;
		const tx2 = x + Math.cos(tickAngle) * outerD;
		const ty2 = y + Math.sin(tickAngle) * outerD;

		ctx.beginPath();
		ctx.moveTo(tx1, ty1);
		ctx.lineTo(tx2, ty2);

		// Lit up if avatar/realm has explored this depth
		if (d <= depth) {
			ctx.strokeStyle = d === depth ? '#fb7185' : '#f59e0b';
			ctx.lineWidth = 2.2;
		} else {
			ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
			ctx.lineWidth = 1.2;
		}
		ctx.stroke();
	}

	// 6. Deep central void pit
	ctx.beginPath();
	ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
	ctx.fillStyle = '#020108';
	ctx.fill();
	ctx.strokeStyle = '#e11d48';
	ctx.lineWidth = 1.2;
	ctx.stroke();

	ctx.restore();
}

/**
 * Render The Spire of Trials marker:
 * An ethereal monolith tower reaching toward the sky with a vertical
 * celestial beacon beam, floor tier bands, and gold/cyan constellation aura.
 */
export function drawSpireOfTrialsMarker(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	options?: { floorBreakRisk?: number; floor?: number; time?: number }
): void {
	const risk = options?.floorBreakRisk ?? 0;
	const floor = options?.floor ?? 1;
	const time = options?.time ?? 0;
	const r = size / 2;

	ctx.save();

	// 1. High risk alert aura (>75%)
	drawWarningAura(ctx, x, y, size, risk, time);

	// 2. Vertical celestial beacon beam shooting straight upward
	const beamTop = y - r * 2.8;
	const beamBottom = y - r * 0.7;
	const beamBaseWidth = size * 0.24;
	const beamTipWidth = size * 0.12;

	ctx.beginPath();
	ctx.moveTo(x - beamBaseWidth / 2, beamBottom);
	ctx.lineTo(x - beamTipWidth / 2, beamTop);
	ctx.lineTo(x + beamTipWidth / 2, beamTop);
	ctx.lineTo(x + beamBaseWidth / 2, beamBottom);
	ctx.closePath();

	if (ctx.createLinearGradient) {
		const beamGrad = ctx.createLinearGradient(x, beamBottom, x, beamTop);
		beamGrad.addColorStop(0, 'rgba(224, 247, 250, 0.85)');
		beamGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
		beamGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.35)');
		beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
		ctx.fillStyle = beamGrad;
	} else {
		ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
	}
	ctx.fill();

	// Center brilliant beam ray
	ctx.beginPath();
	ctx.moveTo(x, beamBottom);
	ctx.lineTo(x, beamTop);
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.lineWidth = 1;
	ctx.stroke();

	// 3. Gold/cyan constellation aura ring and orbit stars
	const auraR = r * 1.15;
	ctx.beginPath();
	ctx.arc(x, y, auraR, 0, Math.PI * 2);
	ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
	ctx.lineWidth = 1;
	if (ctx.setLineDash) {
		ctx.setLineDash([3, 4]);
	}
	ctx.stroke();
	if (ctx.setLineDash) {
		ctx.setLineDash([]);
	}

	// Constellation nodes and line connections
	const starCount = 6;
	const starPositions: [number, number][] = [];
	for (let i = 0; i < starCount; i++) {
		const starAngle = (i * Math.PI * 2) / starCount + time * 0.025;
		const sx = x + Math.cos(starAngle) * auraR;
		const sy = y + Math.sin(starAngle) * auraR;
		starPositions.push([sx, sy]);
	}

	// Constellation geometric links
	ctx.beginPath();
	for (let i = 0; i < starPositions.length; i++) {
		const next = starPositions[(i + 2) % starPositions.length];
		ctx.moveTo(starPositions[i][0], starPositions[i][1]);
		ctx.lineTo(next[0], next[1]);
	}
	ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
	ctx.lineWidth = 0.8;
	ctx.stroke();

	// Draw star diamonds
	for (let i = 0; i < starPositions.length; i++) {
		const [sx, sy] = starPositions[i];
		const starColor = i % 2 === 0 ? '#38bdf8' : '#fbbf24';
		ctx.beginPath();
		ctx.arc(sx, sy, Math.max(1, size * 0.045), 0, Math.PI * 2);
		ctx.fillStyle = starColor;
		ctx.fill();
	}

	// 4. Stepped foundation pedestal at the base
	const baseW = size * 0.55;
	const baseH = size * 0.16;
	const baseY = y + r * 0.72;

	ctx.fillStyle = '#1e293b';
	ctx.fillRect(x - baseW / 2, baseY, baseW, baseH);
	ctx.strokeStyle = '#d97706';
	ctx.lineWidth = 1.2;
	ctx.strokeRect(x - baseW / 2, baseY, baseW, baseH);

	// 5. Monolith tower body (tapering obelisk with 2-facet celestial shading)
	const towerApexX = x;
	const towerApexY = y - r * 0.75;
	const towerBaseL = x - size * 0.22;
	const towerBaseR = x + size * 0.22;
	const towerBaseY = baseY;

	// Left facet: bright celestial silver
	ctx.beginPath();
	ctx.moveTo(towerApexX, towerApexY);
	ctx.lineTo(towerBaseL, towerBaseY);
	ctx.lineTo(x, towerBaseY);
	ctx.closePath();
	ctx.fillStyle = '#e2e8f0';
	ctx.fill();

	// Right facet: astral shadow slate
	ctx.beginPath();
	ctx.moveTo(towerApexX, towerApexY);
	ctx.lineTo(x, towerBaseY);
	ctx.lineTo(towerBaseR, towerBaseY);
	ctx.closePath();
	ctx.fillStyle = '#334155';
	ctx.fill();

	// Tower outline & center crease
	ctx.beginPath();
	ctx.moveTo(towerBaseL, towerBaseY);
	ctx.lineTo(towerApexX, towerApexY);
	ctx.lineTo(towerBaseR, towerBaseY);
	ctx.strokeStyle = '#38bdf8';
	ctx.lineWidth = 1.2;
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(towerApexX, towerApexY);
	ctx.lineTo(x, towerBaseY);
	ctx.strokeStyle = '#67e8f9';
	ctx.lineWidth = 1;
	ctx.stroke();

	// 6. Floor tier bands across the monolith
	const totalBands = 5;
	for (let b = 1; b <= totalBands; b++) {
		const prog = b / (totalBands + 1);
		const bandY = towerBaseY - prog * (towerBaseY - towerApexY);
		const bandHalfW = (size * 0.22) * (1 - prog * 0.85);

		ctx.beginPath();
		ctx.moveTo(x - bandHalfW, bandY);
		ctx.lineTo(x + bandHalfW, bandY);
		ctx.strokeStyle = b % 2 === 0 ? '#fbbf24' : '#67e8f9';
		ctx.lineWidth = 1.4;
		ctx.stroke();
	}

	// 7. Apex beacon star
	ctx.beginPath();
	ctx.arc(towerApexX, towerApexY, Math.max(1.8, size * 0.07), 0, Math.PI * 2);
	ctx.fillStyle = '#fef08a';
	ctx.fill();
	ctx.strokeStyle = '#38bdf8';
	ctx.lineWidth = 1;
	ctx.stroke();

	ctx.restore();
}

/**
 * Main render function for drawing Megastructure markers on the map canvas.
 * Renders custom Canvas2D icons for active Megastructures:
 * - The Bottomless Abyss: Dark spiraling vortex with concentric rings, purple/crimson glow, and depth tier marks.
 * - The Spire of Trials: Ethereal monolith tower with vertical celestial beacon beam, floor tier bands, and gold/cyan constellation aura.
 *
 * Smoothly scales icons between 16px and 36px based on zoom level k.
 * Renders warning alert when floorBreakRisk > 75%.
 */
export function drawMegastructureMarkers(
	ctx: CanvasRenderingContext2D,
	sim: any,
	world: any,
	layer: number,
	k: number,
	S: (x: number, y: number) => [number, number]
): void {
	if (!ctx || !sim || !world) return;

	// Gather active megastructures from sim or world
	const rawSites: any[] = [];
	if (Array.isArray(sim.megastructures)) {
		rawSites.push(...sim.megastructures);
	} else if (sim.megastructures && typeof sim.megastructures === 'object') {
		rawSites.push(...Object.values(sim.megastructures));
	}

	if (Array.isArray(sim.megastructureSites)) {
		rawSites.push(...sim.megastructureSites);
	}
	if (Array.isArray(world.megastructures)) {
		rawSites.push(...world.megastructures);
	}

	// Also check sim.megastructureState (from sim/megastructures.ts)
	if (sim.megastructureState) {
		if (sim.megastructureState.abyss) rawSites.push(sim.megastructureState.abyss);
		if (sim.megastructureState.tower) rawSites.push(sim.megastructureState.tower);
	}

	// Also check legendary places if categorized there
	if (Array.isArray(sim.legendaryPlaces)) {
		for (const lp of sim.legendaryPlaces) {
			if (
				lp &&
				(lp.kind === 'tower_trials' ||
					lp.kind === 'tower' ||
					lp.kind === 'spire' ||
					lp.kind === 'abyss' ||
					lp.kind === 'bottomless_abyss')
			) {
				rawSites.push(lp);
			}
		}
	}

	const size = getMegastructureIconSize(k);
	const viewportW = ctx.canvas?.width ?? 2000;
	const viewportH = ctx.canvas?.height ?? 2000;
	const cullingPad = 80;
	const time = (sim.year ?? 0) * 12 + (sim.month ?? 0) + (sim.tick ?? 0);

	const seen = new Set<string | number>();

	for (const site of rawSites) {
		if (!site) continue;
		const idKey = site.id ?? `${site.kind}-${site.cell}`;
		if (seen.has(idKey)) continue;
		seen.add(idKey);

		// Layer check (defaulting to surface layer 0)
		const siteLayer = site.layer ?? 0;
		if (siteLayer !== layer) continue;
		if (site.active === false || site.destroyed === true) continue;

		// Resolve world coordinates
		let wx = site.x;
		let wy = site.y;
		if ((wx == null || wy == null) && site.cell != null && world.cells?.p) {
			wx = world.cells.p[site.cell * 2];
			wy = world.cells.p[site.cell * 2 + 1];
		} else if ((wx == null || wy == null) && site.burg != null && world.burgs?.[site.burg]) {
			wx = world.burgs[site.burg].x;
			wy = world.burgs[site.burg].y;
		}
		if (wx == null || wy == null) continue;

		const [sx, sy] = S(wx, wy);

		// Viewport culling
		if (
			sx < -cullingPad ||
			sy < -cullingPad ||
			sx > viewportW + cullingPad ||
			sy > viewportH + cullingPad
		) {
			continue;
		}

		const risk = site.currentFloorBreakRisk ?? site.floorBreakRisk ?? site.breakRisk ?? 0;
		const kind = String(site.kind ?? '').toLowerCase();
		const name = String(site.name ?? '').toLowerCase();

		const isTower =
			kind === 'tower' ||
			kind === 'spire' ||
			kind === 'tower_trials' ||
			name.includes('spire') ||
			name.includes('tower');

		const isAbyss =
			kind === 'abyss' ||
			kind === 'bottomless_abyss' ||
			name.includes('abyss') ||
			name.includes('chasm');

		if (isTower) {
			drawSpireOfTrialsMarker(ctx, sx, sy, size, {
				floorBreakRisk: risk,
				floor: site.highestClearedFloor ?? site.currentFloor ?? site.floor ?? 1,
				time
			});
		} else if (isAbyss) {
			drawBottomlessAbyssMarker(ctx, sx, sy, size, {
				floorBreakRisk: risk,
				depth: site.deepestLayer ?? site.currentDepth ?? site.depth ?? 1,
				time
			});
		}
	}
}
