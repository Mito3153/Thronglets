import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';

type SendTx = (tx: Transaction, connection: Connection) => Promise<string>;

export type PayResult = { ok: true } | { ok: false; reason: 'cancelled' | 'network' | 'unverified' };

// Shared SOL payment flow for spawn / tool / chat. Sends `priceSol` to the
// treasury, then verifies on-chain via verify-payment (retrying while the RPC
// catches up), and reports a precise reason on failure so the UI can tell
// "you cancelled" apart from "the network hiccuped".
export async function payForAction(opts: {
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: SendTx;
  treasury: string;
  priceSol: number;
  kind: 'spawn' | 'tool' | 'chat';
}): Promise<PayResult> {
  const { connection, publicKey, sendTransaction, treasury, priceSol, kind } = opts;
  const lamports = Math.round(priceSol * LAMPORTS_PER_SOL);

  let sig: string;
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(treasury), lamports }),
    );
    tx.feePayer = publicKey;
    tx.recentBlockhash = blockhash;
    sig = await sendTransaction(tx, connection);
    // best-effort confirm — if the RPC is slow we don't abort; the verify loop
    // below re-checks the chain and retries.
    try {
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
    } catch { /* slow confirm, handled by verify loop */ }
  } catch (e) {
    const msg = String((e as Error)?.message || e).toLowerCase();
    if (msg.includes('reject') || msg.includes('denied') || msg.includes('cancel') || msg.includes('user declined')) {
      return { ok: false, reason: 'cancelled' };
    }
    console.error('[pay] send failed:', e);
    return { ok: false, reason: 'network' };
  }

  for (let i = 0; i < 6; i++) {
    const { data } = await supabase.functions.invoke('verify-payment', {
      body: { txSig: sig, wallet: publicKey.toString(), kind },
    });
    const d = data as any;
    if (d?.success) return { ok: true };
    if (d?.error && d.error !== 'tx_not_found') console.warn('[pay] verify:', d.error);
    await new Promise((r) => setTimeout(r, 2500));
  }
  return { ok: false, reason: 'unverified' };
}
