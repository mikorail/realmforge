/**
 * Static culture data per sphere: the culture card (food, dress, architecture, music, values),
 * feast days and calendar month names. Drawn from widely shared folk traditions, no sacred figures.
 */
export type FeastKind = 'spring' | 'harvest' | 'dead' | 'midwinter' | 'sea' | 'war' | 'learning' | 'sun';

export interface SphereCulture {
	food: string;
	dress: string;
	architecture: string;
	music: string;
	values: string[];
	/** three feast names; the kind sets the season and the flavour of the event */
	feasts: [string, FeastKind][];
	months: MonthFamily;
}

export type MonthFamily = 'default' | 'eastern' | 'monsoon' | 'steppe' | 'desert' | 'savanna' | 'americas' | 'northern' | 'classical' | 'tide' | 'eldritch';

/** twelve month names starting at the dark of the year (month 0), per family */
export const MONTH_FAMILIES: Record<MonthFamily, string[]> = {
	default: ['Frostmoot', 'Thawmonth', 'Seedtide', 'Rainmoon', 'Bloomtide', 'Highsun', 'Emberfall', 'Harvest', 'Leafturn', 'Mistmoon', 'Darkening', 'Longnight'],
	eastern: ['Plum Moon', 'Peach Moon', 'Willow Moon', 'Rain Moon', 'Peony Moon', 'Lotus Moon', 'Cicada Moon', 'Moon of Lanterns', 'Chrysanthemum Moon', 'Maple Moon', 'Snow Moon', 'Moon of Stillness'],
	monsoon: ['Cool Dawn', 'Mango Blossom', 'Dry Heat', 'Fire Month', 'First Clouds', 'Great Rains', 'Flood Month', 'Lotus Month', 'Lamp Month', 'Rice Cutting', 'Mist Month', 'Long Dusk'],
	steppe: ['White Moon', 'Foaling Moon', 'Green Grass', 'Lambing Moon', 'Felt Moon', 'Kumis Moon', 'Racing Moon', 'Gathering Moon', 'Rutting Moon', 'Fat Moon', 'Wolf Moon', 'Blue Sky Moon'],
	desert: ['Cold Nights', 'Date Bloom', 'Sand Wind', 'Shepherd Month', 'Heat Rising', 'Fasting Month', 'Pilgrim Month', 'Harvest of Dates', 'Caravan Month', 'First Rains', 'Cistern Month', 'Month of Stars'],
	savanna: ['Harmattan', 'Dry Wind', 'Burning Grass', 'First Drops', 'Planting Month', 'Yam Month', 'Drum Month', 'Mask Month', 'Green Month', 'Harvest Drums', 'Cattle Month', 'Ember Month'],
	americas: ['Cold Sun', 'Maize Planting', 'Flower Moon', 'Dry Fire', 'Rain Moon', 'Thunder Moon', 'Corn Silk', 'Green Corn', 'Harvest Moon', 'Falling Leaves', 'Hunter Moon', 'Long Night Moon'],
	northern: ['Wolf Month', 'Ice Break', 'Seed Month', 'Cuckoo Month', 'Blossom Month', 'Midsummer', 'Haymaking', 'Slaughter Month', 'Blood Month', 'Fog Month', 'Yule Month', 'Dark Month'],
	classical: ['Januarius', 'Februus', 'Martius', 'Aprilis', 'Maius', 'Junius', 'Quintilis', 'Sextilis', 'Septembris', 'Octobris', 'Novembris', 'Decembris'],
	tide: ['Cold Swell', 'Turning Tide', 'First Fish', 'Sail Month', 'Long Voyage', 'Star Compass', 'High Tide', 'Coral Month', 'Storm Month', 'Return Month', 'Net Mending', 'Dark Waters'],
	eldritch: ['The First Gaze', 'The Unwaking', 'The Murmur', 'The Tide Below', 'The Counting', 'The Third Eye', 'The Long Hunger', 'The Opening', 'The Drowned Hour', 'The Sleeper Stirs', 'The Black Star', 'The Final Dream']
};

/** which season each feast kind falls in (month index at the default calendar) */
export const FEAST_MONTH: Record<FeastKind, number> = { midwinter: 0, spring: 2, learning: 3, sun: 5, sea: 6, war: 7, harvest: 8, dead: 10 };

const D = (food: string, dress: string, architecture: string, music: string, values: string[], feasts: [string, FeastKind][], months: MonthFamily): SphereCulture => ({ food, dress, architecture, music, values, feasts, months });

