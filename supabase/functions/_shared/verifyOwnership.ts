import { PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.4'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'

// Lightweight wallet-ownership proof: the caller signs a static message that
// contains their wallet address; we verify the ed25519 signature against that
// pubkey. No timestamp/expiry — this only proves "the caller controls this
// keypair" so the per-wallet free tier + paid counting can't be farmed by
// POSTing an arbitrary wallet string. (Fresh SOL txs still gate paid actions.)
export function verifyOwnership(wallet: string, message: string, signatureB64: string): boolean {
  try {
    if (!wallet || !message || !signatureB64) return false
    if (!message.includes(wallet)) return false // bind the signed message to the claimed wallet
    const pk = new PublicKey(wallet)
    const bin = atob(signatureB64)
    const sig = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) sig[i] = bin.charCodeAt(i)
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pk.toBytes())
  } catch {
    return false
  }
}
