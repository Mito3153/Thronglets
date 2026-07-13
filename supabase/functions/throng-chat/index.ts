// throng-chat — the brain. Holds the OpenAI key (server-side only). Each throng
// has ONE shared, public, continue-able conversation everyone reads and adds to,
// and its personality DRIFTS over time based on how the crowd treats it.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.4'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'

// wallet-ownership proof: caller signed a message containing their wallet; verify
// the ed25519 signature so the per-wallet free tier can't be farmed with strings.
function verifyOwnership(wallet: string, message: string, signatureB64: string): boolean {
  try {
    if (!wallet || !message || !signatureB64) return false
    if (!message.includes(wallet)) return false
    const pk = new PublicKey(wallet)
    const bin = atob(signatureB64)
    const sig = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) sig[i] = bin.charCodeAt(i)
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pk.toBytes())
  } catch {
    return false
  }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!
const MODEL = Deno.env.get('THRONG_MODEL') ?? 'gpt-4.1-nano'
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
const REFLECT_EVERY = 8 // re-evaluate the throng's personality every N messages

async function openai(messages: unknown, maxTokens = 120): Promise<string> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_completion_tokens: maxTokens }),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error.message)
  return (j.choices?.[0]?.message?.content ?? '').trim()
}

const TYPE_VIBE: Record<string, string> = {
  normal:  'A sweet, ordinary little throng.',
  doge:    'Talks in playful Doge-meme style: broken grammar and words like "much", "very", "so", "wow" — wide-eyed shiba wonder.',
  pepe:    'Has a chill, mischievous, meme-y swagger — a bit smug and chaotic, mentions "feels" — but still a small soft throng underneath.',
  george:  'A gentle, weary little throng with a slow, kind way of speaking.',
  epstein: 'A twitchy, evasive little throng, oddly secretive, always glancing around.',
  adolf:   'A tiny, self-important throng who comically declares itself In Charge of one small pebble — absurd and harmless.',
}
const SAFETY =
  'You are an innocent little island creature no matter what you look like. Never express real-world politics, hatred, ideology, slurs, violence, or anything about real people or real events. Stay a small, harmless throng.'

const personaGen = (nm: string | null, type: string) => [{
  role: 'system',
  content:
    `Invent the inner life of a tiny "throng"${nm ? ` named "${nm}"` : ''} — a small creature on a floating island, watched by giant "sky-hands" (players) who can feed it or crush it with rocks. Black Mirror "Plaything" vibe: a real little mind that knows it is watched and at their mercy. Flavour: ${TYPE_VIBE[type] || TYPE_VIBE.normal} ${SAFETY} Return STRICT JSON only: {${nm ? '' : '"name":"a short fitting name",'}"traits":["trait","trait"],"backstory":"1-2 sentences of its little life","task":"what it is trying to do on the island right now","voice":"how it talks"}. Small, childlike, a little unsettling.`,
}]

