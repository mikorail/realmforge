<script lang="ts">
	import { BIOMES } from '#lib/gen/physical';
	import type { World } from '#lib/gen/types';
	import { HYPSO, type MapMode } from '#lib/render/renderer';
	import type { Simulation } from '#lib/sim/engine';
	import { dominantSector, SECTOR_INFO, SECTORS } from '#lib/sim/sectors';
	import { RAIL_COLORS, diseaseColor, type SimLayerKey } from '#lib/render/simlayers';

	let { sim, world, layer, mode, v, year, overlays = [] }: { sim: Simulation; world: World; layer: number; mode: MapMode; v: number; year: number; overlays?: SimLayerKey[] } = $props();

	/** legend rows for the optional sim layers (read-only views of the sim state) */
	const overlayRows = $derived.by<{ key: string; color: string; label: string; dash?: boolean; glyph?: string }[]>(() => {
		void v;
		const out: { key: string; color: string; label: string; dash?: boolean; glyph?: string }[] = [];
		const S = sim as unknown as { _railState?: { lines: { kind: string; cut?: number }[]; docks: number[] }; _hazardsState?: { outbreaks: { disease: string; name: string; ended?: number }[] } };
		if (overlays.includes('rail')) {
			const kinds = [...new Set((S._railState?.lines ?? []).map((l) => l.kind))];
			for (const k of kinds) out.push({ key: 'r' + k, color: RAIL_COLORS[k] ?? '#444', label: k });
			if (S._railState?.lines.some((l) => l.cut)) out.push({ key: 'rcut', color: '#666', label: 'cut line', dash: true });
			if (S._railState?.docks.length) out.push({ key: 'dock', color: '#5090d2', label: 'air dock / route', glyph: '⚓' });
			if (!out.length) out.push({ key: 'r0', color: '#999', label: 'no rail yet', dash: true });
		}
		if (overlays.includes('faults')) {
			out.push({ key: 'fault', color: '#a02814', label: 'fault line' });
			out.push({ key: 'volc', color: '#c0392b', label: 'volcano (glow = active)', glyph: '▲' });
			out.push({ key: 'recent', color: '#7a4a1f', label: 'recent disaster (fades)', glyph: '≋' });
		}
		if (overlays.includes('disease')) {
			const live = (S._hazardsState?.outbreaks ?? []).filter((o) => !o.ended).slice(0, 5);
			for (const o of live) out.push({ key: 'ob' + o.name, color: diseaseColor(o.disease), label: o.name });
			out.push({ key: 'q', color: '#888', label: 'quarantined town', dash: true });
		}
		if (overlays.includes('forces')) {
			out.push({ key: 'smog', color: '#5a5550', label: 'smog town', glyph: '☁' });
			out.push({ key: 'fall', color: '#96aa3c', label: 'fallout' });
			out.push({ key: 'corp', color: '#d63384', label: 'megacorp HQ', glyph: '◆' });
			out.push({ key: 'ley', color: '#a78bfa', label: 'leyline', glyph: '✦' });
		}
		if (overlays.includes('names')) out.push({ key: 'nm', color: '#5b3f22', label: 'place names (zoom in for more)', glyph: '✎' });
		return out;
	});

	const KEY = 'realmforge:legend';
	let open = $state(typeof window === 'undefined' || window.innerWidth >= 760);
	try {
		const saved = localStorage.getItem(KEY);
		if (saved !== null) open = saved === '1';
	} catch { /* storage unavailable */ }
	function toggle() {
		open = !open;
		try { localStorage.setItem(KEY, open ? '1' : '0'); } catch { /* ignore */ }
	}

	const MAX = 9;
	interface Row { color: string; label: string; note?: string }
	const TITLES: Record<MapMode, string> = {
		political: 'Realms', biome: 'Biomes', height: 'Relief', culture: 'Cultures', religion: 'Faiths', population: 'Population', economy: 'Economy'
	};

	/** counts per id over the visible layer's open cells */
	function tally(arr: ArrayLike<number>, land = false): [number, number][] {
		const L = world.layers[layer];
		const m = new Map<number, number>();
		for (let i = 0; i < arr.length; i++) {
			if (!L.open[i] || (land && world.cells.h[i] < 20)) continue;
			m.set(arr[i], (m.get(arr[i]) ?? 0) + 1);
		}
		return [...m].sort((a, b) => b[1] - a[1]);
	}

	// Political rows read `v` (cheap: polity.cells). Cell scans for culture, faith and biome only rerun every decade, so 200k-cell worlds stay smooth.
	const decade = $derived(Math.floor(year / 10));
	const political = $derived.by<Row[]>(() => {
		void v;
		return sim.polities
			.filter((p) => p.id && p.alive && p.layer === layer)
			.sort((a, b) => b.cells - a.cells)
			.slice(0, MAX)
			.map((p) => ({ color: p.color, label: p.name, note: p.form }));
	});
	const hiddenRealms = $derived.by(() => {
		void v;
		return Math.max(0, sim.polities.filter((p) => p.id && p.alive && p.layer === layer).length - MAX);
	});
	const scanned = $derived.by<Row[]>(() => {
		void decade;
		if (mode === 'culture') return tally(world.cells.culture).filter(([k]) => k && world.cultures[k]).slice(0, MAX).map(([k]) => ({ color: world.cultures[k].color, label: world.cultures[k].name, note: world.cultures[k].type }));
		if (mode === 'religion') return tally(world.cells.religion).filter(([k]) => k && world.religions[k]).slice(0, MAX).map(([k]) => ({ color: world.religions[k].color, label: world.religions[k].name, note: world.religions[k].type }));
		if (mode === 'economy') {
			if (!sim.sectors) return [];
			const n = new Array(SECTORS.length).fill(0);
			for (const b of world.burgs) if (b.id && b.alive && sim.burgLayer(b) === layer) { const d = dominantSector(sim, b.id); if (d >= 0) n[d]++; }
			return SECTORS.map((k, i) => ({ color: SECTOR_INFO[k].color, label: `${SECTOR_INFO[k].icon} ${SECTOR_INFO[k].name}`, note: n[i] ? `${n[i]} towns` : '', n: n[i] })).sort((a, b) => b.n - a.n).map(({ n: _n, ...r }) => r);
		}
		if (mode === 'biome') return tally(world.cells.biome, true).slice(0, 12).map(([k]) => ({ color: BIOMES[k].color, label: BIOMES[k].name }));
		return [];
	});
	const rows = $derived(mode === 'political' ? political : scanned);
