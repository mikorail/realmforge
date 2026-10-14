/**
 * Culture spheres: phonology + naming + polity/faith vocabulary inspired by real-world
 * language families and civilisations. Names are *generated* from the phoneme sets, never copied.
 */
export interface Sphere {
	id: string;
	name: string;
	cons: string;
	vows: string;
	/** syllable structures (C consonant, V vowel, L liquid, F final, S sibilant, ? optional) */
	structs: string[];
	liqs?: string;
	fins?: string;
	ortho?: Record<string, string>;
	minSyl?: number;
	maxSyl?: number;
	/** affixes for settlement names; '-x' suffix, 'x-' prefix */
	city: string[];
	land: string[];
	forms: string[];
	rulers: string[];
	faiths: string[];
	/** biome affinity (ids from BIOMES) for placing cultures; empty = anywhere */
	biomes: number[];
	/** cold/hot preference: -1 cold, 0 any, 1 hot */
	climate: -1 | 0 | 1;
	/** how personal names are built (see `fullPersonName` in names.ts); default: given + hereditary house */
	grammar?: NameGrammar;
}

/**
 * Personal-name structure for a sphere. The engine's `Person.house` always stays a hereditary lineage
 * name (dynasty tracking); the grammar decides what is *shown* as the second name.
 */
export interface NameGrammar {
	/** 'family-given' puts the clan/family element first (Sinic, Japonic) */
	order?: 'given-family' | 'family-given';
	/**
	 * second element: 'house' hereditary family name · 'patronymic' father's name + marker ·
	 * 'father' father's bare given name (Ethiopic) · 'clan' one of a small closed set (Mande jamu, Sinic surnames) · 'none'
	 */
	surname: 'house' | 'patronymic' | 'father' | 'clan' | 'none';
	/** patronymic markers: '-x' suffix on the father's name (-son, -ovich), 'x ' separate word before it (ibn, mac) */
	patronymic?: { m: string; f: string };
	/** also show the house after the patronymic (Slavic given + patronymic + family) */
	withHouse?: boolean;
	/** particle written before the shown house ('al-') */
	houseParticle?: string;
	/** size of the closed clan pool for surname 'clan' */
	clans?: number;
	/** suffixes often added to house names (Japonic -moto, Latinate -ius, Slavic -ov) */
	houseAffixes?: string[];
	/** feminine forms of house endings, [masc, fem] (Slavic -ov → -ova, Latinate -ius → -ia) */
	houseFem?: [string, string][];
	/** Akan-style weekday names: everyone carries the name of the day they were born on */
	dayNames?: boolean;
	/** feminine given-name endings */
	fem?: string[];
	/** semantic place names put the head noun first ("Fort-White", Kota Baru, Llan-) */
	headFirst?: boolean;
	/** sphere-flavoured epithets mixed into the generic pool */
	epithets?: string[];
}

export const DEFAULT_GRAMMAR: NameGrammar = { surname: 'house' };

