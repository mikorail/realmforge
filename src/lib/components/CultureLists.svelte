<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';

	let { sim, v, onfocus }: { sim: Simulation; v: number; onfocus: (c: number | undefined) => void } = $props();

	const moves = $derived.by(() => {
		void v;
		return sim.cx.movements.filter((m) => m.status === 'rising' || m.status === 'flourishing').slice(-5).reverse();
	});
	const orders = $derived.by(() => {
		void v;
		return sim.cx.orders.filter((o) => o.status === 'rising' || o.status === 'flourishing').slice(-5).reverse();
	});
	const lingua = $derived.by(() => {
		void v;
		return sim.cx.lingua.map((l) => ({ ...l, a: sim.w.burgs[l.a], b: sim.w.burgs[l.b], name: sim.w.cultures[l.culture]?.name ?? '' }));
	});
</script>

{#if moves.length || orders.length || lingua.length}
	<section>
		<h3>Arts, orders and tongues</h3>
		<ul class="list small">
			{#each moves as m (m.id)}
				<li><button class="link" onclick={() => onfocus(sim.w.burgs[sim.polities[m.homeRealm]?.capital]?.cell)}>🎨 {m.name} <span class="muted">· {m.realms.length} realm{m.realms.length === 1 ? '' : 's'} · since {m.founded}</span></button></li>
			{/each}
			{#each orders as o (o.id)}
				<li><button class="link" onclick={() => onfocus(sim.w.burgs[o.seat]?.cell)}>🕯 {o.name} <span class="muted">· {o.realms.length} realm{o.realms.length === 1 ? '' : 's'} · since {o.founded}</span></button></li>
			{/each}
			{#each lingua as l (l.a.id + ':' + l.b.id)}
				<li><button class="link" onclick={() => onfocus(l.a.cell)}>🗣 {l.name} tongue <span class="muted">· {l.a.name} to {l.b.name}</span></button></li>
			{/each}
		</ul>
	</section>
{/if}