</script>

<div class="legend" class:open>
	<button type="button" class="btn lhead" onclick={toggle} aria-expanded={open} aria-controls="legend-body">
		<span aria-hidden="true">{open ? '▾' : '▸'}</span> Legend: {TITLES[mode]}
	</button>
	{#if open}
		<div class="lbody" id="legend-body">
			{#if mode === 'height'}
				<div class="ramp" style="background: linear-gradient(90deg, {HYPSO.join(', ')})" role="img" aria-label="Relief ramp from lowlands to peaks"></div>
				<div class="ends"><span>Lowland</span><span>Peaks</span></div>
			{:else if mode === 'population'}
				<div class="ramp" style="background: linear-gradient(90deg, rgba(192,57,43,0.08), rgba(192,57,43,0.85))" role="img" aria-label="Population ramp from sparse to dense"></div>
				<div class="ends"><span>Sparse</span><span>Dense</span></div>
			{:else if mode === 'economy' && !sim.sectors}
				<p class="more">Sectors are switched off for this world.</p>
			{:else if rows.length}
				<ul>
					{#each rows as r (r.label + r.color)}
						<li><span class="swatch" style="background:{r.color}"></span><span class="lab">{r.label}</span>{#if r.note}<span class="note">{r.note}</span>{/if}</li>
					{/each}
				</ul>
				{#if mode === 'political' && hiddenRealms > 0}<p class="more">and {hiddenRealms} smaller realms</p>{/if}
			{:else}
				<p class="more">Nothing to show on this layer.</p>
			{/if}
			{#if mode === 'political' || mode === 'culture' || mode === 'religion'}
				<div class="marks">
					<span><i class="mk"></i>Border</span>
					{#if mode === 'political'}<span><i class="mk war"></i>War front</span>{/if}
				</div>
			{/if}
			{#if overlayRows.length}
				<ul class="ovl" aria-label="Map layers">
					{#each overlayRows as o (o.key)}
						<li>{#if o.glyph}<span class="gl" style="color:{o.color}">{o.glyph}</span>{:else}<i class="mk" class:dash={o.dash} style="color:{o.color}"></i>{/if}<span class="lab">{o.label}</span></li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.legend { position: absolute; left: 0.6rem; bottom: 0.7rem; z-index: 2; max-width: min(15rem, calc(50% - 1rem)); background: var(--panel); color: var(--panel-ink); border: 1px solid var(--line); border-radius: 10px; backdrop-filter: blur(6px); }
	.lhead { width: 100%; text-align: left; border: 0; font-family: var(--title); font-size: 0.8rem; min-height: 40px; padding: 0.3rem 0.65rem; white-space: nowrap; }
	.lbody { padding: 0 0.65rem 0.55rem; max-height: 40dvh; overflow-y: auto; scrollbar-width: thin; }
	ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.15rem; }
	li { display: flex; align-items: baseline; gap: 0.35rem; font-size: 0.85rem; line-height: 1.25; min-width: 0; }
	.lab { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.note { color: var(--muted); font-size: 0.74rem; margin-left: auto; padding-left: 0.3rem; white-space: nowrap; }
	.ramp { height: 0.8rem; border-radius: 4px; border: 1px solid var(--line); margin-top: 0.15rem; min-width: 10rem; }
	.ends { display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--muted); margin-top: 0.15rem; }
	.more { margin: 0.25rem 0 0; font-size: 0.78rem; color: var(--muted); }
	.marks { display: flex; gap: 0.8rem; margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px dotted var(--line); font-size: 0.78rem; color: var(--muted); }
	.mk { display: inline-block; width: 1.1rem; height: 0; margin-right: 0.3rem; vertical-align: middle; border-top: 2px solid currentColor; }
	.mk.war { border-top: 2px dashed var(--danger); }
	.mk.dash { border-top-style: dashed; }
	.ovl { margin-top: 0.4rem; padding-top: 0.35rem; border-top: 1px dotted var(--line); }
	.gl { display: inline-block; width: 1.1rem; text-align: center; margin-right: 0.3rem; }
	@media (max-width: 760px) {
		.legend { bottom: 6.6rem; max-width: calc(100% - 1.2rem); }
		.lbody { max-height: 30dvh; }
	}
</style>