export const SPHERES: Sphere[] = [
	{ id: 'sinic', name: 'Sinic', cons: 'bpmfdtnlgkhjqxzcsrw', vows: 'aeiou', structs: ['CV', 'CVF', 'CVV', 'CVF'], fins: 'nŋ', ortho: { ŋ: 'ng' }, minSyl: 1, maxSyl: 2, city: ['-zhou', '-jing', '-an', '-yang', '-ling', '-cheng', '-du'], land: ['-guo', '-zhou', '-xia'], forms: ['Dynasty', 'Empire', 'Kingdom', 'Protectorate'], rulers: ['Emperor', 'King', 'Duke'], faiths: ['Way', 'Teachings', 'Mandate', 'Heavenly Court'], grammar: { order: 'family-given', surname: 'clan', clans: 24, headFirst: false, epithets: ['the Martial', 'the Cultured', 'the Filial'] }, biomes: [4, 5, 6, 12], climate: 0 },
	{ id: 'japonic', name: 'Japonic', cons: 'kstnhmyrwgzdb', vows: 'aiueo', structs: ['CV', 'CV', 'V', 'CVF'], fins: 'n', minSyl: 2, maxSyl: 3, city: ['-shima', '-yama', '-kawa', '-saka', '-moto', '-hara', '-zaki'], land: ['-koku', '-shū'], forms: ['Shogunate', 'Domain', 'Empire', 'Province'], rulers: ['Shōgun', 'Daimyō', 'Tennō'], faiths: ['Kami-no-Michi', 'Way', 'Shrine of'], grammar: { order: 'family-given', surname: 'house', houseAffixes: ['-moto', '-yama', '-kawa', '-mura', '-da', '-shita', '-hara'], fem: ['ko', 'mi', 'e'], headFirst: false, epithets: ['the Cloistered', 'the Retired'] }, biomes: [6, 8, 9], climate: 0 },
	{ id: 'indic', name: 'Indic', cons: 'kgcjṭḍtdnpbmyrlvśṣsh', vows: 'aāiīueo', structs: ['CV', 'CVC', 'CVV', 'CLV'], liqs: 'rv', ortho: { ṭ: 't', ḍ: 'd', ś: 'sh', ṣ: 'sh', ā: 'a', ī: 'i' }, minSyl: 2, maxSyl: 3, city: ['-pur', '-nagar', '-abad', '-garh', '-pura', '-patna', '-kot'], land: ['-desh', '-rashtra', '-varta'], forms: ['Raj', 'Mahajanapada', 'Sultanate', 'Empire', 'Kingdom'], rulers: ['Maharaja', 'Raja', 'Samrat'], faiths: ['Dharma of', 'Path of', 'Sangha of'], grammar: { surname: 'house', fem: ['a', 'i'], epithets: ['the Victorious', 'the Learned', 'Lord of Elephants'] }, biomes: [3, 5, 7], climate: 1 },
	{ id: 'sea', name: 'Austronesian-Mainland', cons: 'ptkbdgmnŋslrhwj', vows: 'aeiou', structs: ['CV', 'CVC', 'CV'], ortho: { ŋ: 'ng', j: 'y' }, minSyl: 2, maxSyl: 3, city: ['-pura', '-nagara', '-kota', '-wati', '-thani', '-ayu'], land: ['-desa', '-negara', '-bhumi'], forms: ['Mandala', 'Kingdom', 'Sultanate', 'Kedatuan'], rulers: ['Raja', 'Datu', 'Sultan'], faiths: ['Way of', 'Cult of', 'Teachings of'], grammar: { surname: 'father', headFirst: true }, biomes: [5, 7, 12], climate: 1 },
	{ id: 'steppe', name: 'Steppe', cons: 'bgdkqtmnlrsšzčjx', vows: 'aeiouöü', structs: ['CVC', 'VC', 'CV'], ortho: { š: 'sh', č: 'ch', x: 'kh', j: 'j' }, minSyl: 2, maxSyl: 3, city: ['-balik', '-khot', '-kent', '-ordu', '-bulag'], land: ['-stan', '-yurt'], forms: ['Khaganate', 'Horde', 'Khanate', 'Ulus'], rulers: ['Khagan', 'Khan', 'Bey'], faiths: ['Eternal Sky', 'Tengri', 'Spirits of'], grammar: { surname: 'patronymic', patronymic: { m: '-oghlu', f: '-qizi' }, epithets: ['the Unbowed', 'Sky-Blessed', 'the Lame'] }, biomes: [2, 3, 4], climate: 0 },
	{ id: 'persian', name: 'Persianate', cons: 'bpdtkgfvszšžxhmnlry', vows: 'aāeiou', structs: ['CVC', 'CV', 'CVCC?'], ortho: { š: 'sh', ž: 'zh', x: 'kh', ā: 'a' }, minSyl: 2, maxSyl: 3, city: ['-abad', '-kand', '-shahr', '-gird', '-stan'], land: ['-shahr', '-stan', '-zamin'], forms: ['Shahdom', 'Satrapy', 'Empire', 'Sultanate'], rulers: ['Shah', 'Satrap', 'Padishah'], faiths: ['Flame of', 'Fire Temples of', 'Light of'], grammar: { surname: 'patronymic', patronymic: { m: '-pur', f: '-dokht' }, epithets: ['the Just', 'King of Kings'] }, biomes: [1, 2, 4], climate: 1 },
	{ id: 'arabic', name: 'Semitic', cons: 'bthjdrzsšṣfqklmnwy', vows: 'aiu', structs: ['CVC', 'CV', 'CVCC?'], ortho: { š: 'sh', ṣ: 's', j: 'j' }, minSyl: 2, maxSyl: 3, city: ['al-', '-iyya', '-abad', 'Dar ', '-ar', 'Qasr '], land: ['-ia', 'Bilad '], forms: ['Sultanate', 'Caliphate', 'Emirate', 'Sheikhdom'], rulers: ['Sultan', 'Caliph', 'Emir'], faiths: ['Faith of', 'Covenant of', 'Call of'], grammar: { surname: 'patronymic', patronymic: { m: 'ibn ', f: 'bint ' }, withHouse: true, houseParticle: 'al-', headFirst: true, epithets: ['the Victorious', 'the Just', 'Sword of the Faith'] }, biomes: [1, 2, 3], climate: 1 },
	{ id: 'mande', name: 'Sahelian', cons: 'bdfgjklmnprstwy', vows: 'aeiouɛɔ', structs: ['CV', 'CVN?', 'V'], ortho: { ɛ: 'e', ɔ: 'o' }, minSyl: 2, maxSyl: 3, city: ['-bougou', '-ba', '-so', '-kura', '-dugu', 'Ka-'], land: ['-ka', '-ba'], forms: ['Mansadom', 'Empire', 'Kingdom', 'Confederacy'], rulers: ['Mansa', 'Askia', 'Farin'], faiths: ['Way of the Ancestors', 'Komo', 'Faith of'], grammar: { surname: 'clan', clans: 12, epithets: ['the Lion', 'the Pilgrim'] }, biomes: [1, 3, 4], climate: 1 },
	{ id: 'yoruba', name: 'Guinean', cons: 'bdfgjklmnprstwyŋ', vows: 'aeiouẹọ', structs: ['CV', 'V', 'CV'], ortho: { ẹ: 'e', ọ: 'o', ŋ: 'n' }, minSyl: 2, maxSyl: 4, city: ['Ile-', 'Oyo-', '-ọ', '-kuta', '-dan', '-fe'], land: ['-land', '-ọba'], forms: ['Obadom', 'Kingdom', 'Asantedom', 'City-League'], rulers: ['Oba', 'Asantehene', 'Alafin'], faiths: ['Orisha of', 'Abosom', 'Ifá of'], grammar: { surname: 'house', dayNames: true, headFirst: true }, biomes: [5, 7, 3], climate: 1 },
	{ id: 'bantu', name: 'Bantu-Swahili', cons: 'bdfgjklmnprstvwyz', vows: 'aeiou', structs: ['CV', 'NCV', 'CV'], ortho: {}, minSyl: 2, maxSyl: 4, city: ['-ni', 'Ki-', '-wa', '-ngo', 'Bu-', '-mbe'], land: ['U-', '-land', 'Ki-'], forms: ['Kingdom', 'Mwenedom', 'City-State', 'Mutapa'], rulers: ['Mwene', 'Mfumu', 'Mwami'], faiths: ['Spirits of', 'Way of', 'Mizimu'], grammar: { surname: 'house', headFirst: true }, biomes: [3, 5, 4, 7], climate: 1 },
	{ id: 'ethiopic', name: 'Ethiopic', cons: 'bgdhlmnrstqwyzkšč', vows: 'aeiouə', structs: ['CV', 'CVC'], ortho: { š: 'sh', č: 'ch', ə: 'e' }, minSyl: 2, maxSyl: 3, city: ['-dar', '-gondar', '-sum', '-lalibela', 'Debre '], land: ['-ia', 'Beta '], forms: ['Negusdom', 'Empire', 'Kingdom'], rulers: ['Negus', 'Negusa Nagast', 'Ras'], faiths: ['Church of', 'Covenant of', 'Ark of'], grammar: { surname: 'father', epithets: ['the Restorer', 'Lion of the Highlands'] }, biomes: [4, 6], climate: 0 },
	{ id: 'nahua', name: 'Nahuan', cons: 'ptkmnlswyhčƛ', vows: 'aeio', structs: ['CV', 'CVC', 'CVʔ?'], ortho: { č: 'ch', ƛ: 'tl', ʔ: 'h' }, minSyl: 2, maxSyl: 4, city: ['-tlan', '-pan', '-co', '-titlan', '-huacan', '-tepec'], land: ['-tlan', '-pan'], forms: ['Altepetl', 'Triple League', 'Empire', 'Hueyitlatocayotl'], rulers: ['Tlatoani', 'Huey Tlatoani', 'Cihuacoatl'], faiths: ['Sun Cult of', 'Feathered Serpent', 'Mirror of'], grammar: { surname: 'house', epithets: ['the Elder', 'the Younger', 'Obsidian-Heart'] }, biomes: [3, 5, 4, 1], climate: 1 },
	{ id: 'maya', name: 'Mayan', cons: 'bčkʔlmnpstwyx', vows: 'aeiou', structs: ['CVC', 'CV', 'CVʔ'], ortho: { č: 'ch', ʔ: "'", x: 'j' }, minSyl: 2, maxSyl: 3, city: ['-kab', '-nal', '-tun', '-ha', '-k\'in', 'Ix-'], land: ['-kab', '-ajaw'], forms: ['Ajawlel', 'City-State', 'Kaloomte League'], rulers: ["K'uhul Ajaw", 'Ajaw', "Kalomte'"], faiths: ['Maize God', 'World Tree', 'Hero Twins of'], grammar: { surname: 'house', epithets: ['Smoke-Jaguar', 'the Sky-Born'] }, biomes: [7, 5, 12], climate: 1 },
	{ id: 'andean', name: 'Andean', cons: 'ptkqčmnñlrswyh', vows: 'aiu', structs: ['CV', 'CVC', 'CV'], ortho: { č: 'ch' }, minSyl: 2, maxSyl: 4, city: ['-marca', '-pampa', '-cocha', '-bamba', '-huasi', '-pata'], land: ['-suyu', 'Tawantin'], forms: ['Tawantinsuyu', 'Ayllu League', 'Empire', 'Señorío'], rulers: ['Sapa Inca', 'Kuraka', 'Inca'], faiths: ['Inti', 'Pachamama', 'Viracocha'], grammar: { surname: 'house', headFirst: false, epithets: ['Earth-Shaker', 'the Builder'] }, biomes: [2, 4, 10, 6], climate: -1 },
	{ id: 'turtle', name: 'Turtle Island', cons: 'kmnstwhyčlpg', vows: 'aeiouą', structs: ['CV', 'CVC', 'V'], ortho: { č: 'ch', ą: 'a' }, minSyl: 2, maxSyl: 4, city: ['-ka', '-wa', '-ton', '-ee', '-ago'], land: ['-ah', '-aki'], forms: ['Confederacy', 'Nation', 'League', 'Council'], rulers: ['Sachem', 'High Chief', 'Speaker'], faiths: ['Great Spirit', 'Sky Woman', 'Medicine Lodge'], grammar: { surname: 'clan', clans: 8 }, biomes: [4, 6, 9], climate: 0 },
	{ id: 'inuit', name: 'Boreal', cons: 'ptkqmnŋvgrlsj', vows: 'aiu', structs: ['CVC', 'VC', 'CV'], ortho: { ŋ: 'ng', j: 'j' }, minSyl: 2, maxSyl: 4, city: ['-viq', '-tuq', '-juaq', '-niq'], land: ['-nunaat', '-miut'], forms: ['Band', 'Confederacy', 'Hunting League'], rulers: ['Angakkuq', 'Isumataq', 'Elder'], faiths: ['Sea Mother', 'Sila', 'Spirits of'], grammar: { surname: 'none' }, biomes: [9, 10, 11], climate: -1 },
	{ id: 'polynesian', name: 'Oceanic', cons: 'ptkmnŋfvhlrw', vows: 'aeiou', structs: ['CV', 'V', 'CV'], ortho: { ŋ: 'ng' }, minSyl: 2, maxSyl: 4, city: ['-motu', '-nui', '-roa', '-ika', 'Te ', '-ahu'], land: ['-nui', 'Ra-'], forms: ['Chiefdom', 'Tu\'i Dominion', 'Kingdom', 'Voyager League'], rulers: ['Ariki', "Tu'i", 'Ali\'i Nui'], faiths: ['Mana of', 'Tangaroa', 'Navigator Gods'], grammar: { surname: 'father', headFirst: true, epithets: ['the Navigator', 'Wave-Rider'] }, biomes: [7, 5], climate: 1 },
	{ id: 'norse', name: 'Nordic', cons: 'bdfghjklmnprstvþð', vows: 'aeiouyøå', structs: ['CVC', 'CVCC?', 'CV'], ortho: { þ: 'th', ð: 'd', ø: 'ø' }, minSyl: 1, maxSyl: 2, city: ['-heim', '-vik', '-gard', '-by', '-fjord', '-stad'], land: ['-land', '-mark', '-rike'], forms: ['Jarldom', 'Kingdom', 'Thing-League', 'Realm'], rulers: ['Jarl', 'King', 'High King'], faiths: ['Old Gods', 'Allfather', 'Ash Tree'], grammar: { surname: 'patronymic', patronymic: { m: '-son', f: '-dottir' }, headFirst: false, epithets: ['Fairhair', 'Forkbeard', 'Ironside', 'the Far-Travelled', 'Bloodaxe'] }, biomes: [9, 10, 6, 8], climate: -1 },
	{ id: 'celtic', name: 'Celtic', cons: 'bcdfglmnrstwvh', vows: 'aeiouy', structs: ['CVC', 'CV', 'CVCC?'], ortho: {}, minSyl: 1, maxSyl: 3, city: ['Dun ', 'Caer ', '-more', '-ach', 'Llan-', 'Kil-'], land: ['-ia', '-wy'], forms: ['High Kingdom', 'Tuath', 'Clanlands', 'Kingdom'], rulers: ['Ard Rí', 'Rí', 'Chieftain'], faiths: ['Druidry of', 'Mother of', 'Oak Grove'], grammar: { surname: 'patronymic', patronymic: { m: 'mac ', f: 'nic ' }, headFirst: true, epithets: ['of the Hundred Battles', 'the Hound', 'the Red'] }, biomes: [6, 8, 4], climate: 0 },
	{ id: 'latin', name: 'Latinate', cons: 'bcdfglmnpqrstvx', vows: 'aeiou', structs: ['CV', 'CVC', 'CLV'], liqs: 'rl', ortho: {}, minSyl: 2, maxSyl: 3, city: ['-ium', '-ia', '-polis', 'Porta ', '-ona', '-entum'], land: ['-ia', '-ana'], forms: ['Republic', 'Imperium', 'Dominate', 'Principate'], rulers: ['Imperator', 'Consul', 'Dux'], faiths: ['Cult of', 'Pontifex of', 'Mysteries of'], grammar: { surname: 'house', houseAffixes: ['-ius'], houseFem: [['ius', 'ia']], fem: ['a', 'ia'], headFirst: true, epithets: ['Magnus', 'Pius', 'the Elder'] }, biomes: [4, 6, 3], climate: 0 },
	{ id: 'slavic', name: 'Slavic', cons: 'bvgdžzklmnprstfhcčš', vows: 'aeiouy', structs: ['CVC', 'CV', 'CCV?'], ortho: { ž: 'zh', č: 'ch', š: 'sh', c: 'ts' }, minSyl: 2, maxSyl: 3, city: ['-grad', '-ov', '-sk', '-gorod', '-ice', '-mir'], land: ['-ia', '-ska', 'Rus'], forms: ['Tsardom', 'Principality', 'Grand Duchy', 'Veche Republic'], rulers: ['Tsar', 'Knyaz', 'Voivode'], faiths: ['Perun', 'Rod', 'Old Faith of'], grammar: { surname: 'patronymic', patronymic: { m: '-ovich', f: '-ovna' }, withHouse: true, houseAffixes: ['-ov', '-in', '-ski'], houseFem: [['ov', 'ova'], ['in', 'ina'], ['ski', 'ska']], fem: ['a'], headFirst: false, epithets: ['the Terrible', 'the Quiet', 'the Great'] }, biomes: [6, 9, 4], climate: -1 },
	{ id: 'eldritch', name: 'Eldritch', cons: "kqxzʔŋrlthy", vows: 'aeiouy', structs: ['CVC', 'CVʔVC', 'VCC'], ortho: { ʔ: "'", ŋ: 'gh', x: 'x' }, minSyl: 2, maxSyl: 3, city: ["R'", '-yeh', '-loth', '-ugg'], land: ['-loth', '-yth'], forms: ['Abyssal Throne', 'Hive', 'Conclave', 'Dominion'], rulers: ['Hierophant', 'Overmind', 'Elder'], faiths: ['Sleeper', 'Deep Ones', 'Void Choir'], grammar: { surname: 'none', epithets: ['the Unspeakable', 'Who Dwells Below', 'the Many-Eyed'] }, biomes: [], climate: 0 }
];

