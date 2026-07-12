# Throngle Town — Living AI Colony (design)

**One line:** a bunch of cheap-LLM AIs in thronglet bodies, living together on a livestreamed island — they converse in speech bubbles, react to what happens around them, grieve when a friend is crushed, and form friendships. The Black Mirror "Plaything/Thronglets" premise, as a memecoin spectacle.

## Locked scope (2026-06-27, with devik)
- **IN:** speech-bubble conversations between thronglets; emotional reactions to events (rock/snack/festival/etc.); persistent relationships (grief, friendship, rivalry); memory.
- **OUT (for now):** X/Twitter posting, on-chain trading, any real-money autonomy. Explicitly deferred.
- **Engine:** absolute-cheapest. Default to **Gemini Flash-Lite or Groq-hosted Llama** (Groq = dirt cheap + very fast, good when many short bubbles fire at once). Built model-agnostic behind ONE swap point so we A/B on cost/quality.

## Why the existing game is only the shell
The current codebase is a **god-toy**, not a life-sim: thronglings are dumb FSMs (`wander|eat|rest|play|flee` in `src/types/game.ts`), and the only interactions are spawn (10k $THRONG) + kill/buff them with weapons (`src/lib/constants.ts`). The player is the destroyer.
We **keep the shell** (canvas renderer `GameCanvas.tsx`, sprites, Solana wallet, Supabase backend, $THRONG token panel, multiplayer state) and **replace the mind + the loop**: thronglets become living social agents; spectators watch (and can still poke the world).

## Architecture — three cheap systems, not one expensive one
1. **Sim** (free, deterministic, server-authoritative): bodies move, get hungry, wander. Same as the current FSM, moved out of the canvas into a worker + Supabase. Keeps 50–150 creatures alive 24/7 for ~nothing.
2. **Social state** (cheap, the part that matters): each thronglet has a **persona** (traits: loyal/timid/brave/callous/sociable), a **relationship graph** (affinity −1..1 + a note per other thronglet), a rolling **memory** of what it witnessed, and **mood/grief/energy**. *This* layer decides who feels what.
3. **Brain** (the cheap LLM, the only paid part): fires only on **proximity** (two thronglets near → short exchange) and **events** (rock drop → grief), **batched** (one JSON call → decisions for many thronglets), **short** outputs (one bubble each), with the stable preamble **prompt-cached**. The LLM only writes *wording*; system #2 decides *who feels what*.

### The swap point
`colony-prototype/brain.mjs` defines the interface every engine implements:
```
async think(batch, world) -> Array<{ id, bubble?, emotion?{mood,grief}, bonds?[{with,affinity,note}] }>
```
`mockBrain` (templated, persona/relationship/memory-aware) runs today with zero cost. `geminiBrain`/`groqBrain` is the same signature — one batched cheap JSON call. Swapping is a one-line change.

## "Runs live" backend
Always-on worker (small Node service on a DO droplet, like TrenchRoyale) ticks the sim + batches brain calls + writes Supabase; clients render live via Supabase Realtime. Slower brain batches can ride the trigger.dev line. Most ticks are sim-only (free); the brain only fires on proximity/events/slow ambient cadence.

## Cost (this scope, cheap engine, batched + short + cached)
Roughly **$2–15/day** for a lively 50–150 colony. The naive "every thronglet calls an LLM every few seconds" design is 10–50× that and latency-bound — avoided by sim/brain separation + batching.

## Build order
1. **Server-authoritative sim** — move FSM out of canvas into worker + Supabase; clients render. ✅ reuses renderer.
2. **Social state model** — personas, relationship graph, memory, emotions (prototyped — `colony-prototype/colony.mjs`).
3. **Brain layer** — model-agnostic, batched, prompt-cached; wire the real cheap engine into the `geminiBrain` stub.
4. **Bubbles in-canvas** — render speech bubbles + emotional tells over the sprites.
5. Tune personas, event reactions, relationship dynamics.

## Prototype status (2026-06-27)
`colony-prototype/` (zero-dep, `node demo.mjs`) proves the soul in isolation with a mock brain: one rock drop produces grief from the victim's best friend, rage from the brave one, panic from the timid one, a callous shrug, and a NEW friendship formed over shared trauma — all from persona + relationship + memory. Next: wire the real cheap engine into `brain.mjs:geminiBrain` (needs an API key), then integrate the state model + brain into the live game.
