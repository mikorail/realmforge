<script lang="ts">
	import '@fontsource/cinzel/latin-500.css';
	import '@fontsource/cinzel/latin-600.css';
	import '@fontsource/eb-garamond/latin-400.css';
	import '@fontsource/eb-garamond/latin-600.css';
	import '@fontsource/orbitron/latin-500.css';
	import '@fontsource/orbitron/latin-700.css';
	import '@fontsource/share-tech-mono/latin-400.css';
	import '../app.css';
	import PwaBar from '#lib/components/PwaBar.svelte';
	let { children } = $props();

	// Skip-to-map: jump straight to the map canvas (in game) or the setup form (before a world exists).
	function skip(e: MouseEvent) {
		e.preventDefault();
		const el = document.querySelector<HTMLElement>('canvas[aria-label^="World map"]') ?? document.querySelector<HTMLElement>('.setup');
		if (!el) return;
		if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
		el.focus();
	}
</script>

<a class="skip-link" href="#map" onclick={skip}>Skip to map</a>
{@render children()}
<PwaBar />
