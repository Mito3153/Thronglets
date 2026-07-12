// brain.mjs — THE SWAP POINT.
//
// Every brain implements the same interface:
//
//   async think(batch, world) -> Array<Decision>
//
//   batch : Thronglet[]                 // the thronglets thinking this tick
//   world : { events, nearbyOf(t) }     // shared context (cheap, cached preamble)
//   Decision : {
//     id,                               // which thronglet
//     bubble?: string,                  // what it says (a speech bubble) — may be null
//     emotion?: { mood?, grief? },      // deltas to apply
//     bonds?: Array<{ with, affinity, note }>  // relationship updates
//   }
//
// The MOCK brain below is persona/relationship/memory-aware so the emergent
// behaviour is visible TODAY with zero API cost. The REAL brain (geminiBrain /
// groqBrain) is the same signature — one batched, cheap, JSON call. Swapping is
// a one-line change in the demo. That's the whole point of isolating this.

import { affinity, griefImpact, clamp } from './colony.mjs';

// ---------------------------------------------------------------------------
// MOCK BRAIN — templated, but driven by persona + relationship + memory so it
// already produces the variety devik described: "some grieve, some become
// friends, some are callous." Variety comes from STATE, not from randomness.
// ---------------------------------------------------------------------------
export function mockBrain(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  return {
    name: 'mock',
    async think(batch, world) {
      const out = [];
      const lastDeath = [...world.events].reverse().find((e) => e.type === 'death');

      for (const t of batch) {
        const traits = t.persona.traits;

        // --- reacting to a recent death near them --------------------------
        if (lastDeath && t.memory.some((m) => m.text.includes(lastDeath.victimName))) {
          const victim = { id: lastDeath.victimId, name: lastDeath.victimName };
          const hit = griefImpact(t, victim);

          if ((traits.callous ?? 0) > 0.5 && hit < 0.2) {
            out.push({
              id: t.id,
              bubble: pick([
                `more snacks for me now i guess`,
                `${victim.name} was kind of annoying anyway`,
              ]),
              emotion: { mood: +0.05 },
            });
          } else if (hit > 0.55) {
            // devastated — close friend, loyal persona
            out.push({
              id: t.id,
              bubble: pick([
                `no... no not ${victim.name}... come back`,
                `we were supposed to grow old together ${victim.name}`,
                `why ${victim.name}... why them...`,
              ]),
              emotion: { mood: -0.6, grief: +0.8 },
            });
          } else if ((traits.brave ?? 0) > 0.5) {
            out.push({
              id: t.id,
              bubble: pick([
                `who did this. WHO.`,
                `the sky-hands took ${victim.name}. they'll pay`,
              ]),
              emotion: { mood: -0.3, grief: +0.3 },
            });
          } else if ((traits.timid ?? 0) > 0.5) {
            out.push({
              id: t.id,
              bubble: pick([`i'm scared. i'm so scared`, `am i next? am i next?`]),
              emotion: { mood: -0.4, grief: +0.6 },
            });
          } else {
            out.push({
              id: t.id,
              bubble: `${victim.name}... gone...`,
              emotion: { mood: -0.3, grief: +0.3 },
            });
          }
          continue;
        }

        // --- comforting a grieving neighbour -> bonds form -----------------
        const grievingNeighbour = world
          .nearbyOf(t)
          .find((n) => n.grief > 0.5 && (traits.sociable ?? 0) > 0.4);
        if (grievingNeighbour) {
          out.push({
            id: t.id,
            bubble: pick([
              `hey... ${grievingNeighbour.name}, i'm here. come here`,
              `it's okay ${grievingNeighbour.name}, we have each other`,
              `don't be scared ${grievingNeighbour.name}, stay close to me`,
            ]),
            emotion: { mood: +0.1 },
            bonds: [
              {
                with: grievingNeighbour.id,
                affinity: clamp(affinity(t, grievingNeighbour.id) + 0.4),
                note: 'became close over shared grief',
              },
            ],
          });
          continue;
        }

        // --- ambient idle chatter / budding friendship ---------------------
        const friend = world
          .nearbyOf(t)
          .find((n) => (traits.sociable ?? 0) > 0.5 && t.grief < 0.3);
        if (friend) {
          out.push({
            id: t.id,
            bubble: pick([
              `${friend.name}! wanna find snacks together?`,
              `i like it here with you ${friend.name}`,
              `race you to the big rock ${friend.name}!`,
            ]),
            emotion: { mood: +0.08 },
            bonds: [
              {
                with: friend.id,
                affinity: clamp(affinity(t, friend.id) + 0.15),
                note: 'spending time together',
              },
            ],
          });
        }
      }
      return out;
    },
  };
}

// ---------------------------------------------------------------------------
// REAL BRAIN (stub) — the cheap engine drops in HERE, same signature.
// One batched JSON call for the whole `batch`. Persona+relationship+memory go
// in the prompt; the model returns ONLY wording + emotion/bond deltas. Caching
// the system preamble + keeping outputs to one bubble each = fractions of a
// cent per colony tick. Wire it when devik drops an API key.
// ---------------------------------------------------------------------------
export function geminiBrain({ apiKey, model = 'gemini-2.5-flash-lite' }) {
  return {
    name: model,
    async think(batch, world) {
      // const system = COLONY_RULES;            // <- stable, prompt-cached
      // const user = renderBatchContext(batch, world);  // <- per-tick delta only
      // const res = await fetch(GEMINI_URL, { ...system+user, responseSchema: DECISION_SCHEMA });
      // return parseDecisions(res);             // structured JSON -> Decision[]
      throw new Error('geminiBrain not wired yet — drop GEMINI_API_KEY and implement the fetch.');
    },
  };
}
