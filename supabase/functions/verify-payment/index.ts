// verify-payment — confirms a real SOL transfer to the treasury BEFORE granting
// a paid action. Money-safe: checks the tx is confirmed, sends >= the price to
// the treasury, is signed by the paying wallet, is recent, and hasn't been used.
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
const RPC = Deno.env.get('SOLANA_RPC') ?? 'https://api.mainnet-beta.solana.com'

// price in lamports per action (1 SOL = 1e9 lamports)
const PRICE: Record<string, number> = {
  chat: 1_000_000,   // 0.001 SOL -> 10 more messages
  spawn: 1_000_000,  // 0.001 SOL -> 1 spawn
  tool: 2_000_000,   // 0.002 SOL -> 1 tool use
}
const CREDITS: Record<string, number> = { chat: 10, spawn: 1, tool: 1 }
const MAX_AGE_MS = 30 * 60 * 1000

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return (await r.json())?.result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { txSig, wallet, kind } = await req.json()
    if (!txSig || !wallet || !PRICE[kind]) return json({ error: 'txSig, wallet and a valid kind are required' }, 400)
    const price = PRICE[kind]

    // replay guard — a signature can only ever be claimed once
    const { data: existing } = await admin.from('payments').select('wallet, kind').eq('tx_sig', txSig).maybeSingle()
    if (existing) {
      if (existing.wallet === wallet && existing.kind === kind) return json({ success: true, kind, credits: CREDITS[kind], already: true })
      return json({ error: 'tx already used' }, 409)
    }

    const tx = await rpc('getTransaction', [txSig, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }])
    if (!tx) return json({ error: 'tx_not_found', message: 'not confirmed yet — try again in a moment' }, 404)
    if (tx.meta?.err) return json({ error: 'tx_failed' }, 400)

    // recency (unique tx_sig already blocks reuse; this blocks claiming an ancient unrelated tx)
    if (tx.blockTime && Date.now() - tx.blockTime * 1000 > MAX_AGE_MS) return json({ error: 'tx_too_old' }, 400)

    const keys: any[] = tx.transaction?.message?.accountKeys ?? []
    const idxOf = (pk: string) => keys.findIndex((k) => (k.pubkey ?? k) === pk)
    const tIdx = idxOf(TREASURY)
    const wIdx = idxOf(wallet)
    if (tIdx < 0) return json({ error: 'treasury not in tx' }, 400)
    if (wIdx < 0 || !(keys[wIdx].signer === true || wIdx === 0)) return json({ error: 'payer did not sign' }, 400)

    const received = Number(tx.meta.postBalances[tIdx]) - Number(tx.meta.preBalances[tIdx])
    if (received < price) return json({ error: 'insufficient_amount', needLamports: price, gotLamports: received }, 400)

    // the CLAIMING wallet must be the account that actually FUNDED the transfer
    // (its own balance dropped by >= price), not merely a co-signer riding on a
    // transfer someone else paid for.
    const debited = Number(tx.meta.preBalances[wIdx]) - Number(tx.meta.postBalances[wIdx])
    if (debited < price) return json({ error: 'payer_not_funder', message: 'this wallet did not fund the payment' }, 400)

    const { error: insErr } = await admin.from('payments').insert({ tx_sig: txSig, wallet, kind, lamports: received })
    if (insErr) {
      if (String(insErr.message).includes('duplicate')) return json({ success: true, kind, credits: CREDITS[kind], already: true })
      throw insErr
    }
    return json({ success: true, kind, credits: CREDITS[kind] })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
