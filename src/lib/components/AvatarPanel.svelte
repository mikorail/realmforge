<script lang="ts">
	import type { GenreDef } from '#lib/gen/genre';
	import type { Cosmos } from '#lib/sim/cosmos';
	import type { Role } from '#lib/sim/types';
	import { AMBITION_BY_ID, pickAmbition } from '#lib/sim/ambitions';
	import { getMegastructureState } from '#lib/sim/megastructures';

	let { cosmos, pi, v, cell, layer, terms, onsay, onchanged, onfocus, onplanet, ondelve, onmegastructure }: {
		cosmos: Cosmos; pi: number; v: number; cell: number; layer: number; terms: GenreDef['terms'];
		onsay: (t: string) => void; onchanged: () => void; onfocus: (c: number | undefined, planet?: number) => void; onplanet: (p: number) => void;
		ondelve?: (cell: number) => void;
		onmegastructure?: (site: any) => void;
	} = $props();

	let roleFilter = $state<Role | 'all'>('all');
	let q = $state('');

	const sim = $derived.by(() => {
		void v;
		return cosmos.sims[pi];
	});
	const asim = $derived.by(() => {
		void v;
		return cosmos.avatarSim;
	});
	const me = $derived.by(() => {
		void v;
		return asim?.me ?? null;
	});

	const candidates = $derived.by(() => {
		void v;
		const s = cosmos.sims[pi];
		const here = cell >= 0 ? s.lb[layer][cell] : 0;
		return s
			.candidates()
			.filter((p) => (roleFilter === 'all' || p.role === roleFilter) && (!q || `${p.name} ${p.house}`.toLowerCase().includes(q.toLowerCase())))
			.sort((a, b) => (b.burg === here ? 1 : 0) - (a.burg === here ? 1 : 0) || b.renown - a.renown)
			.slice(0, 40);
	});

	const ctx = $derived.by(() => {
		void v;
		if (!asim || !me) return null;
		const here = asim.w.burgs[me.burg];
		const L = asim.w.layers[asim.burgLayer(here)];
		const local = asim.polities[here.state];
		const pol = asim.polities[me.state];
		const target = cosmos.avatarPlanet === pi && cell >= 0 ? asim.lb[layer][cell] : 0;
		const route = target && target !== me.burg ? asim.route(me.burg, target) : null;
		let days = 0;
		if (route) for (let i = 1; i < route.length; i++) days += asim.linkDays(route[i - 1], route[i]);
		const rifts = cosmos.riftsAt(cosmos.avatarPlanet, me.burg);
		const ruler = (me.role === 'ruler' || me.role === 'villain') && pol?.alive ? pol : null;
		const neighbours = ruler ? asim.neighborsOf(ruler.id).map((id) => asim.polities[id]).filter((p) => p.alive) : [];
		return { here, L, local: local?.alive && local.id ? local : null, pol: pol?.alive && pol.id ? pol : null, target, route, days, rifts, ruler, neighbours };
	});

	const nearbyMonster = $derived.by(() => {
		void v;
		if (!asim || !me) return null;
		const here = asim.w.burgs[me.burg];
		if (!here) return null;
		return asim.monsters?.find((m) => m.alive && (m.cell === here.cell || Math.hypot(m.x - here.x, m.y - here.y) < 55)) ?? null;
	});

	const nearbyWonder = $derived.by(() => {
		void v;
		if (!asim || !me) return null;
		const here = asim.w.burgs[me.burg];
		if (!here) return null;
		return asim.wonders?.find((w) => !w.destroyed && w.cell === here.cell) ?? null;
	});

	function act(a: string, arg?: number) {
		const msg = asim!.act(a, arg);
		onsay(msg);
		onchanged();
	}
	function travel() {
		if (!ctx?.target) return;
		onsay(asim!.startTravel(ctx.target) ?? `Setting out for ${asim!.w.burgs[ctx.target].name}…`);
		onchanged();
	}
	const ROLES: (Role | 'all')[] = ['all', 'ruler', 'heir', 'general', 'merchant', 'trader', 'entrepreneur', 'priest', 'wanderer', 'hero', 'villain', 'prophet'];
</script>