export const SPHERE_BY_ID = Object.fromEntries(SPHERES.map((s) => [s.id, s]));

/** glyph drawn for a settlement on the map (see render/glyphs.ts) */
export type ArchShape =
	| 'pagoda' | 'gate' | 'spire' | 'stilt' | 'tent' | 'dome' | 'minaret' | 'tower' | 'enclosure' | 'roundhouse' | 'cross'
	| 'stepped' | 'temple' | 'terrace' | 'longhouse' | 'snow' | 'hall' | 'stave' | 'ringfort' | 'arch' | 'onion' | 'jagged';

export interface ArchStyle {
	/** short style tag shown on the culture card */
	tag: string;
	shape: ArchShape;
}

/** per-sphere architecture style: a short tag plus the map glyph */
export const SPHERE_ARCH: Record<string, ArchStyle> = {
	sinic: { tag: 'pagoda roofs', shape: 'pagoda' },
	japonic: { tag: 'gate-shrines and raised halls', shape: 'gate' },
	indic: { tag: 'tapering temple spires', shape: 'spire' },
	sea: { tag: 'stilt halls', shape: 'stilt' },
	steppe: { tag: 'felt tents', shape: 'tent' },
	persian: { tag: 'blue-tiled domes', shape: 'dome' },
	arabic: { tag: 'minarets and courtyards', shape: 'minaret' },
	mande: { tag: 'mud-brick towers', shape: 'tower' },
	yoruba: { tag: 'walled compounds', shape: 'enclosure' },
	bantu: { tag: 'round thatched houses', shape: 'roundhouse' },
	ethiopic: { tag: 'rock-hewn cross churches', shape: 'cross' },
	nahua: { tag: 'stepped pyramids', shape: 'stepped' },
	maya: { tag: 'crested temple-pyramids', shape: 'temple' },
	andean: { tag: 'fitted-stone terraces', shape: 'terrace' },
	turtle: { tag: 'longhouses', shape: 'longhouse' },
	inuit: { tag: 'snow domes', shape: 'snow' },
	polynesian: { tag: 'open thatched halls', shape: 'hall' },
	norse: { tag: 'stave halls', shape: 'stave' },
	celtic: { tag: 'ring forts', shape: 'ringfort' },
	latin: { tag: 'arches and aqueducts', shape: 'arch' },
	slavic: { tag: 'onion-roofed halls', shape: 'onion' },
	eldritch: { tag: 'cyclopean spires', shape: 'jagged' }
};

export function archStyleOf(sphere: string | null | undefined): ArchStyle | null {
	return (sphere && SPHERE_ARCH[sphere]) || null;
}

/** spheres eligible for placement; 'eldritch' only on request */
export function pickSphere(rng: () => number, biome: number, temp: number, allowed: string[] | null): Sphere {
	const pool = SPHERES.filter((s) => (allowed ? allowed.includes(s.id) : s.id !== 'eldritch'));
	const w = pool.map((s) => {
		let v = 1;
		if (s.biomes.includes(biome)) v += 3;
		if (s.climate === 1 && temp > 18) v += 2;
		if (s.climate === -1 && temp < 6) v += 2;
		if (s.climate === 1 && temp < 4) v *= 0.2;
		if (s.climate === -1 && temp > 22) v *= 0.2;
		return v;
	});
	let t = rng() * w.reduce((a, b) => a + b, 0);
	for (let i = 0; i < pool.length; i++) if ((t -= w[i]) <= 0) return pool[i];
	return pool[0];
}
