<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		DISTRICT_DEFINITIONS,
		districtCost,
		getBurgDistricts,
		getDistrictTierName,
		getBurgSiegeDefense,
		getBurgBeastDamageReduction,
		getBurgFamineMitigation,
		upgradeDistrict,
		appointBurgGovernor,
		stationGarrison,
		grantBurgCharter,
		type DistrictKind
	} from '#lib/sim/burgs';
	import { onMount } from 'svelte';
	import HeraldryBadge from './HeraldryBadge.svelte';
	import { getBurgCoatOfArms } from '#lib/render/heraldry';

	let {
		sim,
		burgId,
		onclose,
		onselectperson
	}: {
		sim: Simulation;
		burgId: number;
		onclose: () => void;
		onselectperson?: (id: number) => void;
	} = $props();

	let v = $state(0);
	let actionMsg = $state<{ type: 'ok' | 'err'; text: string } | null>(null);
	let showCourtPicker = $state(false);
	let closeBtn = $state<HTMLButtonElement>();

	onMount(() => closeBtn?.focus());

	const burg = $derived.by(() => {
		void v;
		return sim.w.burgs[burgId] ?? null;
	});

	const polity = $derived.by(() => {
		void v;
		return burg ? sim.polities[burg.state] : null;
	});

	const culture = $derived.by(() => {
		void v;
		return burg ? sim.w.cultures[burg.culture] : null;
	});

	const governor = $derived.by(() => {
		void v;
		return burg?.governor ? sim.people[burg.governor] : null;
	});

	const districts = $derived.by(() => {
		void v;
		return burg ? getBurgDistricts(burg) : null;
	});

	const eligibleCourtiers = $derived.by(() => {
		void v;
		if (!burg || !burg.state) return [];
		return sim.idx.inState(sim.people, burg.state).filter((p) => p.alive && p.role !== 'ruler');
	});

	const districtKinds: DistrictKind[] = ['walls', 'market', 'granary', 'temple', 'academy'];

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleUpgrade(kind: DistrictKind) {
		if (!burg) return;
		const res = upgradeDistrict(sim, burg.id, kind);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		v++;
	}

	function handleAppoint(personId: number) {
		if (!burg) return;
		const res = appointBurgGovernor(sim, burg.id, personId);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		showCourtPicker = false;
		v++;
	}

	function handleStationGarrison(pts: number) {
		if (!burg) return;
		const res = stationGarrison(sim, burg.id, pts);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		v++;
	}

	function handleGrantCharter() {
		if (!burg) return;
		const res = grantBurgCharter(sim, burg.id);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		v++;
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="overlay"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	role="presentation"
>
	<div class="modal scroll" role="dialog" aria-modal="true" aria-labelledby="burg-title" tabindex="-1">
		{#if !burg}
			<header class="mhead">
				<h2>Settlement Not Found</h2>
				<button class="btn icon" onclick={onclose} aria-label="Close dialog">✕</button>
			</header>
			<p class="muted">This settlement does not exist or has been destroyed.</p>
		{:else}
			<header class="mhead">
				<div>
					<div class="title-row" style="display: flex; align-items: center; gap: 8px;">
						<HeraldryBadge coa={getBurgCoatOfArms(sim.w.opts.seed, burg, polity ?? undefined)} size={32} />
						<h2 id="burg-title" style="margin: 0;">{burg.name}</h2>
						<span class="chip">{burg.kind}</span>
						{#if burg.capital}<span class="chip gold">Capital</span>{/if}
						{#if burg.port}<span class="chip">Port</span>{/if}
						{#if burg.charter}<span class="chip gold">Chartered</span>{/if}
					</div>
					<p class="muted small">
						{#if polity}
							<span class="swatch" style="background: {polity.color}"></span>
							<strong>{polity.fullName}</strong> ·
						{:else}
							<span>Independent Settlement</span> ·
						{/if}
						<span>{culture?.name ?? 'Unknown'} Culture</span> ·
						<span>Plane: {burg.layer}</span> ·
						<span>Population: {(burg.pop * 1000).toLocaleString()} souls</span>
						{#if polity}
							· <span class="gold-text">Treasury: {Math.floor(polity.treasury)}g</span>
						{/if}
					</p>
				</div>
				<button bind:this={closeBtn} class="btn icon" onclick={onclose} aria-label="Close settlement dialog">✕</button>
			</header>

			{#if actionMsg}
				<div class="banner" class:ok={actionMsg.type === 'ok'} class:err={actionMsg.type === 'err'}>
					<span>{actionMsg.text}</span>
					<button class="link tiny" onclick={() => (actionMsg = null)}>Dismiss</button>
				</div>
			{/if}

			<!-- Governor Section -->
			<section class="section">
				<div class="section-head">
					<h3>Burg Governor and Magistrate</h3>
					{#if !showCourtPicker}
						<button class="btn small" onclick={() => (showCourtPicker = true)}>
							{governor ? 'Replace Governor' : 'Appoint Governor'}
						</button>
					{/if}
				</div>

				{#if showCourtPicker}
					<div class="court-picker">
						<div class="court-picker-head">
							<strong>Appoint Governor from Realm Court</strong>
							<button class="link tiny" onclick={() => (showCourtPicker = false)}>Cancel</button>
						</div>
						{#if eligibleCourtiers.length === 0}
							<p class="small muted">No living court candidates available in this realm.</p>
						{:else}
							<div class="court-list scroll">
								{#each eligibleCourtiers as c (c.id)}
									<div class="court-row">
										<div>
											<strong>{c.name}</strong>
											<span class="small muted">
												({c.role}, Age {sim.ageOf(c)}) · Stewardship: {c.stewardship} · Martial: {c.martial}
											</span>
										</div>
										<button class="btn small primary" onclick={() => handleAppoint(c.id)}>
											Appoint
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if governor}
					<div class="gov-card">
						<div class="gov-info">
							<strong>{governor.name}</strong>
							<span class="small muted">
								House {governor.house || 'Commoner'} · {governor.role} (Age {sim.ageOf(governor)})
							</span>
							<div class="stats-row tiny muted">
								<span>Stewardship: {governor.stewardship}</span>
								<span>Martial: {governor.martial}</span>
								<span>Diplomacy: {governor.diplomacy}</span>
								<span>Intrigue: {governor.intrigue}</span>
							</div>
						</div>
						<div class="gov-actions">
							{#if onselectperson}
								<button class="btn small" onclick={() => onselectperson(governor.id)}>Inspect</button>
							{/if}
							<button class="btn small danger" onclick={() => handleAppoint(0)}>Dismiss</button>
						</div>
					</div>
				{:else}
					<p class="small muted">
						No governor currently appointed. Local aldermen and burghers oversee civil orders.
					</p>
				{/if}
			</section>

			<!-- Districts Grid -->
			<section class="section">
				<h3>Settlement Districts and Infrastructure</h3>
				<div class="districts-grid">
					{#each districtKinds as kind (kind)}
						{@const def = DISTRICT_DEFINITIONS[kind]}
						{@const curLevel = districts ? districts[kind] : 0}
						{@const curMeta = def.levels[curLevel] ?? def.levels[0]}
						{@const cost = districtCost(kind, curLevel)}
						{@const canAfford = polity ? polity.treasury >= cost : false}
						{@const isMax = curLevel >= 3}

						<div class="district-card" class:maxed={isMax}>
							<div class="d-head">
								<span class="d-icon">{def.icon}</span>
								<div class="d-title">
									<strong>{def.name}</strong>
									<span class="chip tiny" class:gold={curLevel > 0}>
										Tier {curLevel}/3: {curMeta.name}
									</span>
								</div>
							</div>

							<p class="d-desc small muted">{curMeta.desc}</p>
							<div class="d-effect tiny">
								<strong>Effect:</strong> {curMeta.effects}
							</div>

							<div class="d-action">
								{#if isMax}
									<span class="chip tiny max-chip">Maximum Tier</span>
								{:else}
									<button
										class="btn small primary"
										disabled={!canAfford}
										onclick={() => handleUpgrade(kind)}
									>
										Upgrade ({cost}g)
									</button>
									{#if !canAfford && polity}
										<span class="tiny muted needs-gold">Needs {cost - Math.floor(polity.treasury)}g</span>
									{/if}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Garrison & Municipal Charter -->
			<section class="section">
				<h3>Municipal Defense and Governance</h3>
				<div class="admin-grid">
					<!-- Garrison Card -->
					<div class="admin-card">
						<div class="admin-head">
							<strong>Defensive Garrison</strong>
							<span class="chip">{burg.garrison ?? 0} Cohorts</span>
						</div>
						<p class="small muted">
							Troops defending against foreign sieges, peasant mutinies, and titan incursions.
						</p>
						<div class="stats-row small">
							<span>Siege Defense: <strong>{getBurgSiegeDefense(burg)}x</strong></span>
							<span>Beast Reduction: <strong>{(getBurgBeastDamageReduction(burg) * 100).toFixed(0)}%</strong></span>
							<span>Famine Mitigation: <strong>{(getBurgFamineMitigation(burg) * 100).toFixed(0)}%</strong></span>
						</div>
						<div class="admin-buttons">
							<button class="btn small" onclick={() => handleStationGarrison((burg.garrison ?? 0) + 5)}>
								+5 Cohorts
							</button>
							<button class="btn small" onclick={() => handleStationGarrison((burg.garrison ?? 0) + 10)}>
								+10 Cohorts
							</button>
							{#if (burg.garrison ?? 0) > 0}
								<button class="btn small" onclick={() => handleStationGarrison(0)}>
									Disband
								</button>
							{/if}
						</div>
					</div>

					<!-- Municipal Charter Card -->
					<div class="admin-card">
						<div class="admin-head">
							<strong>Royal Municipal Charter</strong>
							{#if burg.charter}
								<span class="chip gold">Charter Active</span>
							{:else}
								<span class="chip">Crown Subject</span>
							{/if}
						</div>
						<p class="small muted">
							Grants municipal self-governance rights, boosts trade autonomy, enhances realm stability (+5), and quells local uprisings.
						</p>
						<div class="admin-buttons">
							{#if burg.charter}
								<span class="small muted">Autonomous privileges formally recognized by sovereign decree.</span>
							{:else}
								<button class="btn small primary" onclick={handleGrantCharter}>
									Grant Royal Charter
								</button>
							{/if}
						</div>
					</div>
				</div>
			</section>

			<footer class="mfoot">
				<button class="btn" onclick={onclose}>Close</button>
			</footer>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(8, 6, 4, 0.75);
		backdrop-filter: blur(4px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
	}
	.modal {
		background: var(--panel);
		color: var(--panel-ink);
		border: 1px solid var(--line);
		border-radius: 12px;
		width: min(840px, 100%);
		max-height: 90dvh;
		display: flex;
		flex-direction: column;
		padding: 1rem 1.2rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		overflow: hidden auto;
		gap: 0.8rem;
	}
	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.6rem;
	}
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.title-row h2 {
		font-size: 1.35rem;
	}
	.gold-text {
		color: var(--accent);
		font-weight: 600;
	}
	.chip.gold {
		background: var(--accent);
		color: var(--ink);
		border-color: var(--accent);
		font-weight: 600;
	}
	.chip.tiny {
		font-size: 0.72rem;
		padding: 0.05rem 0.35rem;
	}
	.banner {
		padding: 0.45rem 0.8rem;
		border-radius: 6px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}
	.banner.ok {
		background: rgba(76, 175, 80, 0.15);
		border: 1px solid rgba(76, 175, 80, 0.4);
		color: #2e7d32;
	}
	.banner.err {
		background: rgba(244, 67, 54, 0.15);
		border: 1px solid rgba(244, 67, 54, 0.4);
		color: var(--danger);
	}
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.section h3 {
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.gov-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.6rem 0.8rem;
		background: rgba(0, 0, 0, 0.02);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
	}
	.gov-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.gov-actions {
		display: flex;
		gap: 0.4rem;
	}
	.stats-row {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
	}
	.court-picker {
		border: 1px solid var(--accent);
		border-radius: 8px;
		padding: 0.6rem;
		background: rgba(201, 164, 92, 0.05);
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.court-picker-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.court-list {
		max-height: 180px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.court-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--vellum);
		gap: 0.5rem;
	}
	.districts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
		gap: 0.6rem;
	}
	.district-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.6rem;
		background: rgba(0, 0, 0, 0.02);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.district-card.maxed {
		border-color: rgba(201, 164, 92, 0.4);
		background: rgba(201, 164, 92, 0.03);
	}
	.d-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.d-icon {
		font-size: 1.35rem;
	}
	.d-title {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.d-desc {
		margin: 0;
		line-height: 1.3;
	}
	.d-effect {
		background: rgba(0, 0, 0, 0.03);
		padding: 0.25rem 0.4rem;
		border-radius: 4px;
		border-left: 3px solid var(--accent);
	}
	.d-action {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: auto;
		padding-top: 0.3rem;
	}
	.max-chip {
		background: rgba(201, 164, 92, 0.2);
		color: var(--panel-ink);
	}
	.needs-gold {
		color: var(--danger);
	}
	.admin-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.6rem;
	}
	.admin-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.6rem;
		background: rgba(0, 0, 0, 0.02);
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.admin-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.admin-buttons {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		align-items: center;
	}
	.btn.danger {
		border-color: var(--danger);
		color: var(--danger);
	}
	.mfoot {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.4rem;
		border-top: 1px solid var(--line);
	}
	.small {
		font-size: 0.82rem;
	}
	.tiny {
		font-size: 0.74rem;
	}
	.link.tiny {
		background: none;
		border: none;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		font-size: 0.75rem;
	}
</style>
