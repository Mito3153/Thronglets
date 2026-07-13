// use-tool — gates island tools. Wallet REQUIRED. Free tier is 1 tool per
// wallet (lifetime); after that each tool use costs 0.002 SOL (paid via the
// verify-payment flow, kind:'tool'). Every granted use is recorded in
// tool_uses so the per-wallet count is server-authoritative (no client bypass).
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

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
const TREASURY = '3zNLW78QNU8SZdH2R3UmMNvSNhA3aNVVzkjVihNxXKUC'
const FREE_TOOLS = 1
const ALLOWED_TOOLS = ['rock', 'lightning', 'tornado', 'fire', 'snack', 'festival']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { wallet, ownerMsg, ownerSig, toolId } = await req.json()
    if (!wallet) return json({ error: 'wallet_required' }, 401)
    if (!verifyOwnership(wallet, ownerMsg, ownerSig)) return json({ error: 'ownership_unverified' }, 401)
    if (!ALLOWED_TOOLS.includes(toolId)) return json({ error: 'invalid_tool' }, 400)

    // snack is a coming-soon no-op — never counts against the free tool or charges
    if (toolId === 'snack') return json({ success: true, free: true })

    // free tier: 1 tool per wallet (lifetime), then 0.002 SOL buys 1 more each
    const [{ count: used }, { count: paid }] = await Promise.all([
      admin.from('tool_uses').select('*', { count: 'exact', head: true }).eq('wallet', wallet),
      admin.from('payments').select('*', { count: 'exact', head: true }).eq('wallet', wallet).eq('kind', 'tool'),
    ])
    const allowance = FREE_TOOLS + (paid || 0)
    if ((used || 0) >= allowance) {
      return json({ error: 'payment_required', kind: 'tool', price_sol: 0.002, credits: 1, treasury: TREASURY })
    }

    // record the granted use so the count can't be replayed client-side
    const { error } = await admin.from('tool_uses').insert({ wallet, tool_id: toolId })
    if (error) throw error
    return json({ success: true, remaining_free: Math.max(0, allowance - (used || 0) - 1) })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
