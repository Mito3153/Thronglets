// colony.mjs — the social-colony core: personas, relationships, memory, emotions.
// Pure state + rules. No rendering, no LLM. The brain is injected (see brain.mjs).
//
// This is the part that makes a rock drop produce *grief from the victim's friend,
// fear from the timid one, and a callous shrug from the selfish one* — instead of
// generic text. The LLM only decides *wording*; this decides *who feels what*.

// --- tiny seeded RNG so demo runs are reproducible -------------------------
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- a thronglet -----------------------------------------------------------
// persona.traits drive everything: loyalty, bravery, timidity, callousness, sociability.
// mood: -1 (despair) .. +1 (joy).  grief: 0..1.  energy: 0..1.
// relationships: Map<otherId, { affinity:-1..1, note:string }>
export function makeThronglet({ id, name, x, y, traits, color }) {
  return {
    id, name, x, y, color,
    alive: true,
    persona: { traits },                 // e.g. { loyal: 0.9, timid: 0.2, ... }
    mood: 0.2,
    grief: 0,
    energy: 1,
    relationships: new Map(),
    memory: [],                          // rolling, capped — what this thronglet witnessed
  };
}

export function bond(a, b, affinity, note) {
  a.relationships.set(b.id, { affinity, note });
  b.relationships.set(a.id, { affinity, note });
}

export function affinity(self, otherId) {
  return self.relationships.get(otherId)?.affinity ?? 0;
}

export function remember(t, text, weight = 1) {
  t.memory.push({ text, weight, age: 0 });
  if (t.memory.length > 8) t.memory.shift();   // cheap, bounded context for the brain
}

export function near(a, b, radius = 120) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius;
}

export function clamp(v, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

// --- emotional response to a death -----------------------------------------
// Returns how hard `witness` is hit by `victim` dying, given relationship + persona.
// This is the rule layer; the brain turns this into words.
export function griefImpact(witness, victim) {
  const aff = affinity(witness, victim.id);          // -1..1 how close they were
  const loyal = witness.persona.traits.loyal ?? 0;
  const callous = witness.persona.traits.callous ?? 0;
  // close + loyal => devastated.  callous => barely registers (or relief).
  const raw = Math.max(0, aff) * (0.6 + loyal) - callous * 0.5;
  return clamp(raw, 0, 1);
}
