import type { ArchShape } from '../gen/spheres';

/**
 * Tiny settlement glyphs, one per architecture shape. Each is built in a unit box
 * (x -1..1, y -1..1, y down) scaled by `r`. Fill and outline come from the caller.
 */
function poly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pts: number[][]) {
	pts.forEach(([px, py], i) => {
		if (i) ctx.lineTo(x + px * r, y + py * r);
		else ctx.moveTo(x + px * r, y + py * r);
	});
	ctx.closePath();
}

export function drawArchGlyph(ctx: CanvasRenderingContext2D, shape: ArchShape, x: number, y: number, r: number, fill: string, stroke: string, lw: number) {
	ctx.beginPath();
	switch (shape) {
		case 'pagoda':
			// upturned eaves, tiered pagoda body, and top finial spire
			poly(ctx, x, y, r, [
				[-1.0, 0.05], [-0.7, 0.2], [-0.55, 0.2], [-0.55, 0.9], [0.55, 0.9], [0.55, 0.2], [0.7, 0.2], [1.0, 0.05],
				[0.65, -0.05], [0.45, -0.25], [0.8, -0.35], [0.5, -0.45], [0.28, -0.68], [0.06, -0.78], [0, -1.12],
				[-0.06, -0.78], [-0.28, -0.68], [-0.5, -0.45], [-0.8, -0.35], [-0.45, -0.25], [-0.65, -0.05]
			]);
			break;
		case 'gate':
			// torii / pailou gate with upturned double lintel and central tie-beam
			poly(ctx, x, y, r, [
				[-1.05, -0.82], [-0.75, -0.72], [0.75, -0.72], [1.05, -0.82], [0.95, -0.52], [0.68, -0.52],
				[0.68, -0.35], [0.85, -0.35], [0.85, -0.18], [0.68, -0.18], [0.72, 0.9], [0.45, 0.9],
				[0.42, -0.18], [-0.42, -0.18], [-0.45, 0.9], [-0.72, 0.9], [-0.68, -0.18], [-0.85, -0.18],
				[-0.85, -0.35], [-0.68, -0.35], [-0.68, -0.52], [-0.95, -0.52]
			]);
			ctx.rect(x - 0.42 * r, y - 0.52 * r, 0.84 * r, 0.17 * r);
			break;
		case 'spire':
			// gothic spire with flanking buttresses and lancet window cutout
			poly(ctx, x, y, r, [
				[0, -1.15], [0.22, -0.5], [0.42, -0.15], [0.55, -0.32], [0.68, 0.05], [0.82, 0.25],
				[0.82, 0.9], [-0.82, 0.9], [-0.82, 0.25], [-0.68, 0.05], [-0.55, -0.32], [-0.42, -0.15], [-0.22, -0.5]
			]);
			poly(ctx, x, y, r, [[-0.18, 0.9], [-0.18, 0.35], [0, 0.1], [0.18, 0.35], [0.18, 0.9]]);
			break;
		case 'stilt':
			// pitched gable stilt-house with crossed roof horns and stilted piers
			poly(ctx, x, y, r, [
				[-1.05, -0.05], [-0.15, -0.82], [-0.28, -1.0], [-0.08, -0.92], [0, -0.84], [0.08, -0.92], [0.28, -1.0], [0.15, -0.82],
				[1.05, -0.05], [0.74, -0.05], [0.74, 0.28], [0.58, 0.28], [0.58, 0.9], [0.38, 0.9], [0.38, 0.28],
				[0.1, 0.28], [0.1, 0.9], [-0.1, 0.9], [-0.1, 0.28], [-0.38, 0.28], [-0.38, 0.9], [-0.58, 0.9],
				[-0.58, 0.28], [-0.74, 0.28], [-0.74, -0.05]
			]);
			break;
		case 'tent':
			// yurt / nomad pavilion with crown smoke-ring, stepped conical roof, and doorway cutout
			poly(ctx, x, y, r, [
				[-0.25, -0.95], [0.25, -0.95], [0.35, -0.75], [0.95, 0.1], [0.95, 0.85], [-0.95, 0.85], [-0.95, 0.1], [-0.35, -0.75]
			]);
			poly(ctx, x, y, r, [[-0.22, 0.85], [-0.22, 0.32], [0.22, 0.32], [0.22, 0.85]]);
			break;
		case 'dome':
			// ribbed dome with finial spire and recessed arch entrance
			ctx.moveTo(x - 0.84 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.84 * r, y + 0.12 * r);
			ctx.arc(x, y + 0.12 * r, 0.84 * r, Math.PI, 0);
			ctx.lineTo(x + 0.84 * r, y + 0.9 * r);
			ctx.closePath();
			poly(ctx, x, y, r, [[-0.08, -0.7], [0, -1.1], [0.08, -0.7]]);
			ctx.moveTo(x - 0.26 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.26 * r, y + 0.45 * r);
			ctx.arc(x, y + 0.45 * r, 0.26 * r, Math.PI, 0);
			ctx.lineTo(x + 0.26 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'minaret':
			// minaret with twin balcony galleries, pointed finial, and flanking prayer dome
			poly(ctx, x, y, r, [
				[-0.24, 0.9], [-0.24, 0.0], [-0.38, 0.0], [-0.38, -0.14], [-0.22, -0.14],
				[-0.22, -0.52], [-0.34, -0.52], [-0.34, -0.64], [-0.18, -0.64], [0, -1.14],
				[0.18, -0.64], [0.34, -0.64], [0.34, -0.52], [0.22, -0.52],
				[0.22, -0.14], [0.38, -0.14], [0.38, 0.0], [0.24, 0.0], [0.24, 0.9]
			]);
			ctx.moveTo(x - 0.95 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.95 * r, y + 0.4 * r);
			ctx.arc(x - 0.62 * r, y + 0.4 * r, 0.33 * r, Math.PI, 0);
			ctx.lineTo(x - 0.29 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'tower':
			// crenellated stone keep with flaring base, arrow slit, and arched gate
			poly(ctx, x, y, r, [
				[-0.72, 0.9], [-0.6, 0.3], [-0.6, -0.72], [-0.7, -0.72], [-0.7, -1.02], [-0.38, -1.02],
				[-0.38, -0.78], [-0.16, -0.78], [-0.16, -1.02], [0.16, -1.02], [0.16, -0.78], [0.38, -0.78],
				[0.38, -1.02], [0.7, -1.02], [0.7, -0.72], [0.6, -0.72], [0.6, 0.3], [0.72, 0.9]
			]);
			ctx.rect(x - 0.08 * r, y - 0.48 * r, 0.16 * r, 0.36 * r);
			ctx.moveTo(x - 0.22 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.22 * r, y + 0.48 * r);
			ctx.arc(x, y + 0.48 * r, 0.22 * r, Math.PI, 0);
			ctx.lineTo(x + 0.22 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'enclosure':
			// walled compound with corner bastions and central courtyard keep
			poly(ctx, x, y, r, [
				[-0.95, -0.95], [-0.55, -0.95], [-0.55, -0.78], [0.55, -0.78], [0.55, -0.95], [0.95, -0.95],
				[0.95, -0.55], [0.78, -0.55], [0.78, 0.55], [0.95, 0.55], [0.95, 0.95], [0.55, 0.95],
				[0.55, 0.78], [-0.55, 0.78], [-0.55, 0.95], [-0.95, 0.95], [-0.95, 0.55], [-0.78, 0.55],
				[-0.78, -0.55], [-0.95, -0.55]
			]);
			ctx.rect(x - 0.34 * r, y - 0.34 * r, 0.68 * r, 0.68 * r);
			break;
		case 'ringfort':
			// concentric earthwork ringfort with inner ditch and central round hall
			ctx.arc(x, y, 0.94 * r, 0, Math.PI * 2);
			ctx.moveTo(x + 0.58 * r, y);
			ctx.arc(x, y, 0.58 * r, 0, Math.PI * 2);
			ctx.moveTo(x + 0.28 * r, y);
			ctx.arc(x, y, 0.28 * r, 0, Math.PI * 2);
			break;
		case 'roundhouse':
			// conical thatched roof overhanging eaves, wall drum, and timber doorway
			poly(ctx, x, y, r, [
				[-0.98, 0.05], [0, -1.02], [0.98, 0.05], [0.75, 0.05], [0.75, 0.9], [-0.75, 0.9], [-0.75, 0.05]
			]);
			ctx.rect(x - 0.2 * r, y + 0.35 * r, 0.4 * r, 0.55 * r);
			break;
		case 'cross':
			// flared arms (cross pattee / rock-hewn monolithic church)
			poly(ctx, x, y, r, [
				[-0.36, -1.0], [0.36, -1.0], [0.26, -0.26], [1.0, -0.36], [1.0, 0.36], [0.26, 0.26],
				[0.36, 1.0], [-0.36, 1.0], [-0.26, 0.26], [-1.0, 0.36], [-1.0, -0.36], [-0.26, -0.26]
			]);
			break;
		case 'stepped':
			// Mesoamerican / ziggurat stepped pyramid with summit shrine and central stair cutout
			poly(ctx, x, y, r, [
				[-1.02, 0.9], [-1.02, 0.45], [-0.72, 0.45], [-0.72, 0.0], [-0.44, 0.0], [-0.44, -0.45],
				[-0.28, -0.45], [-0.28, -0.88], [0.28, -0.88], [0.28, -0.45], [0.44, -0.45], [0.44, 0.0],
				[0.72, 0.0], [0.72, 0.45], [1.02, 0.45], [1.02, 0.9]
			]);
			ctx.rect(x - 0.14 * r, y - 0.25 * r, 0.28 * r, 1.15 * r);
			break;
		case 'temple':
			// stepped plinth, colonnaded sanctuary, and crowned pediment roof
			poly(ctx, x, y, r, [
				[-0.95, 0.9], [-0.95, 0.58], [-0.72, 0.58], [-0.72, -0.15], [-0.9, -0.15], [0, -0.95],
				[0.9, -0.15], [0.72, -0.15], [0.72, 0.58], [0.95, 0.58], [0.95, 0.9]
			]);
			ctx.rect(x - 0.44 * r, y - 0.05 * r, 0.2 * r, 0.62 * r);
			ctx.rect(x - 0.1 * r, y - 0.05 * r, 0.2 * r, 0.62 * r);
			ctx.rect(x + 0.24 * r, y - 0.05 * r, 0.2 * r, 0.62 * r);
			break;
		case 'terrace':
			// Andean / hillside stepped agricultural & citadel terraces with central stair
			poly(ctx, x, y, r, [[-1.0, 0.9], [-1.0, 0.55], [1.0, 0.55], [1.0, 0.9]]);
			poly(ctx, x, y, r, [[-0.82, 0.42], [-0.82, 0.08], [0.82, 0.08], [0.82, 0.42]]);
			poly(ctx, x, y, r, [[-0.6, -0.05], [-0.6, -0.38], [0.6, -0.38], [0.6, -0.05]]);
			poly(ctx, x, y, r, [[-0.32, -0.5], [-0.32, -0.82], [0.32, -0.82], [0.32, -0.5]]);
			break;
		case 'longhouse':
			// arched keel-roof longhouse with crossed ridge finials and doorway cutout
			poly(ctx, x, y, r, [
				[-1.08, 0.78], [-1.08, -0.05], [-0.75, -0.5], [-0.88, -0.78], [-0.55, -0.6],
				[0.55, -0.6], [0.88, -0.78], [0.75, -0.5], [1.08, -0.05], [1.08, 0.78]
			]);
			ctx.rect(x - 0.22 * r, y + 0.2 * r, 0.44 * r, 0.58 * r);
			break;
		case 'snow':
			// igloo dome with low arched entrance tunnel
			ctx.moveTo(x - 0.92 * r, y + 0.82 * r);
			ctx.arc(x - 0.08 * r, y + 0.82 * r, 0.84 * r, Math.PI, 0);
			ctx.lineTo(x + 1.02 * r, y + 0.82 * r);
			ctx.lineTo(x + 1.02 * r, y + 0.42 * r);
			ctx.lineTo(x + 0.64 * r, y + 0.42 * r);
			ctx.lineTo(x + 0.64 * r, y + 0.82 * r);
			ctx.closePath();
			ctx.moveTo(x + 0.68 * r, y + 0.82 * r);
			ctx.arc(x + 0.84 * r, y + 0.82 * r, 0.16 * r, Math.PI, 0);
			ctx.closePath();
			break;
		case 'hall':
			// pillared great-hall with pitched pediment and four columns
			poly(ctx, x, y, r, [
				[-1.04, -0.15], [0, -0.92], [1.04, -0.15], [0.82, -0.15], [0.82, 0.9], [0.58, 0.9], [0.58, -0.15],
				[0.24, -0.15], [0.24, 0.9], [0.06, 0.9], [0.06, -0.15], [-0.06, -0.15], [-0.06, 0.9], [-0.24, 0.9],
				[-0.24, -0.15], [-0.58, -0.15], [-0.58, 0.9], [-0.82, 0.9], [-0.82, -0.15]
			]);
			break;
		case 'stave':
			// multi-tiered Nordic stave church with dragon-head ridge gables and spire
			poly(ctx, x, y, r, [
				[-0.95, 0.9], [-0.95, 0.25], [-1.05, 0.12], [-0.62, -0.1], [-0.72, -0.25], [-0.42, -0.45],
				[-0.5, -0.62], [-0.14, -0.82], [0, -1.16], [0.14, -0.82], [0.5, -0.62], [0.42, -0.45],
				[0.72, -0.25], [0.62, -0.1], [1.05, 0.12], [0.95, 0.25], [0.95, 0.9]
			]);
			ctx.rect(x - 0.16 * r, y + 0.4 * r, 0.32 * r, 0.5 * r);
			break;
		case 'arch':
			// triumphal arch with stepped attic parapet and recessed vault
			ctx.moveTo(x - 0.94 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.94 * r, y - 0.58 * r);
			ctx.lineTo(x - 0.62 * r, y - 0.58 * r);
			ctx.lineTo(x - 0.62 * r, y - 0.88 * r);
			ctx.lineTo(x + 0.62 * r, y - 0.88 * r);
			ctx.lineTo(x + 0.62 * r, y - 0.58 * r);
			ctx.lineTo(x + 0.94 * r, y - 0.58 * r);
			ctx.lineTo(x + 0.94 * r, y + 0.9 * r);
			ctx.lineTo(x + 0.42 * r, y + 0.9 * r);
			ctx.lineTo(x + 0.42 * r, y + 0.14 * r);
			ctx.arc(x, y + 0.14 * r, 0.42 * r, 0, Math.PI, true);
			ctx.lineTo(x - 0.42 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'onion':
			// onion dome on tall drum with finial spire and flanking nave shoulders
			ctx.moveTo(x, y - 1.16 * r);
			ctx.quadraticCurveTo(x + 0.85 * r, y - 0.38 * r, x + 0.44 * r, y + 0.04 * r);
			ctx.lineTo(x + 0.44 * r, y + 0.32 * r);
			ctx.lineTo(x + 0.78 * r, y + 0.32 * r);
			ctx.lineTo(x + 0.78 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.78 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.78 * r, y + 0.32 * r);
			ctx.lineTo(x - 0.44 * r, y + 0.32 * r);
			ctx.lineTo(x - 0.44 * r, y + 0.04 * r);
			ctx.quadraticCurveTo(x - 0.85 * r, y - 0.38 * r, x, y - 1.16 * r);
			ctx.closePath();
			ctx.rect(x - 0.14 * r, y + 0.46 * r, 0.28 * r, 0.44 * r);
			break;
		case 'jagged':
			// asymmetric obsidian monolith cluster with glowing central cleft
			poly(ctx, x, y, r, [
				[-0.95, 0.9], [-0.82, -0.15], [-0.55, 0.22], [-0.32, -0.78], [-0.08, -0.18],
				[0.1, -1.16], [0.36, -0.25], [0.62, -0.64], [0.82, 0.05], [0.98, 0.9]
			]);
			poly(ctx, x, y, r, [[-0.14, 0.9], [0, 0.22], [0.14, 0.9]]);
			break;
	}
	ctx.fillStyle = fill;
	ctx.fill('evenodd');
	ctx.lineWidth = lw;
	ctx.lineJoin = 'round';
	ctx.strokeStyle = stroke;
	ctx.stroke();
}
