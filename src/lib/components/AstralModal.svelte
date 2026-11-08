<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		getAstralCosmos,
		embarkAstralVoyage,
		ZODIAC_CONSTELLATIONS,
		type ZodiacConstellation,
		type DeadGodHusk
	} from '#lib/sim/astral_cosmos';
	import { getApotheosisSimData } from '#lib/sim/apotheosis';
	import { onMount } from 'svelte';

	let {
		sim,
		v = 0,
		onclose,
		onrefresh
	}: {
		sim: Simulation;
		v?: number;
		onclose: () => void;
		onrefresh?: () => void;
	} = $props();

	let activeTab = $state<'zodiac' | 'astral' | 'pantheon'>('zodiac');
	let canvasRef = $state<HTMLCanvasElement>();
	let closeBtn = $state<HTMLButtonElement>();
	let voyageResult = $state<string | null>(null);

	const astral = $derived.by(() => {
		void v;
		return getAstralCosmos(sim);
	});

	const apotheosisData = $derived.by(() => {
		void v;
		return getApotheosisSimData(sim);
	});

	const activeConstellation = $derived.by(() => {
		return ZODIAC_CONSTELLATIONS.find((c) => c.id === astral.activeHouseId) || ZODIAC_CONSTELLATIONS[0];
	});

	onMount(() => {
		closeBtn?.focus();
		drawStarmap();
	});

	$effect(() => {
		if (astral || activeTab) {
			drawStarmap();
		}
	});

	function drawStarmap() {
		if (!canvasRef) return;
		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;

		const W = canvasRef.width;
		const H = canvasRef.height;
		ctx.clearRect(0, 0, W, H);

		// 1. Deep Space Void with Nebula Glow
		const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 40, W * 0.5, H * 0.5, W * 0.6);
		grad.addColorStop(0, '#17132a');
		grad.addColorStop(0.5, '#0b0d1e');
		grad.addColorStop(1, '#02040a');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// 2. Background Starfield (Deterministic based on world seed)
		ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
		const seedNum = Math.abs(sim.w.opts.seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0));
		for (let i = 0; i < 90; i++) {
			const sx = ((seedNum * (i + 1) * 31) % W);
			const sy = ((seedNum * (i + 1) * 73) % H);
			const r = (i % 5 === 0) ? 1.8 : 1.0;
			ctx.beginPath();
			ctx.arc(sx, sy, r, 0, Math.PI * 2);
			ctx.fill();
		}

		// 3. Draw Constellation
		const c = activeConstellation;
		const cx = W * 0.5;
		const cy = H * 0.5;
		const scale = Math.min(W, H) * 0.38;

		// Constellation Connecting Lines
		ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
		ctx.lineWidth = 1.5;
		for (const [s1, s2] of c.lines) {
			const [x1, y1] = c.stars[s1];
			const [x2, y2] = c.stars[s2];
			ctx.beginPath();
			ctx.moveTo(cx + x1 * scale, cy + y1 * scale);
			ctx.lineTo(cx + x2 * scale, cy + y2 * scale);
			ctx.stroke();
		}

		// Star Nodes
		for (let idx = 0; idx < c.stars.length; idx++) {
			const [x, y] = c.stars[idx];
			const px = cx + x * scale;
			const py = cy + y * scale;

			// Star halo
			const starGrad = ctx.createRadialGradient(px, py, 1, px, py, 8);
			starGrad.addColorStop(0, '#ffffff');
			starGrad.addColorStop(0.5, 'rgba(191, 219, 254, 0.8)');
			starGrad.addColorStop(1, 'rgba(96, 165, 250, 0)');
			ctx.fillStyle = starGrad;
			ctx.beginPath();
			ctx.arc(px, py, 8, 0, Math.PI * 2);
			ctx.fill();

			// Star center
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(px, py, 2.2, 0, Math.PI * 2);
			ctx.fill();
		}

		// Celestial Ring Overlay
		ctx.strokeStyle = 'rgba(216, 180, 254, 0.2)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, scale * 1.15, 0, Math.PI * 2);
		ctx.stroke();
	}

	function handleVoyage() {
		const res = embarkAstralVoyage(sim);
		voyageResult = res.log;
		onrefresh?.();
	}
</script>