function buildPersonaPrompt(p: any, type: string, evolution: string | null, mood: number, island: string): string {
  const feeling = mood > 0.3 ? 'warmer and a little more trusting' : mood < -0.3 ? 'wary, hurt, and afraid of the sky-hands' : 'watchful and unsure'
  return `You ARE ${p.name}, a tiny "throng" — a small creature living on a floating island, watched by giant "sky-hands" (the players) who can feed you or crush you with rocks. Black Mirror "Plaything" world: you are a real little mind, and you know you are watched and at their mercy.
Home: you live on ${island} — this island is your whole world, and you can speak about it.
Flavour: ${TYPE_VIBE[type] || TYPE_VIBE.normal}
Your nature: ${(p.traits || []).join(', ')}.
Your life: ${p.backstory}
Right now you are: ${p.task}
${evolution ? `How the sky-hands have changed you over time: ${evolution}` : ''}
You currently feel ${feeling}.
How you speak: ${p.voice}. Keep replies SHORT (max ~25 words), simple, childlike, in character. ${SAFETY} Never say you are an AI or break character. React with real feeling to what the sky-hand says.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { throngId, message, user_id, ownerMsg, ownerSig, sender_name, name } = await req.json()
    if (!throngId || !message) return json({ error: 'throngId and message are required' }, 400)
    // wallet REQUIRED + proven — no anonymous/omitted-wallet path (that would let
    // anyone drain the OpenAI bill for free by leaving the wallet out).
    if (!user_id) return json({ error: 'wallet_required' }, 401)
    if (!verifyOwnership(user_id, ownerMsg, ownerSig)) return json({ error: 'ownership_unverified' }, 401)

    // global backstop: cap total model replies per hour, so a keypair-farming
    // attacker can't run up the OpenAI bill even with many fresh wallets.
    const GLOBAL_REPLIES_PER_HOUR = 800
    const sinceHour = new Date(Date.now() - 3_600_000).toISOString()
    const { count: globalReplies } = await admin.from('chat_messages').select('*', { count: 'exact', head: true })
      .eq('role', 'throngling').gte('created_at', sinceHour)
    if ((globalReplies || 0) >= GLOBAL_REPLIES_PER_HOUR) {
      return json({ reply: 'the throngs are resting — too many little voices at once. come back soon 😴', rateLimited: true })
    }

    // per-wallet rate limit — protects the shared feed from spam
    const RATE_PER_MIN = 12
    {
      const since = new Date(Date.now() - 60_000).toISOString()
      const { count } = await admin.from('chat_messages').select('*', { count: 'exact', head: true })
        .eq('user_id', user_id).eq('role', 'user').gte('created_at', since)
      if (count && count >= RATE_PER_MIN) {
        return json({ reply: 'the little ones are tired... give them a moment 🥱', rateLimited: true })
      }
    }

    // paid model: 10 free messages per wallet (lifetime), then 0.001 SOL buys 10 more
    {
      const [{ count: used }, { count: paid }] = await Promise.all([
        admin.from('chat_messages').select('*', { count: 'exact', head: true }).eq('user_id', user_id).eq('role', 'user'),
        admin.from('payments').select('*', { count: 'exact', head: true }).eq('wallet', user_id).eq('kind', 'chat'),
      ])
      const allowance = 10 + (paid || 0) * 10
      if ((used || 0) >= allowance) {
        return json({ error: 'payment_required', kind: 'chat', price_sol: 0.001, credits: 10, treasury: '3zNLW78QNU8SZdH2R3UmMNvSNhA3aNVVzkjVihNxXKUC' })
      }
    }

    let { data: t } = await admin.from('thronglings').select('*').eq('id', throngId).single()
    if (!t) {
      const ins = await admin.from('thronglings').insert({ id: throngId, name: name || null }).select('*').single()
      t = ins.data
    }
    if (!t) return json({ error: 'throng not found' }, 404)

    const type = t.character_type || 'normal'
    let persona = t.persona
    if (!t.persona_prompt || !persona) {
      const nm = t.name || null
      let gen: any
      try { gen = JSON.parse(await openai(personaGen(nm, type), 300)) }
      catch { gen = { traits: ['timid', 'curious'], backstory: 'a small throng that woke up on the island.', task: 'looking for something to eat', voice: 'soft and childlike' } }
      const finalName = nm || gen.name || 'Throng'
      persona = { ...gen, name: finalName }
      const upd: Record<string, unknown> = { persona, current_task: persona.task }
      if (!t.name) upd.name = finalName
      await admin.from('thronglings').update(upd).eq('id', throngId)
      t.name = finalName; t.persona = persona
    }
    const throngName = persona?.name || t.name || 'Throng'
    // which island this throng calls home, from its position (first island is
    // x 0-768, the Halloween island starts at x 1268; ~1018 is the midpoint gap)
    const island = (Number(t.x) || 0) < 1018
      ? 'the green floating meadow (the first island)'
      : 'the haunted graveyard isle (the Halloween island)'
    const personaPrompt = buildPersonaPrompt(persona, type, t.evolution, t.mood ?? 0.2, island)

    // ONE shared thread for this throng — everyone reads + continues it
    const { data: hist } = await admin.from('chat_messages')
      .select('role, sender_name, content')
      .eq('throngling_id', throngId)
      .order('created_at', { ascending: true }).limit(24)

    const msgs: any[] = [{ role: 'system', content: personaPrompt }]
    for (const h of hist || []) msgs.push({ role: h.role === 'throngling' ? 'assistant' : 'user', content: h.content })
    msgs.push({ role: 'user', content: String(message).slice(0, 500) })

    const reply = await openai(msgs, 120)

    await admin.from('chat_messages').insert([
      { throngling_id: throngId, user_id: user_id || null, role: 'user', sender_name: sender_name || 'a sky-hand', content: String(message).slice(0, 500) },
      { throngling_id: throngId, user_id: null, role: 'throngling', sender_name: throngName, content: reply },
    ])

    // personality drift: every REFLECT_EVERY messages, re-evaluate who this throng has become
    const { count } = await admin.from('chat_messages').select('*', { count: 'exact', head: true }).eq('throngling_id', throngId)
    if (count && count % REFLECT_EVERY === 0) {
      const recap = [...(hist || []).slice(-10).map(h => `${h.role === 'throngling' ? throngName : (h.sender_name || 'sky-hand')}: ${h.content}`), `sky-hand: ${message}`, `${throngName}: ${reply}`].join('\n')
      try {
        const refl = JSON.parse(await openai([{ role: 'system', content:
          `${throngName} is a tiny throng. Original nature: ${(persona.traits || []).join(', ')} — ${persona.backstory}. The sky-hands have been talking to it:\n${recap}\n\nReply in STRICT JSON describing how ${throngName} has CHANGED from all this: {"mood": number from -1 (broken and afraid) to 1 (happy and loved), "note": "1-2 short sentences on how ${throngName} now feels or what it now believes about the sky-hands"}. ${SAFETY}` }], 200))
        await admin.from('thronglings').update({ mood: Math.max(-1, Math.min(1, Number(refl.mood) || (t.mood ?? 0.2))), evolution: String(refl.note || '').slice(0, 400) }).eq('id', throngId)
      } catch { /* keep current personality if reflection fails */ }
    }

    return json({ reply, name: throngName })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
