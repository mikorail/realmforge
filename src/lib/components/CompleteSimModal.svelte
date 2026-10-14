<script lang="ts">
	import { downloadFile } from '#lib/export';
	import type { Cosmos } from '#lib/sim/cosmos';
	import { compileAnnalsBookMarkdown } from '#lib/sim/chronicle';

	let {
		cosmos,
		pi,
		onclose,
		onsay,
		onsave,
		onopenscrubber,
		onrefresh
	}: {
		cosmos: Cosmos;
		pi: number;
		onclose: () => void;
		onsay: (text: string) => void;
		onsave: () => Promise<void>;
		onopenscrubber: () => void;
		onrefresh: () => void;
	} = $props();

	const world = $derived(cosmos.u.planets[pi]);
	const sim = $derived(cosmos.sims[pi]);

	let targetYears = $state(100);
	let autoSave = $state(true);
	let running = $state(false);
	let done = $state(false);
	let stoppedEarly = $state(false);

	let startYear = $state(0);
	let currentSimYear = $state(0);
	let targetYear = $state(0);

	$effect(() => {
		if (!running && !done) {
			startYear = cosmos.year;
			currentSimYear = cosmos.year;
			targetYear = cosmos.year + targetYears;
		}
	});

	let annalsCount = $state(0);
	let snapshotsCount = $state(0);
	let uprisingsCount = $state(0);
	let warsCount = $state(0);

	let shouldStop = false;

	const progressPct = $derived.by(() => {
		const total = targetYear - startYear;
		if (total <= 0) return 100;
		const doneYears = currentSimYear - startYear;
		return Math.min(100, Math.max(0, Math.round((doneYears / total) * 100)));
	});

	function stop() {
		shouldStop = true;
		stoppedEarly = true;
	}

	async function runCompleteSim() {
		running = true;
		done = false;
		stoppedEarly = false;
		shouldStop = false;

		startYear = cosmos.year;
		currentSimYear = cosmos.year;
		targetYear = startYear + targetYears;

		const stepBatch = async () => {
			if (shouldStop || cosmos.year >= targetYear) {
				running = false;
				done = true;
				onrefresh();
				annalsCount = sim.allEvents.length || sim.events.length;
				snapshotsCount = sim.historySnapshots.length;
				uprisingsCount = sim.uprisings.length;
				warsCount = sim.wars.length;

				if (autoSave) {
					try {
						await onsave();
					} catch {
						// save error handled by onsave
					}
				}
				onsay(`Complete Sim finished at Year ${cosmos.year}. Preserved ${annalsCount} annals entries.`);
				return;
			}

			// Advance 1 year (12 monthly ticks) per frame
			for (let m = 0; m < 12; m++) {
				cosmos.tick();
			}
			currentSimYear = cosmos.year;
			onrefresh();

			requestAnimationFrame(stepBatch);
		};

		requestAnimationFrame(stepBatch);
	}

	function downloadAnnals() {
		const evList = sim.allEvents && sim.allEvents.length ? sim.allEvents : sim.events;
		const md = compileAnnalsBookMarkdown(evList, world.name, 1000);
		downloadFile(md, `${world.name.toLowerCase().replace(/\s+/g, '-')}-complete-annals.md`, 'text/markdown');
		onsay('Complete historical annals book downloaded.');
	}

	function scrubTimeline() {
		onopenscrubber();
		onclose();
	}
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="complete-sim-title">
	<div class="modal">
		<header class="mhead">
			<div>
				<h2 id="complete-sim-title">Complete Chronicle Simulation</h2>
				<p class="muted small">{world.name} · Year {cosmos.year} · Comprehensive History Mode</p>
			</div>
			<button class="btn icon" onclick={onclose} aria-label="Close dialog" disabled={running}>✕</button>
		</header>

		{#if !running && !done}
			<div class="setup-section">
				<p class="small intro">
					Fast-forward world history across decades or centuries in a single continuous pass.
					Every single event, dynastic shift, wonder, uprising, and border change is preserved
					into the permanent annals and timeline archive from Year 1 to the end without truncation.
				</p>

				<div class="options-box">
					<label class="section-label" for="sim-years-select">Simulation Duration</label>
					<div class="row presets">
						{#each [25, 50, 100, 200, 500] as yr}
							<button
								class="btn chip"
								class:on={targetYears === yr}
								onclick={() => (targetYears = yr)}
							>
								{yr} Years
							</button>
						{/each}
					</div>

					<div class="toggle-row">
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={autoSave} />
							<span>Auto-save to IndexedDB chronicle upon completion</span>
						</label>
					</div>
				</div>

				<div class="info-card">
					<div class="stat"><span>Current Year</span><strong>Year {cosmos.year}</strong></div>
					<div class="stat"><span>Target Destination</span><strong>Year {cosmos.year + targetYears}</strong></div>
					<div class="stat"><span>Active Realms</span><span>{sim.polities.filter((p) => p.alive && p.id).length} realms</span></div>
					<div class="stat"><span>Archive Guarantee</span><span class="gold-text">All annals & timeline snapshots preserved</span></div>
				</div>

				<div class="actions">
					<button class="btn primary big" onclick={runCompleteSim}>
						⚡ Start Complete Sim ({targetYears} Years)
					</button>
					<button class="btn" onclick={onclose}>Cancel</button>
				</div>
			</div>
		{:else if running}
			<div class="running-section">
				<div class="progress-wrap">
					<div class="row between progress-head">
						<strong>Simulating History: Year {currentSimYear} / {targetYear}</strong>
						<span class="pct">{progressPct}%</span>
					</div>
					<div class="bar-track">
						<div class="bar-fill" style="width: {progressPct}%"></div>
					</div>
				</div>

				<div class="live-stats grid2">
					<div class="card stat-card">
						<span class="muted small">Chronicle Events</span>
						<strong>{sim.allEvents.length}</strong>
					</div>
					<div class="card stat-card">
						<span class="muted small">Timeline Snapshots</span>
						<strong>{sim.historySnapshots.length}</strong>
					</div>
					<div class="card stat-card">
						<span class="muted small">Active Realms</span>
						<strong>{sim.polities.filter((p) => p.alive && p.id).length}</strong>
					</div>
					<div class="card stat-card">
						<span class="muted small">Active Wars</span>
						<strong>{sim.wars.filter((w) => !w.end).length}</strong>
					</div>
				</div>

				<div class="actions">
					<button class="btn warn" onclick={stop}>Halt Simulation Early</button>
				</div>
			</div>
		{:else if done}
			<div class="done-section">
				<div class="banner">
					<span class="banner-ico">🏆</span>
					<div>
						<h3>Simulation Completed</h3>
						<p class="muted small">
							{stoppedEarly ? `Halted early at Year ${cosmos.year}` : `Simulated forward from Year ${startYear} to Year ${cosmos.year}`}
						</p>
					</div>
				</div>

				<div class="grid4 results-grid">
					<div class="card stat-card">
						<span class="muted small">Total Annals</span>
						<strong class="gold-text">{annalsCount}</strong>
					</div>
					<div class="card stat-card">
						<span class="muted small">Snapshots</span>
						<strong class="accent-text">{snapshotsCount}</strong>
					</div>
					<div class="card stat-card">
						<span class="muted small">Wars Fought</span>
						<strong>{warsCount}</strong>
					</div>
					<div class="card stat-card">
						<span class="muted small">Uprisings</span>
						<strong>{uprisingsCount}</strong>
					</div>
				</div>

				<p class="small note-box">
					All historical records and map snapshots from Year 1 to Year {cosmos.year} have been stored.
					You can now scrub backwards through past borders, download the complete Markdown chronicle book,
					or continue playing in real-time.
				</p>

				<div class="actions done-actions">
					<button class="btn primary" onclick={downloadAnnals}>
						📜 Download Complete Annals (MD)
					</button>
					<button class="btn" onclick={scrubTimeline}>
						🗺️ Scrub Timeline
					</button>
					<button class="btn" onclick={onsave}>
						💾 Save Chronicle
					</button>
					<button class="btn" onclick={onclose}>Done</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(8, 6, 4, 0.78);
		backdrop-filter: blur(4px);
		z-index: 120;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.modal {
		background: var(--vellum);
		border: 1px solid var(--line);
		border-radius: 12px;
		max-width: 620px;
		width: 100%;
		padding: 1.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}
	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.75rem;
	}
	.mhead h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--accent);
	}
	.intro {
		line-height: 1.45;
		color: var(--muted);
		margin-bottom: 0.8rem;
	}
	.options-box {
		background: color-mix(in srgb, var(--panel) 92%, black);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.section-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	.presets {
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.presets .chip {
		cursor: pointer;
		font-size: 0.8rem;
	}
	.toggle-row {
		margin-top: 0.2rem;
	}
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.82rem;
		cursor: pointer;
		color: var(--ink);
	}
	.info-card {
		background: color-mix(in srgb, var(--panel) 94%, black);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.7rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.7rem;
	}
	.stat {
		display: flex;
		justify-content: space-between;
		font-size: 0.84rem;
	}
	.gold-text {
		color: #e5a93b;
		font-weight: 600;
	}
	.accent-text {
		color: var(--accent);
		font-weight: 600;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.btn.big {
		font-size: 0.95rem;
		padding: 0.55rem 1.1rem;
		font-weight: 600;
	}

	/* Running progress */
	.running-section {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		padding: 0.5rem 0;
	}
	.progress-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.progress-head {
		font-size: 0.9rem;
	}
	.pct {
		font-variant-numeric: tabular-nums;
		color: var(--accent);
		font-weight: 600;
	}
	.bar-track {
		height: 12px;
		background: color-mix(in srgb, var(--line) 40%, transparent);
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--line);
	}
	.bar-fill {
		height: 100%;
		background: var(--accent);
		transition: width 0.1s linear;
	}
	.stat-card {
		padding: 0.6rem 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		text-align: center;
	}
	.stat-card strong {
		font-size: 1.2rem;
		font-variant-numeric: tabular-nums;
	}

	/* Done Section */
	.done-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.banner {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 1px solid var(--accent);
		border-radius: 8px;
		padding: 0.8rem 1rem;
	}
	.banner-ico {
		font-size: 1.8rem;
	}
	.banner h3 {
		margin: 0;
		font-size: 1.1rem;
	}
	.results-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.note-box {
		background: color-mix(in srgb, var(--panel) 92%, black);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.6rem 0.8rem;
		line-height: 1.4;
		color: var(--muted);
		margin: 0;
	}
	.done-actions {
		justify-content: flex-end;
	}
</style>
