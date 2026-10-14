<script lang="ts">
	import { neighbors } from '#lib/gen/grid';
	import type { Simulation } from '#lib/sim/engine';
	import { onMount } from 'svelte';

	let { sim, v, onclose }: { sim: Simulation; v: number; onclose: () => void } = $props();

	let tab = $state<'size' | 'tree'>('size');
	let focusId = $state(0);
	let selId = $state(0);
	let chartW = $state(640);
	let treeW = $state(640);
	let closeBtn: HTMLButtonElement | undefined;
	let dialog: HTMLDivElement | undefined;

	onMount(() => closeBtn?.focus());

	// the live year ticks along behind the modal; recompute every 5 years like the snapshots do
	const bucket = $derived(Math.floor(sim.year / 5));

	/* ---------- realm size over time ---------- */
	const MAX_POINTS = 140;
	const TOP = 9;
	interface Series { id: number; name: string; color: string; alive: boolean; vals: number[]; peak: number }

	const data = $derived.by(() => {
		void v;
		void bucket;
		const snaps = sim.historySnapshots;
		const live = sim.w.layers[0].state;
		const pts: { year: number; st: ArrayLike<number> }[] = snaps.map((s) => ({ year: s.year, st: s.surfaceStates }));
		if (!pts.length || pts[pts.length - 1].year < sim.year) pts.push({ year: sim.year, st: live });
		const step = Math.max(1, Math.ceil(pts.length / MAX_POINTS));
		const use = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
		const n = sim.polities.length;
		const counts = use.map((p) => {
			const c = new Int32Array(n);
			const st = p.st;
			for (let i = 0; i < st.length; i++) if (st[i] < n) c[st[i]]++;
			return c;
		});
		const series: Series[] = [];
		for (let id = 1; id < n; id++) {
			const pol = sim.polities[id];
			let peak = 0;
			for (const c of counts) if (c[id] > peak) peak = c[id];
			if (!peak) continue;
			series.push({ id, name: pol.name, color: pol.color, alive: pol.alive, vals: counts.map((c) => c[id]), peak });
		}
		series.sort((a, b) => b.peak - a.peak);
		// the biggest standing realms plus the biggest fallen ones, so both the present and the past show
		const shown = [...series.filter((s) => s.alive).slice(0, TOP - 3), ...series.filter((s) => !s.alive).slice(0, 3)];
		shown.sort((a, b) => b.peak - a.peak);
		return { years: use.map((p) => p.year), series: shown, total: series.length };
	});

	const PAD = { t: 14, b: 28, l: 44 };
	const CH = 320;
	const labelW = $derived(Math.round(Math.min(124, Math.max(70, chartW * 0.24))));
	const plot = $derived({ x0: PAD.l, x1: Math.max(PAD.l + 60, chartW - labelW - 8), y0: PAD.t, y1: CH - PAD.b });
	const yMax = $derived.by(() => {
		const m = Math.max(1, ...data.series.map((s) => s.peak));
		const mag = 10 ** Math.floor(Math.log10(m)) / 2;
		return Math.ceil(m / mag) * mag;
	});
	const y0 = $derived(data.years[0] ?? 0);
	const y1 = $derived(Math.max(y0 + 1, data.years[data.years.length - 1] ?? 1));
	const sx = (yr: number) => plot.x0 + ((yr - y0) / (y1 - y0)) * (plot.x1 - plot.x0);
	const sy = (val: number) => plot.y1 - (val / yMax) * (plot.y1 - plot.y0);

	function pathOf(s: Series): string {
		let d = '';
		let last = -1;
		for (let i = 0; i < s.vals.length; i++) {
			if (s.vals[i] === 0 && last === -1) continue;
			d += `${d ? 'L' : 'M'}${sx(data.years[i]).toFixed(1)},${sy(s.vals[i]).toFixed(1)}`;
			last = i;
			if (s.vals[i] === 0) break; // line ends where the realm vanished
		}
		return d;
	}
	/** index of the last point where the realm held land */
	function endIdx(s: Series): number {
		let e = 0;
		for (let i = 0; i < s.vals.length; i++) if (s.vals[i] > 0) e = i;
		return e;
	}
	const ticksX = $derived.by(() => {
		const span = y1 - y0;
		const rough = span / Math.max(2, Math.floor((plot.x1 - plot.x0) / 80));
		const mag = 10 ** Math.floor(Math.log10(rough));
		const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? mag * 10;
		const out: number[] = [];
		for (let t = Math.ceil(y0 / step) * step; t <= y1; t += step) out.push(t);
		return out;
	});
	const ticksY = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax)));

	/** direct labels at each line's end, nudged apart so none overlap */
	const labels = $derived.by(() => {
		const rows = data.series.filter((s) => s.alive).map((s) => {
			const e = endIdx(s);
			return { s, x: sx(data.years[e]), y: sy(s.vals[e]), ly: sy(s.vals[e]) };
		});
		rows.sort((a, b) => a.y - b.y);
		const gap = 13;
		for (let i = 1; i < rows.length; i++) if (rows[i].ly - rows[i - 1].ly < gap) rows[i].ly = rows[i - 1].ly + gap;
		const over = rows.length ? rows[rows.length - 1].ly - plot.y1 : 0;
		if (over > 0) for (const r of rows) r.ly -= over;
		for (let i = rows.length - 2; i >= 0; i--) if (rows[i + 1].ly - rows[i].ly < gap) rows[i].ly = rows[i + 1].ly - gap;
		return rows;
	});
	/** fallen realms are labelled where their line ends, not in the right-hand column */
	const fallen = $derived.by(() => {
		const out: { s: Series; x: number; y: number; ly: number; flip: boolean }[] = [];
		for (const s of data.series.filter((q) => !q.alive)) {
			const e = endIdx(s);
			const x = sx(data.years[e]);
			const y = sy(s.vals[e]);
			let ly = y - 7;
			for (let k = 0; k < out.length; k++) for (const o of out) if (Math.abs(o.ly - ly) < 13 && Math.abs(o.x - x) < 110) ly = o.ly - 13;
			out.push({ s, x, y, ly, flip: x > plot.x1 - 90 });
		}
		return out;
	});
	const short = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

	/* ---------- family tree of splits, merges and vassalage ---------- */
	const SPLITTERS = new Set(['rebellion', 'coup', 'prophet', 'avatar', 'scourge']);
	interface TNode { id: number; name: string; color: string; from: number; to: number; alive: boolean; origin: string; parent: number; row: number; kids: number[] }

	const tree = $derived.by(() => {
		void v;
		void bucket;
		const pols = sim.polities;
		const snaps = sim.historySnapshots;
		const cells = sim.w.cells;
		const parentOf = new Map<number, number>();
		for (const p of pols) {
			if (!p.id || p.layer !== 0 || !SPLITTERS.has(p.origin) || !snaps.length) continue;
			const b = sim.w.burgs[p.capital];
			if (!b) continue;
			let snap = snaps[0];
			for (const s of snaps) if (s.year < p.founded) snap = s; else break;
			if (snap.year >= p.founded && snap !== snaps[0]) continue;
			let par = snap.surfaceStates[b.cell];
			if (!par || par === p.id) {
				const tally = new Map<number, number>();
				for (const nb of neighbors(cells, b.cell)) {
					const q = snap.surfaceStates[nb];
					if (q && q !== p.id) tally.set(q, (tally.get(q) ?? 0) + 1);
				}
				par = [...tally].sort((a, b2) => b2[1] - a[1])[0]?.[0] ?? 0;
			}
			if (par && par !== p.id && pols[par] && pols[par].founded <= p.founded) parentOf.set(p.id, par);
		}
		const linked = new Set<number>();
		for (const [c, par] of parentOf) { linked.add(c); linked.add(par); }
		for (const p of pols) {
			if (!p.id) continue;
			if (p.mergedInto && pols[p.mergedInto]) { linked.add(p.id); linked.add(p.mergedInto); }
			if (p.overlord && pols[p.overlord]) { linked.add(p.id); linked.add(p.overlord); }
		}
		const now = sim.year;
		const nodes = new Map<number, TNode>();
		for (const id of linked) {
			const p = pols[id];
			nodes.set(id, { id, name: p.name, color: p.color, from: p.founded, to: p.alive ? now : (p.fell ?? now), alive: p.alive, origin: p.origin, parent: parentOf.get(id) ?? 0, row: 0, kids: [] });
		}
		// row order: a realm sits under its parent, else under the realm that absorbed or rules it, so links stay short
		const layoutParent = (n: TNode) => {
			const p = pols[n.id];
			for (const c of [n.parent, p.mergedInto ?? 0, p.overlord ?? 0]) if (c && c !== n.id && nodes.has(c)) return c;
			return 0;
		};
		for (const n of nodes.values()) {
			const lp = layoutParent(n);
			if (lp) nodes.get(lp)!.kids.push(n.id);
		}
		const byAge = (a: TNode, b: TNode) => a.from - b.from || a.id - b.id;
		let row = 0;
		const order: TNode[] = [];
		const seen = new Set<number>();
		const visit = (n: TNode) => {
			if (seen.has(n.id)) return;
			seen.add(n.id);
			n.row = row++;
			order.push(n);
			for (const k of n.kids.map((i) => nodes.get(i)!).sort(byAge)) visit(k);
		};
		const all = [...nodes.values()].sort(byAge);
		for (const r of all.filter((n) => !layoutParent(n))) visit(r);
		for (const r of all) visit(r); // anything left sits in a cycle
		const merges = [...nodes.values()].filter((n) => pols[n.id].mergedInto && nodes.has(pols[n.id].mergedInto!)).map((n) => ({ from: n.id, to: pols[n.id].mergedInto! }));
		const vassals = [...nodes.values()].filter((n) => pols[n.id].overlord && nodes.has(pols[n.id].overlord!)).map((n) => ({ from: n.id, to: pols[n.id].overlord!, since: pols[n.id].vassalSince ?? n.from }));
		const splits = [...parentOf].filter(([c, par]) => nodes.has(c) && nodes.has(par)).map(([c, par]) => ({ from: par, to: c }));
		const t0 = order.length ? Math.min(...order.map((n) => n.from)) : 0;
		return { order, nodes, merges, vassals, splits, t0, t1: Math.max(now, t0 + 1) };
	});

	const ROW = 24;
	const nameW = $derived(Math.round(Math.min(150, Math.max(84, treeW * 0.26))));
	const tx = (yr: number) => nameW + 8 + ((yr - tree.t0) / (tree.t1 - tree.t0)) * Math.max(40, treeW - nameW - 24);
	const ty = (row: number) => 14 + row * ROW;
	const selNode = $derived(selId ? tree.nodes.get(selId) : undefined);

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		} else if (e.key === 'Tab' && dialog) {
			const f = [...dialog.querySelectorAll<HTMLElement>('button, [tabindex="0"]')].filter((el) => !el.hasAttribute('disabled'));
			if (!f.length) return;
			const first = f[0], last = f[f.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	}
	function tabKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			tab = tab === 'size' ? 'tree' : 'size';
			queueMicrotask(() => dialog?.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.focus());
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" onclick={(e) => e.target === e.currentTarget && onclose()} role="presentation">
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="hist-title" tabindex="-1" bind:this={dialog}>
		<header class="mhead">
			<div>
				<h2 id="hist-title">Realm History</h2>
				<p class="muted small">Year {sim.year}. {data.total} realms have held land on the surface.</p>
			</div>
			<button class="btn" bind:this={closeBtn} onclick={onclose} aria-label="Close history">✕</button>
		</header>

		<div class="tabs" role="tablist" aria-label="History views">
			<button class="btn" role="tab" id="t-size" aria-selected={tab === 'size'} aria-controls="p-size" tabindex={tab === 'size' ? 0 : -1} class:on={tab === 'size'} onclick={() => (tab = 'size')} onkeydown={tabKey}>Realm size</button>
			<button class="btn" role="tab" id="t-tree" aria-selected={tab === 'tree'} aria-controls="p-tree" tabindex={tab === 'tree' ? 0 : -1} class:on={tab === 'tree'} onclick={() => (tab = 'tree')} onkeydown={tabKey}>Family tree</button>
		</div>

		{#if tab === 'size'}
			<div id="p-size" role="tabpanel" aria-labelledby="t-size" class="panel">
				{#if data.years.length < 2 || !data.series.length}
					<p class="muted">Not enough history yet. Let the world run for a few decades; borders are recorded every 5 years.</p>
				{:else}
					<div class="chartbox" bind:clientWidth={chartW}>
						<svg width={chartW} height={CH} viewBox="0 0 {chartW} {CH}" role="img" aria-labelledby="size-desc">
							<desc id="size-desc">Line chart of surface cells held by each of the {data.series.length} largest realms from year {y0} to year {y1}. Peak sizes: {data.series.map((s) => `${s.name} ${s.peak}`).join(', ')}.</desc>
							{#each ticksY as t (t)}
								<line x1={plot.x0} x2={plot.x1} y1={sy(t)} y2={sy(t)} class="grid" />
								<text x={plot.x0 - 6} y={sy(t) + 4} text-anchor="end" class="tick">{t}</text>
							{/each}
							{#each ticksX as t (t)}
								<line x1={sx(t)} x2={sx(t)} y1={plot.y1} y2={plot.y1 + 4} class="axis" />
								<text x={sx(t)} y={plot.y1 + 17} text-anchor="middle" class="tick">{t}</text>
							{/each}
							<line x1={plot.x0} x2={plot.x1} y1={plot.y1} y2={plot.y1} class="axis" />
							<text x={plot.x0} y={10} class="tick">cells</text>
							{#each data.series as s (s.id)}
								{@const dim = focusId !== 0 && focusId !== s.id}
								<path d={pathOf(s)} class="halo" class:dim />
								<path d={pathOf(s)} class="line" class:dim stroke={s.color} />
							{/each}
							{#each labels as l (l.s.id)}
								{@const dim = focusId !== 0 && focusId !== l.s.id}
								<g class="lab" class:dim>
									<line x1={l.x} y1={l.y} x2={plot.x1 + 6} y2={l.ly} class="leader" />
									<circle cx={l.x} cy={l.y} r="3.5" fill={l.s.color} class="dot" />
									<text x={plot.x1 + 10} y={l.ly + 4}>{short(l.s.name, Math.floor(labelW / 6.6))}</text>
								</g>
							{/each}
							{#each fallen as f (f.s.id)}
								{@const dim = focusId !== 0 && focusId !== f.s.id}
								<g class="lab" class:dim>
									<circle cx={f.x} cy={f.y} r="3.5" fill={f.s.color} class="dot" />
									<text x={f.flip ? f.x - 6 : f.x + 7} y={f.ly} text-anchor={f.flip ? 'end' : 'start'}>{short(f.s.name, 14)} †</text>
								</g>
							{/each}
						</svg>
					</div>
					<div class="chips" role="group" aria-label="Highlight a realm">
						{#each data.series as s (s.id)}
							<button type="button" class="btn chipbtn" class:on={focusId === s.id} aria-pressed={focusId === s.id} onclick={() => (focusId = focusId === s.id ? 0 : s.id)}>
								<span class="swatch" style="background:{s.color}"></span>{s.name}<span class="muted"> peak {s.peak}</span>
							</button>
						{/each}
					</div>
					<p class="muted small">Showing the largest standing and fallen realms ({data.series.length} of {data.total}). † marks a fallen realm. Size is counted in surface cells at each recorded snapshot.</p>
				{/if}
			</div>
		{:else}
			<div id="p-tree" role="tabpanel" aria-labelledby="t-tree" class="panel">
				{#if !tree.order.length}
					<p class="muted">No splits, mergers or vassalage yet. Rebellions, unions and conquests will appear here as they happen.</p>
				{:else}
					<div class="treebox scroll" bind:clientWidth={treeW}>
						<svg width={treeW} height={ty(tree.order.length) + 6} viewBox="0 0 {treeW} {ty(tree.order.length) + 6}" role="group" aria-label="Realm family tree: {tree.order.length} realms">
							<defs>
								<marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="arrow" /></marker>
							</defs>
							{#each tree.order as n (n.id)}
								<line x1={nameW + 8} x2={treeW - 8} y1={ty(n.row)} y2={ty(n.row)} class="rowline" />
							{/each}
							{#each tree.splits as e (e.to)}
								{@const a = tree.nodes.get(e.from)!}
								{@const b = tree.nodes.get(e.to)!}
								<path d="M{tx(b.from)},{ty(a.row)} V{ty(b.row)} H{tx(b.from) + 2}" class="link split" />
							{/each}
							{#each tree.vassals as e (e.from)}
								{@const a = tree.nodes.get(e.from)!}
								{@const b = tree.nodes.get(e.to)!}
								<path d="M{tx(e.since)},{ty(a.row)} V{ty(b.row)}" class="link vassal" />
							{/each}
							{#each tree.merges as e (e.from)}
								{@const a = tree.nodes.get(e.from)!}
								{@const b = tree.nodes.get(e.to)!}
								<path d="M{tx(a.to)},{ty(a.row)} V{ty(b.row)}" class="link merge" marker-end="url(#arr)" />
							{/each}
							{#each tree.order as n (n.id)}
								<g class="node" class:sel={selId === n.id} tabindex="0" role="button" aria-label="{n.name}, founded year {n.from}{n.alive ? ', still standing' : `, ended year ${n.to}`}" onfocus={() => (selId = n.id)} onmouseenter={() => (selId = n.id)} onclick={() => (selId = n.id)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selId = n.id)}>
									<rect x={0} y={ty(n.row) - ROW / 2} width={treeW} height={ROW} class="hit" />
									<text x={nameW} y={ty(n.row) + 4} text-anchor="end" class="nm">{short(n.name, Math.floor(nameW / 6.6))}</text>
									<rect x={tx(n.from)} y={ty(n.row) - 4} width={Math.max(4, tx(n.to) - tx(n.from))} height="8" rx="3" fill={n.color} class="bar" />
									{#if !n.alive}<text x={tx(n.to) + 4} y={ty(n.row) + 4} class="end">†</text>{/if}
								</g>
							{/each}
						</svg>
					</div>
					<p class="detail" aria-live="polite">
						{#if selNode}
							<strong>{selNode.name}</strong>: {selNode.origin === 'founding' ? 'founded' : selNode.origin} in year {selNode.from}{selNode.alive ? ', still standing' : `, ended in year ${selNode.to}`}{selNode.parent && tree.nodes.has(selNode.parent) ? `. Split from ${tree.nodes.get(selNode.parent)?.name}` : ''}.
						{:else}
							<span class="muted">Hover or focus a realm for details.</span>
						{/if}
					</p>
					<ul class="key">
						<li><svg width="26" height="10" aria-hidden="true"><path d="M2,5 H24" class="link split" /></svg>Split (parent found from borders)</li>
						<li><svg width="26" height="10" aria-hidden="true"><path d="M2,5 H22" class="link merge" marker-end="url(#arr)" /></svg>Merged into</li>
						<li><svg width="26" height="10" aria-hidden="true"><path d="M2,5 H24" class="link vassal" /></svg>Vassal of</li>
						<li><span class="end">†</span> Fallen</li>
					</ul>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.overlay { position: fixed; inset: 0; background: rgba(8, 6, 4, 0.75); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 0.75rem; }
	.modal { background: var(--panel); color: var(--panel-ink); border: 1px solid var(--line); border-radius: 12px; width: min(900px, 100%); max-height: 92dvh; display: flex; flex-direction: column; padding: 1rem 1.1rem; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); overflow: hidden auto; }
	.mhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.6rem; }
	.mhead h2 { font-size: 1.25rem; }
	.mhead p { margin: 0.1rem 0 0; }
	.mhead .btn { min-width: 40px; min-height: 40px; }
	.small { font-size: 0.82rem; }
	.tabs { display: flex; gap: 0.3rem; margin-bottom: 0.6rem; border-bottom: 1px solid var(--line); padding-bottom: 0.5rem; }
	.tabs .btn { min-height: 40px; font-family: var(--title); font-size: 0.88rem; }
	.panel { min-width: 0; }
	.chartbox, .treebox { width: 100%; min-width: 0; }
	.treebox { max-height: 52dvh; overflow-x: hidden; }
	svg { display: block; max-width: 100%; overflow: visible; }
	.treebox svg { overflow: hidden; }
	.grid { stroke: var(--line); stroke-width: 1; }
	.axis { stroke: var(--muted); stroke-width: 1; }
	.tick { fill: var(--muted); font-size: 11px; font-family: var(--body); }
	.halo { fill: none; stroke: var(--panel); stroke-width: 5.5; stroke-linejoin: round; stroke-linecap: round; opacity: 0.9; }
	.line { fill: none; stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
	.line.dim, .halo.dim, .lab.dim { opacity: 0.18; }
	.lab text { fill: var(--panel-ink); font-size: 12px; font-family: var(--body); }
	.dot { stroke: var(--panel-ink); stroke-width: 1; }
	.leader { stroke: var(--muted); stroke-width: 1; opacity: 0.6; }
	.chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.5rem 0; }
	.chipbtn { min-height: 40px; font-size: 0.85rem; display: inline-flex; align-items: center; }
	.link { fill: none; stroke-width: 1.6; }
	.link.split { stroke: var(--panel-ink); opacity: 0.7; }
	.link.merge { stroke: var(--danger); stroke-width: 2; }
	.link.vassal { stroke: var(--muted); stroke-dasharray: 4 3; }
	.arrow { fill: var(--danger); }
	.rowline { stroke: var(--line); stroke-width: 1; stroke-dasharray: 1 4; }
	.node { cursor: pointer; outline: none; }
	.node .hit { fill: transparent; }
	.node:hover .hit, .node.sel .hit { fill: color-mix(in srgb, var(--accent) 16%, transparent); }
	.node:focus-visible .hit { stroke: var(--accent); stroke-width: 2; }
	.nm { fill: var(--panel-ink); font-size: 12px; font-family: var(--body); }
	.bar { stroke: var(--panel-ink); stroke-opacity: 0.45; stroke-width: 1; }
	.end { fill: var(--panel-ink); font-size: 12px; }
	span.end { font-size: 0.9rem; }
	.detail { margin: 0.5rem 0 0.3rem; min-height: 2.6em; font-size: 0.92rem; }
	.key { list-style: none; display: flex; flex-wrap: wrap; gap: 0.4rem 1.1rem; padding: 0; margin: 0; font-size: 0.82rem; color: var(--muted); }
	.key li { display: flex; align-items: center; gap: 0.35rem; }
	.key .link { stroke-width: 2; }
	@media (max-width: 480px) {
		.modal { padding: 0.75rem; }
	}
</style>
