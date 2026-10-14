<script lang="ts">
	import { BIOMES } from '#lib/gen/physical';
	import type { World } from '#lib/gen/types';
	import { HYPSO, type MapMode } from '#lib/render/renderer';
	import type { Simulation } from '#lib/sim/engine';

	let { sim, world, layer, mode, v, year }: { sim: Simulation; world: World; layer: number; mode: MapMode; v: number; year: number } = $props();

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
		political: 'Realms', biome: 'Biomes', height: 'Relief', culture: 'Cultures', religion: 'Faiths', population: 'Population'
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
	@media (max-width: 760px) {
		.legend { bottom: 6.6rem; max-width: calc(100% - 1.2rem); }
		.lbody { max-height: 30dvh; }
	}
</style>