<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="astral-modal-title">
	<div class="modal-card">
		<header class="modal-header">
			<div class="title-group">
				<h2 id="astral-modal-title">✨ Celestial Starmap & The Astral Sea</h2>
				<span class="subtext">
					Year {sim.year} · Celestial House of {activeConstellation.name} · {astral.voyagesCompleted} Astral Voyages
				</span>
			</div>
			<div class="tab-toggles">
				<button class="tab-btn" class:active={activeTab === 'zodiac'} onclick={() => (activeTab = 'zodiac')}>
					Zodiac & Omens
				</button>
				<button class="tab-btn" class:active={activeTab === 'astral'} onclick={() => (activeTab = 'astral')}>
					Astral Sea
				</button>
				<button class="tab-btn" class:active={activeTab === 'pantheon'} onclick={() => (activeTab = 'pantheon')}>
					Ascended Pantheon
				</button>
			</div>
			<button bind:this={closeBtn} class="close-btn" onclick={onclose} title="Close window">✕</button>
		</header>

		<div class="modal-body">
			<!-- Visual Starmap Canvas -->
			<div class="canvas-wrap">
				<canvas bind:this={canvasRef} width="640" height="280"></canvas>
			</div>

			{#if activeTab === 'zodiac'}
				<!-- Current Zodiac House & Constellation Detail -->
				<div class="info-card">
					<div class="row between">
						<strong>{activeConstellation.glyph} {activeConstellation.name} ({activeConstellation.title})</strong>
						<span class="chip on">{activeConstellation.domain}</span>
					</div>
					<p class="small muted">{activeConstellation.desc}</p>
					<p class="small myth">"{activeConstellation.myth}"</p>
				</div>

				<!-- Active Astrological Omen -->
				{#if astral.currentOmen}
					<div class="omen-card">
						<div class="row between">
							<strong class="omen-title">{astral.currentOmen.symbol} {astral.currentOmen.name}</strong>
							<span class="chip bad">Active ({astral.currentOmen.durationYears} Years)</span>
						</div>
						<p class="small">{astral.currentOmen.desc}</p>
						<p class="small highlight">Impact: {astral.currentOmen.effect}</p>
					</div>
				{:else}
					<div class="info-card muted-box">
						<span class="small muted">The celestial heavens are tranquil. No catastrophic astrological omens currently presage the skies.</span>
					</div>
				{/if}

			{:else if activeTab === 'astral'}
				<!-- Astral Sea & Dead God Expeditions -->
				<div class="astral-controls">
					<button class="voyage-btn" onclick={handleVoyage}>
						🚀 Launch Ethereal Caravel Expedition
					</button>
					{#if voyageResult}
						<p class="small result-msg">{voyageResult}</p>
					{/if}
				</div>

				<div class="husks-list">
					<strong>Charted Petrified Dead God Husks:</strong>
					{#each astral.astralHusks as husk}
						<div class="husk-card" class:salvaged={husk.salvaged}>
							<div class="row between">
								<span><strong>{husk.name}</strong> <span class="muted">({husk.title})</span></span>
								<span class="chip" class:on={husk.salvaged} class:bad={!husk.salvaged}>
									{husk.salvaged ? 'Salvaged' : `Stratum Depth ${husk.stratumDepth}`}
								</span>
							</div>
							<p class="small muted">{husk.desc}</p>
							<p class="small relic">Artifact Relic: <em>{husk.relicName}</em></p>
						</div>
					{/each}
				</div>

			{:else if activeTab === 'pantheon'}
				<!-- Ascended Mortals & Inscribed Constellations -->
				<div class="pantheon-list">
					<strong>Mortals Ascended to Divine Godhood:</strong>
					{#if apotheosisData.apotheoses.size === 0}
						<p class="small muted">No mortal has yet completed the Sacred Trials of Ascendance to inscribe their star among the gods.</p>
					{:else}
						{#each Array.from(apotheosisData.apotheoses.values()) as apo}
							<div class="apo-card">
								<div class="row between">
									<strong>👑 {apo.deityName}</strong>
									<span class="chip on">{apo.portfolio} · {apo.constellation}</span>
								</div>
								<p class="small muted">Order: {apo.holyOrderName} · Followers: {(apo.followers).toLocaleString()} · Miracles: {apo.miraclesCast}</p>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(4, 19, 18, 0.85);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.modal-card {
		background: #090d16;
		border: 1px solid #1e293b;
		border-radius: 8px;
		width: 100%;
		max-width: 680px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.6);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #111827;
		border-bottom: 1px solid #1f2937;
	}

	.title-group h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #e0e7ff;
	}

	.subtext {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.tab-toggles {
		display: flex;
		gap: 6px;
	}

	.tab-btn {
		background: #0f172a;
		border: 1px solid #334155;
		color: #94a3b8;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.tab-btn.active {
		background: #6366f1;
		border-color: #818cf8;
		color: #ffffff;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: #94a3b8;
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px 8px;
	}

	.close-btn:hover {
		color: #f8fafc;
	}

	.modal-body {
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-height: 520px;
		overflow-y: auto;
	}

	.canvas-wrap {
		width: 100%;
		background: #02040a;
		border: 1px solid #1e293b;
		border-radius: 6px;
		overflow: hidden;
		display: flex;
		justify-content: center;
	}

	canvas {
		width: 100%;
		height: auto;
		display: block;
	}

	.info-card {
		background: #111827;
		border: 1px solid #1f2937;
		border-radius: 6px;
		padding: 10px 14px;
	}

	.myth {
		font-style: italic;
		color: #a5b4fc;
		margin: 4px 0 0;
	}

	.omen-card {
		background: rgba(153, 27, 27, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.35);
		border-radius: 6px;
		padding: 10px 14px;
	}

	.omen-title {
		color: #fca5a5;
	}

	.highlight {
		color: #fde047;
		font-weight: 500;
	}

	.muted-box {
		opacity: 0.75;
	}

	.astral-controls {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.voyage-btn {
		background: #4f46e5;
		border: 1px solid #6366f1;
		color: #ffffff;
		padding: 8px 14px;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.voyage-btn:hover {
		background: #4338ca;
	}

	.result-msg {
		color: #86efac;
		font-style: italic;
		margin: 2px 0;
	}

	.husks-list, .pantheon-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.husk-card, .apo-card {
		background: #111827;
		border: 1px solid #1f2937;
		border-radius: 6px;
		padding: 8px 12px;
	}

	.husk-card.salvaged {
		border-color: #059669;
		background: rgba(6, 78, 59, 0.15);
	}

	.relic {
		color: #67e8f9;
		margin: 2px 0 0;
	}
</style>
