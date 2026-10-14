<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import { cultureCard } from '#lib/sim/culture/card';

	let { sim, cultureId, onclose }: { sim: Simulation; cultureId: number; onclose: () => void } = $props();

	const card = $derived(cultureCard(sim, cultureId));
	const color = $derived(sim.w.cultures[cultureId]?.color ?? 'var(--accent)');

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if card}
	<div class="overlay" onclick={(e) => e.target === e.currentTarget && onclose()} onkeydown={(e) => e.key === 'Escape' && onclose()} role="presentation">
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="culture-title" tabindex="-1" style="--cc:{color}">
			<header class="mhead">
				<div>
					<h2 id="culture-title"><span class="swatch" style="background:{color}"></span>{card.name}</h2>
					<p class="muted small">Sphere of {card.sphere} · {card.type} people{card.realms.length ? ` · ${card.realms.join(', ')}` : ''}</p>
				</div>
				<button class="btn icon" onclick={onclose} aria-label="Close culture card">✕</button>
			</header>

			<dl class="facts">
				<dt>Food</dt><dd>{card.food}</dd>
				<dt>Dress</dt><dd>{card.dress}</dd>
				<dt>Architecture</dt><dd>{card.architecture}</dd>
				<dt>Music</dt><dd>{card.music}</dd>
				<dt>Values</dt><dd>{card.values.join(', ')}</dd>
			</dl>

			<h3>Ways of acting</h3>
			<ul class="traits">
				{#each card.traits as t (t.name)}
					<li><span class="ico">{t.icon}</span> <strong>{t.name}</strong> <span class="muted small">{t.blurb}</span></li>
				{/each}
			</ul>

			<h3>Holidays</h3>
			<ul class="plain">
				{#each card.holidays as h (h.name)}
					<li>{h.name} <span class="muted small">· {h.month}</span></li>
				{/each}
			</ul>

			{#if card.lingua.length}
				<h3>Lingua franca</h3>
				<ul class="plain">
					{#each card.lingua as l (l)}<li class="small">{l}</li>{/each}
				</ul>
			{/if}
			{#if card.movements.length}
				<h3>Art movements</h3>
				<ul class="plain">
					{#each card.movements as m (m)}<li class="small">{m}</li>{/each}
				</ul>
			{/if}

			<footer class="mfoot"><button class="btn" onclick={onclose}>Close</button></footer>
		</div>
	</div>
{/if}

<style>
	.overlay { position: fixed; inset: 0; background: rgba(8, 6, 4, 0.75); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
	.modal { background: var(--vellum); border: 1px solid var(--line); border-top: 4px solid var(--cc); border-radius: 12px; max-width: 520px; max-height: 88vh; width: 100%; padding: 1.2rem; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); overflow-y: auto; }
	.mhead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; border-bottom: 1px solid var(--line); padding-bottom: 0.6rem; }
	h2 { font-size: 1.25rem; margin: 0 0 0.2rem 0; }
	h3 { font-size: 0.95rem; margin: 0.9rem 0 0.35rem; }
	.small { font-size: 0.82rem; }
	.swatch { display: inline-block; width: 0.8em; height: 0.8em; border-radius: 50%; margin-right: 0.4em; }
	.facts { display: grid; grid-template-columns: max-content 1fr; gap: 0.3rem 0.8rem; margin: 0; }
	dt { color: var(--muted); font-size: 0.85rem; }
	dd { margin: 0; }
	.traits, .plain { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.mfoot { margin-top: 1rem; text-align: right; }
	@media (max-width: 480px) { .facts { grid-template-columns: 1fr; } dt { margin-top: 0.3rem; } }
</style>
