// demo.mjs — runs a live-ish colony scenario and prints the emergent transcript.
//   node demo.mjs
//
// Scenario: 6 thronglets with distinct personas + seeded friendships. A rock
// drops and kills Bdog. Watch who grieves, who panics, who shrugs, and who
// bonds. Swap mockBrain -> geminiBrain to make the wording actually intelligent.

import { makeThronglet, bond, remember, near, makeRng } from './colony.mjs';
import { mockBrain /*, geminiBrain */ } from './brain.mjs';

const rng = makeRng(7);
const brain = mockBrain(rng);
// const brain = geminiBrain({ apiKey: process.env.GEMINI_API_KEY }); // <- the only change

// --- the colony ------------------------------------------------------------
const T = {
  pebble: makeThronglet({ id: 'pebble', name: 'Pebble', x: 100, y: 100, color: '#F5C86A',
    traits: { loyal: 0.9, timid: 0.3, sociable: 0.6, brave: 0.2, callous: 0 } }),
  bdog: makeThronglet({ id: 'bdog', name: 'Bdog', x: 120, y: 110, color: '#9AD', // the one who dies
    traits: { loyal: 0.7, sociable: 0.7 } }),
  grok: makeThronglet({ id: 'grok', name: 'Grok', x: 140, y: 105, color: '#E55',
    traits: { brave: 0.9, loyal: 0.5, sociable: 0.4, callous: 0 } }),
  // witnesses the death and panics (timid)
  mossy: makeThronglet({ id: 'mossy', name: 'Mossy', x: 300, y: 160, color: '#7C5',
    traits: { timid: 0.9, sociable: 0.5, loyal: 0.4 } }),
  // witnesses but doesn't care (callous)
  crunk: makeThronglet({ id: 'crunk', name: 'Crunk', x: 180, y: 130, color: '#555',
    traits: { callous: 0.9, sociable: 0.2 } }),
  // just OUT of witness range, but near panicking Mossy -> comforts her -> they bond
  tato:  makeThronglet({ id: 'tato', name: 'Tato', x: 400, y: 170, color: '#F8A',
    traits: { sociable: 0.9, loyal: 0.5, brave: 0.3 } }),
};
const all = Object.values(T);

// seeded relationships
bond(T.pebble, T.bdog, 0.9, 'best friends since spawn');
bond(T.grok, T.bdog, 0.5, 'snack buddies');
bond(T.mossy, T.tato, 0.2, 'neighbours, barely know each other');

// --- world context handed to the brain ------------------------------------
const events = [];
const world = {
  events,
  nearbyOf: (t) => all.filter((o) => o.alive && o.id !== t.id && near(t, o)),
};

// --- helpers ---------------------------------------------------------------
function applyDecisions(decisions) {
  for (const d of decisions) {
    const t = all.find((x) => x.id === d.id);
    if (!t) continue;
    if (d.bubble) console.log(`   💬 ${t.name}: "${d.bubble}"`);
    if (d.emotion?.mood) t.mood = Math.max(-1, Math.min(1, t.mood + d.emotion.mood));
    if (d.emotion?.grief) t.grief = Math.max(0, Math.min(1, t.grief + d.emotion.grief));
    for (const b of d.bonds ?? []) {
      const other = all.find((x) => x.id === b.with);
      if (other) {
        t.relationships.set(b.with, { affinity: b.affinity, note: b.note });
        other.relationships.set(t.id, { affinity: b.affinity, note: b.note });
      }
    }
  }
}

async function tick(label) {
  const thinkers = all.filter((t) => t.alive);
  const decisions = await brain.think(thinkers, world);
  if (decisions.length) console.log(`\n── ${label} ──`);
  applyDecisions(decisions);
}

function dropRock(victim) {
  console.log(`\n🪨  A ROCK FALLS FROM THE SKY. ${victim.name} is crushed.\n`);
  victim.alive = false;
  events.push({ type: 'death', victimId: victim.id, victimName: victim.name, x: victim.x, y: victim.y });
  // everyone nearby witnesses it -> goes into their memory -> drives next tick
  for (const t of all) {
    if (t.alive && near(t, victim, 240)) remember(t, `i watched ${victim.name} die`, 2);
  }
}

function snapshot() {
  console.log(`\n────────── colony state ──────────`);
  for (const t of all) {
    const status = t.alive ? '' : ' (dead)';
    const feel = t.alive
      ? `mood ${t.mood.toFixed(2)}  grief ${t.grief.toFixed(2)}`
      : '';
    console.log(`${t.name.padEnd(7)}${status.padEnd(8)} ${feel}`);
    for (const [id, r] of t.relationships) {
      if (Math.abs(r.affinity) >= 0.5) {
        const other = all.find((x) => x.id === id);
        console.log(`         ↔ ${other.name.padEnd(7)} ${r.affinity >= 0 ? '+' : ''}${r.affinity.toFixed(2)}  (${r.note})`);
      }
    }
  }
}

// --- run -------------------------------------------------------------------
console.log('🌱 THRONGLET COLONY — emergent social demo (mock brain)\n');

await tick('ambient life');          // budding friendships, idle chatter
dropRock(T.bdog);                    // the event
await tick('the moment after');      // grief / panic / callousness
await tick('finding each other');    // the survivors bond
snapshot();

console.log('\n(Swap mockBrain → geminiBrain to make the wording genuinely intelligent —');
console.log(' the persona/relationship/memory engine driving WHO feels WHAT stays identical.)');
