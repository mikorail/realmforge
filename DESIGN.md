# Realmforge Design Direction

> Honest notice: this direction was generated from project code and architecture context. Agent-generated direction is kept grounded in Realmforge's cartographic foundations to avoid default AI blandness.

## Identity & Soul
Realmforge is a deep procedural world generator and living-world simulator. The visual feel is that of an illuminated atlas and living cartographer's workshop: tactile, authentic, scholarly, and responsive.

## Core Audience
Worldbuilders, tabletop RPG game masters, procedural simulation fans, and writers who need comprehensive worlds with deep history, believable geography, and varied cultures.

## Dials
Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

- **ENERGY 2 (Balanced)**: Rich historical cartography and focused toolbars; avoids generic minimalist SaaS sterility as well as over-decorated flashy distraction.
- **RHYTHM 2 (Structured with variation)**: Consistent floating panels (Setup, Map controls, Chronicle, Simulation inspectors) with clear content-driven layouts.
- **MOTION 1 (Calm)**: Smooth canvas map navigation (pan, zoom, fit), instant panel state toggles, no unnecessary bouncy entrance animations.

## Typography
- **Headings & Titles**: `Cinzel, serif` (archival book engraving, 500/600 weight)
- **Body & Controls**: `'EB Garamond', Georgia, serif` (readable Renaissance type)
- **Sci-Fi & Cyberpunk Overrides**: `Orbitron, sans-serif` for headers, `'Share Tech Mono', monospace` for data readouts

## Color Systems

### Vellum & Ink (Default: Fantasy, Mythic, Steampunk, Solarpunk)
- Canvas/Desk Background: `#16120d` (dark leather/desk)
- Panel Surface: `rgba(250, 243, 226, 0.94)` (aged vellum parchment)
- Ink (Primary Text): `#2b2116` (deep iron gall ink)
- Muted Text: `#7a6a55` (warm sepia)
- Accent: `#c9a45c` (illuminator gold leaf)
- Borders & Dividers: `rgba(43, 33, 22, 0.18)`
- Danger / War / Plague: `#b03a2e` (crimson wax seal)

### Neon & Terminal (`data-neon`: Cyberpunk, Atompunk, Biopunk)
- Panel Surface: `rgba(12, 12, 24, 0.92)` (void navy slate)
- Primary Text: `#e6f1ff` (phosphor blue-white)
- Muted Text: `#8a93b0` (faded steel)
- Accent: `#29f0ff` (cyan) or `#ff3fa4` (magenta)
- Borders: `rgba(140, 160, 255, 0.2)`

## Craftsmanship & Accessibility Standards
- Minimum WCAG AA color contrast (4.5:1 for body copy, 3:1 for large display titles)
- Visible focus rings on all interactive keyboard controls
- All buttons and sliders have working behaviors and real state updates
- Proper empty, loading (generation worker), and error handling states
- Strictly ZERO em dashes in UI copy, simulated chronicle text, comments, or documentation
- Real generated data or explicit placeholders only

## Feature Visual Systems & UI Architecture

### Living Chronicle & Illuminated Annals
- **Dual-Mode Chronicle Explorer**: The InfoPanel offers an instant toggle between an illuminated storybook ("Annals") and an event log ("Timeline").
- **Illuminated Storybook Presentation**:
  - Year groupings with distinct serif headlines (`Cinzel`, letter-spaced).
  - Rich narrative prose styled in `'EB Garamond'` with elevated line-height (1.6) and generous paragraph margins.
  - One-click "Copy Annals" action copying clean formatted text to clipboard.
- **Timeline Event Filtering**: Event kind filter chips with distinctive emoji identifiers:
  - `🔥` Uprisings (riots, cults, prophets, folk heroes, mutinies)
  - `⚔️` Wars and military clashes
  - `👑` Dynastic successions, crown abolition, and palace coups
  - `📜` Treaties, pacts, and concordats
  - `⚡` Disasters (both natural and anthropogenic ecological cataclysms)
  - `🕊️` Religious schisms, theologies, and the Great Reformation
  - `🏛️` Wonder commissions, completions, and ruins
  - `🐉` Beast encounters and legendary hunts
  - `🔬` Scientific discoveries and historic inventions

