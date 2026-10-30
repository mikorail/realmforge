<script lang="ts">
	import { BIOMES } from '#lib/gen/physical';
	import { SPHERE_BY_ID } from '#lib/gen/spheres';
	import type { GenreDef } from '#lib/gen/genre';
	import type { Simulation } from '#lib/sim/engine';
	import type { EventKind } from '#lib/sim/types';
	import { SPECIES_BY_ID } from '#lib/gen/species';
	import { ERAS, DISCOVERIES, TECH_BRANCHES, type TechBranch } from '#lib/sim/tech';
	import { synthesizeAnnualAnnals, compileAnnalsBookMarkdown } from '#lib/sim/chronicle';
	import { annalsAppendix, biography, rulerName } from '#lib/sim/story/index';
	import { IDEOLOGIES } from '#lib/sim/politics';
	import { techName, techDesc } from '#lib/sim/genre/techskins';
	import { monsterSkin, wonderSkin } from '#lib/sim/genre/creatureskins';
	import CultureCard from './CultureCard.svelte';
	import CultureLists from './CultureLists.svelte';
	import HeraldryBadge from './HeraldryBadge.svelte';
	import SectorBars from './SectorBars.svelte';
	import { getRealmCoatOfArms, getBurgCoatOfArms } from '#lib/render/heraldry';
	import { getBurgDistricts } from '#lib/sim/burgs';
	import { getMegastructureState } from '#lib/sim/megastructures';

	let { sim, v, cell, layer, terms, onfocus, onselect, ondynasty, onburg, onleagues, ondelve, onmegastructure, onapotheosis, oncrises, onsagas, oncongress }: {
		sim: Simulation; v: number; cell: number; layer: number; terms: GenreDef['terms'];
		onfocus: (c: number | undefined) => void; onselect: (c: number) => void;
		ondynasty?: (rulerId: number) => void;
		onburg?: (burgId: number) => void;
		onleagues?: () => void;
		ondelve?: (cell: number) => void;
		onmegastructure?: (site: any) => void;
		onapotheosis?: () => void;
		oncrises?: () => void;
		onsagas?: () => void;
		oncongress?: () => void;
	} = $props();

	type MainTab = 'overview' | 'quests' | 'wonders' | 'monsters' | 'luminaries' | 'tech';
	let mainTab = $state<MainTab>('overview');

	const KIND_ICON: Record<EventKind, string> = {
		war: '⚔', peace: '☮', death: '✝', birth: '✶', found: '⚑',
		fall: '☗', rebel: '✊', disaster: '☄', god: '✦', avatar: '◆',
		faith: '☥', misc: '•', capture: '⛫', monster: '🐉', wonder: '🏛',
		luminary: '📜', tech: '💡', coup: '👑', intrigue: '🗡', quest: '🗺',
		eco_disaster: '🌪', uprising: '🔥', culture: '🏮'
	};

	let cultureCardId = $state<number | null>(null);
	let filter = $state<EventKind | 'all'>('all');
	let chronMode = $state<'annals' | 'timeline'>('annals');
	let copiedAnnals = $state(false);

	async function copyAnnals() {
		const evList = sim.allEvents && sim.allEvents.length ? sim.allEvents : sim.events;
		const text = compileAnnalsBookMarkdown(evList, sim.w.name, 1000, annalsAppendix(sim));
		try {
			await navigator.clipboard.writeText(text);
			copiedAnnals = true;
			setTimeout(() => { copiedAnnals = false; }, 2000);
		} catch {
			// fallback
		}
	}

	const activeEra = $derived.by(() => {
		void v;
		return ERAS[sim.era] ?? ERAS[0];
	});
	const nextEra = $derived.by(() => {
		void v;
		return ERAS[sim.era + 1] ?? null;
	});
	const unlockedTechs = $derived.by(() => {
		void v;
		return DISCOVERIES.filter((d) => sim.techs.has(d.id));
	});

	const cellWonder = $derived.by(() => {
		void v;
		if (cell < 0) return null;
		return sim.wonders?.find((w) => w.cell === cell && w.layer === layer) ?? null;
	});

	const cellMonster = $derived.by(() => {
		void v;
		if (cell < 0) return null;
		return sim.monsters?.find((m) => m.cell === cell && m.layer === layer && m.alive) ?? null;
	});

	const wondersList = $derived.by(() => {
		void v;
		return sim.wonders ?? [];
	});

	const monstersList = $derived.by(() => {
		void v;
		return (sim.monsters ?? []).slice().sort((a, b) => (b.alive ? 1 : 0) - (a.alive ? 1 : 0));
	});

	const luminariesList = $derived.by(() => {
		void v;
		return sim.people.filter((p) => p.alive && ['magician', 'thinker', 'artist', 'athlete', 'inventor'].includes(p.role)).sort((a, b) => b.renown - a.renown);
	});

	const questsList = $derived.by(() => {
		void v;
		return sim.quests ?? [];
	});

	const info = $derived.by(() => {
		void v;
		if (cell < 0) return null;
		const w = sim.w, c = w.cells;
		const L = w.layers[layer];
		const open = L.open[cell] === 1;
		const pol = open ? sim.polities[L.state[cell]] : null;
		const bid = sim.lb[layer][cell];
		const burg = bid ? w.burgs[bid] : null;
		const river = c.river[cell] ? w.rivers[c.river[cell]] : null;
		const cult = layer === 0 ? w.cultures[c.culture[cell]] : burg ? w.cultures[burg.culture] : null;
		const rel = layer === 0 ? w.religions[c.religion[cell]] : pol ? w.religions[pol.religion] : null;
		return { c, L, open, pol: pol?.alive && pol.id ? pol : null, burg, river, cult, rel };
	});

	const realm = $derived.by(() => {
		void v;
		const p = info?.pol;
		if (!p) return null;
		const ruler = sim.people[p.ruler];
		const heir = sim.people[p.heir];
		const wars = sim.warsOf(p.id);
		const enemies = wars.flatMap((w) => (w.attackers.includes(p.id) ? w.defenders : w.attackers)).map((id) => sim.polities[id]);
		const speciesDef = SPECIES_BY_ID[p.species ?? 'human'] ?? SPECIES_BY_ID['human'];
		return { p, ruler, heir: heir?.alive ? heir : null, wars, enemies, allies: p.allies.map((a) => sim.polities[a]), layerName: sim.w.layers[p.layer]?.name, speciesDef };
	});

	const rulerBio = $derived.by(() => {
		void v;
		const id = realm?.ruler?.id;
		return id ? biography(sim, id) : null;
	});

	const realmArtifacts = $derived.by(() => {
		void v;
		const polId = realm?.p.id;
		if (!polId) return [];
		return sim.artifacts.filter((a) => (a.holderType === 'polity' && a.holderId === polId) || (a.holderType === 'person' && a.holderId === realm?.ruler?.id));
	});

	const realms = $derived.by(() => {
		void v;
		return sim.polities.filter((p) => p.alive && p.id).sort((a, b) => b.cells - a.cells).slice(0, 14);
	});
	const fallenRealms = $derived.by(() => {
		void v;
		return sim.polities.filter((p) => !p.alive && p.id > 0 && p.fell !== undefined).sort((a, b) => a.founded - b.founded);
	});
	const wars = $derived.by(() => {
		void v;
		return sim.wars.filter((w) => !w.end).slice(-6);
	});
	const events = $derived.by(() => {
		void v;
		const evList = sim.allEvents && sim.allEvents.length ? sim.allEvents : sim.events;
		const ev = filter === 'all' ? evList : evList.filter((e) => e.kind === filter);
		return ev.slice(-70).reverse();
	});
	const annalsEntries = $derived.by(() => {
		void v;
		const evList = sim.allEvents && sim.allEvents.length ? sim.allEvents : sim.events;
		return synthesizeAnnualAnnals(evList, sim.w.name, 1000);
	});
	const fmt = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));

	const techBranchesList = (Object.keys(TECH_BRANCHES) as TechBranch[]).map((k) => TECH_BRANCHES[k]);
