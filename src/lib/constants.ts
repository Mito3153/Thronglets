export const TOOLS = [
  { id: 'rock', name: 'Huge Rock', price: 50000, icon: '🪨', lethal: true },
  { id: 'lightning', name: 'Lightning Storm', price: 50000, icon: '⚡', lethal: true },
  { id: 'tornado', name: 'Tornado', price: 50000, icon: '🌪️', lethal: true },
  { id: 'fire', name: 'Fire', price: 50000, icon: '🔥', lethal: true },
  { id: 'snack', name: 'Snack Rain', price: 20000, icon: '🍰', lethal: false },
  { id: 'festival', name: 'Mini Festival', price: 200000, icon: '🎉', lethal: false },
];

export const MAX_POPULATION = 150;
export const SPAWN_COST = 10000;

// Name pool so every auto-generated throng is born with a name.
export const THRONG_NAMES = [
  'Thrum', 'Pibble', 'Quark', 'Lumo', 'Nixie', 'Bix', 'Pippa', 'Nova', 'Pixel', 'Kiko',
  'Momo', 'Zazu', 'Tiko', 'Fizz', 'Bloop', 'Wisp', 'Tinker', 'Zephyr', 'Pogo', 'Mellow',
  'Jinx', 'Rolo', 'Tofu', 'Ziggy', 'Koda', 'Nori', 'Boppo', 'Pika', 'Sprocket', 'Glimmer',
  'Taffy', 'Miso', 'Orbit', 'Pebble', 'Waffle', 'Mango', 'Squeak', 'Rumi', 'Cosmo', 'Fenn',
  'Kiki', 'Voxel', 'Tiki', 'Echo', 'Nimbus', 'Puddle', 'Mochi', 'Sprout', 'Astro', 'Lolly',
  'Nugg', 'Doodle', 'Razzle', 'Quibble', 'Neko', 'Lumen', 'Riff', 'Blip', 'Zing', 'Pippin',
  'Noodle', 'Pudding', 'Zebo', 'Quip', 'Sizzle', 'Nubbins', 'Frito', 'Chonk', 'Zuzu', 'Pippy',
  'Kubo', 'Bixby', 'Gigi', 'Toto', 'Fable', 'Yuzu', 'Droplet', 'Kumo', 'Wobble', 'Dax',
  'Zori', 'Tumble', 'Latch', 'Piko', 'Nix', 'Quill', 'Sprig', 'Mallow', 'Ravi', 'Plink',
  'Jello', 'Bristle', 'Nudge', 'Koru', 'Tink', 'Gloop', 'Minty', 'Zippa', 'Snib', 'Wren',
];

// Local dev / admin: spawn straight into the game with no wallet, no backend,
// no daily limit. Toggled via VITE_ADMIN_FREE_SPAWN in .env. Local-only — it
// does NOT touch or bypass the hosted Supabase backend.
export const ADMIN_FREE_SPAWN = import.meta.env.VITE_ADMIN_FREE_SPAWN === 'true';

export const HALLOWEEN_ISLAND_WIDTH = 1280; // Natural width of Halloween island asset
export const MAP_SIZE = 768 + 500 + HALLOWEEN_ISLAND_WIDTH; // 2548
export const SPAWN_AREA = { x: 150, y: 150, w: 468, h: 468 };
export const SPAWN_AREA_SECOND = { x: 1418, y: 150, w: 980, h: 468 }; // Adjusted for wider Halloween island
export const ISLAND_POSITIONS = {
  first: { x: 0, y: 0 },
  second: { x: 1268, y: 0 } // 768 + 500 gap
};
export const THRONGLING_SPEED = 40;
export const GRAB_COOLDOWN = 20000;
export const MAX_DRAG_TIME = 3000;

export const WEAPON_CONFIG = {
  rock: { duration: 1000, radius: 40 },
  lightning: { duration: 1000, radius: 40 },
  tornado: { duration: 3000, radius: 40 },
  fire: { duration: 3000, radius: 40 },
  festival: { duration: 5000, radius: 60 },
};

export const DEATH_ANIMATION_DURATION = 2000;
export const BLOOD_SPLASH_DURATION = 100;
