<script lang="ts">
	import { downloadFile, generateSvgMap, generateWorldGazetteer, renderPosterPng } from '#lib/export';
	import { compileAnnalsBookMarkdown } from '#lib/sim/chronicle';
	import { annalsAppendix } from '#lib/sim/story/index';
	import type { MapRenderer } from '#lib/render/renderer';
	import type { Cosmos } from '#lib/sim/cosmos';
	import { getShareUrl } from '#lib/share';

	let {
		cosmos,
		pi,
		r,
		onclose,
		onsay
	}: {
		cosmos: Cosmos;
		pi: number;
		r: MapRenderer | null;
		onclose: () => void;
		onsay: (text: string) => void;
	} = $props();

	const world = $derived(cosmos.u.planets[pi]);
	const sim = $derived(cosmos.sims[pi]);

	let exportingPoster = $state(false);

	async function exportPoster() {
		if (!r) return;
		exportingPoster = true;
		try {
			const blob = await renderPosterPng(r.canvas, world, sim, r.theme);
			downloadFile(blob, `${world.name.toLowerCase().replace(/\s+/g, '-')}-poster.png`, 'image/png');
			onsay('High-resolution cartographic poster downloaded.');
		} catch (e) {
			onsay(`Poster export failed: ${(e as Error).message}`);
		} finally {
			exportingPoster = false;
		}
	}

	function exportSvg() {
		const svg = generateSvgMap(world, sim, r?.layer ?? 0);
		downloadFile(svg, `${world.name.toLowerCase().replace(/\s+/g, '-')}-vector.svg`, 'image/svg+xml');
		onsay('Layered vector SVG map downloaded.');
	}

	function exportGazetteer() {
		const md = generateWorldGazetteer(world, sim);
		downloadFile(md, `${world.name.toLowerCase().replace(/\s+/g, '-')}-gazetteer.md`, 'text/markdown');
		onsay('World gazetteer and historical dossier downloaded.');
	}

	function exportCompleteAnnals() {
		const evList = sim.allEvents && sim.allEvents.length ? sim.allEvents : sim.events;
		const md = compileAnnalsBookMarkdown(evList, world.name, 1000, annalsAppendix(sim));
		downloadFile(md, `${world.name.toLowerCase().replace(/\s+/g, '-')}-complete-annals.md`, 'text/markdown');
		onsay('Complete historical annals book downloaded.');
	}

	function copyShareLink() {
		const opts = world.opts;
		const url = getShareUrl({
			seed: opts.seed,
			genre: opts.genre,
			planet: opts.planet,
			template: opts.template,
			cells: opts.cells,
			states: opts.states,
			cultures: opts.cultures,
			religions: opts.religions,
			burgs: opts.burgs,
			width: opts.width,
			height: opts.height,
			depth: opts.depth,
			sky: opts.sky,
			sea: opts.sea,
			climate: {
				tEq: opts.climate.tEq,
				tN: opts.climate.tN,
				tS: opts.climate.tS,
				prec: opts.climate.prec
			}
		});
		if (navigator.clipboard) {
			navigator.clipboard.writeText(url);
			onsay('Shareable universe link copied to clipboard.');
		} else {
			onsay('Could not access clipboard.');
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" onclick={(e) => e.target === e.currentTarget && onclose()} onkeydown={(e) => e.key === 'Escape' && onclose()} role="presentation">
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="export-title" tabindex="-1">
		<header class="mhead">
			<div>
				<h2 id="export-title">Cartographer Studio: {world.name}</h2>
				<p class="muted small">Export high-resolution posters, vector maps, world gazetteers, or share seeds.</p>
			</div>
			<button class="btn icon" onclick={onclose} aria-label="Close export dialog">✕</button>
		</header>

		<div class="grid">
			<div class="card">
				<div class="card-icon">🗺</div>
				<h3>Cartographic Poster</h3>
				<p class="muted small">Print-ready Ultra-HD PNG with decorative cartouche, neatline frame, compass rose, and scale bar.</p>
				<button class="btn primary" onclick={exportPoster} disabled={exportingPoster}>
					{exportingPoster ? 'Rendering...' : 'Download Poster (PNG)'}
				</button>
			</div>

			<div class="card">
				<div class="card-icon">📐</div>
				<h3>Vector Map (SVG)</h3>
				<p class="muted small">Layered vector graphics of biomes, rivers, coastlines, borders, and settlements for Illustrator, Inkscape, or VTTs.</p>
				<button class="btn" onclick={exportSvg}>Download Vector (SVG)</button>
			</div>

			<div class="card">
				<div class="card-icon">📜</div>
				<h3>World Gazetteer</h3>
				<p class="muted small">Comprehensive Markdown dossier of all realms, rulers, dynasties, pantheons, culture spheres, and war annals.</p>
				<button class="btn" onclick={exportGazetteer}>Download Dossier (MD)</button>
			</div>

			<div class="card">
				<div class="card-icon">📖</div>
				<h3>Complete Annals Book</h3>
				<p class="muted small">Full narrative chronicle book transcribing all recorded years, major battles, coronations, and uprisings from Year 1 to the present.</p>
				<button class="btn" onclick={exportCompleteAnnals}>Download Complete Annals (MD)</button>
			</div>

			<div class="card">
				<div class="card-icon">🔗</div>
				<h3>Shareable Seed Link</h3>
				<p class="muted small">URL hash containing seed, climate, planet classification, and generator options for one-click sharing.</p>
				<button class="btn" onclick={copyShareLink}>Copy Share Link</button>
			</div>
		</div>

		<footer class="mfoot">
			<button class="btn" onclick={onclose}>Done</button>
		</footer>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(8, 6, 4, 0.75);
		backdrop-filter: blur(4px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.modal {
		background: var(--vellum);
		border: 1px solid var(--line);
		border-radius: 12px;
		max-width: 680px;
		width: 100%;
		padding: 1.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
	}
	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.2rem;
	}
	h2 {
		font-size: 1.3rem;
		margin: 0 0 0.2rem 0;
	}
	.small {
		font-size: 0.82rem;
		margin: 0;
	}
	.icon {
		padding: 0.35rem 0.6rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
		margin-bottom: 1.2rem;
	}
	.card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.02);
	}
	.card-icon {
		font-size: 1.6rem;
		line-height: 1;
	}
	.card h3 {
		font-size: 1.05rem;
		margin: 0;
	}
	.card .btn {
		margin-top: auto;
		width: 100%;
	}
	.btn.primary {
		background: var(--accent);
		color: var(--ink);
		font-weight: 600;
	}
	.mfoot {
		display: flex;
		justify-content: flex-end;
	}
</style>