</script>

<!-- Sub Navigation Tabs -->
<nav class="sub-nav">
	<button class="nav-pill" class:active={mainTab === 'overview'} onclick={() => (mainTab = 'overview')}>Overview</button>
	<button class="nav-pill" class:active={mainTab === 'quests'} onclick={() => (mainTab = 'quests')}>Quests ({questsList.filter((q) => !q.completed).length})</button>
	<button class="nav-pill" class:active={mainTab === 'wonders'} onclick={() => (mainTab = 'wonders')}>Wonders ({wondersList.length})</button>
	<button class="nav-pill" class:active={mainTab === 'monsters'} onclick={() => (mainTab = 'monsters')}>Beasts ({monstersList.length})</button>
	<button class="nav-pill" class:active={mainTab === 'luminaries'} onclick={() => (mainTab = 'luminaries')}>Luminaries ({luminariesList.length})</button>
	<button class="nav-pill" class:active={mainTab === 'tech'} onclick={() => (mainTab = 'tech')}>Tech Tree</button>
</nav>

{#if mainTab === 'overview'}
	<!-- Cell / Wonder / Monster Context -->
	{#if cellWonder}
		<section class="card wonder-highlight" class:ruined-card={cellWonder.destroyed}>
			<div class="row between">
				<h3><span class="ico">{cellWonder.destroyed ? '🏚️' : (wonderSkin(sim.voice, cellWonder.kind)?.icon ?? cellWonder.icon)}</span> {cellWonder.name}{cellWonder.destroyed ? ' (Ruins)' : ''}</h3>
				<span class="chip" class:bad={cellWonder.destroyed} class:on={!cellWonder.destroyed}>{cellWonder.destroyed ? `Ruined (${cellWonder.destroyedYear})` : cellWonder.kind === 'titan_shrine' ? 'Titan Shrine' : 'Wonder'}</span>
			</div>
			<p class="small">{wonderSkin(sim.voice, cellWonder.kind)?.lore ?? cellWonder.description}</p>
			{#if cellWonder.destroyed}
				<div class="stat small"><span>Status</span><span class="bad">Destroyed by {cellWonder.destroyer} ({cellWonder.ruinCause})</span></div>
			{:else}
				<div class="stat small"><span>Benefit</span><span class="gold-text">{cellWonder.effect}</span></div>
			{/if}
			{#if cellWonder.builder}<div class="stat small"><span>Founder</span><span>{cellWonder.builder}</span></div>{/if}
			{#if cellWonder.monumentTo}<div class="stat small"><span>Sanctuary Of</span><span class="bad">Fallen {cellWonder.monumentTo}</span></div>{/if}
		</section>
	{/if}

	{#if cellMonster}
		<section class="card monster-highlight">
			<div class="row between">
				<h3><span class="ico">{monsterSkin(sim.voice, cellMonster.species)?.icon ?? cellMonster.icon}</span> {cellMonster.name}{#if monsterSkin(sim.voice, cellMonster.species)} <span class="muted small">({monsterSkin(sim.voice, cellMonster.species)?.name})</span>{/if}</h3>
				<span class="chip bad">{cellMonster.tier} {cellMonster.category}</span>
			</div>
			<p class="small">{monsterSkin(sim.voice, cellMonster.species)?.lore ?? cellMonster.lore}</p>
			<div class="stat small"><span>Power · Health</span><span>⚔ {cellMonster.power} · ❤️ {cellMonster.health}/{cellMonster.maxHealth}</span></div>
			<div class="stat small"><span>Toughness</span><span>🛡 {Math.round((cellMonster.armor ?? 0) * 100)}% Armor{cellMonster.hardToKill ? ' (Hard to Kill)' : ''} · 💚 +{cellMonster.regen ?? 5} HP/yr</span></div>
			<div class="stat small"><span>Harvest Bounty</span><span class="gold-text">🏆 {cellMonster.trophy || 'Dragonhide & Titan Bones'}</span></div>
		</section>
	{/if}

	{#if info}
		<section class="card">
			{#if info.burg}
				{@const bCoa = getBurgCoatOfArms(sim.w.opts.seed, info.burg, info.pol ?? undefined)}
				{@const dists = getBurgDistricts(info.burg)}
				<div class="row between" style="align-items: center; margin-bottom: 0.35rem;">
					<div class="row" style="gap: 8px; align-items: center;">
						<HeraldryBadge coa={bCoa} size={28} />
						<h3 style="margin: 0;">{info.burg.name} <span class="chip">{info.burg.kind}{info.burg.capital ? ' · capital' : ''}</span></h3>
					</div>
					{#if onburg}
						<button class="btn small" style="padding: 2px 8px;" onclick={() => onburg?.(info.burg!.id)} title="Manage Settlement Districts, Governor, and Garrison">🏛️ Manage</button>
					{/if}
				</div>
				<div class="stat"><span>Population</span><span>{(info.burg.pop * 1000).toFixed(0)}</span></div>
				{#if info.burg.governor && sim.people[info.burg.governor]?.alive}
					<div class="stat"><span>Governor</span><span>{sim.people[info.burg.governor].name}</span></div>
				{/if}
				{#if (info.burg.garrison ?? 0) > 0}
					<div class="stat"><span>Garrison</span><span>🛡️ {info.burg.garrison} points</span></div>
				{/if}
				{#if info.burg.charter}
					<div class="stat"><span>Charter</span><span class="chip on" style="font-size: 0.72rem; padding: 1px 6px;">📜 Royal Municipal Charter</span></div>
				{/if}
				{#if info.burg.banditCove}
					<div class="stat"><span class="bad">Outlaw Threat</span><span class="chip bad">⚔️ Bandit Encampment</span></div>
				{/if}
				{#if info.burg.pirateCove}
					<div class="stat"><span class="bad">Maritime Threat</span><span class="chip bad">🏴‍☠️ Pirate Haven</span></div>
				{/if}
				<div class="row" style="gap: 4px; margin: 4px 0 6px; flex-wrap: wrap;">
					{#if dists.walls > 0}<span class="chip" title="Walls level {dists.walls}">🛡️ W{dists.walls}</span>{/if}
					{#if dists.market > 0}<span class="chip" title="Market level {dists.market}">💰 M{dists.market}</span>{/if}
					{#if dists.granary > 0}<span class="chip" title="Granary level {dists.granary}">🌾 G{dists.granary}</span>{/if}
					{#if dists.temple > 0}<span class="chip" title="Temple level {dists.temple}">✨ T{dists.temple}</span>{/if}
					{#if dists.academy > 0}<span class="chip" title="Academy level {dists.academy}">📚 A{dists.academy}</span>{/if}
				</div>
				<SectorBars {sim} {v} burg={info.burg.id} />
			{/if}
			{#if layer === 0}
				<div class="stat"><span>Land</span><span>{info.c.h[cell] < 20 ? 'Water' : BIOMES[info.c.biome[cell]].name}</span></div>
				<div class="stat"><span>Elevation · Temp · Rain</span><span>{info.c.h[cell]} · {info.c.temp[cell]}° · {info.c.prec[cell]}</span></div>
				{#if info.river}<div class="stat"><span>River</span><span>{info.river.name}</span></div>{/if}
			{:else}
				<div class="stat"><span>Plane</span><span>{info.L.name}{info.open ? '' : ' · solid'}</span></div>
			{/if}
			{#if info.cult && info.cult.id}
				{@const sp = SPECIES_BY_ID[info.cult.species ?? 'human'] ?? SPECIES_BY_ID['human']}
				<div class="stat">
					<span>Culture</span>
					<span><span class="swatch" style="background:{info.cult.color}"></span><button class="link" onclick={() => (cultureCardId = info.cult?.id ?? null)} title="Open culture card">{info.cult.name}</button> <span class="muted">({sp.icon} {sp.name})</span></span>
				</div>
			{/if}
			{#if info.rel && info.rel.id}
				<div class="stat">
					<span>Faith</span>
					<span><span class="swatch" style="background:{info.rel.color}"></span>{info.rel.name}</span>
				</div>
				{#if info.rel.theology || info.rel.doctrine}
					<div class="small muted" style="margin: 2px 0 3px;">
						{#if info.rel.theology}
							<span class="chip on" style="font-size: 0.72rem; padding: 1px 6px;">{info.rel.theology}</span>
						{/if}
						{#if info.rel.doctrine}
							<span class="chip" style="font-size: 0.72rem; padding: 1px 6px; margin-left: 4px;">{info.rel.doctrine}</span>
						{/if}
					</div>
				{/if}
			{/if}
			{#if ondelve && cell >= 0}
				<button class="btn small" onclick={() => ondelve?.(cell)} style="margin-top: 6px; width: 100%;" title="Delve ancient ruins, sunken vaults, and underdark chasms">🗺️ Delve Ancient Ruins & Vaults</button>
			{/if}
		</section>
	{/if}

	{#if realm}
		{@const p = realm.p}
		<section class="card realm" style="--rc:{p.color}">
			<div class="row between" style="align-items: center;">
				<div class="row" style="gap: 8px; align-items: center;">
					<HeraldryBadge coa={getRealmCoatOfArms(sim.w.opts.seed, p)} size={32} />
					<h3 style="margin: 0;"><span class="swatch" style="background:{p.color}"></span>{p.fullName}</h3>
				</div>
				<div class="row" style="gap: 4px; align-items: center;">
					{#if p.secularized}
						<span class="chip bad" style="font-size: 0.72rem; padding: 1px 6px;" title="State Atheism enacted year {p.secularYear}">🚫 State Atheism</span>
					{:else if p.reformed}
						<span class="chip on" style="font-size: 0.72rem; padding: 1px 6px;" title="Reformed Confession">📜 Reformed</span>
					{/if}
					{#if p.patronDeity}
						<span class="chip on" style="font-size: 0.72rem; padding: 1px 6px; background: rgba(245, 158, 11, 0.2); border-color: #f59e0b;" title="Patron God: {p.patronDeity} ({p.patronDomain}) - {p.patronFavor}% Favor{p.isChosenRealm ? ' - Chosen Realm' : ''}">✨ {p.patronDeity.split(' ')[0]}</span>
					{/if}
					{#if p.ideology}
						<span class="chip on" style="font-size: 0.72rem; padding: 1px 6px;" title="State Ideology: {p.ideology}">🏛 {p.ideology}</span>
					{/if}
					<span class="chip species-chip" title={realm.speciesDef.desc}>{realm.speciesDef.icon} {realm.speciesDef.name}</span>
				</div>
			</div>
			<p class="muted small">
				Founded {p.founded < 0 ? `${-p.founded} years before the chronicle` : `year ${p.founded}`} · {realm.layerName}{p.origin !== 'founding' ? ` · born of ${p.origin}` : ''}
				{#if p.reformedSystemYear}
					· reformed {p.reformedSystemYear} ({p.systemChangeCause ?? 'revolution'})
				{/if}
			</p>
			{#if realm.ruler?.alive}
				{@const rulerSp = SPECIES_BY_ID[realm.ruler.species ?? 'human'] ?? realm.speciesDef}
				<div class="stat">
					<span>Ruler</span>
					<span>{rulerName(realm.ruler)} {realm.ruler.house}, {sim.ageOf(realm.ruler)} <span class="muted small">({rulerSp.icon} {rulerSp.name})</span></span>
				</div>
				<div class="small muted">{realm.ruler.traits.join(' · ')} · ⚔{realm.ruler.martial} ✉{realm.ruler.diplomacy} ⚖{realm.ruler.stewardship} 🗝{realm.ruler.intrigue}</div>
			{/if}
			{#if p.era}
				<div class="stat small" title={p.eras?.map((e) => `${e.name} (${e.from}-${e.to})`).join('\n')}><span>Era</span><span>{p.era}</span></div>
			{/if}
			{#if rulerBio}
				<details class="small" style="margin: 4px 0;">
					<summary>Biography of the ruler</summary>
					<p class="muted">{rulerBio.summary}</p>
					<ul class="list">
						{#each rulerBio.entries as e (e.id ?? e.text)}<li><span class="muted">Y{e.y}</span> {e.text}</li>{/each}
					</ul>
				</details>
			{/if}
			{#if realm.heir}<div class="stat"><span>Heir</span><span>{realm.heir.name}, {sim.ageOf(realm.heir)}</span></div>{/if}
			<div class="grid2 nums">
				<div class="stat"><span>Land</span><span>{p.cells}</span></div>
				<div class="stat"><span>People</span><span>{(p.pop * 1000).toFixed(0)}</span></div>
				<div class="stat"><span>{terms.army}</span><span>{(p.army * 1000).toFixed(0)}</span></div>
				<div class="stat"><span>{terms.gold}</span><span>{fmt(p.treasury)}</span></div>
				<div class="stat"><span>Stability</span><span class:bad={p.stability < 30}>{p.stability.toFixed(0)}</span></div>
				<div class="stat"><span>Tax</span><span>{(p.tax * 100).toFixed(0)}%</span></div>
			</div>
			<SectorBars {sim} {v} realm={p.id} />
			{#if p.patronDeity}
				<div class="stat small" style="margin-top: 4px;">
					<span>Patron God</span>
					<span style="color: #ffd700;">✨ {p.patronDeity} ({p.patronDomain}) · {p.patronFavor ?? 50}% Favor{p.isChosenRealm ? ' ★ Chosen Realm' : ''}</span>
				</div>
			{/if}
			{#if p.factions && p.factions.length > 0}
				<div class="factions-box">
					<div class="row between" style="margin-bottom: 4px;">
						<strong class="small">Political Factions & Parties</strong>
						<span class="muted small">{p.factions.length} factions</span>
					</div>
					{#each p.factions as f (f.name)}
						<div class="faction-row">
							<div class="row between small">
								<span>{IDEOLOGIES[f.ideology]?.icon ?? '🏛'} <strong>{f.name}</strong> <span class="muted">({f.ideology})</span></span>
								<span>{f.influence}% infl · <span class:bad={f.militancy > 50}>{f.militancy}% mil</span></span>
							</div>
							<div class="bar-container" style="height: 4px; margin: 2px 0 4px;">
								<div class="bar-fill" style="width: {f.influence}%; background: {f.militancy > 60 ? '#e05252' : f.militancy > 35 ? '#e8a838' : 'var(--accent)'};"></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			<div class="divine-system-box" style="margin-top: 0.6rem; padding: 0.5rem; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius: 8px; background: color-mix(in srgb, var(--accent) 6%, transparent);">
				<div class="row between small" style="margin-bottom: 0.35rem;">
					<strong>✨ Divine Will: Transform System</strong>
					<span class="muted small">{sim.sandbox ? '∞ power' : `${sim.mana.toFixed(0)} / ${sim.manaMax} mana`}</span>
				</div>
				<div class="row small" style="gap: 4px; margin-bottom: 0.4rem; align-items: center;">
					<span class="muted">Ordain:</span>
					<select
						class="small"
						style="flex: 1; padding: 2px 4px; border-radius: 4px; background: var(--bg); border: 1px solid var(--line); color: var(--text);"
						value={sim.divineTargetIdeology ?? ''}
						onchange={(e) => {
							const val = (e.target as HTMLSelectElement).value;
							sim.divineTargetIdeology = val ? (val as any) : undefined;
						}}
					>
						<option value="">Auto (Divine Providence / Factional Will)</option>
						<option value="republic">🏛️ Civic Republic</option>
						<option value="monarchy">👑 Hereditary Monarchy</option>
						<option value="theocracy">☀️ Holy Theocracy</option>
						<option value="communal">🌾 Agrarian Commonweal</option>
						<option value="autocracy">⚔️ Military Stratocracy</option>
						<option value="oligarchy">⚖️ Merchant Oligarchy</option>
						<option value="technocracy">⚙️ Artificer Technocracy</option>
					</select>
				</div>
				<div class="row" style="gap: 4px; flex-wrap: wrap;">
					<button
						class="btn small"
						style="flex: 1; min-width: 80px;"
						disabled={!sim.sandbox && sim.mana < 20}
						onclick={() => {
							const targetCell = p.capital ? sim.w.burgs[p.capital]?.cell ?? cell : cell;
							sim.cast('reform', targetCell, layer);
							onselect(cell);
						}}
						title="Inspire the Grand Assembly to peacefully enact constitutional reform by divine mandate (Cost: 20)"
					>
						📜 Reform
					</button>
					<button
						class="btn small"
						style="flex: 1; min-width: 80px;"
						disabled={!sim.sandbox && sim.mana < 25}
						onclick={() => {
							const targetCell = p.capital ? sim.w.burgs[p.capital]?.cell ?? cell : cell;
							sim.cast('revolution', targetCell, layer);
							onselect(cell);
						}}
						title="Ignite a popular mass revolution to topple autocracy by divine will (Cost: 25)"
					>
						✊ Revolution
					</button>
					<button
						class="btn small"
						style="flex: 1; min-width: 80px;"
						disabled={!sim.sandbox && sim.mana < 25}
						onclick={() => {
							const targetCell = p.capital ? sim.w.burgs[p.capital]?.cell ?? cell : cell;
							sim.cast('coup', targetCell, layer);
							onselect(cell);
						}}
						title="Incite a military putsch or palace conspiracy to seize power by divine mandate (Cost: 25)"
					>
						⚔️ Coup
					</button>
					<button
						class="btn small"
						style="flex: 1; min-width: 80px;"
						disabled={!sim.sandbox && sim.mana < 30}
						onclick={() => {
							const targetCell = p.capital ? sim.w.burgs[p.capital]?.cell ?? cell : cell;
							sim.cast('conspiracy', targetCell, layer);
							onselect(cell);
						}}
						title="Shatter the empire from within via assassination, treasury plundering, and mutinous fragmentation (Cost: 30)"
					>
						🗡️ Conspire
					</button>
					<button
						class="btn small"
						style="flex: 1; min-width: 80px;"
						disabled={!sim.sandbox && sim.mana < 35}
						onclick={() => {
							sim.divineTargetPolityId = p.id;
							const targetCell = p.capital ? sim.w.burgs[p.capital]?.cell ?? cell : cell;
							sim.cast('resurgence', targetCell, layer);
							onselect(cell);
						}}
						title="Resurrect ancestral dynasty and elevate into a Phoenix Empire with 150k legions and Golden Age (Cost: 35)"
					>
						🦅 Resurgence
					</button>
				</div>
			</div>
			{#if realm.enemies.length}<p class="small"><strong class="bad">At war with</strong> {realm.enemies.map((e) => e.name).join(', ')}</p>{/if}
			{#if realm.allies.length}<p class="small"><strong>Allies</strong> {realm.allies.map((e) => e.name).join(', ')}</p>{/if}
			{#if realmArtifacts.length > 0}
				<p class="small">
					<strong>Sacred Relics:</strong> {realmArtifacts.map((a) => `${a.icon} ${a.name}`).join(' · ')}
				</p>
			{/if}
			{#if ondynasty && realm.ruler?.id}
				<div style="margin-top: 0.5rem">
					<button class="btn small" onclick={() => ondynasty?.(realm.ruler.id)}>House Lineage & Relics</button>
				</div>
			{/if}
		</section>
	{/if}

	{#if wars.length}
		<section>
			<h3>Wars</h3>
			<ul class="list">
				{#each wars as w (w.id)}
					<li>
						<strong>{w.name}</strong>
						<span class="small muted">since {w.start} · score {w.score > 0 ? '+' : ''}{w.score}</span>
						<div class="small">{w.attackers.map((x) => sim.polities[x].name).join(', ')} <span class="bad">vs</span> {w.defenders.map((x) => sim.polities[x].name).join(', ')}</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="card era-card">
		<div class="row between">
			<strong>{activeEra.name}</strong>
			<span class="chip on">{activeEra.genreName}</span>
		</div>
		<p class="small muted">{activeEra.blurb}</p>
		{#if nextEra}
			<div class="stat small">
				<span>Era Progress ({sim.innovation.toFixed(0)} / {nextEra.threshold})</span>
				<span>{Math.min(100, Math.round((sim.innovation / nextEra.threshold) * 100))}%</span>
			</div>
			<div class="bar-container">
				<div class="bar-fill" style="width: {Math.min(100, (sim.innovation / nextEra.threshold) * 100)}%"></div>
			</div>
		{:else}
			<div class="small muted">Technological zenith achieved.</div>
		{/if}
		{#if unlockedTechs.length > 0}
			<div class="tech-chips">
				{#each unlockedTechs as t (t.id)}
					<span class="chip" title={techDesc(sim.voice, t.id, t.description)}>{t.icon} {techName(sim.voice, t.id, t.name)}</span>
				{/each}
			</div>
		{/if}
	</section>

	<section>
		<div class="row between" style="align-items: center; margin-bottom: 0.35rem;">
			<h3 style="margin: 0;">Great Realms</h3>
			<div class="row" style="gap: 4px; align-items: center;">
				{#if onmegastructure}
					{@const ms = getMegastructureState(sim)}
					<button class="chip on" onclick={() => onmegastructure(ms.tower)} title="The Spire of Trials">🗼 Spire</button>
					<button class="chip on" onclick={() => onmegastructure(ms.abyss)} title="The Bottomless Abyss">🕳️ Abyss</button>
				{/if}
				{#if onleagues}
					<button class="chip on" onclick={onleagues} title="Open Trade Leagues, Coalitions, and Outlaw Havens">⚖️ Leagues</button>
				{/if}
				{#if onapotheosis}
					<button class="chip on" onclick={onapotheosis} title="Avatar Divine Ascension and Holy Orders">👑 Ascend</button>
				{/if}
				{#if oncrises}
					<button class="chip on" onclick={oncrises} title="Planetary Grand Crises and Contagion Quarantine">☄️ Crises</button>
				{/if}
				{#if onsagas}
					<button class="chip on" onclick={onsagas} title="Living Bardic Tradition, Heroic Sagas, and Monuments">📜 Sagas</button>
				{/if}
				{#if oncongress}
					<button class="chip on" onclick={oncongress} title="Grand World Congress and Planetary Megaprojects">🌐 Congress</button>
				{/if}
			</div>
		</div>
		<ul class="list">
			{#each realms as p (p.id)}
				{@const sp = SPECIES_BY_ID[p.species ?? 'human'] ?? SPECIES_BY_ID['human']}
				<li>
					<button class="link" onclick={() => onfocus(sim.w.burgs[p.capital]?.cell)} style="display: flex; align-items: center; gap: 6px;">
						<HeraldryBadge coa={getRealmCoatOfArms(sim.w.opts.seed, p)} size={18} showBlazonTooltip={false} />
						<span class="swatch" style="background:{p.color}"></span>
						<span>{p.name}</span>
						<span class="muted small">{sp.icon} {p.form} · {p.cells}{p.layer ? ` · ${sim.w.layers[p.layer].name}` : ''}</span>
					</button>
				</li>
			{/each}
		</ul>
		{#if fallenRealms.length > 0}
			<details class="small" style="margin-top: 0.5rem;">
				<summary style="cursor: pointer; font-weight: 600; color: var(--muted);">
					Fallen Kingdoms & Ancient Dynasties ({fallenRealms.length})
				</summary>
				<ul class="list" style="margin-top: 0.35rem;">
					{#each fallenRealms.slice(0, 10) as fp (fp.id)}
						{@const fSp = SPECIES_BY_ID[fp.species ?? 'human'] ?? SPECIES_BY_ID['human']}
						<li style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid var(--line);">
							<div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
								<span class="swatch" style="background:{fp.color}; opacity: 0.6;"></span>
								<strong style="white-space: nowrap;">{fp.name}</strong>
								<span class="muted small" style="white-space: nowrap;">(Y{fp.founded} to Y{fp.fell ?? '?'}) · {fSp.icon} {fp.form}</span>
							</div>
							<button
								class="btn small"
								style="padding: 2px 6px; font-size: 0.72rem; white-space: nowrap;"
								disabled={!sim.sandbox && sim.mana < 35}
								onclick={() => {
									sim.divineTargetPolityId = fp.id;
									const capCell = fp.capital ? sim.w.burgs[fp.capital]?.cell ?? cell : cell;
									sim.cast('resurgence', capCell, layer);
									onselect(capCell);
								}}
								title="Resurrect ancient House and restore the {fp.name} Phoenix Empire (Cost: 35)"
							>
								🦅 Resurge
							</button>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>

	<CultureLists {sim} {v} {onfocus} />

	<section class="chronicle-section">
		<div class="row between chronicle-header">
			<h3>Chronicle</h3>
			<div class="row toggles">
				<button class="chip" class:on={chronMode === 'annals'} onclick={() => (chronMode = 'annals')}>Annals</button>
				<button class="chip" class:on={chronMode === 'timeline'} onclick={() => (chronMode = 'timeline')}>Timeline</button>
				{#if chronMode === 'annals'}
					<button class="chip copy-btn" onclick={copyAnnals} title="Copy annals lore as Markdown">{copiedAnnals ? 'Copied!' : 'Copy Annals'}</button>
				{/if}
			</div>
		</div>

		{#if chronMode === 'annals'}
			<div class="annals-book">
				{#if annalsEntries.length === 0}
					<p class="muted small">The pages of this chronicle remain unwritten.</p>
				{:else}
					{#each annalsEntries as a (a.year)}
						<article class="annal-chapter">
							<header class="annal-header">
								<span class="annal-year">Anno {a.year}</span>
								<span class="annal-headline">{a.headline}</span>
							</header>
							<p class="annal-prose">{a.prose}</p>
							{#if a.events && a.events.length > 0}
								<div class="annal-tags">
									{#each a.events.slice(0, 5) as hl (hl.id ?? (hl.y + ':' + hl.m + ':' + hl.text))}
										<button
											class="annal-tag-btn"
											onclick={() => { if (hl.cell !== undefined) { onfocus(hl.cell); onselect(hl.cell); } }}
											title={hl.text}
										>
											<span class="ico">{KIND_ICON[hl.kind]}</span>
											{hl.kind}
										</button>
									{/each}
								</div>
							{/if}
						</article>
					{/each}
				{/if}
			</div>
		{:else}
			<div class="row filters">
				{#each (['all', 'war', 'peace', 'fall', 'death', 'rebel', 'uprising', 'culture', 'disaster', 'monster', 'wonder', 'luminary', 'tech', 'god'] as const) as k}
					<button class="chip" class:on={filter === k} onclick={() => (filter = k as EventKind | 'all')}>{k === 'all' ? 'All' : `${KIND_ICON[k as EventKind]} ${k}`}</button>
				{/each}
			</div>
			<ol class="events">
				{#each events as e (e.id ?? (e.y + ':' + e.m + ':' + e.text))}
					<li class={e.kind}>
						<button class="link" onclick={() => { if (e.cell !== undefined) { onfocus(e.cell); onselect(e.cell); } }} disabled={e.cell === undefined}>
							<span class="yr">Y{e.y}·M{e.m + 1}</span> <span class="ico">{KIND_ICON[e.kind]}</span> {e.text}
						</button>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
{:else if mainTab === 'quests'}
	<section class="tab-panel">
		<header class="panel-header">
			<h3>Story Quests & Expeditions</h3>
			<p class="muted small">Legendary hunts, relic recovery expeditions, dungeon rescues, and forgotten ruin excavations.</p>
		</header>
		{#if questsList.length === 0}
			<p class="muted small">No active or completed quests recorded in the chronicle yet.</p>
		{:else}
			<div class="items-grid">
				{#each questsList.slice().reverse() as q (q.id)}
					<article class="card item-card quest-card">
						<div class="row between">
							<h4><span class="ico">{q.icon}</span> {q.title}</h4>
							<span class="chip" class:on={q.stage === 'completed'} class:bad={q.stage === 'failed'}>{q.stage}</span>
						</div>
						<p class="small muted"><strong>{q.heroName}</strong> · Year {q.year} · Type: {q.kind}</p>
						{#if q.reward}
							<div class="stat small"><span>Reward</span><span class="gold-text">{q.reward}</span></div>
						{/if}
						{#if q.storyLog && q.storyLog.length > 0}
							<div class="quest-log-box small">
								{#each q.storyLog as l}
									<div class="quest-log-entry">• {l}</div>
								{/each}
							</div>
						{/if}
						<div class="row between" style="margin-top: 0.35rem">
							<span class="small muted">Target: {q.targetName}</span>
							<button class="btn tiny" onclick={() => { onfocus(q.targetCell); onselect(q.targetCell); }}>Focus Target</button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
{:else if mainTab === 'wonders'}
	<section class="tab-panel">
		<header class="panel-header">
			<h3>Wonders of the Mortal World</h3>
			<p class="muted small">Monumental architectural triumphs, arcane spires, and ancient natural sanctums across the cosmos.</p>
		</header>
		{#if wondersList.length === 0}
			<p class="muted small">No wonders recorded in this world.</p>
		{:else}
			<div class="items-grid">
				{#each wondersList as wd (wd.id)}
					<article class="card item-card" class:ruined-card={wd.destroyed}>
						<div class="row between">
							<h4><span class="ico">{wd.destroyed ? '🏚️' : (wonderSkin(sim.voice, wd.kind)?.icon ?? wd.icon)}</span> {wd.name}{wd.destroyed ? ' (Ruins)' : ''}{#if wonderSkin(sim.voice, wd.kind)} <span class="muted small">({wonderSkin(sim.voice, wd.kind)?.name})</span>{/if}</h4>
							<div class="row" style="gap: 4px; align-items: center;">
								{#if wd.destroyed}
									<span class="chip bad">Ruined ({wd.destroyedYear})</span>
								{:else}
									<span class="chip on">Standing</span>
								{/if}
								<button class="btn tiny" onclick={() => { onfocus(wd.cell); onselect(wd.cell); }}>Focus Map</button>
							</div>
						</div>
						<p class="small">{wonderSkin(sim.voice, wd.kind)?.lore ?? wd.description}</p>
						<div class="lore-box small muted">{wd.lore}</div>
						{#if wd.destroyed}
							<div class="stat small"><span>Ruin & Destroyer</span><span class="bad">{wd.destroyer} ({wd.ruinCause})</span></div>
						{:else}
							<div class="stat small"><span>Benefit</span><span class="gold-text">{wd.effect}</span></div>
						{/if}
						{#if wd.builder}<div class="stat small"><span>Founder</span><span>{wd.builder}</span></div>{/if}
						{#if wd.builtYear > 0}<div class="stat small"><span>Erected</span><span>Anno {wd.builtYear}</span></div>{/if}
						{#if wd.monumentTo}<div class="stat small"><span>Shrine of</span><span class="bad">Fallen {wd.monumentTo}</span></div>{/if}
						<div class="stat small"><span>Plane</span><span>{sim.w.layers[wd.layer]?.name ?? 'Surface'}</span></div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
{:else if mainTab === 'monsters'}
	<section class="tab-panel">
		<header class="panel-header">
			<h3>Legendary Beasts & Titans</h3>
			<p class="muted small">Biblical colossi, local guardian sovereigns, cryptids, and terrifying winged wyrms.</p>
		</header>
		{#if monstersList.length === 0}
			<p class="muted small">No legendary monsters recorded in this world.</p>
		{:else}
			<div class="items-grid">
				{#each monstersList as mn (mn.id)}
					<article class="card item-card monster-card" style={!mn.alive ? 'opacity: 0.8;' : ''}>
						<div class="row between">
							<h4><span class="ico">{monsterSkin(sim.voice, mn.species)?.icon ?? mn.icon}</span> {mn.name}{#if monsterSkin(sim.voice, mn.species)} <span class="muted small">({monsterSkin(sim.voice, mn.species)?.name})</span>{/if}</h4>
							{#if mn.alive}
								<span class="chip" class:bad={mn.tier === 'cataclysm'} class:on={mn.tier === 'legendary'}>{mn.tier} · {mn.category}</span>
							{:else}
								<span class="chip">Slain Anno {mn.slainYear}</span>
							{/if}
						</div>
						<p class="small">{monsterSkin(sim.voice, mn.species)?.lore ?? mn.lore}</p>
						<div class="stat small"><span>Lair</span><span>{mn.lairName}</span></div>
						{#if mn.alive}
							<div class="stat small"><span>Power · Health</span><span>⚔ {mn.power} · ❤️ {mn.health}/{mn.maxHealth}</span></div>
							<div class="bar-container">
								<div class="bar-fill health-bar" style="width: {Math.max(0, Math.min(100, (mn.health / mn.maxHealth) * 100))}%"></div>
							</div>
							<div class="stat small"><span>Toughness</span><span>🛡 {Math.round((mn.armor ?? 0) * 100)}% Armor{mn.hardToKill ? ' (Hard to Kill)' : ''} · 💚 +{mn.regen ?? 5} HP/yr</span></div>
							<div class="stat small"><span>Harvest Bounty</span><span class="gold-text">🏆 {mn.trophy || 'Dragonhide & Relic Material'}</span></div>
							<div class="row between" style="margin-top: 0.35rem">
								<span class="small muted">Status: {mn.behavior}</span>
								<button class="btn tiny" onclick={() => { onfocus(mn.cell); onselect(mn.cell); }}>Track Beast</button>
							</div>
						{:else}
							<div class="stat small"><span>Slayer</span><span>☠ Conquered by {mn.slayer || 'Valiant Heroes'}</span></div>
							<div class="stat small"><span>Forged Relic & Spoils</span><span class="gold-text">✦ {mn.trophy || 'Titan Relic'}</span></div>
							<div class="row between" style="margin-top: 0.35rem">
								<span class="small muted">Historic battlefield</span>
								<button class="btn tiny" onclick={() => { onfocus(mn.cell); onselect(mn.cell); }}>Visit Battlefield</button>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	</section>
{:else if mainTab === 'luminaries'}
	<section class="tab-panel">
		<header class="panel-header">
			<h3>Celebrated Luminaries & Polymaths</h3>
			<p class="muted small">Archmages, philosophers, master artisans, grand champions, and visionary artificers.</p>
		</header>
		{#if luminariesList.length === 0}
			<p class="muted small">No luminaries currently recorded.</p>
		{:else}
			<div class="items-grid">
				{#each luminariesList as lum (lum.id)}
					{@const b = sim.w.burgs[lum.burg]}
					{@const sp = SPECIES_BY_ID[lum.species ?? 'human'] ?? SPECIES_BY_ID['human']}
					<article class="card item-card luminary-card">
						<div class="row between">
							<h4>
								<span class="ico">{lum.role === 'magician' ? '🔮' : lum.role === 'thinker' ? '📜' : lum.role === 'artist' ? '🎨' : lum.role === 'athlete' ? '🏆' : '⚙️'}</span>
								{lum.name}
							</h4>
							<span class="chip on">{lum.role}</span>
						</div>
						<p class="small muted">{sp.icon} {sp.name} · {sim.ageOf(lum)} years · Renown {lum.renown}</p>
						{#if lum.magnumOpus}
							<div class="magnum-box small">
								<strong>Magnum Opus:</strong> "{lum.magnumOpus}"
							</div>
						{/if}
						<div class="stat small">
							<span>Traits</span>
							<span>{lum.traits.join(', ')}</span>
						</div>
						<div class="stat small">
							<span>Home Town</span>
							<span>{b ? b.name : 'Wilds'}</span>
						</div>
						<div class="stat small">
							<span>Attributes</span>
							<span>⚔{lum.martial} ✉{lum.diplomacy} ⚖{lum.stewardship} 🗝{lum.intrigue}</span>
						</div>
						{#if b}
							<div style="margin-top: 0.35rem; text-align: right">
								<button class="btn tiny" onclick={() => { onfocus(b.cell); onselect(b.cell); }}>Visit Town</button>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	</section>
{:else if mainTab === 'tech'}
	<section class="tab-panel">
		<header class="panel-header">
			<div class="row between">
				<h3>Technological Progression Tree</h3>
				<span class="chip on">{activeEra.name}</span>
			</div>
			<p class="muted small">Discoveries and breakthrough inventions across 5 core disciplines.</p>
		</header>

		<div class="branches-container">
			{#each techBranchesList as branch (branch.id)}
				{@const branchTechs = DISCOVERIES.filter((d) => d.branch === branch.id)}
				<div class="branch-card card" style="--branch-color: {branch.color}">
					<div class="branch-head">
						<h4><span class="ico">{branch.icon}</span> {branch.name}</h4>
						<p class="small muted">{branch.description}</p>
					</div>
					<div class="tech-step-list">
						{#each branchTechs as tech (tech.id)}
							{@const isUnlocked = sim.techs.has(tech.id)}
							{@const canUnlock = tech.era <= sim.era && (!tech.reqs || tech.reqs.every((r) => sim.techs.has(r)))}
							<div class="tech-node" class:unlocked={isUnlocked} class:available={!isUnlocked && canUnlock}>
								<div class="row between">
									<strong class="tech-title">{tech.icon} {techName(sim.voice, tech.id, tech.name)}</strong>
									<span class="era-tag">Era {tech.era}</span>
								</div>
								<p class="small">{techDesc(sim.voice, tech.id, tech.description)}</p>
								{#if tech.inventions?.length}
									<div class="inventions-list small muted">
										<strong>Historic Inventions:</strong> {tech.inventions.join(' · ')}
									</div>
								{/if}
								{#if tech.reqs?.length}
									<div class="reqs-list small muted">
										Prerequisites: {tech.reqs.join(', ')}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

{#if cultureCardId !== null}
	<CultureCard {sim} cultureId={cultureCardId} onclose={() => (cultureCardId = null)} />
{/if}

<style>
	section { margin-bottom: 1rem; }
	h3 { font-size: 0.98rem; margin-bottom: 0.35rem; }
	h4 { font-size: 0.9rem; margin: 0; }
	.card { padding: 0.6rem; border: 1px solid var(--line); border-radius: 8px; }
	.era-card { display: flex; flex-direction: column; gap: 0.35rem; border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
	.bar-container { height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; margin: 0.15rem 0 0.35rem; }
	.bar-fill { height: 100%; background: var(--accent); transition: width 0.3s; }
	.bar-fill.health-bar { background: #ff453a; }
	.tech-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.3rem; }
	.between { justify-content: space-between; align-items: center; }
	.realm { border-left: 4px solid var(--rc); }
	.small { font-size: 0.82rem; margin: 0.2rem 0; }
	.bad { color: var(--danger); }
	.gold-text { color: #f7d774; }
	.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.link { background: none; border: 0; padding: 0.1rem 0; text-align: left; width: 100%; cursor: pointer; }
	.link:hover:not(:disabled) { color: var(--accent); }
	.link:disabled { opacity: 1; cursor: default; }
	.filters { gap: 0.25rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
	.chip { background: none; font-size: 0.72rem; border: 1px solid var(--line); border-radius: 4px; padding: 0.1rem 0.35rem; }
	.chip.on { background: var(--accent); color: var(--ink); border-color: var(--accent); }
	.species-chip { background: color-mix(in srgb, var(--accent) 15%, transparent); }
	.toggles { gap: 0.25rem; }
	.copy-btn { border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); color: var(--accent); cursor: pointer; }
	.copy-btn:hover { background: color-mix(in srgb, var(--accent) 15%, transparent); }
	.events { list-style: none; margin: 0; padding: 0; font-size: 0.88rem; }
	.events li { border-bottom: 1px dotted var(--line); padding: 0.15rem 0; }
	.yr { font-variant-numeric: tabular-nums; color: var(--muted); font-size: 0.78rem; }
	.events .war .ico, .events .capture .ico, .events .fall .ico { color: var(--danger); }
	.events .uprising .ico, .events .rebel .ico { color: #e65100; }
	.events .god .ico, .events .avatar .ico { color: var(--accent); }
	.nums .stat { font-variant-numeric: tabular-nums; }

	/* Sub Navigation */
	.sub-nav { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--line); padding-bottom: 0.45rem; }
	.nav-pill { background: none; border: 1px solid var(--line); border-radius: 6px; padding: 0.22rem 0.5rem; font-size: 0.75rem; color: var(--muted); cursor: pointer; transition: all 0.15s ease; }
	.nav-pill:hover { color: var(--ink); border-color: color-mix(in srgb, var(--accent) 50%, var(--line)); }
	.nav-pill.active { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); border-color: var(--accent); font-weight: 600; }

	/* Highlight cards */
	.wonder-highlight { border-color: #ffd700; background: color-mix(in srgb, #ffd700 8%, transparent); margin-bottom: 0.6rem; }
	.monster-highlight { border-color: #ff3b30; background: color-mix(in srgb, #ff3b30 8%, transparent); margin-bottom: 0.6rem; }

	/* Tab Panels & Grids */
	.tab-panel { display: flex; flex-direction: column; gap: 0.75rem; }
	.panel-header h3 { margin-bottom: 0.15rem; }
	.items-grid { display: flex; flex-direction: column; gap: 0.6rem; max-height: 520px; overflow-y: auto; padding-right: 0.2rem; }
	.item-card { background: color-mix(in srgb, var(--panel) 92%, black); }
	.ruined-card { opacity: 0.75; border: 1px dashed var(--line); }
	.ruined-card:hover { opacity: 0.95; }
	.lore-box { font-style: italic; margin: 0.3rem 0; line-height: 1.4; padding-left: 0.4rem; border-left: 2px solid var(--line); }
	.magnum-box { background: color-mix(in srgb, var(--accent) 10%, transparent); padding: 0.3rem 0.45rem; border-radius: 4px; margin: 0.35rem 0; }
	.btn.tiny { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid var(--line); background: none; cursor: pointer; color: var(--ink); }
	.btn.tiny:hover { border-color: var(--accent); color: var(--accent); }

	/* Tech Tree */
	.branches-container { display: flex; flex-direction: column; gap: 0.75rem; max-height: 540px; overflow-y: auto; padding-right: 0.2rem; }
	.branch-card { border-left: 4px solid var(--branch-color); }
	.branch-head { margin-bottom: 0.45rem; }
	.tech-step-list { display: flex; flex-direction: column; gap: 0.45rem; }
	.tech-node { padding: 0.45rem; border: 1px solid var(--line); border-radius: 6px; opacity: 0.6; transition: opacity 0.2s; }
	.tech-node.unlocked { opacity: 1; border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
	.tech-node.available { opacity: 0.9; border-style: dashed; }
	.tech-title { font-size: 0.85rem; }
	.era-tag { font-size: 0.7rem; color: var(--muted); }
	.inventions-list { margin-top: 0.25rem; }
	.reqs-list { margin-top: 0.15rem; font-style: italic; }

	/* Annals book styling */
	.annals-book { display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.4rem; max-height: 480px; overflow-y: auto; padding-right: 0.2rem; }
	.annal-chapter { padding: 0.55rem 0.65rem; border: 1px solid var(--line); border-radius: 6px; background: color-mix(in srgb, var(--panel) 92%, black); }
	.annal-header { display: flex; align-items: baseline; gap: 0.45rem; margin-bottom: 0.25rem; }
	.annal-year { font-size: 0.76rem; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 0.1rem 0.35rem; border-radius: 4px; }
	.annal-headline { font-size: 0.8rem; color: var(--muted); font-weight: 500; }
	.annal-prose { font-size: 0.86rem; line-height: 1.48; margin: 0.15rem 0 0.35rem; color: var(--ink); }
	.annal-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; }
	.annal-tag-btn { background: color-mix(in srgb, var(--line) 40%, transparent); border: 1px solid var(--line); border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.73rem; color: var(--muted); cursor: pointer; text-align: left; }
	.annal-tag-btn:hover { border-color: var(--accent); color: var(--accent); }
	.annal-tag-btn .ico { font-size: 0.78rem; margin-right: 0.15rem; }

	/* Factions & Quests */
	.factions-box { background: color-mix(in srgb, var(--panel) 94%, black); border: 1px solid var(--line); border-radius: 6px; padding: 0.45rem 0.55rem; margin: 0.45rem 0; }
	.faction-row { margin-bottom: 0.25rem; }
	.quest-card { border-left: 3px solid color-mix(in srgb, var(--accent) 70%, var(--line)); }
	.quest-log-box { background: color-mix(in srgb, var(--panel) 90%, black); padding: 0.35rem 0.5rem; border-radius: 4px; margin: 0.35rem 0; display: flex; flex-direction: column; gap: 0.2rem; }
	.quest-log-entry { line-height: 1.35; color: var(--muted); }
</style>
