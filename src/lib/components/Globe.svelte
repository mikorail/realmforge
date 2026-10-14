<script lang="ts">
	import { latRange, lonRange, tempAt } from '#lib/gen/options';
	import type { Climate } from '#lib/gen/types';

	let { climate, width = 1600, height = 1000, onwind }: { climate: Climate; width?: number; height?: number; onwind?: (band: number, delta: number) => void } = $props();

	let canvas: HTMLCanvasElement;
	const SIZE = 260;
	const BANDS = [75, 45, 15, -15, -45, -75];

	/** cold → hot ramp, roughly Azgaar's globe colours */
	function tempColor(t: number) {
		const stops: [number, [number, number, number]][] = [
			[-40, [80, 160, 220]], [-15, [150, 220, 230]], [0, [190, 230, 170]], [10, [240, 235, 160]], [20, [240, 180, 120]], [28, [220, 90, 90]], [40, [170, 40, 70]]
		];
		if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
		for (let i = 1; i < stops.length; i++)
			if (t <= stops[i][0]) {
				const [t0, a] = stops[i - 1], [t1, b] = stops[i];
				const f = (t - t0) / (t1 - t0);
				return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
			}
		return `rgb(${stops[stops.length - 1][1]})`;
	}

	$effect(() => {
		const cl = climate;
		const deps = [cl.tEq, cl.tN, cl.tS, cl.mapSize, cl.latitude, cl.longitude, cl.winds.join(), width, height];
		void deps;
		draw(cl);
	});

	function draw(cl: Climate) {
		if (!canvas) return;
		const dpr = Math.min(2, devicePixelRatio || 1);
		canvas.width = SIZE * dpr;
		canvas.height = SIZE * dpr;
		const ctx = canvas.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, SIZE, SIZE);
		const R = SIZE * 0.4, cx = SIZE * 0.47, cy = SIZE / 2;
		const Y = (lat: number) => cy - R * Math.sin((lat * Math.PI) / 180);
		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.clip();
		for (let lat = -90; lat < 90; lat += 2) {
			ctx.fillStyle = tempColor(tempAt(cl, lat + 1));
			ctx.fillRect(cx - R, Y(lat + 2), R * 2, Y(lat) - Y(lat + 2) + 0.5);
		}
		// limb shading
		const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.2, cx, cy, R);
		g.addColorStop(0, 'rgba(255,255,255,0.18)');
		g.addColorStop(1, 'rgba(0,0,0,0.35)');
		ctx.fillStyle = g;
		ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
		// latitude lines
		ctx.strokeStyle = 'rgba(0,0,0,0.25)';
		ctx.setLineDash([3, 3]);
		for (const lat of [-60, -30, 30, 60]) {
			ctx.beginPath();
			ctx.moveTo(cx - R, Y(lat));
			ctx.lineTo(cx + R, Y(lat));
			ctx.stroke();
		}
		ctx.setLineDash([]);
		ctx.strokeStyle = 'rgba(200,0,0,0.5)';
		ctx.beginPath();
		ctx.moveTo(cx - R, cy);
		ctx.lineTo(cx + R, cy);
		ctx.stroke();
		// the map's footprint
		const lr = latRange(cl);
		const lo = lonRange(cl, width, height);
		const half = Math.min(89.9, lo.span / 2);
		const P = (lat: number, lon: number): [number, number] => {
			const la = (lat * Math.PI) / 180, ln = (lon * Math.PI) / 180;
			return [cx + R * Math.cos(la) * Math.sin(ln), cy - R * Math.sin(la)];
		};
		ctx.beginPath();
		const steps = 24;
		for (let k = 0; k <= steps; k++) { const [x, y] = P(lr.top, -half + (2 * half * k) / steps); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
		for (let k = 0; k <= steps; k++) { const [x, y] = P(lr.top - (lr.span * k) / steps, half); ctx.lineTo(x, y); }
		for (let k = 0; k <= steps; k++) { const [x, y] = P(lr.bottom, half - (2 * half * k) / steps); ctx.lineTo(x, y); }
		for (let k = 0; k <= steps; k++) { const [x, y] = P(lr.bottom + (lr.span * k) / steps, -half); ctx.lineTo(x, y); }
		ctx.closePath();
		ctx.fillStyle = 'rgba(255,255,255,0.22)';
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#1b140c';
		ctx.stroke();
		ctx.restore();
		ctx.beginPath();
		ctx.arc(cx, cy, R, 0, Math.PI * 2);
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = '#1b140c';
		ctx.stroke();
		// labels
		ctx.fillStyle = 'currentColor';
		ctx.font = '10px "Share Tech Mono", monospace';
		ctx.fillStyle = getComputedStyle(canvas).color;
		for (const lat of [90, 60, 30, 0, -30, -60, -90]) ctx.fillText(`${Math.abs(lat)}°`, 2, Y(lat) + 3);
	}

	const arrowY = (lat: number) => 50 - (Math.sin((lat * Math.PI) / 180) * 40);
</script>

<div class="globe">
	<canvas bind:this={canvas} style="width:{SIZE}px;height:{SIZE}px" aria-label="Globe preview of the map's latitude and temperature"></canvas>
	<div class="winds" aria-label="Prevailing winds by latitude band (click to rotate, right-click to rotate back)">
		{#each BANDS as lat, b (b)}
			<button
				class="wind"
				style="top:{arrowY(lat)}%"
				title="Wind {lat > 0 ? lat + '°N' : -lat + '°S'} band: blows toward {climate.winds[b]}° (click to rotate)"
				onclick={() => onwind?.(b, 45)}
				oncontextmenu={(e) => { e.preventDefault(); onwind?.(b, -45); }}
			><span style="transform:rotate({climate.winds[b]}deg)">↑</span></button>
		{/each}
	</div>
</div>

<style>
	.globe { position: relative; width: min(300px, 100%); height: 260px; color: var(--muted); margin: 0 auto; }
	canvas { display: block; max-width: calc(100% - 36px); margin: 0 auto; }
	.winds { position: absolute; right: 0; top: 0; bottom: 0; width: 34px; }
	.wind { position: absolute; right: 0; transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line); background: transparent; padding: 0; display: grid; place-items: center; font-size: 1rem; color: var(--accent); }
	.wind span { display: inline-block; transition: transform 0.2s; }
	.wind:hover { border-color: var(--accent); }
</style>
