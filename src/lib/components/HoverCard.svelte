<script lang="ts">
	import { BIOMES } from '#lib/gen/physical';
	import type { World } from '#lib/gen/types';
	import type { Simulation } from '#lib/sim/engine';
	import { IDEOLOGIES } from '#lib/sim/politics';
	import { motiveInfo } from '#lib/sim/motives';
	import HeraldryBadge from './HeraldryBadge.svelte';
	import { getRealmCoatOfArms, getBurgCoatOfArms } from '#lib/render/heraldry';

	let { sim, world, layer, cell, x, y, v }: { sim: Simulation; world: World; layer: number; cell: number; x: number; y: number; v: number } = $props();

	const info = $derived.by(() => {
		void v;
		const L = world.layers[layer];
		const c = world.cells;
		const open = !!L.open[cell];
		const water = L.kind === 'surface' && c.h[cell] < 20;
		const st = open ? sim.polities[L.state[cell]] : undefined;
		const realm = st && st.id && st.alive ? st : null;
		const burgId = sim.lb[layer]?.[cell];
		const burg = burgId ? world.burgs[burgId] : null;
		const wars = realm
			? sim.warsOf(realm.id).map((w) => (w.attackers.includes(realm.id) ? w.defenders : w.attackers).map((id) => sim.polities[id]?.name).filter(Boolean).join(', '))
			: [];
		return {
			realm,
			burg: burg && burg.alive ? burg : null,
			ruler: realm ? sim.ruler(realm) : undefined,
			motive: realm ? motiveInfo(sim, sim.ruler(realm)) : null,
			ideology: realm?.ideology ? IDEOLOGIES[realm.ideology]?.name ?? realm.ideology : '',
			wars,
			overlord: realm?.overlord ? sim.polities[realm.overlord] : undefined,
			culture: open && c.culture[cell] ? world.cultures[c.culture[cell]] : null,
			faith: open && c.religion[cell] ? world.religions[c.religion[cell]] : null,
			water,
			rock: !open && L.kind !== 'surface',
			terrain: !water && open ? BIOMES[c.biome[cell]]?.name ?? '' : ''
		};
	});

	const left = $derived(typeof window !== 'undefined' && x + 14 + 250 > window.innerWidth ? Math.max(4, x - 264) : x + 14);
	const top = $derived(typeof window !== 'undefined' && y + 14 + 210 > window.innerHeight - 60 ? Math.max(4, y - 200) : y + 14);
</script>

<div class="tip" style="left:{left}px; top:{top}px" role="tooltip">
	{#key v}
		{#if info.realm}
			<div class="title" style="display: flex; align-items: center; gap: 6px;">
				<HeraldryBadge coa={getRealmCoatOfArms(sim.w.opts.seed, info.realm)} size={20} showBlazonTooltip={false} />
				<span class="swatch" style="background:{info.realm.color}"></span>
				<strong>{info.realm.name}</strong>
			</div>
			<div class="sub">{info.realm.form}{info.ideology ? ` · ${info.ideology}` : ''}</div>
			<dl>
				{#if info.ruler}<dt>Ruler</dt><dd>{info.ruler.name}{info.ruler.house ? ` of ${info.ruler.house}` : ''}</dd>{/if}
				{#if info.motive}<dt>Motive</dt><dd title={info.motive.blurb}>{info.motive.icon} {info.motive.name}{info.motive.status === 'active' ? '' : info.motive.status === 'done' ? ' (fulfilled)' : ' (abandoned)'}</dd>{/if}
				{#if info.overlord}<dt>Overlord</dt><dd>{info.overlord.name}</dd>{/if}
				{#if info.wars.length}<dt class="war">At war</dt><dd class="war">{info.wars.join('; ')}</dd>{/if}
			</dl>
		{:else}
			<div class="title muted">{info.water ? 'Open water' : info.rock ? 'Solid rock' : 'Unclaimed land'}</div>
		{/if}
		<dl>
			{#if info.culture}<dt>Culture</dt><dd>{info.culture.name}</dd>{/if}
			{#if info.faith}<dt>Faith</dt><dd>{info.faith.name}</dd>{/if}
			{#if info.burg}<dt>Place</dt><dd style="display: flex; align-items: center; gap: 4px;"><HeraldryBadge coa={getBurgCoatOfArms(sim.w.opts.seed, info.burg, info.realm ?? undefined)} size={16} showBlazonTooltip={false} /> {info.burg.name}, {info.burg.capital ? 'capital ' : ''}{info.burg.kind}</dd>{/if}
			{#if info.terrain}<dt>Terrain</dt><dd>{info.terrain}</dd>{/if}
		</dl>
	{/key}
</div>

<style>
	.tip { position: absolute; pointer-events: none; background: var(--panel); color: var(--panel-ink); border: 1px solid var(--line); padding: 0.4rem 0.6rem; border-radius: 8px; font-size: 0.88rem; z-index: 5; width: max-content; max-width: 250px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3); }
	.title { font-family: var(--title); font-size: 0.92rem; }
	.sub { color: var(--muted); font-size: 0.8rem; margin-bottom: 0.15rem; }
	dl { display: grid; grid-template-columns: auto 1fr; gap: 0.05rem 0.6rem; margin: 0.15rem 0 0; }
	dl:empty { display: none; }
	dt { color: var(--muted); font-size: 0.8rem; }
	dd { margin: 0; overflow-wrap: anywhere; }
	.war { color: var(--danger); }
</style>