{#if !me}
	<h3>Choose a life</h3>
	<p class="muted small">Inhabit anyone in the world: a monarch, an heir, a merchant, a wandering nobody. Click a town on the map to see who lives there first.</p>
	<div class="row roles">
		{#each ROLES as r (r)}<button class="chip" class:on={roleFilter === r} onclick={() => (roleFilter = r)}>{r}</button>{/each}
	</div>
	<input class="search" placeholder="Search by name…" bind:value={q} />
	{#if candidates.length === 0}
		<p class="muted small">No people match this name or role filter.</p>
	{:else}
		<ul class="people">
			{#each candidates as p (p.id)}
				{@const b = sim.w.burgs[p.burg]}
				<li>
					<div>
						<strong>{p.name} {p.house}</strong> <span class="chip">{p.role}</span>
						<div class="small muted">{sim.ageOf(p)} yrs · {b?.name}{p.state ? ` · ${sim.polities[p.state].name}` : ''} · renown {p.renown}</div>
						<div class="small muted">⚔{p.martial} ✉{p.diplomacy} ⚖{p.stewardship} 🗝{p.intrigue} · {p.traits.join(', ')}</div>
					</div>
					<div class="col">
						<button class="btn primary" onclick={() => { cosmos.choose(pi, p.id); onchanged(); onfocus(b?.cell); }}>Become</button>
						<button class="btn" onclick={() => onfocus(b?.cell)} aria-label="Show on map">⌖</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{:else if ctx}
	{#if cosmos.avatarPlanet !== pi}
		<p class="note">You live on {cosmos.u.planets[cosmos.avatarPlanet].name}. <button class="btn" onclick={() => onplanet(cosmos.avatarPlanet)}>Go there</button></p>
	{/if}
	<section class="sheet">
		<h3>{me.name} {me.house}</h3>
		<div class="small muted">{me.role}{ctx.pol ? ` of ${ctx.pol.name}` : ''} · age {asim!.ageOf(me)} · {me.traits.join(', ')}</div>
		<div class="grid4">
			<span title="Martial">⚔ {me.martial}</span><span title="Diplomacy">✉ {me.diplomacy}</span><span title="Stewardship">⚖ {me.stewardship}</span><span title="Intrigue">🗝 {me.intrigue}</span>
		</div>
		<div class="grid2">
			<div class="stat"><span>{terms.gold}</span><span>{me.gold}</span></div>
			<div class="stat"><span>Renown</span><span>{me.renown}</span></div>
			<div class="stat"><span>Health</span><span class:bad={me.health < 35}>{me.health}</span></div>
			<div class="stat"><span>Cargo</span><span>{me.cargo ? `from ${asim!.w.burgs[me.cargo.from].name}` : 'none'}</span></div>
		</div>
		<p class="small">
			At <button class="link" onclick={() => onfocus(ctx.here.cell, cosmos.avatarPlanet)}><strong>{ctx.here.name}</strong></button>
			<span class="muted">({ctx.here.kind}, {ctx.L.name}{ctx.local ? `, ${ctx.local.name}` : ', free'})</span>
		</p>
	</section>

	<!-- `me` is the same (non-reactive) object across updates; key on v so these sections re-read it -->
	{#key v}
	{#if asim}
		{@const amb = me.ambition ? AMBITION_BY_ID[me.ambition] : null}
		{@const comps = (me.companions ?? []).map((id) => asim!.people[id]).filter((c) => c?.alive)}
		<section class="ambition">
			<h3>Ambition</h3>
			{#if amb}
				{@const pct = Math.min(1, amb.progress(asim, me))}
				<div class="amb-row"><span class="amb-ico">{amb.icon}</span><div><strong>{amb.title}</strong><div class="small muted">{amb.desc} · reward {amb.reward.gold ? `${amb.reward.gold} gold ` : ''}{amb.reward.renown ? `${amb.reward.renown} renown` : ''}</div></div></div>
				<div class="bar" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin="0" aria-valuemax="100"><div style="width:{pct * 100}%"></div></div>
			{:else if me.ambitionChoices?.length}
				<p class="small muted">Choose what this life is for:</p>
				<div class="amb-choices">
					{#each me.ambitionChoices as id (id)}
						{@const a = AMBITION_BY_ID[id]}
						<button class="btn amb-choice" onclick={() => { pickAmbition(asim!, id); onchanged(); }}><span class="amb-ico">{a.icon}</span><span><strong>{a.title}</strong><span class="small muted"> {a.desc}</span></span></button>
					{/each}
				</div>
			{:else}
				<p class="small muted">Let a month pass to find a new calling.</p>
			{/if}
			{#if me.ambitionsDone?.length}<p class="small muted">Fulfilled: {me.ambitionsDone.map((id) => AMBITION_BY_ID[id]?.icon ?? '').join(' ')}</p>{/if}
		</section>

		<section>
			<h3>Fellowship</h3>
			{#if comps.length}
				<ul class="comps">
					{#each comps as c (c.id)}
						<li><strong>{c.name} {c.house}</strong> <span class="small muted">· ⚔{c.martial} ✉{c.diplomacy} ⚖{c.stewardship} 🗝{c.intrigue}</span></li>
					{/each}
				</ul>
				<p class="small muted">Companions add their best skill to your encounter rolls.</p>
			{:else}
				<p class="small muted">You travel alone.</p>
			{/if}
			{#if comps.length < 3}<button class="btn" onclick={() => act('companion')}>Hire a companion (40 gold)</button>{/if}
		</section>

		{@const letters = asim.letters.slice(-6).reverse()}
		{#if letters.length}
			<section>
				<h3>Letters</h3>
				<ul class="letters">
					{#each letters as l, i (l.y + ':' + i)}
						<li>
							<div class="small muted">Year {l.y} · from {l.from}</div>
							<div>{l.text}</div>
							{#if l.action && !l.read}<button class="btn small" onclick={() => { l.read = true; act(l.action!.act, l.action!.arg); }}>{l.action.label}</button>{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
	{/key}

	<section>
		<h3>Travel</h3>
		{#if asim!.travel}
			{@const t = asim!.travel}
			<p class="small">On the road to <strong>{asim!.w.burgs[t.path[t.path.length - 1]].name}</strong>, leg {t.leg + 1}/{t.path.length - 1}. Let time run to arrive.</p>
			<button class="btn" onclick={() => { asim!.travel = null; onchanged(); }}>Halt here</button>
		{:else if ctx.target && ctx.target !== me.burg}
			{#if ctx.route}
				<button class="btn primary" onclick={travel}>Travel to {asim!.w.burgs[ctx.target].name} · ~{ctx.days} days · {ctx.route.length - 1} legs</button>
			{:else}
				<p class="small muted">No road, tunnel, lane or shaft leads to {asim!.w.burgs[ctx.target].name}.</p>
			{/if}
		{:else}
			<p class="small muted">Select any settlement on the map (any layer) to plot a route.</p>
		{/if}
		{#each ctx.rifts as rf (rf.rift.id)}
			<button class="btn rift" onclick={() => { onsay(cosmos.stepThrough(rf.rift.id)); onchanged(); onplanet(cosmos.avatarPlanet); }}>
				Step through the {rf.rift.name} → {cosmos.u.planets[rf.to.planet].name}
			</button>
		{/each}
	</section>

	<section>
		<h3>Deeds</h3>
		<div class="acts">
			{#if ondelve && ctx?.here}
				<button class="btn primary" onclick={() => ondelve?.(ctx.here.cell)}>🗺️ Delve Local Ruins / Vault</button>
			{/if}
			<button class="btn" onclick={() => act('work')}>Work (1 mo)</button>
			<button class="btn" onclick={() => act('adventure')}>Seek adventure</button>
			<button class="btn" onclick={() => act('train')}>Train (25g)</button>
			<button class="btn" onclick={() => act('research')} disabled={me.gold < 20}>Research (20g)</button>
			<button class="btn" onclick={() => act('invest')} disabled={me.gold < 25}>Invest (25g)</button>
			{#if me.renown >= 15}<button class="btn" onclick={() => act('enterprise')} disabled={me.gold < 75}>Enterprise (75g)</button>{/if}
			{#if me.intrigue >= 8}<button class="btn warn" onclick={() => act('infiltrate')} disabled={me.gold < 25}>Infiltrate (25g)</button>{/if}
			<button class="btn" onclick={() => act('pilgrim')}>Pray</button>
			{#if me.role === 'prophet' || me.role === 'priest'}<button class="btn" onclick={() => act('preach')}>Preach the faith</button>{/if}
			{#if me.role === 'villain'}<button class="btn warn" onclick={() => act('terrorize')}>Extort & terrorize</button>{/if}
			{#if me.role === 'villain'}<button class="btn warn" onclick={() => act('scourge')} disabled={me.gold < 30}>Summon warband (30g)</button>{/if}
			{#if me.cargo}<button class="btn" onclick={() => act('sell')}>Sell goods</button>{:else}<button class="btn" onclick={() => act('buy')}>Buy goods (30g)</button>{/if}
			{#if ctx.local && ctx.local.capital === ctx.here.id && me.role !== 'ruler'}<button class="btn" onclick={() => act('audience')}>Seek audience</button>{/if}
			{#if me.role !== 'ruler'}
				{#if ctx.local && ctx.local.capital === ctx.here.id}
					<button class="btn warn" onclick={() => act('revolution')}>⚡ Ignite Revolution</button>
				{:else}
					<button class="btn warn" onclick={() => act('raise')}>{ctx.local ? 'Raise revolt' : 'Found a realm'}</button>
				{/if}
			{/if}
			{#if me.role === 'general'}<button class="btn warn" onclick={() => act('coup')}>Seize the throne</button>{/if}
			{#if nearbyMonster}<button class="btn warn" onclick={() => act('hunt')}>⚔ Hunt {nearbyMonster.species}</button>{/if}
			{#if nearbyWonder}<button class="btn warn" onclick={() => act('raze')}>🔥 Raze {nearbyWonder.name}</button>{/if}
			{#if ctx.local}<button class="btn warn" onclick={() => act('stir_riot')}>✊ Incite Riot</button>{/if}
			<button class="btn warn" onclick={() => act('found_cult')}>🕯️ Found Cult</button>
			<button class="btn" onclick={() => act('proclaim_prophecy')}>🕊️ Proclaim Prophecy</button>
			<button class="btn" onclick={() => act('rally_hero')}>🛡️ Stand as Folk Hero</button>
			{#if onmegastructure && asim}
				{@const ms = getMegastructureState(asim)}
				<button class="btn" onclick={() => onmegastructure(ms.tower)}>🗼 Spire of Trials (F.{ms.tower.highestClearedFloor})</button>
				<button class="btn" onclick={() => onmegastructure(ms.abyss)}>🕳️ Delve Bottomless Abyss</button>
			{/if}
			<button class="btn" onclick={() => act('build_tower')} disabled={ctx.ruler ? ctx.ruler.treasury < 60 : me.gold < 60}>Build Tower ({ctx.ruler ? '60 tr.' : '60g'})</button>
			<button class="btn" onclick={() => act('build_wonder')} disabled={ctx.ruler ? ctx.ruler.treasury < 100 : me.gold < 100}>Build Wonder ({ctx.ruler ? '100 tr.' : '100g'})</button>
		</div>
	</section>

	{#if ctx.ruler}
		{@const p = ctx.ruler}
		<section>
			<h3>Rule {p.name}</h3>
			<div class="grid2">
				<div class="stat"><span>{terms.gold}</span><span>{p.treasury.toFixed(0)}</span></div>
				<div class="stat"><span>{terms.army}</span><span>{(p.army * 1000).toFixed(0)}</span></div>
				<div class="stat"><span>Stability</span><span class:bad={p.stability < 30}>{p.stability.toFixed(0)}</span></div>
				<div class="stat"><span>Tax</span><span>{(p.tax * 100).toFixed(0)}%</span></div>
			</div>
			<div class="acts">
				<button class="btn" onclick={() => act('festival')}>Festival (25)</button>
				<button class="btn" onclick={() => act('recruit')}>Raise levies (30)</button>
				<button class="btn" onclick={() => act('tax+')}>Tax +</button>
				<button class="btn" onclick={() => act('tax-')}>Tax −</button>
				{#if p.ideology !== 'republic'}<button class="btn" onclick={() => act('proclaim_republic')}>🏛️ Republic</button>{/if}
				{#if p.ideology !== 'communal'}<button class="btn" onclick={() => act('proclaim_union')}>🌾 Free Union</button>{/if}
				{#if p.ideology !== 'monarchy'}<button class="btn" onclick={() => act('proclaim_monarchy')}>👑 Monarchy</button>{/if}
				{#if !p.secularized}<button class="btn warn" onclick={() => act('secularize')}>🚫 State Atheism</button>{/if}
				{#if asim!.warsOf(p.id).length}<button class="btn" onclick={() => act('peace')}>Sue for peace</button>{/if}
				<button class="btn" onclick={() => act('abdicate')}>Abdicate</button>
			</div>
			<h3 class="mt">Neighbours</h3>
			<ul class="people">
				{#each ctx.neighbours as n (n.id)}
					{@const rel = asim!.rel(p.id, n.id)}
					<li>
						<div>
							<span class="swatch" style="background:{n.color}"></span><strong>{n.name}</strong>
							<div class="small muted">relations {rel.toFixed(0)} · {terms.army.toLowerCase()} {(n.army * 1000).toFixed(0)}{p.allies.includes(n.id) ? ' · ally' : ''}{asim!.atWar(p.id, n.id) ? ' · AT WAR' : ''}</div>
						</div>
						<div class="col">
							{#if !asim!.atWar(p.id, n.id)}<button class="btn warn" onclick={() => act('war', n.id)}>War</button>{/if}
							<button class="btn" onclick={() => act('gift', n.id)}>Gift</button>
							{#if !p.allies.includes(n.id) && !asim!.atWar(p.id, n.id)}<button class="btn" onclick={() => act('ally', n.id)}>Ally</button>{/if}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
	<button class="btn small" onclick={() => { if (asim) asim.avatar = -1; cosmos.avatarPlanet = -1; onchanged(); }}>Leave this life</button>
{/if}

<style>
	h3 { font-size: 0.98rem; margin: 0.2rem 0 0.4rem; }
	.mt { margin-top: 0.7rem; }
	section { margin-bottom: 0.9rem; }
	.small { font-size: 0.83rem; }
	.bad { color: var(--danger); }
	.roles { gap: 0.25rem; margin: 0.4rem 0; }
	.chip { background: none; font-size: 0.75rem; }
	.chip.on { background: var(--accent); color: var(--ink); }
	.search { width: 100%; padding: 0.35rem 0.5rem; border: 1px solid var(--line); background: transparent; border-radius: 6px; margin-bottom: 0.4rem; }
	.people { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
	.people li { display: flex; justify-content: space-between; gap: 0.4rem; border-bottom: 1px dotted var(--line); padding-bottom: 0.35rem; }
	.col { display: flex; flex-direction: column; gap: 0.2rem; }
	.sheet { border: 1px solid var(--line); border-radius: 8px; padding: 0.6rem; }
	.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; margin: 0.4rem 0; font-variant-numeric: tabular-nums; }
	.acts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; }
	.warn { border-color: color-mix(in srgb, var(--danger) 50%, transparent); }
	.rift { width: 100%; margin-top: 0.4rem; border-color: #c56cff; box-shadow: 0 0 12px rgba(197, 108, 255, 0.35); }
	.link { background: none; border: 0; padding: 0; }
	.note { font-size: 0.85rem; padding: 0.4rem; border: 1px dashed var(--accent); border-radius: 6px; }
	.ambition { border: 1px solid var(--line); border-radius: 8px; padding: 0.6rem; }
	.amb-row { display: flex; gap: 0.5rem; align-items: center; }
	.amb-ico { font-size: 1.3rem; }
	.amb-choices { display: flex; flex-direction: column; gap: 0.3rem; }
	.amb-choice { display: flex; gap: 0.5rem; align-items: center; text-align: left; }
	.bar { height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; margin-top: 0.4rem; }
	.bar div { height: 100%; background: var(--accent); }
	.comps, .letters { list-style: none; margin: 0 0 0.4rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
	.letters li { border-left: 2px solid var(--accent); padding-left: 0.5rem; font-size: 0.9rem; }
</style>
