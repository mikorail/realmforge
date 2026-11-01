// Headless world file for Realmforge Wanderer: npx tsx scripts/adventure-world.ts [years] [genre] [seed] [template] [planets] > world.json
import { generateUniverse } from '../src/lib/gen/universe';
import { Cosmos } from '../src/lib/sim/cosmos';
import { exportAdventure, exportUniverse } from '../src/lib/adventure/export';
import type { Genre, Template } from '../src/lib/gen/types';

const years = Number(process.argv[2] ?? 120);
const genre = (process.argv[3] ?? 'fantasy') as Genre;
const seed = process.argv[4] ?? 'adv-test';
const template = (process.argv[5] ?? 'continents') as Template;
const planets = Math.max(1, Number(process.argv[6] ?? 1));
const u = generateUniverse({ seed, template, cells: 8000, states: 14, width: 1600, height: 1000, genre, planet: 'terran', spheres: null, depth: 3, sky: true, sea: true }, planets);
const cos = new Cosmos(u);
for (let m = 0; m < years * 12; m++) cos.tick();
console.log(planets > 1 ? exportUniverse(cos) : exportAdventure(cos.sims[0]));
