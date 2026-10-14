<script lang="ts">
	import { buildEquirect, renderGlobe, type AzimuthProjection, type GlobeMode, type GlobeRaster } from '#lib/render/globe';
	import { latRange, lonRange } from '#lib/gen/options';
	import type { Simulation } from '#lib/sim/engine';
	import { onMount } from 'svelte';

	let { sim, onclose }: { sim: Simulation; onclose: () => void } = $props();

	const SIZE = 480;
	let canvas: HTMLCanvasElement | undefined = $state();
	let closeBtn: HTMLButtonElement | undefined;
	let mode = $state<GlobeMode>('political');
	let proj = $state<AzimuthProjection>('orthographic');
	let spin = $state(true);
	let grid = $state(true);
	let lon0 = $state(0);
	let lat0 = $state(20);
	let raster: GlobeRaster | null = null;
	let note = $state('');

	const bucket = $derived(Math.floor(sim.year / 5));
	const o = $derived(sim.w.opts);
	const lat = $derived(latRange(o.climate));
	const lon = $derived(lonRange(o.climate, o.width, o.height));

	function rebuild() {
		raster = buildEquirect(sim, mode);
		note = raster.wrap
			? 'Spherical world: the east and west edges join seamlessly.'
			: raster.coverage > 0.97
				? 'The map covers the whole sphere (its edges meet at the antimeridian).'
				: `The map covers about ${Math.round(raster.coverage * 100)}% of the sphere; the dark area is unmapped. Use Configure World or the Whole world preset for a full globe.`;
		draw();
	}

	let img: ImageData | null = null;
	function draw() {
		if (!canvas || !raster) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		img ??= ctx.createImageData(SIZE, SIZE);
		renderGlobe(raster, img, lon0, lat0, grid, proj);
		ctx.putImageData(img, 0, 0);
	}

	$effect(() => {
		void bucket; // rebuild every 5 sim years, not on every tick
		void mode;
		rebuild();
	});
	$effect(() => {
		void lon0;
		void lat0;
		void grid;
		void proj;
		draw();
	});

	onMount(() => {
		closeBtn?.focus();
		// start over the middle of the mapped area
		lon0 = lon.left + lon.span / 2;
		lat0 = Math.max(-60, Math.min(60, (lat.top + lat.bottom) / 2));
		let raf = 0, last = performance.now();
		const tick = (t: number) => {
			if (spin && !drag) lon0 = ((lon0 + (t - last) * 0.01 + 540) % 360) - 180;
			last = t;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	let drag: { x: number; y: number } | null = null;
	function down(e: PointerEvent) {
		drag = { x: e.clientX, y: e.clientY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!drag) return;
		lon0 = ((lon0 - (e.clientX - drag.x) * 0.45 + 540) % 360) - 180;
		lat0 = Math.max(-89, Math.min(89, lat0 + (e.clientY - drag.y) * 0.45));
		drag = { x: e.clientX, y: e.clientY };
	}
	function up() {
		drag = null;
	}
	function key(e: KeyboardEvent) {
		if (e.key === 'Escape') { e.stopPropagation(); onclose(); }
		else if (e.key === 'ArrowLeft') { lon0 = ((lon0 - 10 + 540) % 360) - 180; e.preventDefault(); }
		else if (e.key === 'ArrowRight') { lon0 = ((lon0 + 10 + 540) % 360) - 180; e.preventDefault(); }
		else if (e.key === 'ArrowUp') { lat0 = Math.min(89, lat0 + 8); e.preventDefault(); }
		else if (e.key === 'ArrowDown') { lat0 = Math.max(-89, lat0 - 8); e.preventDefault(); }
	}
</script>

<svelte:window onkeydown={key} />

<div class="overlay" onclick={(e) => e.target === e.currentTarget && onclose()} onkeydown={(e) => e.key === 'Escape' && onclose()} role="presentation">
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="globe-title" tabindex="-1">
		<header class="mhead">
			<div>
				<h2 id="globe-title">Globe & Azimuth Projection</h2>
				<p class="muted small">Drag to turn the world, or use arrow keys. Center: {Math.round(lat0)}°N, {Math.round(lon0)}°E · Year {sim.year}.</p>
			</div>
			<button class="btn icon" bind:this={closeBtn} onclick={onclose} aria-label="Close globe">✕</button>
		</header>
		<div class="stage">
			<canvas
				bind:this={canvas}
				width={SIZE}
				height={SIZE}
				style="width:{SIZE}px;height:{SIZE}px"
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
				aria-label="Rotatable globe of the world"
			></canvas>
		</div>
		<div class="ctl-group">
			<div class="ctl">
				<span class="ctl-label">Mode:</span>
				<button class="btn tiny" class:active={mode === 'political'} onclick={() => (mode = 'political')}>Political</button>
				<button class="btn tiny" class:active={mode === 'biome'} onclick={() => (mode = 'biome')}>Biomes</button>
				<button class="btn tiny" class:active={spin} onclick={() => (spin = !spin)}>{spin ? 'Pause spin' : 'Spin'}</button>
				<button class="btn tiny" class:active={grid} onclick={() => (grid = !grid)}>Graticule</button>
			</div>
			<div class="ctl">
				<span class="ctl-label">Projection:</span>
				<button class="btn tiny" class:active={proj === 'orthographic'} onclick={() => (proj = 'orthographic')} title="Orthographic azimuthal: 3D sphere as seen from space">Orthographic</button>
				<button class="btn tiny" class:active={proj === 'equidistant'} onclick={() => (proj = 'equidistant')} title="Azimuthal equidistant: preserves true distances from center point">Azimuthal Equidistant</button>
				<button class="btn tiny" class:active={proj === 'stereographic'} onclick={() => (proj = 'stereographic')} title="Stereographic azimuthal: conformal wide view">Stereographic</button>
				<button class="btn tiny" class:active={proj === 'gnomonic'} onclick={() => (proj = 'gnomonic')} title="Gnomonic: great circles are straight lines">Gnomonic</button>
			</div>
			<div class="ctl">
				<span class="ctl-label">Align:</span>
				<button class="btn tiny" onclick={() => { lat0 = 90; spin = false; }}>North Pole</button>
				<button class="btn tiny" onclick={() => { lat0 = 0; spin = false; }}>Equator</button>
				<button class="btn tiny" onclick={() => { lat0 = -90; spin = false; }}>South Pole</button>
				<button class="btn tiny" onclick={() => { lat0 = Math.max(-60, Math.min(60, (lat.top + lat.bottom) / 2)); lon0 = lon.left + lon.span / 2; spin = false; }}>Map Center</button>
			</div>
		</div>
		<p class="muted small note">{note}</p>
	</div>
</div>

<style>
	.overlay { position: fixed; inset: 0; background: rgba(8, 6, 4, 0.78); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
	.modal { background: var(--vellum); border: 1px solid var(--line); border-radius: 12px; max-width: 540px; max-height: 94vh; width: 100%; padding: 1.1rem; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); overflow-y: auto; }
	.mhead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; }
	h2 { margin: 0 0 0.2rem; font-size: 1.25rem; }
	.small { font-size: 0.82rem; margin: 0; }
	.stage { display: flex; justify-content: center; background: radial-gradient(circle at 50% 50%, #0b1020 0%, #05070d 100%); border-radius: 10px; padding: 0.4rem; overflow: hidden; }
	canvas { max-width: 100%; height: auto !important; aspect-ratio: 1; cursor: grab; touch-action: none; }
	canvas:active { cursor: grabbing; }
	.ctl-group { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.7rem; }
	.ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
	.ctl-label { font-size: 0.78rem; font-weight: 600; color: var(--muted); min-width: 70px; }
	.btn.active { outline: 2px solid var(--accent); }
	.note { margin-top: 0.6rem; }
</style>

