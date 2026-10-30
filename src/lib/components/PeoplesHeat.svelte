<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import { peoplesView, sentimentOn, type MatrixView } from '#lib/sim/sentiment';

	let { sim, v }: { sim: Simulation; v: number } = $props();

	let open = $state(false);
	let axis = $state<'species' | 'cultures'>('species');

	const on = $derived.by(() => {
		void v;
		return sentimentOn(sim);
	});
	const view = $derived.by(() => {
		void v;
		return open && on ? peoplesView(sim) : null;
	});
	const mat = $derived<MatrixView | null>(view ? view[axis] : null);

	/** cold = red, warm = green, neutral = transparent; colour is never the only cue (the number is printed) */
	const tint = (n: number) => (n === 0 ? 'transparent' : n < 0 ? `rgba(200,70,60,${Math.min(0.75, Math.abs(n) / 100 + 0.1)})` : `rgba(80,170,100,${Math.min(0.75, n / 100 + 0.1)})`);
</script>

{#if on}
	<section>
		<details bind:open>
			<summary><h3 class="inline">Peoples and grudges</h3></summary>
			{#if view && mat}
				<div class="row tabs">
					<button class="chip" class:on={axis === 'species'} onclick={() => (axis = 'species')}>Species</button>
					<button class="chip" class:on={axis === 'cultures'} onclick={() => (axis = 'cultures')}>Cultures</button>
				</div>
				{#if mat.ids.length < 2}
					<p class="small muted">Only one people here so far.</p>
				{:else}
					<div class="scroll">
						<table class="heat" aria-label="How the row people feel about the column people">
							<thead>
								<tr>
									<th scope="col"><span class="sr">from / toward</span></th>
									{#each mat.ids as id, j (id)}<th scope="col" title={mat.names[j]}>{mat.icons[j] || mat.names[j].slice(0, 3)}</th>{/each}
								</tr>
							</thead>
							<tbody>
								{#each mat.ids as id, i (id)}
									<tr>
										<th scope="row" title={mat.names[i]}>{mat.icons[i]} {mat.names[i]}</th>
										{#each mat.ids as other, j (other)}
											<td style="background:{i === j ? 'transparent' : tint(mat.cells[i][j])}" title="{mat.names[i]} toward {mat.names[j]}: {mat.cells[i][j]}">{i === j ? '·' : mat.cells[i][j]}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
				{#if view.feuds.length}
					<h4>Feuds</h4>
					<ul class="list small">
						{#each view.feuds as f (f.name + f.since)}
							<li>{f.name} <span class="muted">· since {f.since}{f.ended ? `, cooled ${f.ended}` : ''}</span></li>
						{/each}
					</ul>
				{/if}
				{#if view.top.length}
					<h4>Deepest grievances</h4>
					<ul class="list small">
						{#each view.top as t (t.label + t.kind)}
							<li>{t.label} <span class="muted">· {t.kind} · {t.value}</span></li>
						{/each}
					</ul>
				{:else}
					<p class="small muted">No deep grievances yet.</p>
				{/if}
			{/if}
		</details>
	</section>
{/if}

<style>
	summary { cursor: pointer; }
	.inline { display: inline; }
	.tabs { gap: 0.3rem; margin: 0.3rem 0; }
	.scroll { overflow-x: auto; }
	.heat { border-collapse: collapse; font-size: 0.74rem; }
	.heat th, .heat td { padding: 0.15rem 0.3rem; text-align: center; border: 1px solid var(--line, rgba(255,255,255,0.12)); white-space: nowrap; }
	.heat th[scope='row'] { text-align: left; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
	h4 { font-size: 0.85rem; margin: 0.5rem 0 0.2rem; }
	.small { font-size: 0.82rem; margin: 0.2rem 0; }
</style>