### Complete Simulation & Archival Experience
- **Modal UX (`CompleteSimModal.svelte`)**:
  - Clean archival dialog with preset duration chips: 25, 50, 100, 200, and 500 years.
  - Non-blocking execution paced across animation frames, keeping UI responsive.
  - Two-tone progress track (aged gold bar over muted parchment track) with live year counter and event stats.
  - Post-run completion panel offering one-click "Download Complete Annals (MD)" and direct "Scrub Timeline" navigation.
- **Unbounded History Retention**: Complete history archive stored in `sim.allEvents` (up to 1,000 years) while keeping `sim.events` bounded for fast live reactivity.

### Societal Uprisings & Grassroots Unrest
- **Thematic Visual Accents**:
  - **Riots (`✊`)**: Amber-red alert styling, reporting bread famines, tax rebellions, and draft resistance.
  - **Secret Cults (`🕯️`)**: Deep violet accents representing clandestine doomsday and eldritch gatherings.
  - **Charismatic Prophets (`🕊️`)**: Illuminated warm gold accents marking divine revelations and popular pilgrimages.
  - **Folk Heroes (`🛡️`)**: Forest-green and bronze badges representing commoner champions and outlaws.
  - **Garrison Mutinies (`⚔️`)**: Steel-grey banners marking unpaid garrison defiance.
- **Avatar Subversion Controls**: Direct action buttons in the Avatar panel for stirring unrest, founding cults, proclaiming prophecies, and rallying as a champion.

### Political Ideologies & Constitutional Transformations
- **Regime Identification**:
  - 7 Ideologies: Monarchy, Republic, Theocracy, Oligarchy, Autocracy, Communal Democracy, Polytechnic Technocracy.
  - Dynamic constitutional banners reflecting current governing forms (e.g. "Federal Republic", "Democratic Union", "Holy Theocracy", "People's Commune").
  - Faction militancy meters featuring gradual color transitions from calm amber to alarming crimson.
- **Avenue Badges**: Clear chronicle badges identifying how regimes transformed (Popular Revolution, Peaceful Assembly Reform, Victor-Imposed Treaty, or Interregnum Crown Abolition).

### Constructible Wonders, Towers & Weathered Ruins
- **Standing Wonders**: Rendered on canvas with glowing gold map badges and distinct architectural silhouettes (World Tree, Tower of Magic, Colossus Bridge, Grand University, etc.).
- **Weathered Ruins**: Destroyed or sacked wonders persist on the world map with weathered slate markers and struck-through titles, recording historical destroyers, ruination dates, and causes (city sacking, avatar razing, arcane meltdown, reservoir burst).

### Monster Danger Tiers & Battlefield Monuments
- **Threat Hierarchy**:
  - **Biblical Titans**: Cataclysm tier (purple borders, 45-50% damage reduction armor badges).
  - **Guardian Legends**: Local guardian tier (glowing gold borders).
  - **Mythos Cryptids**: Ancient myth tier (cyan mystic borders).
  - **Dangerous Beasts**: Apex predator tier (crimson borders).
- **Battlefield Shrines**: Consecrated permanent Titan Shrine wonders erected on the exact map coordinates of victorious monster hunts.

### Prose Narration & Literary Guidelines
- **Narrative Voice**: Rhythmic, elevated prose inspired by classical historians and illuminated chronicles (Edward Gibbon, the Anglo-Saxon Chronicle, the Silmarillion Annals).
- **Zero Em Dash Rule**: The em dash character (Unicode U+2014) is strictly prohibited in all UI copy, narrative templates, comments, and documentation. Use hyphens (`-`), colons (`:`), or parentheses for subordinate clauses.