export const SPHERE_CULTURE: Record<string, SphereCulture> = {
	sinic: D('rice, steamed buns, tea and pickled greens', 'long silk robes with wide sleeves, layered by rank', 'timber halls with upturned tiled eaves and walled courtyards', 'zithers, bells and bamboo flutes', ['filial duty', 'learning', 'harmony'], [['Lantern Festival', 'spring'], ['Moon Cake Night', 'harvest'], ['Festival of Remembered Graves', 'dead']], 'eastern'),
	japonic: D('rice, miso, fish and pickles', 'wrapped kimono, sashes and straw sandals', 'raised wooden halls with paper screens and gravel gardens', 'koto, shakuhachi and war drums', ['honour', 'restraint', 'beauty in impermanence'], [['Blossom-Viewing', 'spring'], ['Festival of Lanterns for the Dead', 'dead'], ['Day of Drawn Swords', 'war']], 'eastern'),
	indic: D('lentils, flatbread, ghee and fragrant spice', 'draped cotton and silk, bright dyes and heavy jewellery', 'carved stone temples, stepwells and domed palaces', 'sitars, tablas and devotional chanting', ['duty', 'devotion', 'learning'], [['Festival of Lamps', 'midwinter'], ['Festival of Colours', 'spring'], ['Night of Nine Songs', 'harvest']], 'monsoon'),
	sea: D('rice, coconut, fish sauce and chilli', 'sarongs, batik wraps and flower garlands', 'stilted halls with sweeping roofs and terraced temple-mountains', 'gong ensembles and shadow-play chants', ['community', 'balance', 'hospitality'], [['Water Festival', 'spring'], ['Rice Blessing', 'harvest'], ['Night of Shadow Plays', 'learning']], 'monsoon'),
	steppe: D('mutton, mare’s milk, curds and dried meat', 'felt coats, fur caps and sashes, made for riding', 'felt tents on cart-frames and stone cairn-shrines', 'horsehead fiddles and throat-singing', ['freedom', 'loyalty to the clan', 'hospitality'], [['Summer Games', 'sun'], ['Gathering of the Clans', 'war'], ['Feast of the First Foal', 'spring']], 'steppe'),
	persian: D('saffron rice, kebab, pomegranate and sweets', 'long coats, embroidered sashes and silk turbans', 'blue-tiled domes, iwans and walled paradise gardens', 'lutes, frame drums and sung poetry', ['honour', 'poetry', 'hospitality'], [['Feast of New Light', 'spring'], ['Night of Pomegranates', 'midwinter'], ['Festival of Fire Leaping', 'dead']], 'desert'),
	arabic: D('flatbread, dates, lamb, coffee and honeyed sweets', 'flowing robes, headcloths and embroidered cloaks', 'courtyard houses, minarets and covered souks', 'oud, reed pipes and call-and-response verse', ['hospitality', 'honour', 'learning'], [['Feast of Breaking the Fast', 'sun'], ['Feast of the Pilgrim Caravan', 'harvest'], ['Night of Lanterns', 'learning']], 'desert'),
	mande: D('millet porridge, groundnut stew, rice and dried fish', 'dyed cotton robes, mud-cloth and gold ornaments', 'earthen mosques ribbed with timbers and walled compounds', 'kora, balafon and griot epics', ['lineage', 'generosity', 'oaths'], [['Day of Replastering', 'spring'], ['Griots’ Epic Nights', 'learning'], ['Feast of the Harvest Drums', 'harvest']], 'savanna'),
	yoruba: D('yam, palm oil stews, plantain and pepper soup', 'wrapped cloths, beaded crowns and masks', 'compounds around courtyards, shrine groves and moated walls', 'talking drums and call-and-response chorus', ['elders’ counsel', 'ancestors', 'festival'], [['Festival of the Ancestors', 'dead'], ['Yam Feast', 'harvest'], ['Masquerade Season', 'spring']], 'savanna'),
	bantu: D('maize meal, millet, fish and plantain', 'wrapped cloths, bead strings and cowrie shells', 'round thatched houses and stone-walled enclosures', 'drums, thumb pianos and layered chorus', ['kinship', 'ancestors', 'trade'], [['Feast of First Fruits', 'harvest'], ['Dhow Season Fair', 'sea'], ['Dance of the Elders', 'dead']], 'savanna'),
	ethiopic: D('spiced stews on sour flatbread, honey wine and coffee', 'white cotton shawls with bright borders and crosses of silver', 'rock-hewn churches, castles of dark stone and round houses', 'lyres, sistrums and chanted hymns', ['faith', 'fasting', 'legitimate descent'], [['Feast of Lights', 'midwinter'], ['River Blessing Day', 'sun'], ['Fast-Breaking Feast', 'spring']], 'desert'),
	nahua: D('maize flatbread, beans, chilli and chocolate drink', 'feathered headdresses, cotton mantles and jade ornaments', 'stepped pyramids, plazas and causeways', 'drums, conch trumpets and ballgame chants', ['sacrifice', 'valour', 'order'], [['Feast of Flowers', 'spring'], ['Ballgame Festival', 'war'], ['Night of Offerings', 'dead']], 'americas'),
	maya: D('maize, beans, squash, chilli and cacao', 'woven huipil, jade jewellery and plumed headdresses', 'limestone temple-pyramids, observatories and carved stelae', 'flutes, rattles and long-drum processions', ['the count of days', 'kinship', 'ritual exactness'], [['Festival of the New Count', 'midwinter'], ['Ballgame of the Hero Twins', 'war'], ['Day of Rain Offerings', 'spring']], 'americas'),
	andean: D('potatoes, quinoa, maize beer and dried llama meat', 'bright woven ponchos, wool caps and silver pins', 'fitted stonework, terraces and cliff roads', 'panpipes, quenas and drums', ['reciprocity', 'labour for the common good', 'ancestors'], [['Sun Festival', 'sun'], ['Planting Blessing', 'spring'], ['Day of the Mummies', 'dead']], 'americas'),
	turtle: D('corn, beans, squash, venison and maple sap', 'buckskin, beaded sashes and feathered caps', 'longhouses, earth lodges and palisaded towns', 'water drums, rattles and social dances', ['consensus', 'kinship', 'gratitude to the land'], [['Green Corn Feast', 'harvest'], ['Maple Thanks', 'spring'], ['Midwinter Dream Rites', 'midwinter']], 'americas'),
	inuit: D('seal, fish, whale blubber and berries', 'layered skin parkas, mittens and snow goggles', 'snow houses, sod houses and stone caches', 'frame drums and throat games', ['sharing', 'patience', 'respect for the hunt'], [['Return of the Sun', 'spring'], ['Whale Thanks', 'sea'], ['Long Night Gathering', 'midwinter']], 'steppe'),
	polynesian: D('taro, breadfruit, fish and coconut', 'bark cloth, woven mats and shell necklaces', 'open thatched halls, stone platforms and canoe houses', 'log drums, conches and chanted genealogies', ['mana', 'voyaging', 'genealogy'], [['Feast of the Return Voyage', 'sea'], ['First Fruit Offerings', 'harvest'], ['Canoe Launching', 'spring']], 'tide'),
	norse: D('smoked fish, rye bread, mutton, ale and mead', 'wool tunics, cloaks with brooches and fur-lined caps', 'turf-roofed longhouses, stave halls and shipyards', 'lyres, horns and skaldic recitation', ['honour', 'oaths', 'seafaring'], [['Winter Nights', 'dead'], ['Midsummer Bonfires', 'sun'], ['Feast of the Longships', 'sea']], 'northern'),
	celtic: D('oatcakes, stews, salted pork, mead and ale', 'checked wool cloaks, torcs and brooches', 'ring forts, round houses and standing-stone circles', 'harps, pipes and bardic song', ['hospitality', 'bardic memory', 'clan loyalty'], [['Fires of Beltane', 'spring'], ['Night of the Veil', 'dead'], ['Lammas Gathering', 'harvest']], 'northern'),
	latin: D('bread, olive oil, wine, cheese and garum', 'draped tunics and togas, military cloaks and brooches', 'forums, aqueducts, arches and domed temples', 'lyres, horns and theatre choruses', ['law', 'civic duty', 'martial discipline'], [['Saturnalia', 'midwinter'], ['Games of the Arena', 'war'], ['Feast of the Vine', 'harvest']], 'classical'),
	slavic: D('black bread, borscht, pickles, kvass and honey', 'embroidered linen shirts, sheepskin coats and headscarves', 'log houses with carved eaves, wooden fortresses and onion-roofed halls', 'gusli, accordions and round-dance songs', ['community', 'hospitality', 'endurance'], [['Burning of Winter', 'spring'], ['Night of Wreaths', 'sun'], ['Feast of the Ancestors', 'dead']], 'northern'),
	eldritch: D('pale fungi, blind fish and brine', 'layered shrouds, bone masks and glimmering beads', 'cyclopean stone, spiralling towers and drowned halls', 'low chanting, bone flutes and humming stones', ['obedience', 'secret knowledge', 'the long dream'], [['Night of Opening Eyes', 'dead'], ['The Counting', 'learning'], ['Drowned Hour Feast', 'sea']], 'eldritch')
};

export const FALLBACK_CULTURE: SphereCulture = D('bread, stews and seasonal fruit', 'woven wool and linen, dyed in local colours', 'timber and stone halls around a market square', 'pipes, drums and work songs', ['kinship', 'hospitality', 'custom'], [['Midwinter Feast', 'midwinter'], ['Spring Festival', 'spring'], ['Harvest Home', 'harvest']], 'default');

/** flavour for what each feast kind does, used in the event text */
export const FEAST_TEXT: Record<FeastKind, string> = {
	spring: 'People of {realm} wake the year with song and fresh green boughs at {town}.',
	harvest: 'Granaries of {realm} are opened at {town}; the whole town eats until dusk.',
	dead: 'Families in {realm} set out lamps and food for their dead at {town}.',
	midwinter: 'The longest night in {realm} is spent by firelight in {town}, with stories and gifts.',
	sea: 'Boats of {realm} are blessed and raced off {town}; sailors are toasted ashore.',
	war: 'Warriors of {realm} parade and wrestle in the squares of {town} to honour the old victories.',
	learning: 'Scholars and singers of {realm} compete in {town}; the best verse is carried through the streets.',
	sun: 'Bonfires on the hills of {realm} greet the high sun above {town}.'
};
