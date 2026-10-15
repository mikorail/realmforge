<script lang="ts">
	import { onMount } from 'svelte';

	let {
		sim,
		world,
		layer = 0,
		renderer,
		v = 0,
		onpan
	}: {
		sim: any;
		world: any;
		layer?: number;
		renderer?: any;
		v?: number;
		onpan?: (x: number, y: number) => void;
	} = $props();

	let collapsed = $state(false);
	let canvas: HTMLCanvasElement | null = $state(null);
	let isDragging = $state(false);

	const miniW = 140;
	const miniH = 90;

	// Cached offscreen canvas for planet thumbnail
	let offscreenThumb: HTMLCanvasElement | null = null;
	let thumbKey = '';

	function renderThumbnail() {
		if (!world || !world.cells) return null;
		const key = `${world.opts?.seed || ''}:${layer}:${v}`;
		if (offscreenThumb && thumbKey === key) return offscreenThumb;

		if (typeof document === 'undefined') return null;
		if (!offscreenThumb) {
			offscreenThumb = document.createElement('canvas');
			offscreenThumb.width = miniW;
			offscreenThumb.height = miniH;
		}

		const ctx = offscreenThumb.getContext('2d');
		if (!ctx) return null;

		const W = world.opts?.width ?? 1000;
		const H = world.opts?.height ?? 1000;
		const scaleX = miniW / W;
		const scaleY = miniH / H;

		// Deep ocean background
		ctx.fillStyle = '#0f172a';
		ctx.fillRect(0, 0, miniW, miniH);

		const cells = world.cells;
		const n = cells.n ?? 0;
		const L = world.layers ? world.layers[layer] : null;
		const open = L ? L.open : null;
		const st = L ? L.state : cells.state;
		const polities = sim?.polities ?? [];

		// Render cells
		for (let i = 0; i < n; i++) {
			if (open && !open[i]) continue;
			if (cells.h && cells.h[i] < 20) continue; // sea

			const cx = cells.x[i] * scaleX;
			const cy = cells.y[i] * scaleY;
			const stateId = st ? st[i] : 0;

			if (stateId && polities[stateId]?.alive) {
				ctx.fillStyle = polities[stateId].color;
			} else {
				ctx.fillStyle = '#334155';
			}

			ctx.fillRect(cx - 0.9, cy - 0.9, 2.2, 2.2);
		}

		thumbKey = key;
		return offscreenThumb;
	}

	function drawMinimap() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		void v;

		const W = world?.opts?.width ?? 1000;
		const H = world?.opts?.height ?? 1000;
		const scaleX = miniW / W;
		const scaleY = miniH / H;

		// 1. Blit cached thumbnail or clear
		const thumb = renderThumbnail();
		if (thumb) {
			ctx.drawImage(thumb, 0, 0);
		} else {
			ctx.fillStyle = '#0f172a';
			ctx.fillRect(0, 0, miniW, miniH);
		}

		// 2. Tactical radar grid overlay
		ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		ctx.moveTo(miniW * 0.5, 0);
		ctx.lineTo(miniW * 0.5, miniH);
		ctx.moveTo(0, miniH * 0.5);
		ctx.lineTo(miniW, miniH * 0.5);
		ctx.stroke();

		// 3. Highlighted camera viewport rectangle in world coordinates
		if (renderer) {
			const k = renderer.k || 1;
			const tx = renderer.tx || 0;
			const ty = renderer.ty || 0;
			const rw = renderer.w || 800;
			const rh = renderer.h || 600;

			const minWx = -tx / k;
			const minWy = -ty / k;
			const viewW = rw / k;
			const viewH = rh / k;

			const rx = minWx * scaleX;
			const ry = minWy * scaleY;
			const rWidth = viewW * scaleX;
			const rHeight = viewH * scaleY;

			// Glowing viewport box
			ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
			ctx.fillRect(rx, ry, rWidth, rHeight);

			ctx.strokeStyle = '#facc15';
			ctx.lineWidth = 1.4;
			ctx.strokeRect(rx, ry, rWidth, rHeight);

			// Corner reticle accents
			const cor = Math.min(4, rWidth * 0.3, rHeight * 0.3);
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 1.8;
			ctx.beginPath();
			// Top left
			ctx.moveTo(rx, ry + cor);
			ctx.lineTo(rx, ry);
			ctx.lineTo(rx + cor, ry);
			// Top right
			ctx.moveTo(rx + rWidth - cor, ry);
			ctx.lineTo(rx + rWidth, ry);
			ctx.lineTo(rx + rWidth, ry + cor);
			// Bottom right
			ctx.moveTo(rx + rWidth, ry + rHeight - cor);
			ctx.lineTo(rx + rWidth, ry + rHeight);
			ctx.lineTo(rx + rWidth - cor, ry + rHeight);
			// Bottom left
			ctx.moveTo(rx + cor, ry + rHeight);
			ctx.lineTo(rx, ry + rHeight);
			ctx.lineTo(rx, ry + rHeight - cor);
			ctx.stroke();
		}
	}

	function handlePointerPan(e: PointerEvent) {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const px = Math.max(0, Math.min(miniW, e.clientX - rect.left));
		const py = Math.max(0, Math.min(miniH, e.clientY - rect.top));

		const W = world?.opts?.width ?? 1000;
		const H = world?.opts?.height ?? 1000;
		const targetWx = (px / miniW) * W;
		const targetWy = (py / miniH) * H;

		if (renderer) {
			renderer.tx = renderer.w * 0.5 - targetWx * renderer.k;
			renderer.ty = renderer.h * 0.5 - targetWy * renderer.k;
			if (typeof renderer.draw === 'function') {
				renderer.draw();
			}
		}

		if (onpan) {
			onpan(targetWx, targetWy);
		}
		drawMinimap();
	}

	function onPointerDown(e: PointerEvent) {
		if (!canvas) return;
		canvas.setPointerCapture(e.pointerId);
		isDragging = true;
		handlePointerPan(e);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		handlePointerPan(e);
	}

	function onPointerUp(e: PointerEvent) {
		if (!canvas) return;
		try {
			canvas.releasePointerCapture(e.pointerId);
		} catch {
			// Ignore if pointer was not captured
		}
		isDragging = false;
	}

	function toggleCollapse() {
		collapsed = !collapsed;
	}

	$effect(() => {
		// Re-render minimap when state or renderer properties change
		void v;
		void world;
		void layer;
		if (!collapsed && canvas) {
			drawMinimap();
		}
	});

	onMount(() => {
		if (canvas) {
			drawMinimap();
		}
	});
