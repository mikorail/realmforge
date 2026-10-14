<script lang="ts">
	import { CLIMATE_PRESETS, DEFAULT_WINDS, kmPerPx, latRange, lonRange } from '#lib/gen/options';
	import type { Climate } from '#lib/gen/types';
	import Globe from './Globe.svelte';

	/** Azgaar-style "Configure World": temperatures, latitude band, precipitation, winds. */
	let { climate = $bindable(), width = 1600, height = 1000, onchange }: { climate: Climate; width?: number; height?: number; onchange?: () => void } = $props();

	const set = (patch: Partial<Climate>) => {
		climate = { ...climate, ...patch };
		onchange?.();
	};
	const f = (c: number) => `${Math.round((c * 9) / 5 + 32)}°F`;
	const fmtLat = (l: number) => `${Math.abs(l).toFixed(0)}°${l >= 0 ? 'N' : 'S'}`;
	const fmtLon = (l: number) => `${Math.abs(l).toFixed(0)}°${l >= 0 ? 'E' : 'W'}`;
	const info = $derived.by(() => {
		const lr = latRange(climate), lo = lonRange(climate, width, height);
		const km = kmPerPx(climate, height);
		return { lr, lo, wKm: Math.round(width * km), hKm: Math.round(height * km), pct: Math.round(climate.mapSize) };
	});
	const SLIDERS: [keyof Climate, string, number, number, (v: number) => string][] = [
		['tEq', 'Equator', -20, 50, (v) => `${v}°C = ${f(v)}`],
		['tN', 'North pole', -60, 30, (v) => `${v}°C = ${f(v)}`],
		['tS', 'South pole', -60, 30, (v) => `${v}°C = ${f(v)}`],
		['mapSize', 'Map size', 5, 100, (v) => `${v}% of the globe`],
		['latitude', 'Latitudes', 0, 100, () => `N ↔ S`],
		['longitude', 'Longitudes', 0, 100, () => `W ↔ E`],
		['prec', 'Precipitation', 0, 300, (v) => `${v}%`]
	];
</script>

<div class="climate">
	<div class="sliders">
		{#each SLIDERS as [key, label, min, max, fmt] (key)}
			<label>
				<span class="lab">{label} <span class="muted">{fmt(climate[key] as number)}</span></span>
				<input type="range" {min} {max} step="1" value={climate[key] as number} oninput={(e) => set({ [key]: +(e.currentTarget as HTMLInputElement).value })} />
			</label>
		{/each}
		<div class="facts small">
			<div>Map: {width}×{height} px ≈ {info.wKm.toLocaleString()}×{info.hKm.toLocaleString()} km</div>
			<div>Spans {fmtLat(info.lr.top)} → {fmtLat(info.lr.bottom)}, {fmtLon(info.lo.left)} → {fmtLon(info.lo.right)}</div>
		</div>
		<div class="row presets">
			<span class="muted small">Presets</span>
			{#each Object.entries(CLIMATE_PRESETS) as [name, p] (name)}
				<button class="btn" onclick={() => set(p)}>{name}</button>
			{/each}
		</div>
	</div>
	<div class="side">
		<Globe {climate} {width} {height} onwind={(b, d) => set({ winds: climate.winds.map((w, i) => (i === b ? (w + d + 360) % 360 : w)) })} />
		<button class="btn small" onclick={() => set({ winds: [...DEFAULT_WINDS] })}>Restore winds</button>
	</div>
</div>

<style>
	.climate { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 1rem; align-items: start; }
	.sliders { display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; }
	.side { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin: 0 auto; max-width: 100%; }
	label { display: flex; flex-direction: column; gap: 0.15rem; }
	.lab { font-size: 0.88rem; display: flex; justify-content: space-between; gap: 0.5rem; }
	input[type='range'] { width: 100%; accent-color: var(--accent); }
	.small { font-size: 0.8rem; }
	.facts { color: var(--muted); line-height: 1.35; padding: 0.2rem 0; }
	.presets { gap: 0.35rem; margin-top: 0.2rem; }
	.presets .btn { font-size: 0.82rem; padding: 0.25rem 0.5rem; }
</style>
