<script lang="ts">
	import { GENRES, type Genre } from '#lib/gen/genre';
	import { groupSaves, parseSlot, type SaveMeta } from '#lib/save';

	let {
		saves,
		note = '',
		onload,
		ondelete,
		onrename,
		onexport,
		onimport
	}: {
		saves: SaveMeta[];
		note?: string;
		onload: (slot: string) => void;
		ondelete: (slot: string) => void;
		onrename: (slot: string, label: string) => void;
		onexport: (slot: string) => void;
		onimport: (file: File) => void;
	} = $props();

	const groups = $derived(groupSaves(saves));
	let editing = $state<string | null>(null);
	let draft = $state('');
	let picker: HTMLInputElement | undefined;

	const title = (sv: SaveMeta) => {
		if (sv.label) return sv.label;
		const p = parseSlot(sv.slot);
		return p.kind === 'manual' ? `Save ${p.n}` : p.kind === 'auto' ? `Autosave ${p.n}` : p.kind === 'quick' ? 'Quicksave' : 'Saved chronicle';
	};
	const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

	function startRename(sv: SaveMeta) {
		editing = sv.slot;
		draft = sv.label ?? '';
	}
	function commit(slot: string) {
		onrename(slot, draft);
		editing = null;
	}
	function picked(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		input.value = '';
		if (f) onimport(f);
	}
</script>

<section class="panel-card saves-sec">
	<div class="panel-header">
		<h2>📜 Saved Chronicles</h2>
		<span class="panel-sub">Resume, rename, export or remove saves, grouped by world</span>
	</div>

	<div class="saves-tools">
		<button type="button" class="btn small" onclick={() => picker?.click()}>Import .rfsave…</button>
		<input bind:this={picker} type="file" accept=".rfsave" class="saves-file" aria-label="Import a .rfsave file" onchange={picked} />
	</div>
	{#if note}<p class="saves-note small" role="status">{note}</p>{/if}

	{#if groups.length}
		{#each groups as g (g.seed)}
			<div class="save-group">
				<h3 class="save-group-title">{g.name} <span class="muted small">seed {g.seed}</span></h3>
				<ul class="saves-list">
					{#each g.saves as sv (sv.slot)}
						{@const t = title(sv)}
						<li class="save-item">
							<div class="save-info">
								{#if editing === sv.slot}
									<form class="save-rename" onsubmit={(e) => { e.preventDefault(); commit(sv.slot); }}>
										<input class="save-input" aria-label="Name for {t}" maxlength="80" bind:value={draft} placeholder="Save name" onkeydown={(e) => e.key === 'Escape' && (editing = null)} />
										<button type="submit" class="btn small primary">Save name</button>
										<button type="button" class="btn small" onclick={() => (editing = null)}>Cancel</button>
									</form>
								{:else}
									<strong>{t}</strong>
								{/if}
								<span class="save-meta">Year {sv.year} · {GENRES[sv.genre as Genre]?.name ?? sv.genre}{sv.planets > 1 ? ` · ${sv.planets} planets` : ''} · saved {when(sv.saved)}</span>
							</div>
							<div class="save-actions">
								<button type="button" class="btn primary small" aria-label="Resume {t}, year {sv.year}" onclick={() => onload(sv.slot)}>Resume</button>
								<button type="button" class="btn small" aria-label="Rename {t}" onclick={() => startRename(sv)}>Rename</button>
								<button type="button" class="btn small" aria-label="Export {t} as a .rfsave file" onclick={() => onexport(sv.slot)}>Export</button>
								<button type="button" class="btn small danger" aria-label="Delete {t}, year {sv.year}" onclick={() => ondelete(sv.slot)}>✕</button>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{:else}
		<p class="muted small">No saved chronicles found yet. Generate a world and click Save in the top bar to record history, or import a .rfsave file.</p>
	{/if}
</section>

<style>
	.saves-file {
		display: none;
	}
	.saves-tools {
		margin-bottom: 0.5rem;
	}
	.saves-note {
		margin: 0 0 0.6rem;
	}
	.save-group {
		margin-bottom: 1rem;
	}
	.save-group-title {
		margin: 0 0 0.4rem;
		font-size: 1rem;
	}
	.save-rename {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		align-items: center;
	}
	.save-input {
		min-width: 12rem;
		padding: 0.3rem 0.5rem;
		background: rgba(0, 0, 0, 0.35);
		color: inherit;
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	.save-input:focus-visible,
	.btn:focus-visible {
		outline: 2px solid var(--accent, #d9b36a);
		outline-offset: 2px;
	}
</style>