</script>

<div class="minimap-container" class:collapsed>
	<button
		type="button"
		class="minimap-toggle"
		onclick={toggleCollapse}
		title={collapsed ? 'Open tactical minimap' : 'Collapse tactical minimap'}
		aria-expanded={!collapsed}
	>
		[🗺️ Minimap]
	</button>

	{#if !collapsed}
		<div class="minimap-viewport">
			<canvas
				bind:this={canvas}
				width={miniW}
				height={miniH}
				class="minimap-canvas"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
			></canvas>
			<div class="minimap-hint">Drag or click to pan</div>
		</div>
	{/if}
</div>

<style>
	.minimap-container {
		position: absolute;
		bottom: 12px;
		right: 12px;
		z-index: 40;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		user-select: none;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.minimap-toggle {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #e2e8f0;
		background: rgba(15, 23, 42, 0.82);
		border: 1px solid rgba(148, 163, 184, 0.35);
		border-radius: 4px;
		backdrop-filter: blur(6px);
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
	}

	.minimap-toggle:hover {
		background: rgba(30, 41, 59, 0.95);
		border-color: #38bdf8;
		color: #fff;
	}

	.minimap-viewport {
		position: relative;
		padding: 4px;
		background: rgba(15, 23, 42, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.3);
		border-radius: 6px;
		backdrop-filter: blur(8px);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.minimap-canvas {
		display: block;
		width: 140px;
		height: 90px;
		border-radius: 3px;
		cursor: crosshair;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.minimap-hint {
		font-size: 9px;
		color: #94a3b8;
		margin-top: 2px;
		text-align: center;
		letter-spacing: 0.03em;
	}
</style>
