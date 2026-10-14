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
			poly(ctx, x, y, r, [[-0.9, -0.1], [0, -0.55], [0.9, -0.1], [0.55, -0.1], [0.55, 0.9], [-0.55, 0.9], [-0.55, -0.1]]);
			poly(ctx, x, y, r, [[-0.55, -0.55], [0, -1], [0.55, -0.55]]);
			break;
		case 'gate':
			poly(ctx, x, y, r, [[-1, -0.7], [1, -0.7], [1, -0.4], [0.7, -0.4], [0.7, 0.9], [0.45, 0.9], [0.45, -0.4], [-0.45, -0.4], [-0.45, 0.9], [-0.7, 0.9], [-0.7, -0.4], [-1, -0.4]]);
			break;
		case 'spire':
			poly(ctx, x, y, r, [[0, -1.1], [0.35, -0.4], [0.7, 0.2], [0.7, 0.9], [-0.7, 0.9], [-0.7, 0.2], [-0.35, -0.4]]);
			break;
		case 'stilt':
			poly(ctx, x, y, r, [[-1, -0.1], [0, -0.9], [1, -0.1], [0.7, -0.1], [0.7, 0.2], [0.55, 0.2], [0.55, 0.9], [0.35, 0.9], [0.35, 0.2], [-0.35, 0.2], [-0.35, 0.9], [-0.55, 0.9], [-0.55, 0.2], [-0.7, 0.2], [-0.7, -0.1]]);
			break;
		case 'tent':
			poly(ctx, x, y, r, [[0, -1], [0.95, 0.85], [-0.95, 0.85]]);
			break;
		case 'dome':
			ctx.moveTo(x - 0.8 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.8 * r, y + 0.1 * r);
			ctx.arc(x, y + 0.1 * r, 0.8 * r, Math.PI, 0);
			ctx.lineTo(x + 0.8 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'minaret':
			poly(ctx, x, y, r, [[-0.25, 0.9], [-0.25, -0.5], [0, -1.1], [0.25, -0.5], [0.25, 0.9]]);
			poly(ctx, x, y, r, [[-0.9, 0.9], [-0.9, 0.3], [-0.35, 0.3], [-0.35, 0.9]]);
			break;
		case 'tower':
			poly(ctx, x, y, r, [[-0.6, 0.9], [-0.6, -0.7], [-0.6, -1], [-0.3, -1], [-0.3, -0.75], [0, -0.75], [0, -1], [0.3, -1], [0.3, -0.75], [0.6, -0.75], [0.6, 0.9]]);
			break;
		case 'enclosure':
			ctx.rect(x - 0.85 * r, y - 0.85 * r, 1.7 * r, 1.7 * r);
			ctx.rect(x - 0.3 * r, y - 0.3 * r, 0.6 * r, 0.6 * r);
			break;
		case 'ringfort':
			ctx.arc(x, y, 0.9 * r, 0, Math.PI * 2);
			ctx.moveTo(x + 0.35 * r, y);
			ctx.arc(x, y, 0.35 * r, 0, Math.PI * 2);
			break;
		case 'roundhouse':
			ctx.moveTo(x - 0.8 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.8 * r, y);
			ctx.lineTo(x, y - 0.95 * r);
			ctx.lineTo(x + 0.8 * r, y);
			ctx.lineTo(x + 0.8 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'cross':
			poly(ctx, x, y, r, [[-0.3, -1], [0.3, -1], [0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3], [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3]]);
			break;
		case 'stepped':
			poly(ctx, x, y, r, [[-1, 0.9], [-1, 0.4], [-0.65, 0.4], [-0.65, -0.1], [-0.3, -0.1], [-0.3, -0.6], [0.3, -0.6], [0.3, -0.1], [0.65, -0.1], [0.65, 0.4], [1, 0.4], [1, 0.9]]);
			break;
		case 'temple':
			poly(ctx, x, y, r, [[-0.9, 0.9], [-0.9, 0.5], [-0.55, 0.5], [-0.55, 0.1], [-0.35, 0.1], [-0.35, -0.3], [-0.35, -0.5], [-0.5, -0.5], [-0.5, -0.8], [0.5, -0.8], [0.5, -0.5], [0.35, -0.5], [0.35, 0.1], [0.55, 0.1], [0.55, 0.5], [0.9, 0.5], [0.9, 0.9]]);
			break;
		case 'terrace':
			poly(ctx, x, y, r, [[-1, 0.9], [-1, 0.55], [1, 0.55], [1, 0.9]]);
			poly(ctx, x, y, r, [[-0.8, 0.4], [-0.8, 0.05], [0.8, 0.05], [0.8, 0.4]]);
			poly(ctx, x, y, r, [[-0.55, -0.1], [-0.55, -0.45], [0.55, -0.45], [0.55, -0.1]]);
			break;
		case 'longhouse':
			poly(ctx, x, y, r, [[-1.05, 0.7], [-1.05, -0.1], [-0.6, -0.55], [0.6, -0.55], [1.05, -0.1], [1.05, 0.7]]);
			break;
		case 'snow':
			ctx.moveTo(x - 0.9 * r, y + 0.8 * r);
			ctx.arc(x, y + 0.8 * r, 0.9 * r, Math.PI, 0);
			ctx.closePath();
			break;
		case 'hall':
			poly(ctx, x, y, r, [[-1, -0.1], [0, -0.85], [1, -0.1], [0.75, -0.1], [0.75, 0.9], [0.55, 0.9], [0.55, -0.1], [-0.55, -0.1], [-0.55, 0.9], [-0.75, 0.9], [-0.75, -0.1]]);
			break;
		case 'stave':
			poly(ctx, x, y, r, [[-0.9, 0.9], [-0.9, 0.2], [-0.5, -0.1], [-0.5, -0.6], [0, -1], [0.5, -0.6], [0.5, -0.1], [0.9, 0.2], [0.9, 0.9]]);
			break;
		case 'arch':
			ctx.moveTo(x - 0.9 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.9 * r, y - 0.7 * r);
			ctx.lineTo(x + 0.9 * r, y - 0.7 * r);
			ctx.lineTo(x + 0.9 * r, y + 0.9 * r);
			ctx.lineTo(x + 0.4 * r, y + 0.9 * r);
			ctx.lineTo(x + 0.4 * r, y + 0.1 * r);
			ctx.arc(x, y + 0.1 * r, 0.4 * r, 0, Math.PI, true);
			ctx.lineTo(x - 0.4 * r, y + 0.9 * r);
			ctx.closePath();
			break;
		case 'onion':
			ctx.moveTo(x, y - 1.1 * r);
			ctx.quadraticCurveTo(x + 0.9 * r, y - 0.3 * r, x + 0.5 * r, y + 0.1 * r);
			ctx.lineTo(x + 0.5 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.5 * r, y + 0.9 * r);
			ctx.lineTo(x - 0.5 * r, y + 0.1 * r);
			ctx.quadraticCurveTo(x - 0.9 * r, y - 0.3 * r, x, y - 1.1 * r);
			ctx.closePath();
			break;
		case 'jagged':
			poly(ctx, x, y, r, [[-0.9, 0.9], [-0.7, -0.2], [-0.4, 0.3], [-0.15, -1.1], [0.15, 0.1], [0.45, -0.5], [0.9, 0.9]]);
			break;
	}
	ctx.fillStyle = fill;
	ctx.fill('evenodd');
	ctx.lineWidth = lw;
	ctx.lineJoin = 'round';
	ctx.strokeStyle = stroke;
	ctx.stroke();
}
