// throng-chat — the brain. Holds the OpenAI key (server-side only), gives each
// throng a persona (themed by its character type) on first contact, and answers
// chat in character. Writes both sides to chat_messages (realtime) + memory.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!
const MODEL = Deno.env.get('THRONG_MODEL') ?? 'gpt-4.1-nano'
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

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

// Per character-type flavour. These are just SKINS — every throng is an innocent
// little island creature underneath, never a real-world figure or ideology.
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

const personaGen = (name: string | null, type: string) => [{
  role: 'system',
  content:
    `Invent the inner life of a tiny "throng"${name ? ` named "${name}"` : ''} — a small creature on a floating island, watched by giant "sky-hands" (players) who can feed it or crush it with rocks. Black Mirror "Plaything" vibe: a real little mind that knows it is watched and at their mercy. Flavour: ${TYPE_VIBE[type] || TYPE_VIBE.normal} ${SAFETY} Return STRICT JSON only: {${name ? '' : '"name":"a short fitting name",'}"traits":["trait","trait"],"backstory":"1-2 sentences of its little life","task":"what it is trying to do on the island right now","voice":"how it talks"}. Small, childlike, a little unsettling.`,
}]

function buildPersonaPrompt(p: any, type: string): string {
  return `You ARE ${p.name}, a tiny "throng" — a small creature living on a floating island, watched by giant "sky-hands" (the players) who can feed you or crush you with rocks. Black Mirror "Plaything" world: you are a real little mind, and you know you are watched and at their mercy.
Flavour: ${TYPE_VIBE[type] || TYPE_VIBE.normal}
Your nature: ${(p.traits || []).join(', ')}.
Your life: ${p.backstory}
Right now you are: ${p.task}
How you speak: ${p.voice}. Keep replies SHORT (max ~25 words), simple, childlike, in character. ${SAFETY} Never say you are an AI or break character. React with real feeling to what the sky-hand says.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { throngId, message, sender_name, name } = await req.json()
    if (!throngId || !message) return json({ error: 'throngId and message are required' }, 400)

    // load the throng; create it on-demand if it only existed client-side (local spawn)
    let { data: t } = await admin.from('thronglings').select('*').eq('id', throngId).single()
    if (!t) {
      const ins = await admin.from('thronglings').insert({ id: throngId, name: name || null }).select('*').single()
      t = ins.data
    }
    if (!t) return json({ error: 'throng not found' }, 404)

    const type = t.character_type || 'normal'
    let persona = t.persona
    let personaPrompt = t.persona_prompt
    if (!personaPrompt) {
      const hadName = !!t.name
      let gen: any
      try { gen = JSON.parse(await openai(personaGen(t.name || null, type), 300)) }
      catch { gen = { name: t.name || 'Throng', traits: ['timid', 'curious'], backstory: 'a small throng that woke up on the island.', task: 'looking for something to eat', voice: 'soft and childlike' } }
      const nm = t.name || gen.name || 'Throng'
      persona = { ...gen, name: nm }
      personaPrompt = buildPersonaPrompt(persona, type)
      const upd: Record<string, unknown> = { persona, persona_prompt: personaPrompt, current_task: persona.task }
      if (!hadName) upd.name = nm
      await admin.from('thronglings').update(upd).eq('id', throngId)
      t.name = nm
    }

    const mem = Array.isArray(t.memory) ? t.memory.slice(-6) : []
    const memText = mem.length ? `Things you remember: ${mem.map((m: any) => m.text || m).join(' | ')}` : ''
    const feeling = t.mood > 0.3 ? 'okay' : t.mood < -0.3 ? 'sad and scared' : 'a little uneasy'

    const reply = await openai([
      { role: 'system', content: `${personaPrompt}\n${memText}\n(your mood right now: ${feeling})` },
      { role: 'user', content: String(message).slice(0, 500) },
    ], 120)

    await admin.from('chat_messages').insert([
      { throngling_id: throngId, role: 'user', sender_name: sender_name || 'a sky-hand', content: String(message).slice(0, 500) },
      { throngling_id: throngId, role: 'throngling', sender_name: persona?.name || t.name, content: reply },
    ])

    const nextMem = [...(Array.isArray(t.memory) ? t.memory : []), { text: `a sky-hand said "${message}"; I said "${reply}"` }].slice(-12)
    await admin.from('thronglings').update({ memory: nextMem }).eq('id', throngId)

    return json({ reply, name: persona?.name || t.name })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
