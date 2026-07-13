import { WalletContextState } from '@solana/wallet-adapter-react';

export interface OwnershipProof {
  wallet: string;
  ownerMsg: string;
  ownerSig: string;
}

const cacheKey = (w: string) => `throngle_owner_${w}`;

// One-time-per-browser wallet signature proving the user controls this wallet.
// Cached in localStorage (no gas, no expiry) so the user only sees one popup.
// Sent with every gated action so the server can trust the wallet identity
// instead of a caller-supplied string. Throws if the user rejects.
export async function getOwnershipProof(wallet: WalletContextState): Promise<OwnershipProof> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  if (!wallet.signMessage) throw new Error('This wallet cannot sign messages');
  const w = wallet.publicKey.toString();

  const cached = localStorage.getItem(cacheKey(w));
  if (cached) {
    try {
      const p = JSON.parse(cached);
      if (p?.wallet === w && p?.ownerMsg && p?.ownerSig) return p;
    } catch { /* fall through and re-sign */ }
  }

  const ownerMsg = `Throngle Town — sign to prove you control this wallet so you can play.\nWallet: ${w}\n(no transaction, no gas)`;
  const sigBytes = await wallet.signMessage(new TextEncoder().encode(ownerMsg));
  const ownerSig = btoa(String.fromCharCode(...sigBytes));
  const proof: OwnershipProof = { wallet: w, ownerMsg, ownerSig };
  localStorage.setItem(cacheKey(w), JSON.stringify(proof));
  return proof;
}
