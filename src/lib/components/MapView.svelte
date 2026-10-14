<script lang="ts">
	import { MapRenderer } from '#lib/render/renderer';
	import { onMount } from 'svelte';

	let { onready, onpick, onhover, onchange }: {
		onready: (r: MapRenderer) => void;
		onpick: (cell: number) => void;
		onhover?: (cell: number, x: number, y: number) => void;
		onchange: () => void;
	} = $props();

	let wrap: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let r: MapRenderer;

	onMount(() => {
		r = new MapRenderer(canvas);
		const ro = new ResizeObserver(() => {
			const first = !r.w;
			r.resize(wrap.clientWidth, wrap.clientHeight);
			if (first) r.fit();
			onchange();
		});
		ro.observe(wrap);
		r.resize(wrap.clientWidth, wrap.clientHeight);
		onready(r);
		return () => ro.disconnect();
	});

	// pan / pinch / click with pointer events
	const pts = new Map<number, { x: number; y: number }>();
	let moved = 0;
	let pinchD = 0;
	function local(e: PointerEvent | WheelEvent) {
		const b = canvas.getBoundingClientRect();
		return { x: e.clientX - b.left, y: e.clientY - b.top };
	}
	function down(e: PointerEvent) {
		canvas.setPointerCapture(e.pointerId);
		pts.set(e.pointerId, local(e));
		moved = 0;
		if (pts.size === 2) {
			const [a, b] = [...pts.values()];
			pinchD = Math.hypot(a.x - b.x, a.y - b.y);
		}
	}
	function move(e: PointerEvent) {
		const p = local(e);
		const prev = pts.get(e.pointerId);
		if (!prev) {
			if (onhover && e.pointerType === 'mouse') onhover(r.pick(p.x, p.y), p.x, p.y);
			return;
		}
		if (pts.size === 1) {
			r.tx += p.x - prev.x;
			r.ty += p.y - prev.y;
			moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
		} else if (pts.size === 2) {
			pts.set(e.pointerId, p);
			const [a, b] = [...pts.values()];
			const d = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinchD) r.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinchD);
			pinchD = d;
			moved += 10;
		}
		pts.set(e.pointerId, p);
		onchange();
	}
	function up(e: PointerEvent) {
		const p = local(e);
		if (pts.size === 1 && moved < 6) onpick(r.pick(p.x, p.y));
		pts.delete(e.pointerId);
		if (pts.size < 2) pinchD = 0;
	}
	function wheel(e: WheelEvent) {
		e.preventDefault();
		const p = local(e);
		r.zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
		onchange();
	}

	function key(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') { r.tx += 40; onchange(); e.preventDefault(); }
		else if (e.key === 'ArrowRight') { r.tx -= 40; onchange(); e.preventDefault(); }
		else if (e.key === 'ArrowUp') { r.ty += 40; onchange(); e.preventDefault(); }
		else if (e.key === 'ArrowDown') { r.ty -= 40; onchange(); e.preventDefault(); }
		else if (e.key === '+' || e.key === '=') { r.zoomAt(r.w / 2, r.h / 2, 1.25); onchange(); e.preventDefault(); }
		else if (e.key === '-' || e.key === '_') { r.zoomAt(r.w / 2, r.h / 2, 0.8); onchange(); e.preventDefault(); }
	}
</script>

<div class="map" bind:this={wrap}>
	<canvas
		bind:this={canvas}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onpointerleave={() => onhover?.(-1, 0, 0)}
		onwheel={wheel}
		onkeydown={key}
		tabindex="0"
		aria-label="World map: drag to pan, scroll or pinch to zoom, arrow keys to navigate, click to inspect"
	></canvas>
</div>

<style>
	.map { position: absolute; inset: 0; overflow: hidden; }
	canvas { display: block; touch-action: none; cursor: grab; }
	canvas:active { cursor: grabbing; }
</style>
