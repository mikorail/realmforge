<script lang="ts">
	export interface TabDef { id: string; icon: string; label: string }

	let { tabs, active = $bindable(), viewMode = $bindable() }: { tabs: TabDef[]; active: string; viewMode: 'tabs' | 'all' } = $props();

	let list: HTMLDivElement | undefined;

	function onkey(e: KeyboardEvent) {
		const i = tabs.findIndex((t) => t.id === active);
		let n = i;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
		else if (e.key === 'Home') n = 0;
		else if (e.key === 'End') n = tabs.length - 1;
		else return;
		e.preventDefault();
		active = tabs[n].id;
		queueMicrotask(() => list?.querySelector<HTMLElement>(`#tab-${active}`)?.focus());
	}
</script>

<div class="setup-tabs" role="tablist" aria-label="Configuration sections" bind:this={list}>
	{#each tabs as t (t.id)}
		<button
			type="button"
			class="tab-btn"
			class:active={active === t.id}
			id="tab-{t.id}"
			role="tab"
			aria-selected={active === t.id}
			aria-controls="setup-panel"
			tabindex={active === t.id ? 0 : -1}
			onclick={() => (active = t.id)}
			onkeydown={onkey}
		>
			<span class="tab-icon" aria-hidden="true">{t.icon}</span>
			<span class="tab-text">{t.label}</span>
		</button>
	{/each}
	<button
		type="button"
		class="tab-btn view-toggle"
		class:active={viewMode === 'all'}
		aria-pressed={viewMode === 'all'}
		onclick={() => (viewMode = viewMode === 'all' ? 'tabs' : 'all')}
		title={viewMode === 'all' ? 'Switch to focused tabbed view' : 'Switch to full studio view'}
	>
		<span class="tab-icon" aria-hidden="true">{viewMode === 'all' ? '📑' : '📖'}</span>
		<span class="tab-text">{viewMode === 'all' ? 'Focus View' : 'Studio View'}</span>
	</button>
</div>
