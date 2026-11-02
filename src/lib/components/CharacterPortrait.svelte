<script lang="ts">
	import type { Person } from '#lib/sim/types';
	import { drawCharacterPortrait, describeProceduralAppearance } from '#lib/render/proc_assets';

	let {
		person,
		size = 44,
		realmColor,
		worldSeed = 1,
		v = 0
	}: {
		person: Person;
		size?: number;
		realmColor?: string;
		worldSeed?: number | string;
		v?: number;
	} = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	const look = $derived.by(() => {
		void v;
		return describeProceduralAppearance(person, worldSeed);
	});

	$effect(() => {
		void v;
		if (!canvas || !person) return;
		const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
		canvas.width = Math.round(size * dpr);
		canvas.height = Math.round(size * dpr);
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, size, size);
		drawCharacterPortrait(ctx, person, 0, 0, size, realmColor, worldSeed);
	});
</script>

<canvas
	bind:this={canvas}
	class="portrait"
	style="width: {size}px; height: {size}px;"
	title={look.summary}
	aria-label={`Portrait of ${person.name}: ${look.summary}`}
></canvas>

<style>
	.portrait {
		display: block;
		flex-shrink: 0;
		border-radius: 16%;
	}
</style>
