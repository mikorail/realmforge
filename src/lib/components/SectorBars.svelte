<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import { burgMix, realmMix, SECTOR_INFO, SECTORS, specialities } from '#lib/sim/sectors';

	/** sector mix of a realm (stacked bar + specialities) or one town (one line) */
	let { sim, v, realm = 0, burg = 0 }: { sim: Simulation; v: number; realm?: number; burg?: number } = $props();

	const mix = $derived.by(() => {
		void v;
		const m = realm ? realmMix(sim, realm) : burgMix(sim, burg);
		if (!m) return null;
		return m.map((share, i) => ({ key: SECTORS[i], share, ...SECTOR_INFO[SECTORS[i]] })).sort((a, b) => b.share - a.share);
	});
	const special = $derived.by(() => {
		void v;
		return realm ? specialities(sim, realm).map((k) => `${SECTOR_INFO[k].icon} ${SECTOR_INFO[k].name}`) : [];
	});
	const pct = (x: number) => `${Math.round(x * 100)}%`;
</script>

{#if mix}
	{#if realm}
		<div class="sectors">
			<div class="bar" role="img" aria-label={'Economy: ' + mix.map((s) => `${s.name} ${pct(s.share)}`).join(', ')}>
				{#each mix as s (s.key)}
					<span style="width:{s.share * 100}%; background:{s.color}" title="{s.icon} {s.name} {pct(s.share)}"></span>
				{/each}
			</div>
			<div class="keys small">
				{#each mix.slice(0, 4) as s (s.key)}
					<span><i style="background:{s.color}"></i>{s.icon} {s.name} {pct(s.share)}</span>
				{/each}
			</div>
			<div class="stat small"><span>Specialities</span><span>{special.length ? special.join(' · ') : 'none above the world mean'}</span></div>
		</div>
	{:else}
		<div class="stat small"><span>Economy</span><span>{mix.slice(0, 3).map((s) => `${s.icon} ${s.name} ${pct(s.share)}`).join(' · ')}</span></div>
	{/if}
{/if}

<style>
	.sectors { margin: 0.4rem 0; }
	.bar { display: flex; height: 0.7rem; border-radius: 4px; overflow: hidden; border: 1px solid var(--line); }
	.bar span { display: block; height: 100%; }
	.keys { display: flex; flex-wrap: wrap; gap: 0.15rem 0.6rem; margin: 0.2rem 0; color: var(--muted); }
	.keys i { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 2px; margin-right: 0.25rem; vertical-align: middle; }
</style>
