<script lang="ts">
	import type { CoatOfArms } from '../render/heraldry';
	import { heraldrySvg } from '../render/heraldry';

	let {
		coa,
		size = 48,
		label,
		showBlazonTooltip = true
	}: {
		coa: CoatOfArms;
		size?: number;
		label?: string;
		showBlazonTooltip?: boolean;
	} = $props();

	const svgContent = $derived(heraldrySvg(coa, size));
</script>

<div
	class="heraldry-badge"
	style="--badge-size: {size}px;"
	title={showBlazonTooltip ? coa.blazon : undefined}
	role="img"
	aria-label={label ? `${label}: ${coa.blazon}` : coa.blazon}
>
	<div class="badge-icon">
		{@html svgContent}
	</div>
	{#if label}
		<span class="badge-label">{label}</span>
	{/if}
	{#if showBlazonTooltip}
		<div class="blazon-tooltip" role="tooltip">
			{#if label}
				<div class="tooltip-label">{label}</div>
			{/if}
			<div class="tooltip-blazon">{coa.blazon}</div>
		</div>
	{/if}
</div>

<style>
	.heraldry-badge {
		position: relative;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		cursor: default;
		user-select: none;
	}

	.badge-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--badge-size);
		height: var(--badge-size);
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
		transition: transform 0.15s ease, filter 0.15s ease;
	}

	.badge-icon:hover {
		transform: translateY(-1px) scale(1.04);
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
	}

	.badge-label {
		margin-top: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: calc(var(--badge-size) * 1.5);
		color: currentColor;
	}

	.blazon-tooltip {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		background: #0f172a;
		color: #f8fafc;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 5px 8px;
		font-size: 0.72rem;
		line-height: 1.35;
		white-space: normal;
		width: max-content;
		max-width: 220px;
		text-align: center;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.15s ease, visibility 0.15s ease;
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	.heraldry-badge:hover .blazon-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.tooltip-label {
		font-weight: 600;
		color: #93c5fd;
		margin-bottom: 2px;
	}

	.tooltip-blazon {
		font-style: italic;
		color: #e2e8f0;
	}
</style>
