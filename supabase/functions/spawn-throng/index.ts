// spawn-throng — the ONLY way to spawn. Requires a wallet, enforces the free
// tier (5/wallet) + SOL payment, and INSERTS into the shared thronglings table
// so every player sees it live and it survives refresh.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
const TREASURY = '3zNLW78QNU8SZdH2R3UmMNvSNhA3aNVVzkjVihNxXKUC'
const FREE_SPAWNS = 5
const MAX_POP = 150
const ALLOWED_TYPES = ['normal', 'adolf', 'doge', 'george', 'epstein', 'pepe']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { wallet, name, characterType, x, y } = await req.json()
    if (!wallet) return json({ error: 'wallet_required' }, 401)
    if (typeof x !== 'number' || typeof y !== 'number') return json({ error: 'x and y are required' }, 400)

    // population cap
    const { count: alive } = await admin.from('thronglings').select('*', { count: 'exact', head: true }).eq('is_alive', true)
    if ((alive || 0) >= MAX_POP) return json({ error: 'max_population', message: 'The island is full.' }, 403)

    // free tier: 5 spawns per wallet (lifetime), then 0.001 SOL each
    const [{ count: used }, { count: paid }] = await Promise.all([
      admin.from('thronglings').select('*', { count: 'exact', head: true }).eq('spawned_by', wallet),
      admin.from('payments').select('*', { count: 'exact', head: true }).eq('wallet', wallet).eq('kind', 'spawn'),
    ])
    const allowance = FREE_SPAWNS + (paid || 0)
    if ((used || 0) >= allowance) {
      return json({ error: 'payment_required', kind: 'spawn', price_sol: 0.001, credits: 1, treasury: TREASURY })
    }

    const type = ALLOWED_TYPES.includes(characterType) ? characterType : 'normal'
    const row = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      x, y,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      state: 'wander',
      is_alive: true,
      body_color: '#F5C86A',
      accent_color: '#FF7F2A',
      name: typeof name === 'string' ? name.slice(0, 16) : null,
      character_type: type,
      spawned_by: wallet,
    }
    const { data, error } = await admin.from('thronglings').insert(row).select().single()
    if (error) throw error
    return json({ success: true, throngling: data })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
