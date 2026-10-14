import { BIOMES } from './gen/physical';
import { kmPerPx } from './gen/options';
import { SEA, type World } from './gen/types';
import type { MapMode } from './render/renderer';
import type { MapTheme } from './render/theme';
import type { Simulation } from './sim/engine';
import { synthesizeAnnualAnnals } from './sim/chronicle';

/** Trigger a browser file download */
export function downloadFile(content: string | Blob, filename: string, mimeType = 'text/plain') {
	const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/** Generate a clean layered SVG vector map of the active world */
export function generateSvgMap(world: World, sim: Simulation, layerIndex = 0): string {
	const { width: W, height: H } = world.opts;
	const c = world.cells;
	const L = world.layers[layerIndex];
	const isWater = (i: number) => c.h[i] < SEA;

	const parts: string[] = [];
	parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
	parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
	parts.push(`<defs><style>
		.ocean { fill: #1a2b3c; }
		.land { fill: #c8d68f; }
		.river { fill: none; stroke: #2a52be; stroke-linecap: round; }
		.coast { fill: none; stroke: #121c26; stroke-width: 1.5; }
		.border { fill: none; stroke: #ffffff; stroke-width: 1.2; stroke-dasharray: 4,3; opacity: 0.8; }
		.road { fill: none; stroke: #b08d57; stroke-width: 1.2; stroke-dasharray: 3,2; }
		.label { font-family: "EB Garamond", serif; font-weight: 600; text-anchor: middle; fill: #1a1208; }
		.burg-label { font-family: sans-serif; font-size: 10px; fill: #2c2214; }
	</style></defs>`);

	// Ocean background
	parts.push(`<rect width="${W}" height="${H}" class="ocean"/>`);

	// Cells
	parts.push(`<g id="cells">`);
	for (let i = 0; i < c.n; i++) {
		if (isWater(i)) continue;
		const s = c.polyStart[i], e = c.polyStart[i + 1];
		if (e - s < 3) continue;
		const pts: string[] = [];
		for (let k = s; k < e; k++) pts.push(`${c.polyXY[2 * k].toFixed(1)},${c.polyXY[2 * k + 1].toFixed(1)}`);
		const col = BIOMES[c.biome[i]]?.color ?? '#c8d68f';
		parts.push(`<polygon points="${pts.join(' ')}" fill="${col}" stroke="${col}" stroke-width="0.5"/>`);
	}
	parts.push(`</g>`);

	// Rivers
	parts.push(`<g id="rivers">`);
	for (const r of world.rivers) {
		if (!r.id || r.cells.length < 2) continue;
		const d = r.cells.map((idx, k) => `${k === 0 ? 'M' : 'L'} ${c.x[idx].toFixed(1)} ${c.y[idx].toFixed(1)}`).join(' ');
		const wd = Math.min(3, 0.5 + Math.sqrt(r.flux) * 0.05);
		parts.push(`<path d="${d}" class="river" stroke-width="${wd.toFixed(1)}"/>`);
	}
	parts.push(`</g>`);

	// Political fills
	parts.push(`<g id="polities">`);
	const pols = sim.polities;
	for (let i = 0; i < c.n; i++) {
		if (!L.open[i] || !L.state[i]) continue;
		const pol = pols[L.state[i]];
		if (!pol?.alive) continue;
		const s = c.polyStart[i], e = c.polyStart[i + 1];
		if (e - s < 3) continue;
		const pts: string[] = [];
		for (let k = s; k < e; k++) pts.push(`${c.polyXY[2 * k].toFixed(1)},${c.polyXY[2 * k + 1].toFixed(1)}`);
		parts.push(`<polygon points="${pts.join(' ')}" fill="${pol.color}" fill-opacity="0.35"/>`);
	}
	parts.push(`</g>`);

	// Settlements & labels
	parts.push(`<g id="settlements">`);
	for (const b of world.burgs) {
		if (!b.id || !b.alive) continue;
		if (sim.burgLayer(b) !== layerIndex) continue;
		const r = b.capital ? 3.5 : 2;
		parts.push(`<circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${r}" fill="#fffaf0" stroke="#2b2116" stroke-width="1.2"/>`);
		parts.push(`<text x="${(b.x + r + 3).toFixed(1)}" y="${(b.y - 1).toFixed(1)}" class="burg-label">${b.name}</text>`);
	}
	parts.push(`</g>`);

	parts.push(`</svg>`);
	return parts.join('\n');
}

/** Generate a complete Markdown world gazetteer and historical dossier */
export function generateWorldGazetteer(world: World, sim: Simulation): string {
	const lines: string[] = [];
	lines.push(`# Chronicle and Gazetteer of ${world.name}`);
	lines.push(`\n**Planetary Classification**: ${world.opts.planet} | **Genre**: ${world.opts.genre}`);
	lines.push(`**Current Year**: ${sim.year} | **Chronicle Age**: ${sim.age}`);
	lines.push(`**Known Settlements**: ${world.burgs.filter((b) => b.id && b.alive).length} | **Living Realms**: ${sim.polities.filter((p) => p.id && p.alive).length}`);
	lines.push(`\n---\n`);

	lines.push(`## The Great Realms\n`);
	const aliveRealms = sim.polities.filter((p) => p.id && p.alive).sort((a, b) => b.cells - a.cells);
	for (const p of aliveRealms) {
		const cap = world.burgs[p.capital];
		const ruler = sim.people[p.ruler];
		const cult = world.cultures[p.culture];
		const rel = world.religions[p.religion];
		lines.push(`### ${p.fullName}`);
		lines.push(`- **Capital**: ${cap ? cap.name : 'None'}`);
		lines.push(`- **Government**: ${p.form} (Origin: ${p.origin})`);
		lines.push(`- **Ruler**: ${ruler?.alive ? `${ruler.name} ${ruler.house} (Age ${sim.ageOf(ruler)}, Traits: ${ruler.traits.join(', ') || 'None'})` : 'Regency council'}`);
		lines.push(`- **Dominion**: ${p.cells} territorial cells | ${(p.pop * 1000).toFixed(0)} subjects`);
		lines.push(`- **Military**: ${(p.army * 1000).toFixed(0)} standing troops | Stability: ${p.stability.toFixed(0)}/100`);
		lines.push(`- **Treasury**: ${p.treasury.toFixed(1)} gold (Tax rate: ${(p.tax * 100).toFixed(0)}%)`);
		lines.push(`- **Culture**: ${cult ? cult.name : 'Unknown'} | **Faith**: ${rel ? rel.name : 'Secular'}`);
		const allies = p.allies.map((id) => sim.polities[id]?.name).filter(Boolean);
		if (allies.length) lines.push(`- **Alliances**: ${allies.join(', ')}`);
		const wars = sim.warsOf(p.id);
		if (wars.length) {
			const enemyNames = wars.flatMap((w) => (w.attackers.includes(p.id) ? w.defenders : w.attackers)).map((id) => sim.polities[id]?.name);
			lines.push(`- **Active Wars**: At war with ${enemyNames.join(', ')}`);
		}
		lines.push(``);
	}

	lines.push(`## Faiths and Pantheons\n`);
	for (const r of world.religions) {
		if (!r.id) continue;
		lines.push(`- **${r.name}** (${r.type}): Venerates ${r.deity || 'the Unnamed'}. Founded in ${world.cultures[r.culture]?.name ?? 'the ancient lands'}.`);
	}

	lines.push(`\n## Culture Spheres\n`);
	for (const c of world.cultures) {
		if (!c.id) continue;
		lines.push(`- **${c.name}**: Sphere of ${c.sphere || 'General'}.`);
	}

	lines.push(`\n## Active Wars\n`);
	const activeWars = sim.wars.filter((w) => !w.end);
	if (activeWars.length) {
		for (const w of activeWars) {
			const att = w.attackers.map((id) => sim.polities[id]?.name).join(', ');
			const def = w.defenders.map((id) => sim.polities[id]?.name).join(', ');
			lines.push(`- **${w.name}** (Year ${w.start} to present): ${att} versus ${def}. Current war score: ${w.score > 0 ? '+' : ''}${w.score}.`);
		}
	} else {
		lines.push(`*The known realms currently rest in an uneasy peace.*\n`);
	}

	lines.push(`\n## The Great Annals of ${world.name}\n`);
	lines.push(`*Synthesized by royal chroniclers from the archives of the realms.*\n`);
	const evList = sim.allEvents && sim.allEvents.length ? sim.allEvents : sim.events;
	const annals = synthesizeAnnualAnnals(evList, world.name, 1000);
	if (annals.length) {
		for (const a of annals) {
			lines.push(`### Anno ${a.year}: ${a.headline}\n`);
			lines.push(`${a.prose}\n`);
		}
	} else {
		lines.push(`*The known realms currently rest in antiquity with no major wars or falls yet chronicled.*\n`);
	}

	return lines.join('\n');
}

/** Render a high-resolution cartographic poster PNG with title cartouche, compass rose, and scale bar */
export async function renderPosterPng(
	sourceCanvas: HTMLCanvasElement,
	world: World,
	sim: Simulation,
	theme: MapTheme,
	scaleFactor = 2
): Promise<Blob> {
	const W = sourceCanvas.width;
	const H = sourceCanvas.height;
	const poster = document.createElement('canvas');
	poster.width = W;
	poster.height = H;
	const ctx = poster.getContext('2d')!;

	// Draw base rendered map
	ctx.drawImage(sourceCanvas, 0, 0);

	// Cartographic double border frame
	const borderPadding = 18 * scaleFactor;
	ctx.strokeStyle = theme.glow ? '#5bf' : '#3d2e1e';
	ctx.lineWidth = 3 * scaleFactor;
	ctx.strokeRect(borderPadding, borderPadding, W - borderPadding * 2, H - borderPadding * 2);

	ctx.strokeStyle = theme.glow ? 'rgba(90,190,255,0.4)' : 'rgba(120,90,50,0.5)';
	ctx.lineWidth = 1 * scaleFactor;
	ctx.strokeRect(borderPadding + 6 * scaleFactor, borderPadding + 6 * scaleFactor, W - (borderPadding + 6 * scaleFactor) * 2, H - (borderPadding + 6 * scaleFactor) * 2);

	// Title cartouche box (top center or top left)
	const boxW = 340 * scaleFactor;
	const boxH = 74 * scaleFactor;
	const boxX = (W - boxW) / 2;
	const boxY = borderPadding + 14 * scaleFactor;

	ctx.fillStyle = theme.glow ? 'rgba(10,14,24,0.92)' : 'rgba(247,241,227,0.95)';
	ctx.fillRect(boxX, boxY, boxW, boxH);
	ctx.strokeStyle = theme.glow ? '#5bf' : '#3d2e1e';
	ctx.lineWidth = 1.5 * scaleFactor;
	ctx.strokeRect(boxX, boxY, boxW, boxH);

	// Cartouche text
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `600 ${20 * scaleFactor}px ${theme.font}`;
	ctx.fillStyle = theme.glow ? '#fff' : '#1c140a';
	ctx.fillText(world.name.toUpperCase(), boxX + boxW / 2, boxY + 26 * scaleFactor);

	ctx.font = `400 ${11 * scaleFactor}px ${theme.bodyFont}`;
	ctx.fillStyle = theme.glow ? '#8af' : '#6b583e';
	ctx.fillText(`Year ${sim.year} · ${sim.age} · ${world.opts.genre}`, boxX + boxW / 2, boxY + 52 * scaleFactor);

	// Compass Rose (bottom right)
	const crX = W - borderPadding - 55 * scaleFactor;
	const crY = H - borderPadding - 55 * scaleFactor;
	const crR = 28 * scaleFactor;

	ctx.beginPath();
	ctx.arc(crX, crY, crR, 0, Math.PI * 2);
	ctx.fillStyle = theme.glow ? 'rgba(10,14,24,0.85)' : 'rgba(247,241,227,0.9)';
	ctx.fill();
	ctx.strokeStyle = theme.glow ? '#5bf' : '#3d2e1e';
	ctx.lineWidth = 1.5 * scaleFactor;
	ctx.stroke();

	// North pointer
	ctx.beginPath();
	ctx.moveTo(crX, crY - crR * 0.85);
	ctx.lineTo(crX + crR * 0.28, crY);
	ctx.lineTo(crX, crY - crR * 0.15);
	ctx.closePath();
	ctx.fillStyle = theme.glow ? '#5bf' : '#b22222';
	ctx.fill();

	// South pointer
	ctx.beginPath();
	ctx.moveTo(crX, crY + crR * 0.85);
	ctx.lineTo(crX - crR * 0.28, crY);
	ctx.lineTo(crX, crY + crR * 0.15);
	ctx.closePath();
	ctx.fillStyle = theme.glow ? '#345' : '#3d2e1e';
	ctx.fill();

	ctx.font = `700 ${10 * scaleFactor}px sans-serif`;
	ctx.fillStyle = theme.glow ? '#fff' : '#1c140a';
	ctx.textAlign = 'center';
	ctx.fillText('N', crX, crY - crR - 5 * scaleFactor);

	// Scale Bar (bottom left)
	const sbX = borderPadding + 25 * scaleFactor;
	const sbY = H - borderPadding - 32 * scaleFactor;
	const kmUnit = kmPerPx(world.opts.climate, world.opts.width);
	const targetPx = 100 * scaleFactor;
	const realKm = Math.round(targetPx * kmUnit);

	ctx.fillStyle = theme.glow ? 'rgba(10,14,24,0.85)' : 'rgba(247,241,227,0.9)';
	ctx.fillRect(sbX - 10 * scaleFactor, sbY - 18 * scaleFactor, targetPx + 20 * scaleFactor, 32 * scaleFactor);
	ctx.strokeRect(sbX - 10 * scaleFactor, sbY - 18 * scaleFactor, targetPx + 20 * scaleFactor, 32 * scaleFactor);

	ctx.fillStyle = theme.glow ? '#fff' : '#1c140a';
	ctx.fillRect(sbX, sbY, targetPx / 2, 4 * scaleFactor);
	ctx.fillStyle = theme.glow ? '#5bf' : '#b22222';
	ctx.fillRect(sbX + targetPx / 2, sbY, targetPx / 2, 4 * scaleFactor);

	ctx.font = `600 ${9 * scaleFactor}px sans-serif`;
	ctx.fillStyle = theme.glow ? '#fff' : '#1c140a';
	ctx.textAlign = 'left';
	ctx.fillText('0', sbX, sbY - 6 * scaleFactor);
	ctx.textAlign = 'right';
	ctx.fillText(`${realKm} km`, sbX + targetPx, sbY - 6 * scaleFactor);

	return new Promise((resolve, reject) => {
		poster.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error('Failed to create poster blob'));
		}, 'image/png');
	});
}
